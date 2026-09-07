// TMDB provider (§8 — free API, key stays server-side).
const API_KEY = process.env.TMDB_API_KEY ?? "";
const BASE = "https://api.themoviedb.org/3";

export const tmdbConfigured = Boolean(API_KEY);

export interface TmdbHit {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  vote_average?: number;
}

export async function tmdbSearch(query: string): Promise<TmdbHit[]> {
  if (!API_KEY) return [];
  const url = `${BASE}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US&include_adult=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: Array<Record<string, unknown>> };
  return (data.results ?? [])
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .map((r) => ({
      id: r.id as number,
      media_type: r.media_type as "movie" | "tv",
      title: (r.title ?? r.name ?? "") as string,
      overview: (r.overview as string) || undefined,
      poster_path: (r.poster_path as string | null) ?? undefined,
      backdrop_path: (r.backdrop_path as string | null) ?? undefined,
      release_date: ((r.release_date ?? r.first_air_date) as string) || undefined,
      vote_average: (r.vote_average as number) || undefined,
    }));
}

/** Search Movies Only (Specifically for Movies Vault) */
export async function searchMoviesOnly(query: string): Promise<TmdbHit[]> {
  if (!API_KEY) return [];
  const url = `${BASE}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US&include_adult=false`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: Array<Record<string, unknown>> };
  return (data.results ?? []).map((r) => ({
    id: r.id as number,
    media_type: "movie",
    title: (r.title ?? r.name ?? "") as string,
    overview: (r.overview as string) || undefined,
    poster_path: (r.poster_path as string | null) ?? undefined,
    backdrop_path: (r.backdrop_path as string | null) ?? undefined,
    release_date: (r.release_date as string) || undefined,
    vote_average: (r.vote_average as number) || undefined,
  }));
}

/** Search TV Series Only (Specifically for Series Vault) */
export async function searchTvOnly(query: string): Promise<TmdbHit[]> {
  if (!API_KEY) return [];
  const url = `${BASE}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US&include_adult=false`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: Array<Record<string, unknown>> };
  return (data.results ?? []).map((r) => ({
    id: r.id as number,
    media_type: "tv",
    title: (r.name ?? r.title ?? "") as string,
    overview: (r.overview as string) || undefined,
    poster_path: (r.poster_path as string | null) ?? undefined,
    backdrop_path: (r.backdrop_path as string | null) ?? undefined,
    release_date: (r.first_air_date as string) || undefined,
    vote_average: (r.vote_average as number) || undefined,
  }));
}

/** Full details with credits/images/videos/keywords appended. */
export async function tmdbDetail(mediaType: "movie" | "tv", id: number): Promise<any> {
  const url = `${BASE}/${mediaType}/${id}?api_key=${API_KEY}&language=en-US&append_to_response=credits,images,videos,keywords,release_dates`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`TMDB returned ${res.status}`);
  return res.json();
}

export function tmdbImage(path: string | null | undefined, size: string): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function extractTmdbMovieData(d: any) {
  const director = (d.credits?.crew ?? []).find((c: any) => c.job === "Director")?.name;
  const writers = (d.credits?.crew ?? [])
    .filter((c: any) => c.job === "Screenplay" || c.job === "Writer")
    .map((c: any) => c.name);

  const castDetails = (d.credits?.cast ?? []).slice(0, 15).map((c: any) => ({
    name: c.name,
    character: c.character || undefined,
    avatarUrl: tmdbImage(c.profile_path, "w185") || undefined,
  }));

  const crewDetails: Array<{ name: string; role: string }> = [];
  if (director) crewDetails.push({ name: director, role: "Director" });
  writers.forEach((w: string) => crewDetails.push({ name: w, role: "Writer" }));

  const trailer = (d.videos?.results ?? []).find(
    (v: { site?: string; type?: string }) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"),
  );

  const productionCompanies = (d.production_companies ?? []).map((p: any) => ({
    name: p.name,
    logoUrl: tmdbImage(p.logo_path, "w185") || undefined,
  }));

  const keywords = (d.keywords?.keywords ?? []).map((k: any) => k.name);

  return {
    title: (d.title ?? d.name ?? "").trim(),
    originalTitle: d.original_title ?? d.original_name,
    tagline: d.tagline || undefined,
    overview: d.overview || undefined,
    runtime: typeof d.runtime === "number" && d.runtime > 0 ? d.runtime : undefined,
    releaseDate: d.release_date || undefined,
    year: Number((d.release_date ?? "").slice(0, 4)) || undefined,
    country:
      d.origin_country?.[0] ??
      d.production_countries?.[0]?.iso_3166_1 ??
      (d.original_language === "zh" || d.original_language === "cn" ? "CN" : d.original_language === "ko" ? "KR" : d.original_language === "ja" ? "JP" : "US"),
    rating: d.vote_average || undefined,
    votes: d.vote_count || undefined,
    budget: d.budget > 0 ? d.budget : undefined,
    revenue: d.revenue > 0 ? d.revenue : undefined,
    studio: productionCompanies[0]?.name || undefined,
    director,
    castDetails,
    crewDetails,
    productionCompanies,
    genres: (d.genres ?? []).map((g: any) => g.name),
    keywords,
    trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : undefined,
    posterUrl: tmdbImage(d.poster_path, "w500"),
    backdropUrl: tmdbImage(d.backdrop_path, "w1280"),
    previewImageUrls: (d.images?.backdrops ?? [])
      .slice(0, 12)
      .map((b: any) => tmdbImage(b.file_path, "w780"))
      .filter(Boolean) as string[],
  };
}