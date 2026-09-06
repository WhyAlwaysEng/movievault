import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, requireAdmin } from "@/lib/server/auth";
import { getMediaRow, rowToMedia } from "@/lib/server/mapper";
import { setMediaActresses, refreshMediaCounts } from "@/lib/server/actresses";
import { audit } from "@/lib/server/audit";
import { mediaDir } from "@/lib/storage";
import fs from "node:fs";
import { buildSearchTokens, normalizeJavCode } from "@/lib/utils/normalize";
import type { Media } from "@/lib/types";
import { cachedAsync, serverCache } from "@/lib/server/cache";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const data = await cachedAsync(`media:detail:${id}`, 120, () => {
    const row = getMediaRow(id);
    if (!row) return null;
    const media = rowToMedia(row);

    // 1. If media has a franchise seriesName, query other titles in the same series
    let seriesWorks: Media[] = [];
    const seriesName = (media.extraMeta?.seriesName as string) || (media.extraMeta?.series as string);
    if (seriesName && seriesName.trim()) {
      const sRows = db
        .prepare(
          `SELECT * FROM media
           WHERE id != ?
             AND (extra_meta LIKE ? OR extra_meta LIKE ?)
             AND status = 'published'
           ORDER BY year DESC, created_at DESC LIMIT 20`,
        )
        .all(media.id, `%"seriesName":"${seriesName}"%`, `%"series":"${seriesName}"%`) as Array<Record<string, unknown>>;
      seriesWorks = sRows.map((r) => rowToMedia(r as never));
    }

    return { media, seriesWorks };
  });

  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
    },
  });
}

interface SourceInput {
  label?: string;
  url?: string;
  kind?: "hls" | "embed" | "local" | "other";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const row = getMediaRow(id);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json()) as {
    title?: string;
    titleTh?: string;
    titleJa?: string;
    titleEn?: string;
    overview?: string;
    country?: string;
    year?: number;
    studio?: string;
    rating?: number;
    trailerUrl?: string;
    status?: string;
    sources?: SourceInput[];
    director?: string;
    runtime?: number;
    releaseDate?: string;
    tagline?: string;
    network?: string;
    tags?: string[];
    actresses?: string[];
  };

  const now = Date.now();
  const fields: string[] = [];
  const values: unknown[] = [];

  const scalars: Array<[keyof typeof body, string]> = [
    ["title", "title"],
    ["titleTh", "title_th"],
    ["titleJa", "title_ja"],
    ["titleEn", "title_en"],
    ["overview", "overview"],
    ["country", "country"],
    ["studio", "studio"],
    ["trailerUrl", "trailer_url"],
    ["director", "director"],
    ["releaseDate", "release_date"],
    ["tagline", "tagline"],
    ["network", "network"],
  ];
  for (const [key, col] of scalars) {
    if (body[key] !== undefined) {
      fields.push(`${col} = ?`);
      values.push((body[key] as string | null) ?? null);
    }
  }
  if (body.year !== undefined) {
    fields.push("year = ?");
    values.push(body.year ?? null);
  }
  if (body.runtime !== undefined) {
    fields.push("runtime = ?");
    values.push(body.runtime ?? null);
  }
  if (body.rating !== undefined) {
    fields.push("rating = ?");
    values.push(body.rating ?? null);
  }
  if (body.status === "draft" || body.status === "published" || body.status === "flagged") {
    fields.push("status = ?");
    values.push(body.status);
  }

  // sources: wholesale replace
  if (body.sources) {
    db.prepare("DELETE FROM media_sources WHERE media_id = ?").run(id);
    const ins = db.prepare(
      `INSERT INTO media_sources (media_id, label, url, kind, sort) VALUES (?, ?, ?, ?, ?)`,
    );
    body.sources
      .filter((s) => s.label?.trim() && s.url?.trim())
      .forEach((s, i) => ins.run(id, s.label!.trim(), s.url!.trim(), s.kind ?? "hls", i));
  }

  // tags: wholesale replace
  if (body.tags) {
    db.prepare("DELETE FROM media_tags WHERE media_id = ?").run(id);
    const ins = db.prepare("INSERT OR IGNORE INTO media_tags (media_id, tag) VALUES (?, ?)");
    for (const t of body.tags.map((t) => t.trim()).filter(Boolean)) ins.run(id, t);
  }

  // actresses: sync both ways
  if (body.actresses) {
    setMediaActresses(id, body.actresses.map((a) => a.trim()).filter(Boolean));
  }

  if (body.title !== undefined || body.actresses) {
    const final = getMediaRow(id)!;
    const names = (
      db
        .prepare(
          `SELECT a.name FROM media_actors ma JOIN actresses a ON a.id = ma.actress_id WHERE ma.media_id = ?`,
        )
        .all(id) as Array<{ name: string }>
    ).map((r) => r.name);
    const tokens = buildSearchTokens(
      body.title ?? final.title,
      { th: body.titleTh ?? final.title_th ?? undefined, en: final.title_en ?? undefined, ja: final.title_ja ?? undefined },
      final.code ?? undefined,
      names,
    );
    fields.push("search_tokens = ?");
    values.push(tokens.join(" "));
  }

  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE media SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  refreshMediaCounts();
  serverCache.invalidateByPrefix("media:");
  audit(session.uid, "media.update", "media", id, {
    fields: fields.filter((f) => !f.includes("search_tokens")),
  });

  return NextResponse.json({ media: rowToMedia(getMediaRow(id)!) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const row = getMediaRow(id);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  db.prepare("DELETE FROM media WHERE id = ?").run(id);
  fs.rmSync(mediaDir(id), { recursive: true, force: true });
  refreshMediaCounts();
  serverCache.invalidateByPrefix("media:");
  audit(session.uid, "media.delete", "media", id, { code: row.code ?? row.title });

  return NextResponse.json({ ok: true });
}