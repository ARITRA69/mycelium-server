# Media Upload & Processing Pipeline

> **Routes:** `POST /api/v1/media/upload` · `GET /api/v1/media/:id/status`

---

## Overview

The media pipeline accepts image and video files from authenticated clients, stores them to disk, persists metadata to PostgreSQL, and then asynchronously processes them via background workers. For images, an additional AI post-processing stage runs Ollama vision models to generate descriptions and vector embeddings stored in Qdrant.

```
Client
  │
  ▼
POST /api/v1/media/upload
  │
  ├── is_authenticated (Firebase JWT)
  ├── upload_middleware (Multer — disk storage + validation)
  └── upload_media (controller)
        │
        ├── [video only] probe_video → extract_video_metadata
        ├── INSERT media_items (processing_status = 'uploaded')
        └── enqueue_processing
              │
              ├── [image] → image_queue (BullMQ) → image_worker
              │                                         │
              │                                         ├── sharp: thumbnail (800px webp)
              │                                         ├── sharp: placeholder (20px webp)
              │                                         ├── UPDATE media_items (status = 'completed')
              │                                         └── genererate_image_embedding
              │                                               ├── process_ai_for_media (Ollama qwen3-vl:2b)
              │                                               └── process_embedding_for_media (Ollama nomic-embed-text → Qdrant)
              │
              └── [video] → video_queue (BullMQ) → video_worker
                                                        ├── ffprobe: get rotation
                                                        ├── ffmpeg: screenshot at 5% (thumb.jpg)
                                                        ├── ffmpeg: HLS transcode (360p / 720p / 1080p)
                                                        └── UPDATE media_items (status = 'completed')
```

---

## Layer-by-Layer Breakdown

### 1. App Bootstrap — `src/app.ts`

**What it does:**

- Sets the absolute paths for `ffmpeg.exe` and `ffprobe.exe` so `fluent-ffmpeg` can locate them on Windows.
- Creates the full directory tree under `STORAGE_ROOT` before any request arrives.
- Runs database migrations (`run_migrations`) and ensures the Qdrant collection exists (`setup_qdrant_collections`).
- Imports `image-worker` and `video-worker` — this side-effectful import is what registers the BullMQ worker listeners in the same process.
- Mounts `upload_routes` at `/api/v1/media`.

**Why we need it here:** Workers must be registered in the process that also starts the HTTP server. By importing the worker files, BullMQ starts polling Redis and is ready to process jobs the moment the server goes up.

---

### 2. Route Definition — `src/routes/upload.ts`

```
POST /upload  → is_authenticated → upload_middleware.single("file") → upload_media
GET  /:id/status                                                     → get_media_status
```

**Why two endpoints:**

- `POST /upload` starts the pipeline (async — responds with 202).
- `GET /:id/status` lets the client poll until `processing_status` becomes `completed` or `failed`. This decouples slow processing (HLS transcode can take minutes) from the HTTP response.

---

### 3. Authentication Middleware — `src/middlewere/authentication.ts` · `is_authenticated`

**What it does:**

1. Reads the `Authorization: Bearer <token>` header.
2. Calls `firebase_auth.verifyIdToken(token)` — validates the JWT signature against Firebase's public keys.
3. Looks up the user in PostgreSQL by `uid`. If they don't exist (first login), inserts a new row via `ON CONFLICT DO UPDATE` (upsert).
4. Attaches the user record to `req.user` for downstream handlers.

**Why Firebase:** The project migrated from Clerk to Firebase for authentication. Firebase ID tokens are short-lived JWTs that the client refreshes automatically — the server never stores passwords.

**Why upsert on first login:** Avoids a separate registration step. The first valid token implicitly creates the user.

---

### 4. Multer Middleware — `src/middlewere/multer.ts` · `upload_middleware`

**What it does:**

- **Storage** (`multer.diskStorage`): Determines the destination folder and generates a unique filename.
  - Images go to `{STORAGE_ROOT}/images/originals/`
  - Videos go to `{STORAGE_ROOT}/videos/originals/`
  - Filename is a `uuidv4()` + original extension (e.g., `a1b2c3d4.jpg`). UUID prevents collisions and avoids exposing user-provided names to the filesystem.
