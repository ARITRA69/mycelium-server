import path from "path";
import { v4 as uuidv4 } from "uuid";
import multer, { MulterError } from "multer";
import {
  ALLOWED_MIMETYPES,
  MAX_FILE_SIZE,
  STORAGE_ROOT,
  type TAllowedMimeTypes,
  type TImageMimeTypes,
} from "@/constants/common";
import { is_image } from "@/utils/media";

const storage = multer.diskStorage({
  destination(_req, file, cb) {
    const dest = is_image(file.mimetype as TImageMimeTypes)
      ? path.join(STORAGE_ROOT, "images", "originals")
      : path.join(STORAGE_ROOT, "videos", "originals");
    cb(null, dest);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const upload_middleware = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIMETYPES.includes(file.mimetype as TAllowedMimeTypes)) {
      cb(null, true);
    } else {
      cb(
        new MulterError(
          "LIMIT_UNEXPECTED_FILE",
          `Unsupported file type: ${file.mimetype}`
        )
      );
    }
  },
});
