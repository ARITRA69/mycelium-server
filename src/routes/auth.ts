import { login } from "@/controllers/auth/login";

export const auth_routes = {
  "/auth/login": {
    POST: login,
  },
};
