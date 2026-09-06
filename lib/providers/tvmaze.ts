// TVMaze Provider — 100% Free, Zero-Config Series API (No API Key Required).
// Official API Docs: https://www.tvmaze.com/api

export interface TvMazeHit {
  id: number;
  name: string;
  premiered?: string;
  year?: number;
  genres: string[];
  status: string;
  network?: string;
  rating?: number;
  posterUrl?: string;
  backdropUrl?: string;
  summary?: string;
  officialSite?: string;
}

export interface TvMazeEpisode {
  id: number;
  name: string;
  season: number;
  episode: number;
  airdate?: string;
  runtime?: number;
  thumbnailUrl?: string;
  summary?: string;
}

function stripHtml(html?: string | null): string {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "").trim();
}

export async function tvmazeSearch(query: string): Promise<TvMazeHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(trimmed)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "MovieVault/2.0" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`TVMaze error: HTTP ${res.status}`);
  }

  const raw = (await res.json()) as Array<{
    score: number;
    show: {
      id: number;
      name: string;
      premiered?: string | null;
      genres?: string[];
      status?: string;
      network?: { name: string } | null;
      webChannel?: { name: string } | null;
      rating?: { average?: number | null };
      image?: { medium?: string; original?: string } | null;
      summary?: string | null;
      officialSite?: string | null;
    };
  }>;

  return raw.map((item) => {
    const s = item.show;
    const year = s.premiered ? parseInt(s.premiered.slice(0, 4), 10) : undefined;
    const network = s.network?.name || s.webChannel?.name || undefined;

    return {
      id: s.id,
      name: s.name,
      premiered: s.premiered || undefined,
      year: isNaN(year as number) ? undefined : year,
      genres: s.genres || [],
      status: s.status || "Unknown",
      network,
      rating: s.rating?.average || undefined,
      posterUrl: s.image?.original || s.image?.medium || undefined,
      backdropUrl: s.image?.original || undefined,
      summary: stripHtml(s.summary),
      officialSite: s.officialSite || undefined,
    };
  });
}

export async function tvmazeGetEpisodes(showId: number): Promise<TvMazeEpisode[]> {
  const url = `https://api.tvmaze.com/shows/${showId}/episodes`;
  const res = await fetch(url, {
    headers: { "User-Agent": "MovieVault/2.0" },
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    throw new Error(`TVMaze episode error: HTTP ${res.status}`);
  }

  const raw = (await res.json()) as Array<{
    id: number;
    name: string;
    season: number;
    number: number;
    airdate?: string | null;
    runtime?: number | null;
    image?: { medium?: string; original?: string } | null;
    summary?: string | null;
  }>;

  return raw.map((ep) => ({
    id: ep.id,
    name: ep.name || `Episode ${ep.number}`,
    season: ep.season,
    episode: ep.number,
    airdate: ep.airdate || undefined,
    runtime: ep.runtime ? ep.runtime * 60 : undefined, // Convert minutes to seconds
    thumbnailUrl: ep.image?.original || ep.image?.medium || undefined,
    summary: stripHtml(ep.summary),
  }));
}

export interface TvMazeFullShow {
  id: number;
  name: string;
  type: string;
  language: string;
  genres: string[];
  status: string;
  premiered?: string;
  ended?: string;
  schedule?: string;
  network?: string;
  rating?: number;
  runtime?: number;
  officialSite?: string;
  imdbId?: string;
  country?: string;
  posterUrl?: string;
  backdropUrl?: string;
  summary: string;
  castDetails: Array<{ name: string; character?: string; avatarUrl?: string }>;
  crewDetails: Array<{ name: string; role: string }>;
  seasons: Array<{
    id: number;
    seasonNumber: number;
    name?: string;
    episodeCount?: number;
    premiereDate?: string;
    endDate?: string;
  }>;
  episodes: TvMazeEpisode[];
}

export async function tvmazeGetShowFull(showId: number): Promise<TvMazeFullShow> {
  const url = `https://api.tvmaze.com/shows/${showId}?embed[]=episodes&embed[]=cast&embed[]=crew&embed[]=seasons&embed[]=images`;
  const res = await fetch(url, {
    headers: { "User-Agent": "MovieVault/2.0" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`TVMaze show error: HTTP ${res.status}`);
  }

  const d = (await res.json()) as any;
  const embedded = d._embedded || {};

  // Cast
  const castDetails = (embedded.cast || []).slice(0, 20).map((c: any) => ({
    name: c.person?.name || "Actor",
    character: c.character?.name || undefined,
    avatarUrl: c.person?.image?.original || c.person?.image?.medium || undefined,
  }));

  // Crew
  const crewDetails = (embedded.crew || []).slice(0, 10).map((cr: any) => ({
    name: cr.person?.name || "Crew",
    role: cr.type || "Creator",
  }));

  // Seasons
  const seasons = (embedded.seasons || []).map((s: any) => ({
    id: s.id,
    seasonNumber: s.number,
    name: s.name || `Season ${s.number}`,
    episodeCount: s.episodeOrder || undefined,
    premiereDate: s.premiereDate || undefined,
    endDate: s.endDate || undefined,
  }));

  // Episodes
  const episodes: TvMazeEpisode[] = (embedded.episodes || []).map((ep: any) => ({
    id: ep.id,
    name: ep.name || `Episode ${ep.number}`,
    season: ep.season,
    episode: ep.number,
    airdate: ep.airdate || undefined,
    runtime: ep.runtime ? ep.runtime * 60 : undefined,
    thumbnailUrl: ep.image?.original || ep.image?.medium || undefined,
    summary: stripHtml(ep.summary),
  }));

  // Schedule string
  let scheduleStr: string | undefined = undefined;
  if (d.schedule?.days?.length) {
    scheduleStr = `${d.schedule.days.join(", ")}${d.schedule.time ? ` at ${d.schedule.time}` : ""}`;
  }

  // Backdrop
  let backdropUrl = d.image?.original || undefined;
  const backgrounds = (embedded.images || []).filter((img: any) => img.type === "background");
  if (backgrounds.length > 0) {
    backdropUrl = backgrounds[0].resolutions?.original?.url || backdropUrl;
  }

  return {
    id: d.id,
    name: d.name,
    type: d.type || "Scripted",
    language: d.language || "English",
    genres: d.genres || [],
    status: d.status || "Unknown",
    premiered: d.premiered || undefined,
    ended: d.ended || undefined,
    schedule: scheduleStr,
    network: d.network?.name || d.webChannel?.name || undefined,
    rating: d.rating?.average || undefined,
    runtime: d.averageRuntime || d.runtime || undefined,
    officialSite: d.officialSite || undefined,
    imdbId: d.externals?.imdb || undefined,
    country: d.network?.country?.code || d.webChannel?.country?.code || (d.language === "Korean" ? "KR" : d.language === "Japanese" ? "JP" : d.language === "Chinese" ? "CN" : undefined),
    posterUrl: d.image?.original || d.image?.medium || undefined,
    backdropUrl,
    summary: stripHtml(d.summary),
    castDetails,
    crewDetails,
    seasons,
    episodes,
  };
}
