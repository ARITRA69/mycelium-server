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

export type MediaProcessingStatus = (typeof MEDIA_PROCESSING_STATUS)[keyof typeof MEDIA_PROCESSING_STATUS];

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
