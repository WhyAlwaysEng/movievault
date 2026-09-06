import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./db";

// ── Backend file layout (Orange Pi) ─────────────────────────────────────────
// data/
//   db/movievault.db
//   media/{mediaId}/poster.jpg | backdrop.jpg | preview-01.jpg… | video/*
//   actresses/{actressId}/photo.jpg
//   backups/movievault-<ts>.db
// ─────────────────────────────────────────────────────────────────────────────

/** Strip anything that could escape the data dir or break a path segment. */
export function safeSegment(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "");
}

export function mediaDir(mediaId: string): string {
  return path.join(DATA_DIR, "media", safeSegment(mediaId));
}

export function actressDir(actressId: string): string {
  return path.join(DATA_DIR, "actresses", safeSegment(actressId));
}

export function backupsDir(): string {
  return path.join(DATA_DIR, "backups");
}

/** Download an http(s) image into the data dir; returns false on failure. */
export async function downloadImage(url: string, dest: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return false;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 20 * 1024 * 1024) return false;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  }
}

/** Public URL served by /api/files for a stored file. */
export function fileUrl(bucket: "media" | "actresses", id: string, file: string): string {
  return `/api/files/${bucket}/${encodeURIComponent(safeSegment(id))}/${encodeURIComponent(file)}`;
}

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mkv": "video/x-matroska",
  ".webm": "video/webm",
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
  ".vtt": "text/vtt",
  ".json": "application/json",
};

export function mimeFor(file: string): string {
  return MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
}