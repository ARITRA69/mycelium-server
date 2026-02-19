import { CRON_BATCH_SIZE, MAX_EMBEDDING_ATTEMPTS } from "@/constants/common";
import { process_embedding_for_media } from "@/services/process-embedding-for-media";
import { sql } from "bun";

export const runEmbeddingCron = async () => {
  const batch = await sql`
    SELECT mad.id, mad.description, mad.tags, mad.media_type
    FROM media_ai_data mad
    WHERE mad.status = 'completed'
      AND mad.embedding_status IN ('pending', 'failed')
      AND mad.embedding_attempts < ${MAX_EMBEDDING_ATTEMPTS}
    LIMIT ${CRON_BATCH_SIZE}
  `;

  for (const item of batch) {
    await process_embedding_for_media({
      media: {
        id: item.id,
        description: item.description,
        tags: item.tags,
        media_type: item.media_type,
      },
    });
  }
};
