export type TEnv = {
  database_url: string;
  port: number;
  frontend_url: string;
  backend_url: string;
  ollama_url: string;
  qdrant_url: string;
  clerk_publishable_key: string;
  clerk_secret_key: string;
  redis_host: string;
  redis_port: number;
  storage_directory: string;
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
  redis_host: Bun.env.REDIS_HOST ?? "127.0.0.1",
  redis_port: Number(Bun.env.REDIS_PORT ?? 6379),
  storage_directory: Bun.env.STORAGE_DIRECTORY ?? 'NA'
};