- **File size limit:** `MAX_FILE_SIZE = 500 MB`. Multer rejects the upload before the file is fully buffered in memory.
- **MIME filter:** Accepts only `image/jpeg`, `image/png`, `image/heic`, `image/webp`, `video/mp4`, `video/quicktime`. Any other MIME type triggers a `MulterError("LIMIT_UNEXPECTED_FILE")` which is handled before the controller runs.

**Why disk storage instead of memory storage:** Videos can be hundreds of megabytes. Keeping them in memory would exhaust the heap. Writing directly to disk lets the worker pick them up later by file path without re-reading from the request.

**Why uuid filenames:** Prevents path traversal, filename collisions between users, and leaking original metadata.

---

### 5. Upload Controller — `src/controllers/media/upload-media.ts` · `upload_media`

This is the orchestration point. It runs synchronously up to the DB insert, then hands off to the queue.

#### Step-by-step:

**a) File presence check**

```ts
if (!file) { error(res, "No file provided", 400); return; }
```

Guards against the middleware allowing the request through with no file.

**b) Auth check**

```ts
const user_id = req.user?.id;
if (!user_id) { remove_file(file.path); ... }
```

Even though `is_authenticated` already ran, this is a safety net. If `req.user` is somehow absent, the file is deleted immediately to avoid orphaned files on disk.

**c) Media type detection — `is_image`**

```ts
const media_type = is_image(file.mimetype as TImageMimeTypes) ? "image" : "video";
```

`is_image` checks if the MIME is in the `IMAGE_MIMETYPES` constant. Simple lookup — no file inspection needed because Multer already validated the MIME.

**d) Video metadata probe (video only)**

```ts
const probe_data = await probe_video(file.path);
const metadata = extract_video_metadata({ probe_data });
```

- `probe_video` wraps `ffprobe` in a Promise so it can be awaited.
- `extract_video_metadata` walks the FFprobe stream list to find the first video stream and extracts: `width`, `height`, `codec_name`, `duration`, and `rotation` (checked in both `tags.rotate` and `side_data_list`).
- **Why extract rotation at upload time:** Mobile phones record videos in portrait but embed a rotation flag rather than physically rotating the pixels. Capturing this now lets the worker apply the correct `transpose` filter during transcode.
- **Duration gate:** If `duration_secs > MAX_VIDEO_DURATION` (3 hours), the file is deleted and the request is rejected. This prevents runaway transcodes.

**e) DB insert**

```sql
INSERT INTO media_items (
  "user", file_path, file_name, mime_type, media_type,
  file_size, width, height, duration_secs, rotation,
  codec, processing_status
) VALUES (..., 'uploaded')
RETURNING *
```

`processing_status = 'uploaded'` is the initial state. The returned row gives us the generated UUID `id` which becomes the job payload and the file identifier for all subsequent steps.

**f) Enqueue**

```ts
await enqueue_processing({ media_id: row.id, file_path, mime_type, media_type });
```

Jobs are added to BullMQ and control returns immediately. The response is `202 Accepted` — the client knows the file was received but processing is not done.

**g) Error cleanup**

```ts
} catch (err) {
  remove_file(file.path);
  ...
}
```

If the DB insert or enqueue throws, the file on disk is deleted to avoid orphaned storage.

---

### 6. Queue Layer — `src/queues/image-queue.ts` · `src/queues/video-queue.ts`

Both queues are `bullmq.Queue` instances backed by Redis:

| Queue name | Job name | Worker concurrency |
|---|---|---|
| `image-processing` | `process-image` | 5 |
| `video-processing` | `process-video` | 2 |

**Why separate queues:** Images process fast (< 1 second with sharp). Videos take minutes (FFmpeg transcode). Separate queues allow independent concurrency tuning — 5 images can be processed simultaneously without blocking a video slot.

**Why BullMQ / Redis:**
- Jobs survive server restarts (Redis persistence).
- Automatic retries: `attempts: 3, backoff: { type: "exponential", delay: 3000 }` — if a worker throws, BullMQ waits 3 s, then 9 s, then 27 s before marking the job failed.
- Decouples the HTTP server from the CPU-intensive work.

**`enqueue_processing` — `src/utils/functions.ts`**

Routes to the correct queue based on `media_type`. Job options (attempts + backoff) are defined here in one place so both queues use identical retry semantics.

---

### 7. Image Worker — `src/workers/image-worker.ts`

Concurrency: **5** (up to 5 images processed simultaneously).

#### Step-by-step:

**a) Status → `'processing'`**

