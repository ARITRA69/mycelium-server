import { sql } from "@/db/postgresql";
import { error, success } from "@/types/response";
import { TMediaItem } from "@/types/schemas/media-item";
import { Request, Response } from "express";

export async function get_media_status(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
  
      const rows = await sql<TMediaItem[]>`
        SELECT * FROM media_items WHERE id = ${id}
      `;
  
      if (rows.length === 0) {
        error(res, "Media not found", 404);
        return;
      }
  
      success(res, "Media status retrieved", rows[0]);
    } catch (err) {
      console.error("Status check error:", err);
      error(res, "Internal server error", 500);
    }
  }
  