import type { Request, Response } from "express";
import { success } from "@/types/response";

export async function get_users(_req: Request, res: Response): Promise<void> {
  const users = [
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" },
  ];

  success(res, "Users fetched successfully", { users });
}
