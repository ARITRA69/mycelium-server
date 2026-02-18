# CLAUDE.md

## Runtime

This is a **Bun** server project. Default to Bun for everything — do not use Node.js, npm, pnpm, or Vite.

| Instead of | Use |
|---|---|
| `node <file>` / `ts-node <file>` | `bun <file>` |
| `jest` / `vitest` | `bun test` |
| `webpack` / `esbuild` | `bun build <file.html\|file.ts\|file.css>` |
| `npm install` / `yarn` / `pnpm` | `bun install` |
| `npm run <script>` | `bun run <script>` |
| `npx <pkg>` | `bunx <pkg>` |

Bun automatically loads `.env` — do **not** use `dotenv`.

---

## Naming Conventions

- **Function names** → `snake_case`
- **File names** → `kebab-case`

```ts
// ✅ correct
export function get_user_by_id(id: string) { ... }
// file: user-service.ts

// ❌ wrong
export function getUserById(id: string) { ... }
// file: userService.ts
```

---

## Bun APIs — Use These, Not Third-Party Packages

| Purpose | Use | Never use |
|---|---|---|
| HTTP server + routes | `Bun.serve()` | `express`, `fastify`, `hono` |
| SQLite | `bun:sqlite` | `better-sqlite3` |
| Redis | `Bun.redis` | `ioredis`, `redis` |
| Postgres | `Bun.sql` | `pg`, `postgres.js` |
| WebSockets | built-in `WebSocket` | `ws` |
| File I/O | `Bun.file()` | `fs.readFile` / `fs.writeFile` |
| Shell commands | `Bun.$\`cmd\`` | `execa`, `child_process` |

---

## Server Structure

Entry point using `Bun.serve()` with HTML imports for the frontend:

```ts
// src/index.ts
import index from "./index.html";

Bun.serve({
  port: Number(Bun.env.PORT ?? 3000),

  routes: {
    "/": index,

    "/api/users": {
      GET: (req) => handle_users_list(req),
      POST: (req) => handle_user_create(req),
    },

    "/api/users/:id": {
      GET:    (req) => handle_user_by_id(req),
      PUT:    (req) => handle_user_update(req),
      DELETE: (req) => handle_user_delete(req),
    },
  },

  websocket: {
    open:    (ws)      => handle_ws_open(ws),
    message: (ws, msg) => handle_ws_message(ws, msg),
    close:   (ws)      => handle_ws_close(ws),
  },

  development: {
    hmr: true,
    console: true,
  },
});
```

---

## Frontend

HTML files are served directly by `Bun.serve()`. Bun's bundler auto-transpiles `.tsx`/`.jsx`/`.ts` imports and bundles CSS via `<link>` tags. Do **not** use Vite.

```html
<!-- index.html -->
<html>
  <head>
    <link rel="stylesheet" href="./src/styles/global.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./src/frontend/main.tsx"></script>
  </body>
</html>
```

```tsx
// src/frontend/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
```

Run the dev server:

```sh
bun --hot ./src/index.ts
```

---

## Testing

```ts
// src/__tests__/user-service.test.ts
import { test, expect, describe } from "bun:test";
import { get_user_by_id } from "../services/user-service";

describe("user-service", () => {
  test("returns user for valid id", () => {
    const user = get_user_by_id("123");
    expect(user).toBeDefined();
  });
});
```

Run tests:

```sh
bun test
# or with watch mode:
bun test --watch
```

---

## Recommended Project Structure

```
.
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── index.html                   # frontend entry (served by Bun.serve)
└── src/
    ├── index.ts                 # server entry — Bun.serve()
    ├── frontend/
    │   ├── main.tsx             # React root
    │   ├── app.tsx
    │   └── components/
    ├── routes/
    │   ├── api-users.ts         # handler functions in snake_case
    │   └── api-health.ts
    ├── services/
    │   └── user-service.ts
    ├── lib/
    │   ├── database.ts          # bun:sqlite setup
    │   └── logger.ts
    ├── middleware/
    │   └── auth.ts
    ├── styles/
    │   └── global.css
    └── __tests__/
        └── user-service.test.ts
```

---

## Environment Variables

Bun loads `.env` automatically. Access via `Bun.env`:

```ts
const port     = Number(Bun.env.PORT ?? 3000);
const db_url   = Bun.env.DATABASE_URL ?? "local.db";
const api_key  = Bun.env.API_KEY;
```

No `dotenv` import needed.

---

## SQLite Example

```ts
// src/lib/database.ts
import { Database } from "bun:sqlite";

const db = new Database(Bun.env.DATABASE_URL ?? "app.db");

export function db_init() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    )
  `);
}

export function db_get_user(id: number) {
  return db.query("SELECT * FROM users WHERE id = ?").get(id);
}

export function db_list_users() {
  return db.query("SELECT * FROM users").all();
}

export function db_insert_user(name: string, email: string) {
  return db.query("INSERT INTO users (name, email) VALUES (?, ?)").run(name, email);
}
```

---

## Response Helpers

```ts
// src/lib/response.ts
export function json_ok(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function json_error(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
```
