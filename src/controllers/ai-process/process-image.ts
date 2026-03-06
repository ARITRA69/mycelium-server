import { extract_image_ai_data } from '@/services/ai/extract-image-ai-data';
import { error, success } from '@/types/response';
import { Request, Response } from 'express';

export const handle_process_image = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    error(res, 'Invalid request', 400);
    return;
  }

  const base64 = req.file.buffer.toString('base64');
  const parsed = await extract_image_ai_data(base64);

  success(res, 'Image processed', parsed);
};
