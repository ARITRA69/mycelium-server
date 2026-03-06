import { sql } from "@/db/postgresql";
import { extract_image_ai_data } from "@/services/ai/extract-image-ai-data";
import type { TMediaItem } from "@/types/schemas/media-item";

export const process_ai_for_media = async ({
  media,
}: {
  media: Pick<TMediaItem, "id" | "file_path" | "media_type">;
}) => {
  if (media.media_type === "image") {
    await handle_process_image_for_media({ media });
  }
};

const handle_process_image_for_media = async ({
  media,
}: {
  media: Pick<TMediaItem, "id" | "file_path" | "media_type">;
}) => {
  try {
    await sql`UPDATE media_ai_data SET status = 'processing' WHERE media = ${media.id}`;

    const file_buffer = await Bun.file(media.file_path).arrayBuffer();
    const base64 = Buffer.from(file_buffer).toString("base64");

    const { desc, tags } = await extract_image_ai_data(base64);

    const pg_tags = `{${tags.map((t) => `"${t.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`;

    await sql`
        UPDATE media_ai_data
        SET description = ${desc},
            tags = ${pg_tags}::text[],
            status = 'completed',
            completed_at = now()
        WHERE media = ${media.id}
    `;
  } catch (error) {
    console.error(error);
    await sql`UPDATE media_ai_data SET status = 'failed', error = ${error instanceof Error ? error.message : "Unknown error"}, attempts = attempts + 1 WHERE media = ${media.id}`;
  }
};
