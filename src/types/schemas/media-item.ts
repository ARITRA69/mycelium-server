import type { MediaType, MediaProcessingStatus } from "@/constants/common";
import type { TUser } from "./user";

export type TMediaItem<TMediaItemUser = TUser["id"]> = {
  id: string;
  user: TMediaItemUser;
  file_path: string;
  file_name: string;
  mime_type: string;
  media_type: MediaType;
  file_size: number | null;
  width: number | null;
  height: number | null;
  duration_secs: number | null;
  taken_at: Date | null;
  is_vaulted: boolean;
  processing_status: MediaProcessingStatus;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};
