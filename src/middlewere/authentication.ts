import { createClerkClient, getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

import { env } from "@/constants/env";
import { sql } from "@/db/postgresql";

const clerk_client = createClerkClient({ secretKey: env.clerk_secret_key });

export async function is_authenticated(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { userId } = getAuth(req);

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const [existing] = await sql<{ id: string; email: string; name: string | null; device_info: string | null; created_at: Date }[]>`
    SELECT id, email, name, device_info, created_at FROM users WHERE id = ${userId}
  `;

  if (existing) {
    req.user = existing;
    next();
    return;
  }

  // First login — fetch from Clerk and persist to DB
  const clerk_user = await clerk_client.users.getUser(userId);
  const email = clerk_user.emailAddresses[0]?.emailAddress ?? "";
  const name = `${clerk_user.firstName ?? ""} ${clerk_user.lastName ?? ""}`.trim() || null;

  const [new_user] = await sql<{ id: string; email: string; name: string | null; device_info: string | null; created_at: Date }[]>`
    INSERT INTO users (id, email, name)
    VALUES (${userId}, ${email}, ${name})
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name
    RETURNING id, email, name, device_info, created_at
  `;

  req.user = new_user;
  next();
}
