# CLAUDE.md

This file defines the coding standards and conventions for the Mycelium server project.
Follow these rules consistently across all files.

---

## Runtime

This is a **Bun + Express** project. Use Bun for everything — never use Node.js, npm, pnpm, or Vite.

| Instead of | Use |
|---|---|
| `node` / `ts-node` | `bun` |
| `jest` / `vitest` | `bun test` |
| `npm install` / `yarn` / `pnpm` | `bun install` |
| `npm run <script>` | `bun run <script>` |
| `npx <pkg>` | `bunx <pkg>` |
| `pg` / `postgres.js` | `Bun.sql` |
| `fs.readFile` / `fs.writeFile` | `Bun.file()` |
| `child_process` / `execa` | `Bun.$\`cmd\`` |
| `dotenv` | ❌ not needed — Bun loads `.env` automatically |

---

## Project Structure

```
src/
├── app.ts                  # Express app setup, routes mounted here
├── constants/
│   └── env.ts              # All env vars — always import from here
├── routes/                 # Route definitions + OpenAPI JSDoc
├── controllers/            # Request handlers (one file per handler)
├── services/               # Business logic
├── db/
│   ├── schema.ts           # Migrations via Bun.sql
│   └── qdrant.ts           # Qdrant collection setup
├── middlewere/             # Auth, multer, etc.
├── types/
│   └── response.ts         # ApiResponse<T>, success(), error() helpers
├── docs/
│   └── openapi.ts          # Swagger-jsdoc spec config
└── crons/                  # Cron job definitions
```

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| File names | `kebab-case` | `media-processor.ts` |
| Functions & variables | `snake_case` | `get_user_by_id`, `const file_path` |
| Module-level constants | `SCREAMING_SNAKE_CASE` | `const MAX_BATCH_SIZE = 5` |
| Types & Classes | `PascalCase` | `type MediaFile`, `class QueueProcessor` |
| DB columns & table names | `snake_case` / plural | `media_files`, `created_at` |

---

## Functions

Always use **arrow functions** — never `function` declarations.

```ts
// ✅ correct
const get_user_by_id = async (id: string): Promise<User> => {
  // ...
};

// ❌ wrong
async function get_user_by_id(id: string): Promise<User> {
  // ...
}
```

**Exception:** class methods use standard method syntax.

---

## TypeScript

- Always define **explicit return types** on non-trivial functions
- Use `type` for all type definitions — never `interface`
- No `any` — use `unknown` and narrow, or define a proper type

```ts
type MediaFile = {
  id: string;
  file_path: string;
  created_at: Date;
};

type MediaStatus = 'pending' | 'processing' | 'done' | 'failed';
```

---

## Imports

Group in this order, separated by a blank line:

1. Node built-ins
2. Third-party packages
3. Internal modules (`@/...`)

```ts
import path from 'path';

import express from 'express';
import type { Request, Response } from 'express';

import { success, error } from '@/types/response';
import { env } from '@/constants/env';
```

- Always import `Request` and `Response` from `express` directly — no aliases
- Use named imports over default imports where possible

---

## Environment Variables

**Always** import from `src/constants/env.ts` — never read `process.env` or `Bun.env` directly in handlers or services.

```ts
// ✅ correct
import { env } from '@/constants/env';
const url = env.qdrantUrl;

// ❌ wrong
const url = process.env.QDRANT_URL;
```

---

## Response Helpers

Always use the helpers from `src/types/response.ts`. Never call `res.json()` or `res.status()` directly in controllers.

```ts
import { success, error } from '@/types/response';

// Success
success(res, 'User fetched', { user });       // 200
success(res, 'Created', { id }, 201);

// Error
error(res, 'Not found', 404);
error(res, 'Unauthorized', 401);
```

All responses follow the `ApiResponse<T>` shape:

```ts
{ message: string, data?: T }
```

---

## Express Conventions

- Mount all routes in `src/app.ts` under `/api/v1/<resource>`
- Route files live in `src/routes/` — they only define the router and attach JSDoc
- Controller files live in `src/controllers/<resource>/` — one file per handler
- Auth middleware is `is_authenticated` from `src/middlewere/authentication.ts`

---

## Database

- **PostgreSQL** via `Bun.sql` — never use `pg`, `postgres.js`, or Prisma
- **Qdrant** for vector embeddings — never store embeddings in PostgreSQL
- All column names: `snake_case`
- All table names: `snake_case`, plural

---

## General Style

- **Indentation:** 2 spaces
- **Quotes:** Single quotes `'` for TS/JS
- **Semicolons:** Always
- **Trailing commas:** Always in multi-line arrays/objects
- **Max line length:** 100 characters

---

## Comments

Use `//` for inline, `/** */` for JSDoc on exported functions. Explain *why*, not *what*.

```ts
/**
 * Generates a text embedding using nomic-embed-text via Ollama.
 * Vectors are normalized by default — no post-processing needed.
 */
const generate_embedding = async (text: string): Promise<number[]> => {
  const response = await ollama.embed({ model: 'nomic-embed-text', input: text });
  return response.embeddings[0];
};
```

---

## API Documentation (OpenAPI)

**Docs are part of the code.** Every route must have an `@openapi` JSDoc block. When you touch a route, you touch its docs.

| Action | Required |
|---|---|
| Add a route | Add `@openapi` block above the `router.*()` call |
| Change request/response shape | Update the schema in the JSDoc |
| Delete a route | Remove its `@openapi` block |
| Add/remove `is_authenticated` | Add/remove `security: - BearerAuth: []` |

**Rules:**

- JSDoc goes in the **route file** (`src/routes/*.ts`), directly above the `router.get/post/patch/delete` call — never in the controller
- Tag routes by resource: `[User]`, `[Media]`, `[AI]`, etc.
- Always document: `200`, `400`, `401` (if authenticated), `500`
- Multipart routes: use `requestBody` with `multipart/form-data`
- Response schemas must always match `ApiResponse<T>`: `{ message: string, data?: T }`

**Template:**

```ts
/**
 * @openapi
 * /api/v1/<resource>/<path>:
 *   <method>:
 *     summary: Short one-line description
 *     tags: [ResourceName]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [field1]
 *             properties:
 *               field1:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success
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
 *                     id:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/<path>', is_authenticated, handler);
```

**Scalar UI** is served at `GET /docs`. Raw spec at `GET /openapi.json`.
Theme: `purple`. Servers: local dev (`http://localhost:8888`)

---

## Testing

```ts
// src/__tests__/user-service.test.ts
import { test, expect, describe } from 'bun:test';
import { get_user_by_id } from '@/services/user-service';

describe('user-service', () => {
  test('returns user for valid id', async () => {
    const user = await get_user_by_id('123');
    expect(user).toBeDefined();
  });
});
```

```sh
bun test
bun test --watch
```
