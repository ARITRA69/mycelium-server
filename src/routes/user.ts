import { get_users } from "@/controllers/user/get-users";
import { Router } from "express";

const router = Router();

router.get("/", get_users);

export { router as user_routes };
