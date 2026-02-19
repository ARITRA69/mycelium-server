import cron from "node-cron";
import { runAiCron } from "./ai-processing";
import { runEmbeddingCron } from "./embedding";

export const initCrons = () => {
  cron.schedule("*/2 * * * *", runAiCron);
  cron.schedule("*/2 * * * *", () => setTimeout(runEmbeddingCron, 30_000));
};
