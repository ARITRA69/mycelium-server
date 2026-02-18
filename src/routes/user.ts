import { get_users } from "@/controllers/user/get-users";

export const user_routes = {
  "/user": {
    GET: get_users,
  },
};
