import { Router } from "express";
import { upload_media } from "@/controllers/media/upload-media";
import { upload_middleware } from "@/middlewere/multer";
import { is_authenticated } from "@/middlewere/authentication";
import { get_media_status } from "@/controllers/media/get-media-status";

const router = Router();

router.post("/upload", is_authenticated, upload_middleware.single("file"), upload_media);
router.get("/:id/status", get_media_status);

export { router as upload_routes };
