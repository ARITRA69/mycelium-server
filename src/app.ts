import { env } from "@/constants/env";
import { ollama } from "@/db/ollama";
import { run_migrations } from "@/db/schema";
import { auth_routes } from "@/routes/auth";
import { user_routes } from "@/routes/user";
import { ai_process_routes } from "./routes/ai-process";
import chalk from "chalk";
import express from "express";

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

const app = express();
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    message: "Gallery API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1/auth", auth_routes);
app.use("/api/v1/user", user_routes);
app.use("/api/v1/ai-process", ai_process_routes);

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.listen(env.port, () => {
  console.log(chalk.red(`Server running on http://localhost:${env.port}`));
});
