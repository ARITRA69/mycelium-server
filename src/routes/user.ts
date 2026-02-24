import { get_me } from "@/controllers/user/get-me";
import { get_users } from "@/controllers/user/get-users";
import { patch_me } from "@/controllers/user/patch-me";
import { is_authenticated } from "@/middlewere/authentication";
import { Router } from "express";

const router = Router();

router.get("/me", is_authenticated, get_me);
router.patch("/me", is_authenticated, patch_me);
router.get("/", is_authenticated, get_users);

export { router as user_routes };
