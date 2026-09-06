import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/server/auth";
import { getMediaRow, rowToMedia } from "@/lib/server/mapper";
import { setMediaActresses } from "@/lib/server/actresses";
import { audit } from "@/lib/server/audit";
import { downloadImage, mediaDir } from "@/lib/storage";
import { tmdbDetail, tmdbImage, extractTmdbMovieData } from "@/lib/providers/tmdb";
import fs from "node:fs";
import path from "node:path";
import { buildSearchTokens } from "@/lib/utils/normalize";

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { tmdbId?: number };
  const tmdbId = Number(body.tmdbId);
  if (!tmdbId) return NextResponse.json({ error: "tmdbId required" }, { status: 400 });

  const dup = db.prepare("SELECT id FROM media WHERE tmdb_id = ?").get(tmdbId) as
    | { id: string }
    | undefined;
  if (dup) {
    return NextResponse.json({ ok: true, duplicate: true, mediaId: dup.id });
  }

  const d = await tmdbDetail("movie", tmdbId);
  const mediaId = `tmdb-${tmdbId}`;
  const now = Date.now();
  const info = extractTmdbMovieData(d);
  if (!info.title) return NextResponse.json({ error: "empty title from TMDB" }, { status: 502 });

  // Download images into data/media/{id}/
  const dir = mediaDir(mediaId);
  fs.mkdirSync(dir, { recursive: true });
  let posterSaved = false;
  let backdropSaved = false;
  if (info.posterUrl) posterSaved = await downloadImage(info.posterUrl, path.join(dir, "poster.jpg"));
  if (info.backdropUrl) backdropSaved = await downloadImage(info.backdropUrl, path.join(dir, "backdrop.jpg"));

  const previewPaths: string[] = [];
  for (let i = 0; i < info.previewImageUrls.length; i++) {
    const file = `preview-${String(i + 1).padStart(2, "0")}.jpg`;
    if (await downloadImage(info.previewImageUrls[i], path.join(dir, file))) {
      previewPaths.push(file);
    }
  }

  const castNames = info.castDetails.map((c: { name: string }) => c.name);
  const tokens = buildSearchTokens(
    info.title,
    { th: info.title, en: info.originalTitle },
    undefined,
    castNames,
  ).join(" ");

  const extraMeta = JSON.stringify({
    budget: info.budget,
    revenue: info.revenue,
    castDetails: info.castDetails,
    crewDetails: info.crewDetails,
    productionCompanies: info.productionCompanies,
  });

  db.prepare(
    `INSERT INTO media (id, type, title, title_th, title_en, overview, country, year,
       tmdb_id, rating, votes, trailer_url, director, runtime, release_date, tagline, studio,
       extra_meta, status, poster_path, backdrop_path,
       search_tokens, created_at, updated_at)
     VALUES (?, 'movie', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?)`,
  ).run(
    mediaId,
    info.title,
    info.title,
    info.originalTitle ?? null,
    info.overview ?? null,
    info.country,
    info.year ?? null,
    tmdbId,
    info.rating ?? null,
    info.votes ?? null,
    info.trailerUrl ?? null,
    info.director ?? null,
    info.runtime ?? null,
    info.releaseDate ?? null,
    info.tagline ?? null,
    info.studio ?? null,
    extraMeta,
    posterSaved ? "poster.jpg" : info.posterUrl || null,
    backdropSaved ? "backdrop.jpg" : info.backdropUrl || null,
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
  for (const g of info.genres) insTag.run(mediaId, g);
  for (const k of info.keywords.slice(0, 10)) insTag.run(mediaId, k);

  // Default test stream source
  db.prepare(`
    INSERT INTO media_sources (media_id, label, url, kind, healthy, sort)
    VALUES (?, 'Main Server (4K)', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', 'hls', 1, 0)
  `).run(mediaId);

  if (info.castDetails && info.castDetails.length > 0) {
    setMediaActresses(mediaId, info.castDetails);
  } else {
    setMediaActresses(mediaId, castNames);
  }

  audit(session.uid, "library.save_movie", "media", mediaId, {
    tmdbId,
    title: info.title,
    cast: castNames.length,
  });

  return NextResponse.json({
    ok: true,
    duplicate: false,
    media: rowToMedia(getMediaRow(mediaId)!),
  });
}
