export type TEnv = {
  database_url: string;
  port: number;
  frontend_url: string;
  backend_url: string;
  ollama_url: string;
  qdrant_url: string;
  clerk_publishable_key: string;
  clerk_secret_key: string;
};

export const env: TEnv = {
  database_url: Bun.env.DATABASE_URL ?? "NA",
  port: Number(Bun.env.PORT ?? 8000),
  frontend_url: Bun.env.FRONTEND_URL ?? "NA",
  backend_url: Bun.env.BACKEND_URL ?? "NA",
  ollama_url: Bun.env.OLLAMA_URL ?? "NA",
  qdrant_url: Bun.env.QDRANT_URL ?? "NA",
  clerk_publishable_key: Bun.env.CLERK_PUBLISHABLE_KEY ?? "NA",
  clerk_secret_key: Bun.env.CLERK_SECRET_KEY ?? "NA",
};
