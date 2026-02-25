import { TImageMimeTypes, TVideoMimeTypes } from "@/constants/common";

export interface ImageJobData {
  media_id: string;
  file_path: string;
  mime_type: TImageMimeTypes;
}

export interface VideoJobData {
  media_id: string;
  file_path: string;
  mime_type: TVideoMimeTypes;
}
