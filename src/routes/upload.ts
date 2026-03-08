import { Router } from 'express';

import { upload_media } from '@/controllers/media/upload-media';
import { get_synced_asset_ids } from '@/controllers/media/get-synced-asset-ids';
import { upload_middleware } from '@/middlewere/multer';
import { get_media_status } from '@/controllers/media/get-media-status';

const router = Router();

/**
 * @openapi
 * /api/v1/media/synced-asset-ids:
 *   get:
 *     summary: Get device asset IDs already synced for the authenticated user
 *     description: |
 *       Returns the list of `device_asset_id` values that are already stored in
 *       `media_items` for this user (not soft-deleted). Use this on the client to
 *       build a skip-set before uploading a batch of local assets, avoiding
 *       redundant re-uploads.
 *     tags: [Media]
 *     responses:
 *       200:
 *         description: Synced asset IDs fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Synced asset IDs fetched
 *                 data:
 *                   type: object
 *                   properties:
 *                     ids:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ['asset-uuid-1', 'asset-uuid-2']
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/synced-asset-ids', get_synced_asset_ids);

/**
 * @openapi
 * /api/v1/media/upload:
 *   post:
 *     summary: Upload a media file
 *     description: |
 *       Saves the file to disk and inserts a `media_items` row with
 *       `processing_status: "uploaded"`, then enqueues a BullMQ background job
 *       that handles thumbnail generation, HLS transcoding (video), AI tagging, and embeddings.
 *
 *       Returns `202 Accepted` immediately — processing happens asynchronously.
 *       Use `GET /api/v1/media/{id}/status` to poll until `processing_status` reaches
 *       `"done"` or `"failed"`.
 *
 *       If `device_asset_id` is provided and a matching row already exists for this user,
 *       returns `200` with the existing `media_id` immediately and discards the uploaded file.
 *
 *       **Video constraint:** videos exceeding the max duration are rejected before queuing
 *       and the uploaded file is deleted from disk.
 *     tags: [Media]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image (JPEG, PNG, HEIC, WEBP) or video (MP4, MOV, AVI, MKV) file
 *               device_asset_id:
 *                 type: string
 *                 description: Optional stable ID from the device media library (e.g. expo-media-library asset ID)
 *     responses:
 *       202:
 *         description: Upload accepted and queued for processing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Upload accepted for processing
 *                 data:
 *                   type: object
 *                   properties:
 *                     media_id:
 *                       type: string
 *                       format: uuid
 *                       example: f47ac10b-58cc-4372-a567-0e02b2c3d479
 *       200:
 *         description: Asset was already synced — returns existing media_id
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Already synced
 *                 data:
 *                   type: object
 *                   properties:
 *                     media_id:
 *                       type: string
 *                       format: uuid
 *       400:
 *         description: No file provided or unsupported file type or video exceeds duration limit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 */
router.post('/upload', upload_middleware.single('file'), upload_media);

/**
 * @openapi
 * /api/v1/media/{id}/status:
 *   get:
 *     summary: Get media processing status
 *     description: |
 *       Poll this after `POST /api/v1/media/upload` to track async processing.
 *
 *       `processing_status` lifecycle: `uploaded` → `processing` → `done` | `failed`.
 *       On failure, `error_message` is populated with the reason.
 *
 *       **No auth required** — the `media_id` UUID returned from upload serves as the
 *       access token for this endpoint. Do not expose `media_id` publicly if the content
 *       is sensitive.
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Media item ID
 *     responses:
 *       200:
 *         description: Media status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/MediaItem'
 *       404:
 *         description: Media not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 */
router.get('/:id/status', get_media_status);

export { router as upload_routes };