```sql
UPDATE media_items SET processing_status = 'processing' WHERE id = ${media_id}
```

Marks the record so the client's poll can see progress.

**b) HEIC conversion**

```ts
if (mime_type === "image/heic") {
  const heic_convert = (await import("heic-convert")).default;
  const jpeg_buffer = await heic_convert({ buffer, format: "JPEG", quality: 1 });
  image = sharp(jpeg_buffer as Buffer);
}
```

HEIC (Apple's image format) is not natively supported by `sharp`. `heic-convert` decodes it to a raw JPEG buffer first, which `sharp` can then process. The dynamic `import()` avoids paying the load cost on every request — it's loaded only when a HEIC file actually arrives.

**c) Auto-rotation**

```ts
image = image.rotate();
```

`sharp.rotate()` with no argument reads the EXIF `Orientation` tag and physically rotates the pixels, then strips the tag. Without this, portrait photos taken on phones appear sideways.

**d) Thumbnail generation**

```ts
await image.clone().resize({ width: 800 }).webp({ quality: 80 }).toFile(thumbnail_path);
```

- **800px wide** — enough for gallery grids on any device, keeps file size manageable.
- **WebP at quality 80** — WebP at q80 is roughly equivalent to JPEG at q90 but ~25% smaller.
- Path: `{STORAGE_ROOT}/images/thumbnails/{media_id}.webp`
- `image.clone()` — sharp pipelines are stateful. Cloning lets the same decoded image produce two outputs without re-reading the file.

**e) Placeholder generation**

```ts
await image.clone().resize({ width: 20 }).webp({ quality: 20 }).toFile(placeholder_path);
```

- **20px wide, q20** — produces a tiny (~100 byte) blurred image.
- Used for LQIP (Low Quality Image Placeholder) — the client shows this blurred version instantly while the full thumbnail loads.
- Path: `{STORAGE_ROOT}/images/placeholders/{media_id}-placeholder.webp`

**f) Status → `'completed'`**

```sql
UPDATE media_items
SET processing_status = 'completed',
    thumbnail_path = ${thumbnail_path},
    placeholder_path = ${placeholder_path}
WHERE id = ${media_id}
```

Stores the generated file paths alongside the status so the client can construct static URLs.

**g) AI post-processing**

```ts
await genererate_image_embedding({ media_id, file_path, media_type: "image" });
```

Runs after the `try/catch` block, so an AI failure does **not** flip `processing_status` to `'failed'`. The media is already usable (thumbnail + placeholder exist). AI enrichment is best-effort.

**h) Failure path**

```sql
UPDATE media_items SET processing_status = 'failed', error_message = ${error_message}
WHERE id = ${media_id}
```

BullMQ re-throws the error after updating the DB, which triggers the retry logic.

---

### 8. Video Worker — `src/workers/video-worker.ts`

Concurrency: **2** (FFmpeg is CPU-intensive; more than 2–3 concurrent transcodes would saturate the server).

#### Helper functions:

| Function | Purpose |
|---|---|
| `probe_video` | Same ffprobe wrapper as in `src/utils/video.ts` — resolves FFprobe data as a Promise |
| `get_rotation` | Reads `tags.rotate` or `side_data_list[].rotation` from the video stream |
| `get_rotation_filter` | Maps rotation degrees to FFmpeg `transpose` filter strings (90° → `transpose=1`, 180° → `hflip,vflip`, 270° → `transpose=2`) |
| `build_scale_filter` | Chains rotation filter + scale filter if rotation is needed, or returns just the scale filter |
| `run_ffmpeg_screenshots` | Captures a single frame at 5% of duration as `thumb.jpg` at 400px wide |
| `run_hls_transcode` | Main transcode — produces multi-bitrate HLS output |

#### Step-by-step:

**a) Status → `'processing'`** — same pattern as image worker.

**b) Re-probe for rotation**

The upload controller already probed and stored rotation in the DB. The worker re-probes because the job payload only includes `media_id`, `file_path`, and `mime_type` — keeping jobs lightweight.

**c) Directory creation**

```ts
fs.mkdirSync(path.join(output_dir, "v0"), { recursive: true });  // 360p
fs.mkdirSync(path.join(output_dir, "v1"), { recursive: true });  // 720p
fs.mkdirSync(path.join(output_dir, "v2"), { recursive: true });  // 1080p
```

HLS output is per-media-id, subdivided into variant streams `v0`, `v1`, `v2`.

