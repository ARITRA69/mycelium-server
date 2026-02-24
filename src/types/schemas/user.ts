export type TUser = {
  id: string; // Firebase UID
  email: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: Date | null;
  onboarding_complete: boolean;
  media_library_permission_granted: boolean;
  device_info: string | null;
  created_at: Date;
};
