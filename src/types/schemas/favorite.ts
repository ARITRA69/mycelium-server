import type { TMediaItem } from "./media-item";
import type { TUser } from "./user";

export type TFavorite<TFavoriteUser = TUser["id"], TFavoriteMedia = TMediaItem["id"]> = {
  id: string;
  user: TFavoriteUser;
  media: TFavoriteMedia;
  created_at: Date;
};
