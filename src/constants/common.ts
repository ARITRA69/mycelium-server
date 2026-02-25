import path from "path";
import { env } from "./env";

export const STORAGE_ROOT = path.resolve(process.cwd(),env.storage_directory);

export const MEDIA_TYPE = {
  IMAGE: "image",
  VIDEO: "video",
} as const;

export type MediaType = (typeof MEDIA_TYPE)[keyof typeof MEDIA_TYPE];

export const MEDIA_PROCESSING_STATUS = {
  UNPROCESSED: "unprocessed",
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type MediaProcessingStatus =
  (typeof MEDIA_PROCESSING_STATUS)[keyof typeof MEDIA_PROCESSING_STATUS];

export const AI_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type AiStatus = (typeof AI_STATUS)[keyof typeof AI_STATUS];

export const TAG_SOURCE = {
  AI: "ai",
  MANUAL: "manual",
} as const;

export type TagSource = (typeof TAG_SOURCE)[keyof typeof TAG_SOURCE];

export const CRON_BATCH_SIZE = 10;
export const MAX_AI_ATTEMPTS = 3;
export const MAX_EMBEDDING_ATTEMPTS = 3;

export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
export const MAX_VIDEO_DURATION = 10800; // 3 hours in seconds


export const IMAGE_MIMETYPES = ["image/jpeg", "image/png", "image/heic", "image/webp"] as const;
export const VIDEO_MIMETYPES = [
  "video/mp4",
  "video/quicktime"] as const

export type TImageMimeTypes = (typeof IMAGE_MIMETYPES)[number]
export type TVideoMimeTypes = (typeof VIDEO_MIMETYPES)[number]

export const ALLOWED_MIMETYPES = [
...IMAGE_MIMETYPES,...VIDEO_MIMETYPES
] as const;


export type TAllowedMimeTypes =  (typeof ALLOWED_MIMETYPES)[number]