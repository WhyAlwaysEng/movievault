import { NextRequest, NextResponse } from "next/server";
import { tvmazeSearch } from "@/lib/providers/tvmaze";
import { searchTvOnly, tmdbConfigured, tmdbImage } from "@/lib/providers/tmdb";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const source = req.nextUrl.searchParams.get("source") || "tvmaze";

  if (!q.trim()) {
    return NextResponse.json({ source, results: [], tmdbConfigured });
  }

  try {
    if (source === "tmdb" && tmdbConfigured) {
      const hits = await searchTvOnly(q);
      const results = hits.map((h) => ({
        source: "tmdb" as const,
        id: h.id,
        title: h.title,
        year: h.release_date ? parseInt(h.release_date.slice(0, 4), 10) : undefined,
        genres: [],
        rating: h.vote_average,
        posterUrl: tmdbImage(h.poster_path, "w500"),
        overview: h.overview,
      }));
      return NextResponse.json({ source: "tmdb", results, tmdbConfigured });
    }

    // Default: TVMaze (100% Free, 0 keys needed)
    const hits = await tvmazeSearch(q);
    const results = hits.map((h) => ({
      source: "tvmaze" as const,
      id: h.id,
      title: h.name,
      year: h.year,
      genres: h.genres,
      status: h.status,
      network: h.network,
      rating: h.rating,
      posterUrl: h.posterUrl,
      overview: h.summary,
    }));
    return NextResponse.json({ source: "tvmaze", results, tmdbConfigured });
  } catch (err) {
    return NextResponse.json(
      { source, results: [], error: (err as Error).message, tmdbConfigured },
      { status: 500 },
    );
  }
}
