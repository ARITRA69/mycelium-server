import type { TUser } from "./user";
import type { TMediaItem } from "./media-item";

export type TAlbum<TAlbumUser = TUser["id"], TCoverMedia = TMediaItem["id"] | null> = {
  id: string;
  user: TAlbumUser;
  name: string;
  description: string | null;
  cover_media: TCoverMedia;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type TAlbumMedia<TAlbumId = TAlbum["id"], TAlbumMediaItem = TMediaItem["id"]> = {
  id: string;
  album: TAlbumId;
  media: TAlbumMediaItem;
  sort_order: number;
  added_at: Date;
};
