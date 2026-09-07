import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/server/auth";
import { getMediaRow, rowToMedia } from "@/lib/server/mapper";
import { setMediaActresses } from "@/lib/server/actresses";
import { audit } from "@/lib/server/audit";
import { downloadImage, mediaDir } from "@/lib/storage";
import { tmdbDetail, tmdbImage } from "@/lib/providers/tmdb";
import fs from "node:fs";
import path from "node:path";
import { buildSearchTokens } from "@/lib/utils/normalize";

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { tmdbId?: number; type?: "movie" | "tv" };
  const tmdbId = Number(body.tmdbId);
  const mediaType = body.type === "tv" ? "tv" : "movie";
  if (!tmdbId) return NextResponse.json({ error: "tmdbId required" }, { status: 400 });

  const dup = db.prepare("SELECT id FROM media WHERE tmdb_id = ?").get(tmdbId) as
    | { id: string }
    | undefined;
  if (dup) {
    return NextResponse.json({ ok: true, duplicate: true, mediaId: dup.id });
  }

  const d = await tmdbDetail(mediaType, tmdbId);
  const mediaId = `tmdb-${tmdbId}`;
  const now = Date.now();
  const title = (d.title ?? d.name ?? "").trim();
  if (!title) return NextResponse.json({ error: "empty title from API" }, { status: 502 });

  // ── download images into data/media/{id}/ ────────────────────────────────
  const dir = mediaDir(mediaId);
  fs.mkdirSync(dir, { recursive: true });
  const posterUrl = tmdbImage(d.poster_path, "w500");
  const backdropUrl = tmdbImage(d.backdrop_path, "w1280");
  let posterSaved = false;
  let backdropSaved = false;
  if (posterUrl) posterSaved = await downloadImage(posterUrl, path.join(dir, "poster.jpg"));
  if (backdropUrl) backdropSaved = await downloadImage(backdropUrl, path.join(dir, "backdrop.jpg"));

  const previewPaths: string[] = [];
  const backdrops = (d.images?.backdrops ?? []).slice(0, 12) as Array<{ file_path?: string }>;
  for (let i = 0; i < backdrops.length; i++) {
    const url = tmdbImage(backdrops[i].file_path, "w780");
    if (!url) continue;
    const file = `preview-${String(i + 1).padStart(2, "0")}.jpg`;
    if (await downloadImage(url, path.join(dir, file))) previewPaths.push(file);
  }

  // ── assemble fields ───────────────────────────────────────────────────────
  const year = Number((d.release_date ?? d.first_air_date ?? "").slice(0, 4)) || null;
  const country =
    d.origin_country?.[0] ??
    d.production_countries?.[0]?.iso_3166_1 ??
    (d.original_language === "zh" || d.original_language === "cn" ? "CN" : d.original_language === "ko" ? "KR" : d.original_language === "ja" ? "JP" : "US");
  const genres = (d.genres ?? []).map((g: { name: string }) => g.name);
  const cast = (d.credits?.cast ?? [])
    .map((c: { name?: string }) => c.name)
    .filter(Boolean)
    .slice(0, 15);
  const trailer = (d.videos?.results ?? []).find(
    (v: { site?: string; type?: string }) => v.site === "YouTube" && v.type === "Trailer",
  );
  const tokens = buildSearchTokens(
    title,
    { th: title, en: d.original_title ?? d.original_name },
    undefined,
    cast,
  ).join(" ");

  db.prepare(
    `INSERT INTO media (id, type, title, title_th, title_en, overview, country, year,
       tmdb_id, rating, votes, trailer_url, status, poster_path, backdrop_path,
       search_tokens, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)`,
  ).run(
    mediaId,
    mediaType === "movie" ? "movie" : "series",
    title,
    title,
    d.original_title ?? d.original_name ?? null,
    d.overview ?? null,
    country,
    year,
    tmdbId,
    d.vote_average ?? null,
    d.vote_count ?? null,
    trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    posterSaved ? "poster.jpg" : null,
    backdropSaved ? "backdrop.jpg" : null,
    tokens,
    now,
    now,
  );

  const insImg = db.prepare(
    "INSERT INTO media_images (media_id, kind, path, sort) VALUES (?, ?, ?, ?)",
  );
  if (posterSaved) insImg.run(mediaId, "poster", "poster.jpg", 0);
  if (backdropSaved) insImg.run(mediaId, "backdrop", "backdrop.jpg", 0);
  previewPaths.forEach((p, i) => insImg.run(mediaId, "preview", p, i));

  const insTag = db.prepare("INSERT OR IGNORE INTO media_tags (media_id, tag) VALUES (?, ?)");
  for (const g of genres) insTag.run(mediaId, g);

  setMediaActresses(mediaId, cast, country);

  audit(session.uid, "library.save_tmdb", "media", mediaId, {
    tmdbId,
    mediaType,
    title,
    actresses: cast.length,
    previews: previewPaths.length,
  });

  return NextResponse.json({ ok: true, duplicate: false, media: rowToMedia(getMediaRow(mediaId)!) });
}