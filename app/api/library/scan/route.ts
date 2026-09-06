import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { DATA_DIR } from "@/lib/db";
import fs from "node:fs";
import path from "node:path";

const VIDEO_EXTS = new Set([".mp4", ".mkv", ".webm", ".avi", ".mov", ".m4v"]);

export interface LocalVideoFile {
  filename: string;
  relativePath: string;
  fullPath: string;
  sizeBytes: number;
  sizeFormatted: string;
  streamUrl: string;
  suggestedTitle: string;
  suggestedYear?: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function parseTitleAndYear(filename: string): { title: string; year?: number } {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  const cleaned = nameWithoutExt.replace(/[_.]+/g, " ");
  const yearMatch = cleaned.match(/\b(19\d\d|20\d\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;
  let title = cleaned;
  if (yearMatch && yearMatch.index !== undefined) {
    title = cleaned.substring(0, yearMatch.index).trim();
  }
  title = title.replace(/\b(1080p|720p|2160p|4k|bluray|web-dl|x264|x265|hevc|aac|dts)\b/gi, "").trim();
  return { title: title || nameWithoutExt, year };
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const targetDirParam = req.nextUrl.searchParams.get("dir");
  const scanDir = targetDirParam
    ? path.resolve(targetDirParam)
    : path.join(DATA_DIR, "media", "videos");

  fs.mkdirSync(scanDir, { recursive: true });

  const files: LocalVideoFile[] = [];

  function scanRecursive(dir: string, baseRelative = "") {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        const rel = path.join(baseRelative, entry.name).replace(/\\/g, "/");
        if (entry.isDirectory()) {
          scanRecursive(full, rel);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (VIDEO_EXTS.has(ext)) {
            const stat = fs.statSync(full);
            const { title, year } = parseTitleAndYear(entry.name);
            files.push({
              filename: entry.name,
              relativePath: rel,
              fullPath: full,
              sizeBytes: stat.size,
              sizeFormatted: formatBytes(stat.size),
              streamUrl: `/api/files/media/videos/${rel}`,
              suggestedTitle: title,
              suggestedYear: year,
            });
          }
        }
      }
    } catch (err) {
      console.error("Scan error:", err);
    }
  }

  scanRecursive(scanDir);

  return NextResponse.json({
    scanDir,
    totalFiles: files.length,
    files,
  });
}