import { CRON_BATCH_SIZE, MAX_AI_ATTEMPTS } from "@/constants/common";
import { process_ai_for_media } from "@/services/process-ai-for-media";
import { sql } from "bun";

export const runAiCron = async () => {
  const batch = await sql`
    SELECT mi.id, mi.file_path, mi.media_type
    FROM media_items mi
    LEFT JOIN media_ai_data mad ON mad.media = mi.id
    WHERE mi.processing_status = 'queued'
      AND (mad.id IS NULL OR (mad.status = 'failed' AND mad.attempts < ${MAX_AI_ATTEMPTS}))
    LIMIT ${CRON_BATCH_SIZE}
  `;

  for (const item of batch) {
    await process_ai_for_media({
      media: {
        id: item.id,
        file_path: item.file_path,
        media_type: item.media_type,
      },
    });
  }
};
