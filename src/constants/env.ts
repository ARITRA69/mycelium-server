export type TEnv = {
  database_url: string;
  port: number;
  frontend_url: string;
  backend_url: string;
  ollama_url: string;
};

export const env: TEnv = {
  database_url: Bun.env.DATABASE_URL ?? "NA",
  port: Number(Bun.env.PORT ?? 8000),
  frontend_url: Bun.env.FRONTEND_URL ?? "NA",
  backend_url: Bun.env.BACKEND_URL ?? "NA",
  ollama_url: Bun.env.OLLAMA_URL ?? "NA",
};
