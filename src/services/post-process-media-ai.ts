import { sql } from "@/db/postgresql";
import { process_ai_for_media } from "@/services/process-ai-for-media";
import { process_embedding_for_media } from "@/services/process-embedding-for-media";
import type { MediaType } from "@/constants/common";
import type { TMediaAiData } from "@/types/schemas/media-ai-data";

type TPostProcessMediaAiParams = {
  media_id: string;
  file_path: string;
  media_type: MediaType;
};

export async function genererate_image_embedding({
  media_id,
  file_path,
  media_type,
}: TPostProcessMediaAiParams): Promise<void> {
  try {
    // Ensure a media_ai_data record exists (idempotent via UNIQUE constraint on media)
    await sql`
      INSERT INTO media_ai_data (media, media_type)
      VALUES (${media_id}, ${media_type})
      ON CONFLICT (media) DO NOTHING
    `;

    // Run AI description + tag extraction via Ollama
    await process_ai_for_media({
      media: { id: media_id, file_path, media_type },
    });

    // Fetch the AI result — only proceed to embedding if AI succeeded
    const [ai_record] = await sql<
      Pick<TMediaAiData, "id" | "description" | "tags" | "media_type">[]
    >`
      SELECT id, description, tags, media_type
      FROM media_ai_data
      WHERE media = ${media_id} AND status = 'completed'
    `;

    if (!ai_record) {
      return;
    }

    // Generate embedding and upsert to Qdrant
    await process_embedding_for_media({ media: ai_record });
  } catch (error) {
    console.error(
      `AI post-processing failed for media ${media_id}:`,
      error instanceof Error ? error.message : error
    );
  }
}
