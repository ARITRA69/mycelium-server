import { handle_process_image } from '@/controllers/ai-process/process-image';
import { is_authenticated } from '@/middlewere/authentication';
import { Router } from 'express';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @openapi
 * /api/v1/ai-process/image:
 *   post:
 *     summary: Process an image with AI
 *     description: |
 *       Uploads an image (held in memory, never written to disk) and runs it synchronously
 *       through the local Ollama vision model (`qwen3-vl-2b`). Blocks until the model responds.
 *
 *       **Response shape:** the `data` field is whatever JSON the model returns — structure
 *       varies by image content and the extraction prompt baked into the server.
 *
 *       **vs. media upload:** this endpoint is for one-off, on-demand inference only.
 *       For persistent storage with async processing (thumbnails, HLS, AI tagging, embeddings)
 *       use `POST /api/v1/media/upload` instead.
 *     tags: [AI]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to process (JPEG, PNG, WEBP, etc.)
 *     responses:
 *       200:
 *         description: Image processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   description: Structured metadata extracted by the vision model
 *                   additionalProperties: true
 *       400:
 *         description: No image file provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 */
router.post('/image', is_authenticated, upload.single('image'), handle_process_image);

export { router as ai_process_routes };