**d) Thumbnail screenshot — `run_ffmpeg_screenshots`**

```ts
ffmpeg(file_path).screenshots({ timestamps: ["5%"], filename: "thumb.jpg", size: "400x?" })
```

`5%` is chosen over `00:00:01` because very short videos may not have a useful frame at 1 second. `400x?` preserves aspect ratio.

**e) HLS multi-bitrate transcode — `run_hls_transcode`**

This is the most complex step. FFmpeg produces three adaptive bitrate variants in a single pass:

| Variant | Resolution | Video bitrate | Audio bitrate |
|---|---|---|---|
| v0 | 640×360 | 800 kbps | 96 kbps |
| v1 | 1280×720 | 2800 kbps | 128 kbps |
| v2 | 1920×1080 | 5000 kbps | 192 kbps |

Key FFmpeg options:

- **`-filter_complex`**: Applies rotation + scale to each variant from a single input decode. This is more efficient than running FFmpeg three times.
- **`-map 0:a?`**: The `?` makes audio optional — files without audio tracks still process correctly.
- **`-c:v libx264`**: H.264 codec, universally supported by browsers and mobile players.
- **`-c:a aac`**: AAC audio, the standard for HLS.
- **`-hls_time 6`**: 6-second segments. This is the HLS industry standard — short enough for fast startup, long enough to avoid excessive segment requests.
- **`-hls_playlist_type vod`**: Marks the playlist as complete (vs. live). Enables seeking without waiting for segments.
- **`-hls_flags independent_segments`**: Each segment is independently decodable — required for mid-stream quality switching.
- **`-master_pl_name master.m3u8`**: Creates a master playlist that references all three variant playlists. The client (e.g., HLS.js) reads `master.m3u8` and switches variants based on bandwidth.
- **`-var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2"`**: Tells FFmpeg how to pair video and audio streams into variants.

Output structure:
```
{STORAGE_ROOT}/videos/hls/{media_id}/
  ├── master.m3u8        ← client starts here
  ├── thumb.jpg          ← video poster image
  ├── v0/
  │   ├── stream.m3u8    ← 360p playlist
  │   └── seg0.ts, seg1.ts, ...
  ├── v1/
  │   ├── stream.m3u8    ← 720p playlist
  │   └── seg0.ts, ...
  └── v2/
      ├── stream.m3u8    ← 1080p playlist
      └── seg0.ts, ...
```

**f) Status → `'completed'`** — stores `hls_dir` and `video_thumb_path`.

**Note:** The video worker does **not** call AI post-processing. The `process_ai_for_media` service only has a handler for `media_type === 'image'` — video AI enrichment is not yet implemented.

---

### 9. AI Post-Processing — `src/services/post-process-media-ai.ts` · `genererate_image_embedding`

This runs inline after the image worker's `try/catch`, isolated from the main `processing_status` lifecycle.

**a) Idempotent `media_ai_data` row**

```sql
INSERT INTO media_ai_data (media, media_type)
VALUES (${media_id}, ${media_type})
ON CONFLICT (media) DO NOTHING
```

The `UNIQUE` constraint on `media` ensures exactly one AI record per media item. Re-runs (e.g., from the cron) don't create duplicates.

**b) AI description + tag extraction — `process_ai_for_media` → `handle_process_image_for_media`**

```ts
const file_buffer = await Bun.file(media.file_path).arrayBuffer();
const base64 = Buffer.from(file_buffer).toString("base64");

const generated_text = await ollama.generate({
  model: MODELS.QWEN3_VL_2B,   // "qwen3-vl:2b"
  prompt: IMAGE_EXTRACT_PROMPT,
  images: [base64],
  think: false,
});
```

- **Why `Bun.file().arrayBuffer()`:** Bun's native file API is faster than Node's `fs.readFile` for this use case. The entire image is read into memory here because the Ollama API requires base64-encoded images.
- **Why `qwen3-vl:2b`:** A small (2B parameter) vision-language model that runs locally via Ollama. It accepts the image and a structured prompt, returning JSON with `desc` and `tags`.
- **`think: false`:** Disables chain-of-thought reasoning to reduce latency and token usage — we only need the structured output.

The prompt (`IMAGE_EXTRACT_PROMPT`) instructs the model to output raw JSON without markdown code fences, and specifies the exact schema `{ desc, tags }`.

