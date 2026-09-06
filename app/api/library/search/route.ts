import { NextRequest, NextResponse } from "next/server";
import { tmdbConfigured, tmdbImage, tmdbSearch } from "@/lib/providers/tmdb";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") ?? "tmdb";
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ configured: provider === "tmdb" ? tmdbConfigured : false, results: [] });

  if (provider === "tmdb") {
    const hits = await tmdbSearch(q);
    return NextResponse.json({
      configured: tmdbConfigured,
      results: hits.map((h) => ({
        tmdbId: h.id,
        mediaType: h.media_type,
        title: h.title,
        overview: h.overview,
        year: h.release_date ? Number(h.release_date.slice(0, 4)) : undefined,
        rating: h.vote_average,
        posterUrl: tmdbImage(h.poster_path, "w342"),
        backdropUrl: tmdbImage(h.backdrop_path, "w780"),
      })),
    });
  }

  return NextResponse.json({ configured: false, results: [] });
}