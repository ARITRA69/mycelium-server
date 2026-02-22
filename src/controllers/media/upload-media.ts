import type { Request, Response } from "express";
import { sql } from "@/db/postgresql";
import { success, error } from "@/types/response";
import type { TMediaItem } from "@/types/schemas/media-item";
import { enqueue_processing, remove_file } from "@/utils/fucntions";
import { is_image } from "@/utils/media";
import { probe_video, extract_video_metadata } from "@/utils/video";
import { MAX_VIDEO_DURATION, type TImageMimeTypes } from "@/constants/common";

export async function upload_media(
  req: Request,
  res: Response
): Promise<void> {
  const file = req.file;
  if (!file) {
    error(res, "No file provided", 400);
    return;
  }

  try {
    const user_id = req.user?.id || "test_user_Abhishek";
    if (!user_id) {
      remove_file(file.path);
      error(res, "Unauthorized", 401);
      return;
    }

    const media_type = is_image(file.mimetype as TImageMimeTypes)
      ? "image"
      : "video";

    let width: number | null = null;
    let height: number | null = null;
    let duration_secs: number | null = null;
    let codec: string | null = null;
    let rotation: number | null = null;

    if (media_type === "video") {
      const probe_data = await probe_video(file.path);
      const metadata = extract_video_metadata({ probe_data });

      width = metadata.width;
      height = metadata.height;
      duration_secs = metadata.duration_secs;
      codec = metadata.codec;
      rotation = metadata.rotation;

      if (duration_secs !== null && duration_secs > MAX_VIDEO_DURATION) {
        remove_file(file.path);
        error(
          res,
          `Video duration exceeds maximum of ${MAX_VIDEO_DURATION} seconds`,
          400
        );
        return;
      }
    }

    const [row] = await sql<TMediaItem[]>`
    INSERT INTO media_items (
      "user", file_path, file_name, mime_type, media_type,
      file_size, width, height, duration_secs, rotation,
      codec, processing_status
    ) VALUES (
      ${user_id}, ${file.path}, ${file.originalname}, ${file.mimetype},
      ${media_type}, ${file.size}, ${width}, ${height},
      ${duration_secs}, ${rotation}, ${codec}, 'uploaded'
    )
    RETURNING *
  `;

    await enqueue_processing({
      media_id: row.id,
      file_path: file.path,
      mime_type: file.mimetype,
      media_type,
    });

    success(res, "Upload accepted for processing", { media_id: row.id }, 202);
  } catch (err) {
    remove_file(file.path);
    console.error("Upload error:", err);
    error(res, "Internal server error", 500);
  }
}

