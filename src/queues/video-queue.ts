import { Queue } from "bullmq";
import { env } from "@/constants/env";
import type { VideoJobData } from "@/types/schemas/media-job";

const video_queue = new Queue<VideoJobData, unknown, string>("video-processing", {
  connection: {
    host: env.redis_host,
    port: env.redis_port,
  },
});

export default video_queue;
