import type { Request, Response } from "express";
import { sql } from "@/db/postgresql";
import { success } from "@/types/response";

export async function get_users(_req: Request, res: Response): Promise<void> {
  const users = await sql`SELECT id, email, created_at FROM users ORDER BY created_at DESC`;
  success(res, "Users fetched successfully", { users });
}
