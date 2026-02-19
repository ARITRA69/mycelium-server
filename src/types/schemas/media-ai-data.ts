import type { AiStatus } from "@/constants/common";
import type { TMediaItem } from "./media-item";
import type { TTag } from "./tag";

export type TMediaAiData<TMediaAiDataMedia = TMediaItem["id"]> = {
  id: string;
  media: TMediaAiDataMedia;
  description: string | null;
  tags: TTag[] | null;
  status: AiStatus;
  error: string | null;
  attempts: number;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};
