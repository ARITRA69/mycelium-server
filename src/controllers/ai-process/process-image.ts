import { MODELS } from "@/constants/models";
import { IMAGE_EXTRACT_PROMPT } from "@/constants/prompts";
import { ollama } from "@/db/ollama";
import { error, success } from "@/types/response";
import z from "zod";

const z_process_image = z.object({
  image: z.instanceof(File),
});

export async function handle_process_image(req: Request): Promise<Response> {
  const formData = await req.formData();

  const parsed = z_process_image.safeParse({
    image: formData.get("image"),
  });

  if (!parsed.success) {
    return error("Invalid request", 400);
  }

  const { image } = parsed.data;

  const buffer = await image.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  const generated_text = await ollama.generate({
    model: MODELS.QWEN3_VL_2B,
    prompt: IMAGE_EXTRACT_PROMPT,
    images: [base64],
    think: false,
  });

  const response_in_json = JSON.parse(generated_text.response);

  return success("Image processed", response_in_json);
}
