import { IMAGE_MIMETYPES, type TImageMimeTypes } from "@/constants/common";

export function is_image(mimetype: TImageMimeTypes): boolean {
  return IMAGE_MIMETYPES.includes(mimetype);
}
