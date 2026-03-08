import type { Request, Response } from 'express';

import { sql } from '@/db/postgresql';
import { success, error } from '@/types/response';
import type { TMediaItem } from '@/types/schemas/media-item';
import { enqueue_processing, remove_file } from '@/utils/functions';
import { is_image } from '@/utils/media';
import { probe_video, extract_video_metadata } from '@/utils/video';
import { MAX_VIDEO_DURATION, TAllowedMimeTypes, type TImageMimeTypes } from '@/constants/common';

export const upload_media = async (req: Request, res: Response): Promise<void> => {
  const file = req.file;
  if (!file) {
    error(res, 'No file provided', 400);
    return;
  }

  try {
    const device_asset_id: string | null = req.body?.device_asset_id ?? null;
    const aperture: number | null = req.body?.aperture != null ? parseFloat(req.body.aperture) : null;
    const iso: number | null = req.body?.iso != null ? parseInt(req.body.iso, 10) : null;
    const shutter_speed: number | null = req.body?.shutter_speed != null ? parseFloat(req.body.shutter_speed) : null;
    const focal_length: number | null = req.body?.focal_length != null ? parseFloat(req.body.focal_length) : null;
    const device_make: string | null = req.body?.device_make ?? null;
    const device_model: string | null = req.body?.device_model ?? null;

    if (device_asset_id) {
      const [existing] = await sql<{ id: string }[]>`
        SELECT id FROM media_items
        WHERE device_asset_id = ${device_asset_id}
        LIMIT 1
      `;

      if (existing) {
        remove_file(file.path);
        success(res, 'Already synced', { media_id: existing.id }, 200);
        return;
      }
    }

    const media_type = is_image(file.mimetype as TImageMimeTypes) ? 'image' : 'video';

    let width: number | null = null;
    let height: number | null = null;
    let duration_secs: number | null = null;
    let codec: string | null = null;
    let rotation: number | null = null;

    if (media_type === 'video') {
      const probe_data = await probe_video(file.path);
      const metadata = extract_video_metadata({ probe_data });

      width = metadata.width;
      height = metadata.height;
      duration_secs = metadata.duration_secs;
      codec = metadata.codec;
      rotation = metadata.rotation;

      if (duration_secs !== null && duration_secs > MAX_VIDEO_DURATION) {
        remove_file(file.path);
        error(res, `Video duration exceeds maximum of ${MAX_VIDEO_DURATION} seconds`, 400);
        return;
      }
    }

    const [row] = await sql<TMediaItem[]>`
      INSERT INTO media_items (
        file_path, file_name, mime_type, media_type,
        file_size, width, height, duration_secs, rotation,
        codec, processing_status, device_asset_id,
        aperture, iso, shutter_speed, focal_length, device_make, device_model
      ) VALUES (
        ${file.path}, ${file.originalname}, ${file.mimetype},
        ${media_type}, ${file.size}, ${width}, ${height},
        ${duration_secs}, ${rotation}, ${codec}, 'unprocessed',
        ${device_asset_id},
        ${aperture}, ${iso}, ${shutter_speed}, ${focal_length}, ${device_make}, ${device_model}
      )
      RETURNING *
    `;

    await enqueue_processing({
      media_id: row.id,
      file_path: file.path,
      mime_type: file.mimetype as TAllowedMimeTypes,
      media_type,
    });

    success(res, 'Upload accepted for processing', { media_id: row.id }, 202);
  } catch (err) {
    remove_file(file.path);
    console.error('Upload error:', err);
    error(res, 'Internal server error', 500);
  }
};
