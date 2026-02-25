import { MODELS } from "@/constants/models";
import { IMAGE_EXTRACT_PROMPT } from "@/constants/prompts";
import { ollama } from "@/db/ollama";
import type { TMediaItem } from "@/types/schemas/media-item";
import { sql } from "bun";

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

    const generated_text = await ollama.generate({
      model: MODELS.QWEN3_VL_2B,
      prompt: IMAGE_EXTRACT_PROMPT,
      images: [base64],
      think: false,
    });

    const response_in_json = JSON.parse(generated_text.response);
    const tags: string[] = Array.isArray(response_in_json.tags)
      ? response_in_json.tags
      : [];

    // Bun.sql doesn't auto-convert JS arrays to PG array literals,
    // so we build the text[] literal manually: {"val1","val2",...}
    const pg_tags = `{${tags.map((t) => `"${t.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`;

    await sql`
        UPDATE media_ai_data
        SET description = ${response_in_json.desc},
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
