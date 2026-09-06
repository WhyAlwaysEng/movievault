import { db } from "@/lib/db";
import { fileUrl } from "@/lib/storage";
import type { Media, MediaSource, SeriesEpisode, SeriesSeason } from "@/lib/types";

interface MediaRow {
  id: string;
  type: string;
  code: string | null;
  title: string;
  title_th: string | null;
  title_ja: string | null;
  title_en: string | null;
  overview: string | null;
  country: string | null;
  year: number | null;
  studio: string | null;
  rating: number | null;
  votes?: number | null;
  views: number;
  tmdb_id: number | null;
  trailer_url: string | null;
  director?: string | null;
  runtime?: number | null;
  release_date?: string | null;
  tagline?: string | null;
  network?: string | null;
  extra_meta?: string | null;
  status: string;
  poster_path: string | null;
  backdrop_path: string | null;
  created_at: number;
  updated_at: number;
}

function resolveImageUrl(bucket: "media" | "actresses", id: string, p: string | null | undefined): string | undefined {
  if (!p) return undefined;
  if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith("/")) {
    return p;
  }
  return fileUrl(bucket, id, p);
}

export function rowToMedia(row: MediaRow): Media {
  const mediaId = row.id;
  let extraMeta: Record<string, unknown> = {};
  if (row.extra_meta) {
    try {
      extraMeta = JSON.parse(row.extra_meta);
    } catch {}
  }

  return {
    id: row.id,
    type: (row.type as Media["type"]) ?? "movie",
    code: row.code ?? undefined,
    title: row.title,
    altTitles: {
      th: row.title_th ?? undefined,
      ja: row.title_ja ?? undefined,
      en: row.title_en ?? undefined,
    },
    overview: row.overview ?? undefined,
    country: row.country ?? "US",
    posterUrl: resolveImageUrl("media", mediaId, row.poster_path) ?? "",
    backdropUrl: resolveImageUrl("media", mediaId, row.backdrop_path),
    previewImages: imagesOf(mediaId, "preview"),
    actors: actorsOf(mediaId),
    tags: tagsOf(mediaId),
    year: row.year ?? undefined,
    studio: row.studio ?? undefined,
    rating: row.rating ?? undefined,
    views: row.views ?? 0,
    trailerUrl: row.trailer_url ?? (extraMeta.trailerUrl as string | undefined),
    sources: sourcesOf(mediaId),
    searchTokens: [],
    status: row.status as Media["status"],
    updatedAt: row.updated_at,

    // Rich Metadata fields
    director: row.director ?? (extraMeta.director as string | undefined),
    runtime: row.runtime ?? (extraMeta.runtime as number | undefined),
    releaseDate: row.release_date ?? (extraMeta.releaseDate as string | undefined),
    tagline: row.tagline ?? (extraMeta.tagline as string | undefined),
    network: row.network ?? (extraMeta.network as string | undefined),
    castDetails:
      (extraMeta.castDetails as Media["castDetails"]) ||
      (extraMeta.actressDetails as Media["castDetails"]) ||
      undefined,
    crewDetails: (extraMeta.crewDetails as Media["crewDetails"]) || undefined,
    extraMeta,
    seasons: row.type === "series" ? seasonsOf(mediaId) : undefined,
  };
}

export function sourcesOf(mediaId: string): MediaSource[] {
  const rows = db
    .prepare(
      `SELECT label, url, kind, healthy, last_checked_at FROM media_sources
       WHERE media_id = ? ORDER BY sort ASC, id ASC`,
    )
    .all(mediaId) as Array<{
    label: string;
    url: string;
    kind: string;
    healthy: number;
    last_checked_at: number | null;
  }>;
  return rows.map((r) => ({
    label: r.label,
    url: r.url,
    kind: r.kind as MediaSource["kind"],
    healthy: r.healthy === 1,
    lastCheckedAt: r.last_checked_at ?? undefined,
  }));
}

export function tagsOf(mediaId: string): string[] {
  const rows = db
    .prepare("SELECT tag FROM media_tags WHERE media_id = ? ORDER BY tag")
    .all(mediaId) as Array<{ tag: string }>;
  return rows.map((r) => r.tag);
}

