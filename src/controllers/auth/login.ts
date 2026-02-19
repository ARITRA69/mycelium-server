import type { Request, Response } from "express";
import { error, success } from "@/types/response";

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    error(res, "Email and password are required", 400);
    return;
  }

  success(res, "Login successful", { email });
}