```ts
const pg_tags = `{${tags.map((t) => `"${t.replace(...)}"`).join(",")}}`;
await sql`UPDATE media_ai_data SET description = ..., tags = ${pg_tags}::text[], status = 'completed' ...`
```

PostgreSQL arrays can't be sent as JSON arrays via parameterized queries in `bun:sql`, so the tags are manually serialized into the PostgreSQL text array literal format `{"tag1","tag2"}` before being cast with `::text[]`.

**c) Embedding generation — `process_embedding_for_media` → `handle_process_embedding_for_media`**

```ts
const embedding = await ollama.embed({
  model: MODELS.NOMIC_EMBED_TEXT,   // "nomic-embed-text"
  input: media.description ?? "",
});

await qdrant.upsert(QDRANT_COLLECTIONS.MEDIA_EMBEDDINGS, {
  points: [{ id: media.id, vector, payload: { description, tags, media_type } }]
});
```

- **Why `nomic-embed-text`:** A dedicated embedding model (768-dimension vectors) that converts text into a semantic vector. It runs locally via Ollama — no external API calls.
- **Why embed the description, not the raw image:** The description is already extracted and human-readable text. Embedding text is faster and produces higher-quality semantic vectors than image embeddings for search purposes.
- **Why Qdrant:** A vector database purpose-built for similarity search. Storing embeddings here enables semantic search queries like "find all photos of sunsets" without full-text search.
- **Cosine distance:** Configured at collection creation (`setup_qdrant_collections`). Cosine similarity is standard for text embeddings because it's invariant to vector magnitude.
- **Guard:** Embedding only runs if the AI step completed (`status = 'completed'`). A failed description means there's nothing meaningful to embed.

---

### 10. Status Controller — `src/controllers/media/get-media-status.ts` · `get_media_status`

```ts
GET /api/v1/media/:id/status
```

Simple SELECT by UUID. Returns the full `media_items` row including `processing_status`, `thumbnail_path`, `placeholder_path`, `hls_dir`, and `error_message`.

**Why no auth guard here:** Status polling should be lightweight. The UUID is unguessable (v4 UUID = 122 bits of entropy), so knowing the ID is equivalent to authorization for read access.

---

### 11. Cron Jobs — `src/crons/index.ts` · `src/crons/ai-processing.ts` · `src/crons/embedding.ts`

Both crons are registered in `initCrons` via `node-cron`:

```ts
cron.schedule("*/2 * * * *", runAiCron);
cron.schedule("*/2 * * * *", () => setTimeout(runEmbeddingCron, 30_000));
```

Both fire every **2 minutes**, but the embedding cron is intentionally delayed by **30 seconds** inside `setTimeout`. This stagger prevents both crons from hitting the database at the exact same moment and competing for the same rows.

---

#### `runAiCron` — AI description + tag extraction retry

```sql
SELECT mi.id, mi.file_path, mi.media_type
FROM media_items mi
LEFT JOIN media_ai_data mad ON mad.media = mi.id
WHERE mi.processing_status = 'queued'
  AND (mad.id IS NULL OR (mad.status = 'failed' AND mad.attempts < MAX_AI_ATTEMPTS))
LIMIT CRON_BATCH_SIZE
```

Picks up items where:
- No `media_ai_data` row exists yet (AI never ran), **or**
- AI previously failed and `attempts < 3`

**Why have a cron if the worker already calls AI?** The worker calls AI inline after image processing. If the Ollama service is down at that moment, the AI step silently fails and the image is still marked `completed`. The cron catches these cases and retries on a schedule.

---

#### `runEmbeddingCron` — Qdrant embedding retry

```sql
SELECT mad.id, mad.description, mad.tags, mad.media_type
FROM media_ai_data mad
WHERE mad.status = 'completed'
  AND mad.embedding_status IN ('pending', 'failed')
  AND mad.embedding_attempts < MAX_EMBEDDING_ATTEMPTS
LIMIT CRON_BATCH_SIZE
```

