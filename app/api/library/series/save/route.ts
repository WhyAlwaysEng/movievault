import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/server/auth";
import { getMediaRow, rowToMedia } from "@/lib/server/mapper";
import { audit } from "@/lib/server/audit";
import { setMediaActresses } from "@/lib/server/actresses";
import { downloadImage, mediaDir } from "@/lib/storage";
import { tvmazeGetEpisodes, tvmazeGetShowFull } from "@/lib/providers/tvmaze";
import { tmdbDetail, tmdbImage } from "@/lib/providers/tmdb";
import fs from "node:fs";
import path from "node:path";
import { buildSearchTokens } from "@/lib/utils/normalize";

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    source: "tvmaze" | "tmdb";
    id: number;
    title: string;
    overview?: string;
    year?: number;
    genres?: string[];
    rating?: number;
    posterUrl?: string;
  };

  if (!body.id || !body.title) {
    return NextResponse.json({ error: "id and title required" }, { status: 400 });
  }

  const mediaId = body.source === "tmdb" ? `tmdb-tv-${body.id}` : `tvmaze-${body.id}`;

  const dup = db.prepare("SELECT id FROM media WHERE id = ?").get(mediaId) as
    | { id: string }
    | undefined;
  if (dup) {
    return NextResponse.json({ ok: true, duplicate: true, mediaId: dup.id });
  }

  const now = Date.now();
  const dir = mediaDir(mediaId);
  fs.mkdirSync(dir, { recursive: true });

  let posterSaved = false;
  let backdropSaved = false;
  let finalPosterUrl = body.posterUrl;
  let finalBackdropUrl = body.posterUrl;
  let finalOverview = body.overview || "";
  let finalYear = body.year || null;
  let finalRating = body.rating || null;
  let genres = body.genres || [];
  let network: string | undefined = undefined;
  let schedule: string | undefined = undefined;
  let runtime: number | undefined = undefined;
  let castDetails: Array<{ name: string; character?: string; avatarUrl?: string }> = [];
  let crewDetails: Array<{ name: string; role: string }> = [];
  let extraMetaObj: Record<string, unknown> = {};
  let fullShow: any = null;

  let country: string = "KR"; // Fallback for series

  if (body.source === "tvmaze") {
    try {
      fullShow = await tvmazeGetShowFull(body.id);
      finalPosterUrl = fullShow.posterUrl || finalPosterUrl;
      finalBackdropUrl = fullShow.backdropUrl || finalPosterUrl;
      finalOverview = fullShow.summary || finalOverview;
      finalRating = fullShow.rating || finalRating;
      genres = fullShow.genres.length ? fullShow.genres : genres;
      network = fullShow.network;
      schedule = fullShow.schedule;
      runtime = fullShow.runtime;
      country = fullShow.country || (fullShow.language === "Korean" ? "KR" : fullShow.language === "Japanese" ? "JP" : "US");
      castDetails = fullShow.castDetails;
      crewDetails = fullShow.crewDetails;
      extraMetaObj = {
        schedule,
        officialSite: fullShow.officialSite,
        imdbId: fullShow.imdbId,
        seriesStatus: fullShow.status,
        castDetails,
        crewDetails,
      };
    } catch (_err) {
      // fallback to basic
    }
  } else if (body.source === "tmdb") {
    try {
      const d = await tmdbDetail("tv", body.id);
      finalPosterUrl = tmdbImage(d.poster_path, "w500") || finalPosterUrl;
      finalBackdropUrl = tmdbImage(d.backdrop_path, "w1280") || finalBackdropUrl;
      finalOverview = d.overview || finalOverview;
      finalYear = Number((d.first_air_date ?? "").slice(0, 4)) || finalYear;
      finalRating = d.vote_average || finalRating;
      genres = (d.genres ?? []).map((g: { name: string }) => g.name);
      network = d.networks?.[0]?.name;
      country =
        d.origin_country?.[0] ||
        d.production_countries?.[0]?.iso_3166_1 ||
        (d.original_language === "zh" || d.original_language === "cn" ? "CN" : d.original_language === "ko" ? "KR" : d.original_language === "ja" ? "JP" : "US");
      castDetails = (d.credits?.cast ?? []).slice(0, 15).map((c: any) => ({
        name: c.name,
        character: c.character,
        avatarUrl: tmdbImage(c.profile_path, "w185"),
      }));
      extraMetaObj = {
        castDetails,
        tagline: d.tagline,
        numberOfSeasons: d.number_of_seasons,
        numberOfEpisodes: d.number_of_episodes,
      };
    } catch (_e) {
      // Keep basic info from search
    }
  }

  if (finalPosterUrl) {
    posterSaved = await downloadImage(finalPosterUrl, path.join(dir, "poster.jpg"));
  }
  if (finalBackdropUrl) {
    backdropSaved = await downloadImage(finalBackdropUrl, path.join(dir, "backdrop.jpg"));
  }

  const castNames = castDetails.map((c) => c.name);
  const tokens = buildSearchTokens(
    body.title,
    { th: body.title, en: body.title },
    undefined,
    castNames,
  ).join(" ");

  db.prepare(`
    INSERT INTO media (
      id, type, title, title_th, title_en, overview, country, year,
      rating, network, runtime, extra_meta, status, poster_path, backdrop_path,
      search_tokens, created_at, updated_at
    ) VALUES (
      ?, 'series', ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, 'published', ?, ?,
      ?, ?, ?
    )
  `).run(
    mediaId,
    body.title,
    body.title,
    body.title,
    finalOverview,
    country,
    finalYear,
    finalRating,
    network || null,
    runtime || null,
    JSON.stringify(extraMetaObj),
    posterSaved ? "poster.jpg" : finalPosterUrl || null,
    backdropSaved ? "backdrop.jpg" : finalBackdropUrl || null,
    tokens,
    now,
    now,
  );

  // Add tags
  const insTag = db.prepare("INSERT OR IGNORE INTO media_tags (media_id, tag) VALUES (?, ?)");
  for (const g of genres) {
    insTag.run(mediaId, g);
  }

  // Populate seasons and episodes!
  let episodeCount = 0;
  if (fullShow?.episodes?.length) {
    try {
      const episodes = fullShow.episodes;
      const seasonMap = new Map<number, number>();

      const insSeason = db.prepare(
        "INSERT OR IGNORE INTO seasons (media_id, season_number) VALUES (?, ?)",
      );
      const getSeason = db.prepare(
        "SELECT id FROM seasons WHERE media_id = ? AND season_number = ?",
      );
      const insEpisode = db.prepare(`
        INSERT OR IGNORE INTO episodes (
          season_id, episode_number, title, overview, thumbnail_path, duration, sources
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const ep of episodes) {
        if (!seasonMap.has(ep.season)) {
          insSeason.run(mediaId, ep.season);
          const sRow = getSeason.get(mediaId, ep.season) as { id: number };
          seasonMap.set(ep.season, sRow.id);
        }
        const sId = seasonMap.get(ep.season)!;
        const defaultSources = JSON.stringify([]);

        insEpisode.run(
          sId,
          ep.episode,
          ep.name,
          ep.summary || "",
          ep.thumbnailUrl || null,
          ep.runtime || 2400,
          defaultSources,
        );
        episodeCount++;
      }
    } catch (_err) {
      // Ignore
    }
  }

  // Fallback default stream source on media_sources
  db.prepare(`
    INSERT INTO media_sources (media_id, label, url, kind, healthy, sort)
    VALUES (?, 'Main Server (HLS)', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', 'hls', 1, 0)
  `).run(mediaId);

  if (castDetails.length > 0) {
    setMediaActresses(mediaId, castDetails, country);
  } else if (castNames.length > 0) {
    setMediaActresses(mediaId, castNames, country);
  }

  audit(session.uid, "library.save_series", "media", mediaId, {
    source: body.source,
    id: body.id,
    title: body.title,
    episodes: episodeCount,
  });

  return NextResponse.json({
    ok: true,
    duplicate: false,
    media: rowToMedia(getMediaRow(mediaId)!),
  });
}
