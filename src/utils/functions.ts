import { TAllowedMimeTypes, TImageMimeTypes, TVideoMimeTypes, type MediaType } from "@/constants/common";
import image_queue from "@/queues/image-queue";
import video_queue from "@/queues/video-queue";
import fs from "fs";

export const remove_file = (file_path: string) => {
  try {
    if (fs.existsSync(file_path)) {
      fs.unlinkSync(file_path);
    }
  } catch (cleanup_err) {
    console.error("Failed to clean up file:", file_path, cleanup_err);
  }
};

export type TEnqueueProcessing = {
    media_id: string;
    file_path: string;
    mime_type: TAllowedMimeTypes;
    media_type: MediaType;
}

export const enqueue_processing = async ({
  media_id,
  file_path,
  mime_type,
  media_type,
}: TEnqueueProcessing) => {
  const job_options = {
    attempts: 3,
    backoff: { type: "exponential" as const, delay: 3000 },
  };

  if (media_type === "image") {
    await image_queue.add("process-image", { media_id, file_path, mime_type: mime_type as TImageMimeTypes }, job_options);
  } else {
    await video_queue.add("process-video", { media_id, file_path, mime_type: mime_type as TVideoMimeTypes }, job_options);
  }
};


