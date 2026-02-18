export const MEDIA_TYPE = {
  IMAGE: "image",
  VIDEO: "video",
} as const;

export const MEDIA_PROCESSING_STATUS = {
  UNPROCESSED: "unprocessed",
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const AI_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const TAG_SOURCE = {
  AI: "ai",
  MANUAL: "manual",
} as const;
