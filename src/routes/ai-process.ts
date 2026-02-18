import { handle_process_image } from "@/controllers/ai-process/process-image";

export const ai_process_routes = {
  "/ai-process/image": {
    POST: handle_process_image,
  },
};
