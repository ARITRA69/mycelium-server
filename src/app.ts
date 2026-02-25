import { env } from "@/constants/env";
import { STORAGE_ROOT } from "@/constants/common";
import { run_migrations } from "@/db/schema";
import { user_routes } from "@/routes/user";
import { ai_process_routes } from "@/routes/ai-process";
import { upload_routes } from "./routes/upload";
import chalk from "chalk";
import express from "express";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { setup_qdrant_collections } from "@/db/quadrant";
import { clerkMiddleware } from "@clerk/express";
import "@/workers/image-worker";
import "@/workers/video-worker";


// Set ffmpeg/ffprobe paths explicitly so fluent-ffmpeg can find them
const FFMPEG_BIN = path.join(
  process.env.LOCALAPPDATA ?? "",
  "Microsoft",
  "WinGet",
  "Packages",
  "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe",
  "ffmpeg-8.0.1-full_build",
  "bin"
);
ffmpeg.setFfmpegPath(path.join(FFMPEG_BIN, "ffmpeg.exe"));
ffmpeg.setFfprobePath(path.join(FFMPEG_BIN, "ffprobe.exe"));

// Import workers to start BullMQ listeners


// Create storage directories
const storage_dirs = [
  path.join(STORAGE_ROOT, "images", "originals"),
  path.join(STORAGE_ROOT, "images", "thumbnails"),
  path.join(STORAGE_ROOT, "images", "placeholders"),
  path.join(STORAGE_ROOT, "videos", "originals"),
  path.join(STORAGE_ROOT, "videos", "hls"),
];

for (const dir of storage_dirs) {
  fs.mkdirSync(dir, { recursive: true });
}

run_migrations();
setup_qdrant_collections();

const app = express();
app.use(express.json());
app.use(clerkMiddleware());

// Serve storage as static files
app.use("/static", express.static(STORAGE_ROOT));

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    message: "Gallery API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1/user", user_routes);
app.use("/api/v1/ai-process", ai_process_routes);
app.use("/api/v1/media",upload_routes)

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.listen(env.port, () => {
  console.log(chalk.red(`Server running on http://localhost:${env.port}`));
});
