import type { TagSource } from "@/constants/common";
import type { TMediaItem } from "./media-item";

export type TTag = {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
};

export type TMediaTag<
  TMediaTagMedia = TMediaItem["id"],
  TMediaTagTag = TTag["id"],
  TMediaTagSource = TagSource,
> = {
  id: string;
  media: TMediaTagMedia;
  tag: TMediaTagTag;
  source: TMediaTagSource;
  created_at: Date;
};