export function actorsOf(mediaId: string): string[] {
  const rows = db
    .prepare(
      `SELECT a.name FROM media_actors ma
       JOIN actresses a ON a.id = ma.actress_id
       WHERE ma.media_id = ? ORDER BY a.name`,
    )
    .all(mediaId) as Array<{ name: string }>;
  return rows.map((r) => r.name);
}

export function imagesOf(mediaId: string, kind: "poster" | "backdrop" | "preview"): string[] {
  const rows = db
    .prepare("SELECT path FROM media_images WHERE media_id = ? AND kind = ? ORDER BY sort")
    .all(mediaId, kind) as Array<{ path: string }>;
  return rows
    .map((r) => resolveImageUrl("media", mediaId, r.path))
    .filter((p): p is string => typeof p === "string" && !p.includes("/v/"));
}

export function seasonsOf(mediaId: string): SeriesSeason[] {
  try {
    const seasonRows = db
      .prepare("SELECT id, season_number FROM seasons WHERE media_id = ? ORDER BY season_number ASC")
      .all(mediaId) as Array<{ id: number; season_number: number }>;

    if (!seasonRows.length) return [];

    const episodeRows = db
      .prepare(
        `SELECT e.id, e.season_id, e.episode_number, e.title, e.overview, e.thumbnail_path, e.duration, e.sources
         FROM episodes e
         JOIN seasons s ON s.id = e.season_id
         WHERE s.media_id = ?
         ORDER BY s.season_number ASC, e.episode_number ASC`
      )
      .all(mediaId) as Array<{
        id: number;
        season_id: number;
        episode_number: number;
        title: string | null;
        overview: string | null;
        thumbnail_path: string | null;
        duration: number;
        sources: string;
      }>;

    const episodeMap = new Map<number, SeriesEpisode[]>();
    for (const ep of episodeRows) {
      let sources: MediaSource[] = [];
      try {
        sources = JSON.parse(ep.sources);
      } catch {}
      const list = episodeMap.get(ep.season_id) || [];
      list.push({
        id: ep.id,
        episodeNumber: ep.episode_number,
        title: ep.title || `Episode ${ep.episode_number}`,
        overview: ep.overview || undefined,
        thumbnailUrl: resolveImageUrl("media", mediaId, ep.thumbnail_path) || ep.thumbnail_path || undefined,
        duration: ep.duration,
        sources,
      });
      episodeMap.set(ep.season_id, list);
    }

    return seasonRows.map((s) => ({
      id: s.id,
      seasonNumber: s.season_number,
      name: `Season ${s.season_number}`,
      episodeCount: (episodeMap.get(s.id) || []).length,
      episodes: episodeMap.get(s.id) || [],
    }));
  } catch (_e) {
    return [];
  }
}

export function getMediaRow(id: string): MediaRow | undefined {
  return db.prepare("SELECT * FROM media WHERE id = ?").get(id) as MediaRow | undefined;
}

/**
 * Batch maps an array of MediaRows to Media objects.
 * Eliminates N+1 query overhead by bulk-fetching sources, tags, actors, and preview images
 * in single batched SQL queries.
 */
