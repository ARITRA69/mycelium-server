import type { Request, Response } from 'express';

import { sql } from '@/db/postgresql';
import { success, error } from '@/types/response';

export const get_synced_asset_ids = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await sql<{ device_asset_id: string }[]>`
      SELECT device_asset_id
      FROM media_items
      WHERE device_asset_id IS NOT NULL
        AND deleted_at IS NULL
    `;

    success(res, 'Synced asset IDs fetched', { ids: rows.map((r) => r.device_asset_id) });
  } catch (err) {
    console.error('get_synced_asset_ids error:', err);
    error(res, 'Internal server error', 500);
  }
};
