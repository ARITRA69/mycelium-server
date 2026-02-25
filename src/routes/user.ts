import { get_me } from '@/controllers/user/get-me';
import { get_users } from '@/controllers/user/get-users';
import { patch_me } from '@/controllers/user/patch-me';
import { is_authenticated } from '@/middlewere/authentication';
import { Router } from 'express';

const router = Router();

/**
 * @openapi
 * /api/v1/user/me:
 *   get:
 *     summary: Get current user
 *     description: |
 *       Returns the authenticated user's full profile from the database.
 *
 *       **Important:** the `is_authenticated` middleware (Firebase JWT) auto-creates
 *       a user record on first login, so this endpoint doubles as the implicit sign-up
 *       step — no separate registration call is needed.
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 */
router.get('/me', is_authenticated, get_me);

/**
 * @openapi
 * /api/v1/user/me:
 *   patch:
 *     summary: Update current user
 *     description: |
 *       Partially updates the authenticated user's profile. All body fields are optional
 *       but at least one must be present.
 *
 *       **name sync:** when `first_name` or `last_name` is changed, the `name` field is
 *       automatically recomputed as `"${first_name} ${last_name}"` — never update `name` directly.
 *
 *       **Onboarding flow:** send `onboarding_complete: true` once the user finishes the
 *       setup wizard, and `media_library_permission_granted: true` when they grant photo
 *       library access on-device.
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               first_name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: Jane
 *               last_name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: Doe
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: '1990-06-15'
 *               media_library_permission_granted:
 *                 type: boolean
 *                 example: true
 *               onboarding_complete:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error or no fields provided
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
router.patch('/me', is_authenticated, patch_me);

/**
 * @openapi
 * /api/v1/user/:
 *   get:
 *     summary: List all users
 *     description: |
 *       Returns a trimmed list (id, email, created_at only) of all registered users,
 *       ordered newest-first.
 *
 *       **Note:** no pagination — avoid calling this frequently on large datasets.
 *       Intended for admin/internal tooling, not client-facing UIs.
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Users fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: abc123uid
 *                           email:
 *                             type: string
 *                             format: email
 *                             example: jane@example.com
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 */
router.get('/', is_authenticated, get_users);

export { router as user_routes };