export function rowsToMedia(rows: MediaRow[]): Media[] {
  if (rows.length === 0) return [];
  if (rows.length === 1) return [rowToMedia(rows[0])];

  const mediaIds = rows.map((r) => r.id);
  const placeholders = mediaIds.map(() => "?").join(",");

  // 1. Batch sources
  const sourceRows = db
    .prepare(
      `SELECT media_id, label, url, kind, healthy, last_checked_at 
       FROM media_sources 
       WHERE media_id IN (${placeholders}) 
       ORDER BY sort ASC, id ASC`,
    )
    .all(...mediaIds) as Array<{
    media_id: string;
    label: string;
    url: string;
    kind: string;
    healthy: number;
    last_checked_at: number | null;
  }>;

  const sourcesMap = new Map<string, MediaSource[]>();
  for (const s of sourceRows) {
    const list = sourcesMap.get(s.media_id) || [];
    list.push({
      label: s.label,
      url: s.url,
      kind: s.kind as MediaSource["kind"],
      healthy: s.healthy === 1,
      lastCheckedAt: s.last_checked_at ?? undefined,
    });
    sourcesMap.set(s.media_id, list);
  }

  // 2. Batch tags
  const tagRows = db
    .prepare(
      `SELECT media_id, tag FROM media_tags 
       WHERE media_id IN (${placeholders}) 
       ORDER BY tag ASC`,
    )
    .all(...mediaIds) as Array<{ media_id: string; tag: string }>;

  const tagsMap = new Map<string, string[]>();
  for (const t of tagRows) {
    const list = tagsMap.get(t.media_id) || [];
    list.push(t.tag);
    tagsMap.set(t.media_id, list);
  }

  // 3. Batch actors
  const actorRows = db
    .prepare(
      `SELECT ma.media_id, a.name FROM media_actors ma 
       JOIN actresses a ON a.id = ma.actress_id 
       WHERE ma.media_id IN (${placeholders}) 
       ORDER BY a.name ASC`,
    )
    .all(...mediaIds) as Array<{ media_id: string; name: string }>;

  const actorsMap = new Map<string, string[]>();
  for (const a of actorRows) {
    const list = actorsMap.get(a.media_id) || [];
    list.push(a.name);
    actorsMap.set(a.media_id, list);
  }

  // 4. Batch preview images
  const imageRows = db
    .prepare(
      `SELECT media_id, path FROM media_images 
       WHERE media_id IN (${placeholders}) AND kind = 'preview' 
       ORDER BY sort ASC`,
    )
    .all(...mediaIds) as Array<{ media_id: string; path: string }>;

  const imagesMap = new Map<string, string[]>();
  for (const img of imageRows) {
    const url = resolveImageUrl("media", img.media_id, img.path);
    if (url && !url.includes("/v/")) {
      const list = imagesMap.get(img.media_id) || [];
      list.push(url);
      imagesMap.set(img.media_id, list);
    }
  }

  // Map each row using the pre-fetched dictionaries
  return rows.map((row) => {
    const mediaId = row.id;
    let extraMeta: Record<string, unknown> = {};
    if (row.extra_meta) {
      try {
        extraMeta = JSON.parse(row.extra_meta);
      } catch {}
    }

    return {
      id: row.id,
      type: (row.type as Media["type"]) ?? "movie",
      code: row.code ?? undefined,
      title: row.title,
      altTitles: {
        th: row.title_th ?? undefined,
        ja: row.title_ja ?? undefined,
        en: row.title_en ?? undefined,
      },
      overview: row.overview ?? undefined,
      country: row.country ?? "US",
      posterUrl: resolveImageUrl("media", mediaId, row.poster_path) ?? "",
      backdropUrl: resolveImageUrl("media", mediaId, row.backdrop_path),
      previewImages: imagesMap.get(mediaId) || [],
      actors: actorsMap.get(mediaId) || [],
      tags: tagsMap.get(mediaId) || [],
      year: row.year ?? undefined,
      studio: row.studio ?? undefined,
      rating: row.rating ?? undefined,
      views: row.views ?? 0,
      trailerUrl: row.trailer_url ?? (extraMeta.trailerUrl as string | undefined),
      sources: sourcesMap.get(mediaId) || [],
      searchTokens: [],
      status: row.status as Media["status"],
      updatedAt: row.updated_at,

      director: row.director ?? (extraMeta.director as string | undefined),
      runtime: row.runtime ?? (extraMeta.runtime as number | undefined),
      releaseDate: row.release_date ?? (extraMeta.releaseDate as string | undefined),
      tagline: row.tagline ?? (extraMeta.tagline as string | undefined),
      network: row.network ?? (extraMeta.network as string | undefined),
      castDetails:
        (extraMeta.castDetails as Media["castDetails"]) ||
        (extraMeta.actressDetails as Media["castDetails"]) ||
        undefined,
      crewDetails: (extraMeta.crewDetails as Media["crewDetails"]) || undefined,
      extraMeta,
      seasons: row.type === "series" ? seasonsOf(mediaId) : undefined,
    };
  });
}