import { MODELS } from "@/constants/models";
import { ollama } from "@/db/ollama";
import { qdrant, QDRANT_COLLECTIONS } from "@/db/quadrant";
import { TMediaAiData } from "@/types/schemas/media-ai-data";
import { sql } from "bun";

export const process_embedding_for_media = async ({
  media,
}: {
  media: Pick<TMediaAiData, "id" | "description" | "tags" | "media_type">;
}) => {
  if (media.media_type === "image") {
    await handle_process_embedding_for_media({ media });
  }
};

const handle_process_embedding_for_media = async ({
  media,
}: {
  media: Pick<TMediaAiData, "id" | "description" | "tags" | "media_type">;
}) => {
  try {
    await sql`UPDATE media_ai_data SET embedding_status = 'processing' WHERE id = ${media.id}`;

    const embedding = await ollama.embed({
      model: MODELS.NOMIC_EMBED_TEXT,
      input: media.description ?? "",
    });

    const vector = embedding.embeddings[0];

    await qdrant.upsert(QDRANT_COLLECTIONS.MEDIA_EMBEDDINGS, {
      points: [
        {
          id: media.id,
          vector,
          payload: {
            description: media.description,
            tags: media.tags,
            media_type: media.media_type,
          },
        },
      ],
    });

    await sql`UPDATE media_ai_data SET embedding_status = 'completed', embedding_completed_at = now() WHERE id = ${media.id}`;
  } catch (error) {
    console.error(error);
    await sql`UPDATE media_ai_data SET embedding_status = 'failed', error = ${error instanceof Error ? error.message : "Unknown error"}, embedding_attempts = embedding_attempts + 1 WHERE id = ${media.id}`;
  }
};
