import type { TUser } from "./user";

export type TVault<TVaultUser = TUser["id"]> = {
  id: string;
  user: TVaultUser;
  pin_hash: string;
  is_enabled: boolean;
  created_at: Date;
  updated_at: Date;
};

export type TVaultSession<TVaultSessionId = TVault["id"], TVaultSessionUser = TUser["id"]> = {
  id: TVaultSessionId;
  user: TVaultSessionUser;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
};
