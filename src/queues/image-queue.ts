import { Queue } from "bullmq";
import { env } from "@/constants/env";
import type { ImageJobData } from "@/types/schemas/media-job";

const image_queue = new Queue<ImageJobData, unknown, string>("image-processing", {
  connection: {
    host: env.redis_host,
    port: env.redis_port,
  },
});

export default image_queue;
