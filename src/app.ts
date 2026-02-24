import { env } from "@/constants/env";
import { run_migrations } from "@/db/schema";
import { user_routes } from "@/routes/user";
import { ai_process_routes } from "@/routes/ai-process";
import chalk from "chalk";
import express from "express";
import { setup_qdrant_collections } from "@/db/quadrant";

run_migrations();
setup_qdrant_collections();

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

app.use("/api/v1/user", user_routes);
app.use("/api/v1/ai-process", ai_process_routes);

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.listen(env.port, () => {
  console.log(chalk.red(`Server running on http://localhost:${env.port}`));
});
