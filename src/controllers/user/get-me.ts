import type { Request, Response } from "express";

import { success } from "@/types/response";

export async function get_me(req: Request, res: Response): Promise<void> {
  success(res, "User fetched successfully", { user: req.user });
}
