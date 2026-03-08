import postgres from "postgres";

export const sql = postgres(Bun.env.DATABASE_URL!, {
  connection: { client_min_messages: 'warning' },
});
