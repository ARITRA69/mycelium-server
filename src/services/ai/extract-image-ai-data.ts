import { MODELS } from '@/constants/models';
import { IMAGE_EXTRACT_PROMPT, ImageExtractSchema } from '@/constants/prompts';
import type { ImageExtract } from '@/constants/prompts';
import { ollama } from '@/db/ollama';

export const extract_image_ai_data = async (base64: string): Promise<ImageExtract> => {
  const generated_text = await ollama.generate({
    model: MODELS.QWEN3_5_2B,
    prompt: IMAGE_EXTRACT_PROMPT,
    images: [base64],
    format: 'json',
    think: false,
  });

  return ImageExtractSchema.parse(JSON.parse(generated_text.response));
};
