import { MODELS } from "@/constants/models";
import { IMAGE_EXTRACT_PROMPT } from "@/constants/prompts";
import { ollama } from "@/db/ollama";
import { error, success } from "@/types/response";
import type { Request, Response } from "express";

export async function handle_process_image(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    error(res, "Invalid request", 400);
    return;
  }

  const base64 = req.file.buffer.toString("base64");

  const generated_text = await ollama.generate({
    model: MODELS.QWEN3_VL_2B,
    prompt: IMAGE_EXTRACT_PROMPT,
    images: [base64],
    think: false,
  });

  const response_in_json = JSON.parse(generated_text.response);

  success(res, "Image processed", response_in_json);
}
