import { Worker } from "bullmq";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { sql } from "@/db/postgresql";
import { env } from "@/constants/env";
import { STORAGE_ROOT } from "@/constants/common";
import type { VideoJobData } from "@/types/schemas/media-job";

function probe_video(file_path: string): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file_path, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

function get_rotation(probe_data: ffmpeg.FfprobeData): number | null {
  const video_stream = probe_data.streams.find(
    (s) => s.codec_type === "video"
  );
  if (!video_stream) return null;

  const rotate_tag = video_stream.tags?.rotate;
  if (rotate_tag) return parseInt(rotate_tag, 10);

  const side_data = video_stream.side_data_list as
    | Array<{ rotation?: number }>
    | undefined;
  const rotation_entry = side_data?.find((sd) => sd.rotation !== undefined);
  if (rotation_entry?.rotation !== undefined) {
    return Math.abs(rotation_entry.rotation);
  }

  return null;
}

function get_rotation_filter(rotation: number): string | null {
  switch (rotation) {
    case 90:
      return "transpose=1";
    case 180:
      return "hflip,vflip";
    case 270:
      return "transpose=2";
    default:
      return null;
  }
}

function build_scale_filter(
  rotation_filter: string | null,
  scale: string
): string {
  return rotation_filter ? `${rotation_filter},${scale}` : scale;
}

function run_ffmpeg_screenshots(
  file_path: string,
  output_dir: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(file_path)
      .screenshots({
        timestamps: ["5%"],
        filename: "thumb.jpg",
        folder: output_dir,
        size: "400x?",
      })
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err));
  });
}

function run_hls_transcode(
  file_path: string,
  output_dir: string,
  media_id: string,
  rotation: number | null
): Promise<void> {
  return new Promise((resolve, reject) => {
    const rotation_filter = rotation ? get_rotation_filter(rotation) : null;

    const filter_v0 = build_scale_filter(rotation_filter, "scale=640:360");
    const filter_v1 = build_scale_filter(rotation_filter, "scale=1280:720");
    const filter_v2 = build_scale_filter(rotation_filter, "scale=1920:1080");

    const segment_path = path.join(
      STORAGE_ROOT,
      "videos",
      "hls",
      media_id,
      "v%v",
      "seg%d.ts"
    );

    const output_path = path.join(
      STORAGE_ROOT,
      "videos",
      "hls",
      media_id,
      "v%v",
      "stream.m3u8"
    );

    ffmpeg(file_path)
      .outputOptions([
        // Filter complex for 3 video + 3 audio variants
        "-filter_complex",
        [
          `[0:v]${filter_v0}[v0]`,
          `[0:v]${filter_v1}[v1]`,
          `[0:v]${filter_v2}[v2]`,
        ].join(";"),

        // Map video streams
        "-map", "[v0]",
        "-map", "[v1]",
        "-map", "[v2]",
        // Map audio streams
        "-map", "0:a?",
        "-map", "0:a?",
        "-map", "0:a?",

        // Video codec settings per variant
        "-c:v:0", "libx264", "-b:v:0", "800k",
        "-c:v:1", "libx264", "-b:v:1", "2800k",
        "-c:v:2", "libx264", "-b:v:2", "5000k",

        // Audio codec settings per variant
        "-c:a:0", "aac", "-b:a:0", "96k",
        "-c:a:1", "aac", "-b:a:1", "128k",
        "-c:a:2", "aac", "-b:a:2", "192k",

        // HLS options
        "-f", "hls",
        "-hls_time", "6",
        "-hls_playlist_type", "vod",
        "-hls_flags", "independent_segments",
        "-master_pl_name", "master.m3u8",
        "-hls_segment_filename", segment_path,
        "-var_stream_map", "v:0,a:0 v:1,a:1 v:2,a:2",
      ])
      .output(output_path)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}

const video_worker = new Worker<VideoJobData>(
  "video-processing",
  async (job) => {
    const { media_id, file_path } = job.data;

    try {
      await sql`
        UPDATE media_items SET processing_status = 'processing'
        WHERE id = ${media_id}
      `;

      const probe_data = await probe_video(file_path);
      const rotation = get_rotation(probe_data);

      const output_dir = path.join(STORAGE_ROOT, "videos", "hls", media_id);
      fs.mkdirSync(output_dir, { recursive: true });

      // Create variant subdirectories
      fs.mkdirSync(path.join(output_dir, "v0"), { recursive: true });
      fs.mkdirSync(path.join(output_dir, "v1"), { recursive: true });
      fs.mkdirSync(path.join(output_dir, "v2"), { recursive: true });

      // Generate video thumbnail
      await run_ffmpeg_screenshots(file_path, output_dir);

      const video_thumb_path = path.join(output_dir, "thumb.jpg");

      // Run HLS multi-bitrate transcode
      await run_hls_transcode(file_path, output_dir, media_id, rotation);

      const hls_dir = output_dir;

      await sql`
        UPDATE media_items
        SET processing_status = 'completed',
            hls_dir = ${hls_dir},
            video_thumb_path = ${video_thumb_path}
        WHERE id = ${media_id}
      `;
    } catch (err) {
      const error_message =
        err instanceof Error ? err.message : "Unknown error";
      console.error(`Video processing failed for ${media_id}:`, err);

      await sql`
        UPDATE media_items
        SET processing_status = 'failed',
            error_message = ${error_message}
        WHERE id = ${media_id}
      `;

      throw err;
    }
  },
  {
    connection: {
      host: env.redis_host,
      port: env.redis_port,
    },
    concurrency: 2,
  }
);

video_worker.on("failed", (job, err) => {
  console.error(`Video job ${job?.id} failed:`, err.message);
});

export default video_worker;
