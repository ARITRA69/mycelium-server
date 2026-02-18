import { env } from "@/constants/env";
import { ollama } from "@/db/ollama";
import { run_migrations } from "@/db/schema";
import { auth_routes } from "@/routes/auth";
import { user_routes } from "@/routes/user";
import { error } from "@/types/response";
import chalk from "chalk";
import { ai_process_routes } from "./routes/ai-process";

async function connect_ollama() {
  try {
    await ollama.list();
    console.log(chalk.green(`Ollama connected at ${env.ollama_url}`));
  } catch (err) {
    console.error(chalk.red(`Failed to connect to Ollama at ${env.ollama_url}`));
    console.error(err);
    process.exit(1);
  }
}

await connect_ollama();
await run_migrations();

Bun.serve({
  port: env.port,
  routes: {
    "/": () =>
      Response.json({
        status: "ok",
        message: "Gallery API is running",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      }),
    ...auth_routes,
    ...user_routes,
    ...ai_process_routes,
  },
  fetch(req) {
    return error("Not found", 404);
  },
});

console.log(chalk.red(`Server running on http://localhost:${env.port}`));
