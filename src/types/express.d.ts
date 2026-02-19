import { TUser } from "./schemas/user";

declare global {
  namespace Express {
    export interface Request {
      user: TUser;
    }
  }
}

export {};
