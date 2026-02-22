import { Worker } from "bullmq";
import sharp from "sharp";
import path from "path";
import { sql } from "@/db/postgresql";
import { env } from "@/constants/env";
import { STORAGE_ROOT } from "@/constants/common";
import type { ImageJobData } from "@/types/schemas/media-job";

const image_worker = new Worker<ImageJobData>(
  "image-processing",
  async (job) => {
    const { media_id, file_path, mime_type } = job.data;

    try {
      await sql`
        UPDATE media_items SET processing_status = 'processing'
        WHERE id = ${media_id}
      `;

      let image: sharp.Sharp;

      if (mime_type === "image/heic") {
        // @ts-expect-error heic-convert has no type declarations
        const heic_convert = (await import("heic-convert")).default;
        const input_buffer = await Bun.file(file_path).arrayBuffer();
        const jpeg_buffer = await heic_convert({
          buffer: Buffer.from(input_buffer),
          format: "JPEG",
          quality: 1,
        });
        image = sharp(jpeg_buffer as Buffer);
      } else {
        image = sharp(file_path);
      }

      image = image.rotate();

      const thumbnail_path = path.join(
        STORAGE_ROOT,
        "images",
        "thumbnails",
        `${media_id}.webp`
      );

      const placeholder_path = path.join(
        STORAGE_ROOT,
        "images",
        "placeholders",
        `${media_id}-placeholder.webp`
      );

      await image
        .clone()
        .resize({ width: 800 })
        .webp({ quality: 80 })
        .toFile(thumbnail_path);

      await image
        .clone()
        .resize({ width: 20 })
        .webp({ quality: 20 })
        .toFile(placeholder_path);

      await sql`
        UPDATE media_items
        SET processing_status = 'completed',
            thumbnail_path = ${thumbnail_path},
            placeholder_path = ${placeholder_path}
        WHERE id = ${media_id}
      `;
    } catch (err) {
      const error_message =
        err instanceof Error ? err.message : "Unknown error";
      console.error(`Image processing failed for ${media_id}:`, err);

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
    concurrency: 5,
  }
);

image_worker.on("failed", (job, err) => {
  console.error(`Image job ${job?.id} failed:`, err.message);
});

export default image_worker;
