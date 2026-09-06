import { NextRequest, NextResponse } from "next/server";
import { DATA_DIR, db } from "@/lib/db";
import { requireAdmin } from "@/lib/server/auth";
import { buildSearchTokens } from "@/lib/utils/normalize";
import fs from "node:fs";
import path from "node:path";

const VIDEO_EXTS = new Set([".mp4", ".mkv", ".m3u8", ".mov", ".webm", ".avi", ".ts"]);

function cleanMediaFilename(filename: string): { title: string; year: number | null; javCode: string | null } {
  const base = path.parse(filename).name;

  // 1. Check for JAV Code pattern (e.g. IPX-711, SSIS-842, FC2-PPV-123456)
  const javMatch = base.match(/\b([A-Z]{2,6}|FC2-PPV)[-_]?(\d{3,6})\b/i);
  let javCode: string | null = null;
  if (javMatch) {
    javCode = `${javMatch[1].toUpperCase()}-${javMatch[2]}`;
  }

  // 2. Year pattern (19xx or 20xx)
  const yearMatch = base.match(/\b(19\d{2}|20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : null;

  // 3. Strip common release group tags, resolutions, codecs
  let title = base
    .replace(/\b(1080p|2160p|4k|720p|480p|bluray|bdrip|webrip|web-dl|h264|x264|h265|x265|hevc|aac|dts|hd|remux)\b/gi, "")
    .replace(/[._]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (javCode) {
    title = javCode;
  }

  return { title: title || base, year, javCode };
}

function scanDirRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...scanDirRecursive(full));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VIDEO_EXTS.has(ext)) {
          results.push(full);
        }
      }
    }
  } catch {
    /* ignore read error */
  }
  return results;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let scanPath = path.join(DATA_DIR, "media");
  try {
    const body = (await req.json()) as { folderPath?: string };
    if (body.folderPath && fs.existsSync(body.folderPath)) {
      scanPath = body.folderPath;
    }
  } catch {
    /* use default */
  }

  if (!fs.existsSync(scanPath)) {
    fs.mkdirSync(scanPath, { recursive: true });
  }

  const files = scanDirRecursive(scanPath);
  let addedCount = 0;
  let skippedCount = 0;
  const processedItems: Array<{ file: string; title: string; status: "added" | "skipped" }> = [];

  const checkSourceStmt = db.prepare("SELECT media_id FROM media_sources WHERE url = ?");
  const checkCodeStmt = db.prepare("SELECT id FROM media WHERE code = ?");
  const insertMediaStmt = db.prepare(`
    INSERT INTO media (
      id, type, code, title, title_en, year, status, search_tokens, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)
  `);
  const insertSourceStmt = db.prepare(`
    INSERT INTO media_sources (media_id, label, url, kind, healthy, sort)
    VALUES (?, ?, ?, 'local', 1, 0)
  `);

  for (const file of files) {
    const filename = path.basename(file);
    const relUrl = `/media/${encodeURIComponent(filename)}`;
    const { title, year, javCode } = cleanMediaFilename(filename);

    // Check if source or javCode already exists
    const sourceExists = checkSourceStmt.get(relUrl);
    const codeExists = javCode ? checkCodeStmt.get(javCode) : null;

    if (sourceExists || codeExists) {
      skippedCount++;
      processedItems.push({ file: filename, title, status: "skipped" });
      continue;
    }

    const now = Date.now();
    const mediaId = javCode ? `jav-${javCode.toLowerCase()}` : `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const mediaType = javCode ? "jav" : "movie";
    const tokens = JSON.stringify(
      buildSearchTokens(title, undefined, javCode || undefined, []),
    );

    try {
      db.transaction(() => {
        insertMediaStmt.run(
          mediaId,
          mediaType,
          javCode || null,
          title,
          title,
          year,
          tokens,
          now,
          now,
        );
        insertSourceStmt.run(
          mediaId,
          "Local Storage (Direct File)",
          relUrl,
        );
      })();

      addedCount++;
      processedItems.push({ file: filename, title, status: "added" });
    } catch {
      skippedCount++;
      processedItems.push({ file: filename, title, status: "skipped" });
    }
  }

  return NextResponse.json({
    ok: true,
    scanPath,
    totalScanned: files.length,
    added: addedCount,
    skipped: skippedCount,
    items: processedItems,
  });
}
