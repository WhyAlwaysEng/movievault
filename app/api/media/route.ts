import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, requireAdmin } from "@/lib/server/auth";
import { getMediaRow, rowToMedia, rowsToMedia } from "@/lib/server/mapper";
import { setMediaActresses } from "@/lib/server/actresses";
import { audit } from "@/lib/server/audit";
import { mediaDir } from "@/lib/storage";
import { downloadImage } from "@/lib/storage";
import fs from "node:fs";
import path from "node:path";
import { buildSearchTokens, normalizeJavCode } from "@/lib/utils/normalize";
import type { MediaType } from "@/lib/types";
import { cachedAsync, serverCache } from "@/lib/server/cache";

const SORTS: Record<string, string> = {
  views: "views DESC",
  year: "year DESC, id ASC",
  created: "created_at DESC",
  title: "title COLLATE NOCASE ASC",
};

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const statusParam = url.searchParams.get("status") ?? "published";
  const sortParam = url.searchParams.get("sort") ?? "views";
  const sort = SORTS[sortParam] ?? SORTS.views;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 24), 500);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

  const wantAll = statusParam === "all";
  const status = wantAll && session.isAdmin ? null : statusParam;

  // Cache key for public queries (non-admin, published)
  const isPublicQuery = !session.isAdmin && status === "published";
  const cacheKey = `media:list:${type || "all"}:${sortParam}:${limit}:${offset}`;

  const fetchMediaList = () => {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (status) {
      clauses.push("status = ?");
      params.push(status);
    }
    if (type && (type === "movie" || type === "series" || type === "jav")) {
      clauses.push("type = ?");
      params.push(type);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const countRow = db
      .prepare(`SELECT COUNT(*) as total FROM media ${where}`)
      .get(...params) as { total: number };

    const rows = db
      .prepare(`SELECT * FROM media ${where} ORDER BY ${sort} LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as Array<Record<string, unknown>>;

    return {
      items: rowsToMedia(rows as never),
      total: countRow.total,
      limit,
      offset,
      configured: true,
    };
  };

  const payload = isPublicQuery
    ? await cachedAsync(cacheKey, 60, fetchMediaList)
    : fetchMediaList();

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    type?: MediaType;
    code?: string;
    title?: string;
    titleTh?: string;
    overview?: string;
    country?: string;
    year?: number;
    studio?: string;
    tags?: string[];
    actresses?: string[];
    posterUrl?: string;
    trailerUrl?: string;
    rating?: number;
  };

  const type = body.type ?? "jav";
  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const code = body.code ? normalizeJavCode(body.code) : undefined;
  const now = Date.now();
  const id = code ?? `m-${Math.random().toString(36).slice(2, 10)}`;

  if (code && db.prepare("SELECT id FROM media WHERE id = ?").get(id)) {
    return NextResponse.json({ error: `Media ${code} already exists in vault`, duplicate: true }, { status: 409 });
  }

  const actresses = (body.actresses ?? []).map((a) => a.trim()).filter(Boolean);
  const tokens = buildSearchTokens(title, { th: body.titleTh }, code, actresses);

  db.prepare(
    `INSERT INTO media (id, type, code, title, title_th, overview, country, year, studio,
       rating, trailer_url, status, search_tokens, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
  ).run(
    id,
    type,
    code ?? null,
    title,
    body.titleTh ?? null,
    body.overview ?? null,
    body.country ?? null,
    body.year ?? null,
    body.studio ?? null,
    body.rating ?? null,
    body.trailerUrl ?? null,
    tokens.join(" "),
    now,
    now,
  );

  for (const tag of (body.tags ?? []).map((t) => t.trim()).filter(Boolean)) {
    db.prepare("INSERT OR IGNORE INTO media_tags (media_id, tag) VALUES (?, ?)").run(id, tag);
  }
  setMediaActresses(id, actresses);

  if (body.posterUrl) {
    const dir = mediaDir(id);
    fs.mkdirSync(dir, { recursive: true });
    const ok = await downloadImage(body.posterUrl, path.join(dir, "poster.jpg"));
    if (ok) {
      db.prepare(
        `INSERT INTO media_images (media_id, kind, path, sort) VALUES (?, 'poster', 'poster.jpg', 0)`,
      ).run(id);
      db.prepare("UPDATE media SET poster_path = 'poster.jpg', updated_at = ? WHERE id = ?").run(now, id);
    }
  }

  audit(session.uid, "media.create", "media", id, { type, title });
  serverCache.invalidateByPrefix("media:");
  return NextResponse.json({ media: rowToMedia(getMediaRow(id)!) });
}