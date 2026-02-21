export type TUser = {
  id: string; // Clerk user_id e.g. "user_2abc123"
  email: string;
  name: string | null;
  device_info: string | null;
  created_at: Date;
};
