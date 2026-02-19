import { handle_process_image } from "@/controllers/ai-process/process-image";
import { Router } from "express";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/image", upload.single("image"), handle_process_image);

export { router as ai_process_routes };
