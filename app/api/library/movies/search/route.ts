import { NextRequest, NextResponse } from "next/server";
import { searchMoviesOnly, tmdbConfigured, tmdbImage } from "@/lib/providers/tmdb";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ configured: tmdbConfigured, results: [] });
  }

  try {
    const hits = await searchMoviesOnly(q);
    const results = hits.map((h) => ({
      tmdbId: h.id,
      mediaType: "movie" as const,
      title: h.title,
      overview: h.overview,
      year: h.release_date ? parseInt(h.release_date.slice(0, 4), 10) : undefined,
      rating: h.vote_average,
      posterUrl: tmdbImage(h.poster_path, "w500"),
      backdropUrl: tmdbImage(h.backdrop_path, "w1280"),
    }));
    return NextResponse.json({ configured: tmdbConfigured, results });
  } catch (err) {
    return NextResponse.json(
      { configured: tmdbConfigured, results: [], error: (err as Error).message },
      { status: 500 },
    );
  }
}