Picks up AI records where:
- AI description is `completed` (there's something to embed), **and**
- The Qdrant upsert never ran (`pending`) or previously failed (`failed`), **and**
- `embedding_attempts < 3`

**Why a separate embedding cron?** The AI step and the embedding step can fail independently. The AI cron only retries Ollama vision calls. The embedding cron only retries Qdrant upserts. Separating them means a Qdrant outage doesn't cause unnecessary re-runs of the expensive vision model.

---

### 12. Standalone AI Route — `POST /api/v1/ai-process/image`

This is a **separate, synchronous endpoint** unrelated to the upload pipeline. It is registered in `src/routes/ai-process.ts` and mounted at `/api/v1/ai-process`.

```
POST /api/v1/ai-process/image
  ├── is_authenticated (Firebase JWT)
  ├── multer({ storage: memoryStorage() }).single("image")
  └── handle_process_image
        ├── base64-encode req.file.buffer
        ├── ollama.generate({ model: qwen3-vl:2b, images: [base64] })
        └── success(res, "Image processed", { desc, tags })   ← 200 synchronous
```

**What it does:** Accepts an image file, runs the same Ollama vision model (`qwen3-vl:2b`) with the same `IMAGE_EXTRACT_PROMPT`, and returns the `{ desc, tags }` JSON **immediately in the response** — no DB writes, no queues, no async.

**Key differences from the upload pipeline:**

| Aspect | Upload pipeline | AI-process route |
|---|---|---|
| Storage | Disk (`multer.diskStorage`) | Memory (`multer.memoryStorage`) |
| Response | `202 Accepted` (async) | `200 OK` (synchronous) |
| DB writes | Yes — `media_items`, `media_ai_data` | None |
| Queues | Yes — BullMQ | None |
| Purpose | Persist + process user's media library | One-shot AI analysis of any image |

**Why memory storage here:** The file is not saved anywhere — it's used immediately for the Ollama call and then discarded. There's no downstream worker that needs to read it from disk.

**Why this endpoint exists:** Useful for clients that want to extract a description or tags from an image on-the-fly (e.g., before deciding whether to upload it, or for UI previews) without committing it to the media library.

---

## Data Models

### `media_items` table

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key, used as job ID and file identifier |
| `user` | `text` | FK → `users.id` |
| `file_path` | `text` | Absolute path to the original file on disk |
| `file_name` | `text` | Original client filename |
| `mime_type` | `text` | Validated MIME type |
| `media_type` | `enum` | `'image'` or `'video'` |
| `file_size` | `bigint` | Bytes |
| `width` / `height` | `int` | Pixel dimensions |
| `duration_secs` | `float` | Video duration (null for images) |
| `rotation` | `int` | Degrees from metadata (0/90/180/270) |
| `codec` | `text` | Video codec name (e.g., `h264`) |
| `processing_status` | `enum` | `uploaded → processing → completed/failed` |
| `thumbnail_path` | `text` | Path to 800px WebP thumbnail |
| `placeholder_path` | `text` | Path to 20px LQIP WebP |
| `hls_dir` | `text` | Root HLS directory for video |
| `video_thumb_path` | `text` | Path to video poster JPG |
| `error_message` | `text` | Set on failure |

### `media_ai_data` table

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `media` | `uuid` | FK → `media_items.id` (unique) |
| `description` | `text` | AI-generated description |
| `tags` | `text[]` | AI-extracted tags |
| `status` | `enum` | AI extraction status (`pending/processing/completed/failed`) |
| `attempts` | `int` | Number of AI extraction attempts |
| `embedding_status` | `enum` | Qdrant upsert status |
| `embedding_attempts` | `int` | Number of embedding attempts |

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **202 Accepted response** | Processing can take seconds (image) to minutes (video). A synchronous response would time out clients. |
| **BullMQ + Redis** | Durable job queue survives server restarts. Exponential backoff retries transient failures automatically. |
| **Separate image/video queues** | Different concurrency needs — 5 fast image jobs vs. 2 slow video transcodes. |
| **LQIP placeholders** | 20px WebP blurs load near-instantly and give users immediate visual feedback while the real thumbnail loads. |
| **Multi-bitrate HLS** | Adaptive streaming — the player picks 360p on slow connections, 1080p on fast ones. No client buffering on quality switches. |
| **Rotation correction** | Mobile photos/videos embed rotation in metadata rather than pixels. Without correction, content appears sideways. |
| **Local Ollama models** | No external API costs, no data leaving the server, no rate limits. Trades latency for privacy and cost. |
| **AI failures non-fatal** | Images are immediately usable after thumbnail generation. AI enrichment enhances search but isn't required for the media to be viewable. |
| **Qdrant for embeddings** | Enables semantic/similarity search at scale. A SQL `LIKE` query can't find "beach sunset" if the user searches "ocean at dusk". |
