import cron from "node-cron";
import { runAiCron } from "./ai-processing";
import { runEmbeddingCron } from "./embedding";

export const initCrons = () => {
  cron.schedule("*/30 * * * * *", runAiCron);
  cron.schedule("*/30 * * * * *", () => setTimeout(runEmbeddingCron, 15_000));
};
