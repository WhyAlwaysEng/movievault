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

import { scrapeJavDb } from "@/lib/providers/javdb";

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { mediaId?: string };
  const mediaId = body.mediaId;
  if (!mediaId) return NextResponse.json({ error: "mediaId required" }, { status: 400 });

  const row = getMediaRow(mediaId);
  if (!row) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  // ── Handle JAV Refetch ──────────────────────────────────────────────────
  if (row.type === "jav") {
    const code = row.code || row.id.replace(/^jav-/, "").toUpperCase();
    const item = await scrapeJavDb(code);
    const now = Date.now();

    const previewImages = (item.previewImages || []).slice(0, 12);
    const extraMeta = JSON.stringify({
      label: item.label,
      maker: item.studio,
      series: item.series,
      censored: true,
      actressDetails: item.actressDetails,
      previewImages,
    });

    db.prepare(`
      UPDATE media SET
        title = ?, title_ja = ?, studio = ?, director = ?,
        runtime = ?, release_date = ?, rating = ?,
        extra_meta = ?, updated_at = ?
      WHERE id = ?
    `).run(
      item.title,
      item.titleJa || null,
      item.studio || null,
      item.director || null,
      item.duration || null,
      item.releaseDate || null,
      item.rating || null,
      extraMeta,
      now,
      mediaId,
    );

    // Update tags
    db.prepare("DELETE FROM media_tags WHERE media_id = ?").run(mediaId);
    const insTag = db.prepare("INSERT OR IGNORE INTO media_tags (media_id, tag) VALUES (?, ?)");
    for (const t of item.tags) insTag.run(mediaId, t);

    // Update actresses
    setMediaActresses(mediaId, item.actresses);

    audit(session.uid, "library.refetch", "media", mediaId, { code });
    return NextResponse.json({ ok: true, media: rowToMedia(getMediaRow(mediaId)!) });
  }

  if (!row.tmdb_id) {
    return NextResponse.json({ error: "Missing tmdb_id for movie/series" }, { status: 400 });
  }

  const mediaType = row.type === "series" ? "tv" : "movie";
  const d = await tmdbDetail(mediaType, row.tmdb_id);
  const now = Date.now();
  const title = (d.title ?? d.name ?? row.title).trim();

  const dir = mediaDir(mediaId);
  fs.mkdirSync(dir, { recursive: true });
  const posterUrl = tmdbImage(d.poster_path, "w500");
  const backdropUrl = tmdbImage(d.backdrop_path, "w1280");
  const posterSaved = posterUrl ? await downloadImage(posterUrl, path.join(dir, "poster.jpg")) : false;
  const backdropSaved = backdropUrl ? await downloadImage(backdropUrl, path.join(dir, "backdrop.jpg")) : false;

  // refresh previews: clear old, download new
  db.prepare("DELETE FROM media_images WHERE media_id = ? AND kind = 'preview'").run(mediaId);
  const previewPaths: string[] = [];
  const backdrops = (d.images?.backdrops ?? []).slice(0, 12) as Array<{ file_path?: string }>;
  for (let i = 0; i < backdrops.length; i++) {
    const url = tmdbImage(backdrops[i].file_path, "w780");
    if (!url) continue;
    const file = `preview-${String(i + 1).padStart(2, "0")}.jpg`;
    if (await downloadImage(url, path.join(dir, file))) previewPaths.push(file);
  }

  const country = d.origin_country?.[0] ?? d.production_countries?.[0]?.iso_3166_1 ?? (d.original_language === "ko" ? "KR" : d.original_language === "ja" ? "JP" : row.country || "US");
  const year = Number((d.release_date ?? d.first_air_date ?? "").slice(0, 4)) || null;
  const genres = (d.genres ?? []).map((g: { name: string }) => g.name);
  const cast = (d.credits?.cast ?? [])
    .map((c: { name?: string }) => c.name)
    .filter(Boolean)
    .slice(0, 15);

  db.prepare(
    `UPDATE media SET title = ?, title_th = ?, title_en = ?, overview = ?, country = ?, year = ?,
       rating = ?, votes = ?, status = 'draft',
       poster_path = ?, backdrop_path = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    title,
    title,
    d.original_title ?? d.original_name ?? null,
    d.overview ?? null,
    country,
    year,
    d.vote_average ?? null,
    d.vote_count ?? null,
    posterSaved ? "poster.jpg" : row.poster_path,
    backdropSaved ? "backdrop.jpg" : row.backdrop_path,
    now,
    mediaId,
  );

  const insImg = db.prepare(
    "INSERT OR IGNORE INTO media_images (media_id, kind, path, sort) VALUES (?, ?, ?, ?)",
  );
  if (posterSaved) insImg.run(mediaId, "poster", "poster.jpg", 0);
  if (backdropSaved) insImg.run(mediaId, "backdrop", "backdrop.jpg", 0);
  previewPaths.forEach((p, i) => insImg.run(mediaId, "preview", p, i));

  const insTag = db.prepare("INSERT OR IGNORE INTO media_tags (media_id, tag) VALUES (?, ?)");
  for (const g of genres) insTag.run(mediaId, g);
  setMediaActresses(mediaId, cast, country);

  audit(session.uid, "library.refetch", "media", mediaId, { tmdbId: row.tmdb_id });

  return NextResponse.json({ ok: true, media: rowToMedia(getMediaRow(mediaId)!) });
}