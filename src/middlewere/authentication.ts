import type { NextFunction, Request, Response } from "express";

import { sql } from "@/db/postgresql";
import { firebase_auth } from "@/lib/firebase-admin";
import type { TUser } from "@/types/schemas/user";

export async function is_authenticated(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth_header = req.headers.authorization;
  const token = auth_header?.startsWith('Bearer ') ? auth_header.slice(7) : null;

  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  let uid: string;
  let email: string;
  let display_name: string | null;
  let first_name: string | null;
  let last_name: string | null;

  try {
    const decoded = await firebase_auth.verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email ?? '';
    display_name = decoded.name ?? null;
    const parts = display_name?.split(' ') ?? [];
    first_name = parts[0] ?? null;
    last_name = parts.slice(1).join(' ') || null;
  } catch {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const [existing] = await sql<TUser[]>`
    SELECT id, email, name, first_name, last_name, date_of_birth, onboarding_complete, media_library_permission_granted, device_info, created_at
    FROM users WHERE id = ${uid}
  `;

  if (existing) {
    req.user = existing;
    next();
    return;
  }

  // First login — persist to DB
  const name = [first_name, last_name].filter(Boolean).join(' ') || null;

  const [new_user] = await sql<TUser[]>`
    INSERT INTO users (id, email, name, first_name, last_name)
    VALUES (${uid}, ${email}, ${name}, ${first_name}, ${last_name})
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name
    RETURNING id, email, name, first_name, last_name, date_of_birth, onboarding_complete, media_library_permission_granted, device_info, created_at
  `;

  req.user = new_user;
  next();
}
