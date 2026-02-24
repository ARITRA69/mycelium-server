import type { Request, Response } from "express";
import { z } from "zod";

import { sql } from "@/db/postgresql";
import type { TUser } from "@/types/schemas/user";
import { error, success } from "@/types/response";

const patch_me_schema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  date_of_birth: z.string().date().optional(),
  media_library_permission_granted: z.boolean().optional(),
  onboarding_complete: z.boolean().optional(),
});

export async function patch_me(req: Request, res: Response): Promise<void> {
  const parsed = patch_me_schema.safeParse(req.body);

  if (!parsed.success) {
    error(res, parsed.error.message ?? "Invalid request body", 400);
    return;
  }

  const { first_name, last_name, date_of_birth, media_library_permission_granted, onboarding_complete } = parsed.data;

  const updates: Record<string, unknown> = {};

  if (first_name !== undefined) updates.first_name = first_name;
  if (last_name !== undefined) updates.last_name = last_name;
  if (date_of_birth !== undefined) updates.date_of_birth = date_of_birth;
  if (media_library_permission_granted !== undefined) updates.media_library_permission_granted = media_library_permission_granted;
  if (onboarding_complete !== undefined) updates.onboarding_complete = onboarding_complete;

  if (Object.keys(updates).length === 0) {
    error(res, "No fields to update", 400);
    return;
  }

  // Keep name in sync when first/last name changes
  if (first_name !== undefined || last_name !== undefined) {
    const current_first = first_name ?? req.user.first_name ?? "";
    const current_last = last_name ?? req.user.last_name ?? "";
    updates.name = [current_first, current_last].filter(Boolean).join(" ") || null;
  }

  const [updated_user] = await sql<TUser[]>`
    UPDATE users SET ${sql(updates)}
    WHERE id = ${req.user.id}
    RETURNING id, email, name, first_name, last_name, date_of_birth, onboarding_complete, media_library_permission_granted, device_info, created_at
  `;

  success(res, "User updated successfully", { user: updated_user });
}
