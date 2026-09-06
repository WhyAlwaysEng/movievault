// Firestore schema types — mirror of docs/MASTER_PLAN_v2.md §3
// Timestamps are normalized to epoch ms on the client.

export type MediaType = "movie" | "series" | "jav";
export type MediaStatus = "draft" | "published" | "flagged";

export interface MediaSource {
  label: string; // "Main Server", "Backup Server 1"
  url: string; // .m3u8 / embed / local /api/files URL
  kind?: "hls" | "embed" | "local" | "other";
  type?: string;
  quality?: string;
  healthy?: boolean;
  lastCheckedAt?: number;
}

export interface CastMember {
  name: string;
  character?: string;
  avatarUrl?: string;
  profileUrl?: string;
  actressId?: string;
}

export interface CrewMember {
  name: string;
  role: string;
}

export interface SeriesEpisode {
  id: number;
  episodeNumber: number;
  title: string;
  name?: string;
  overview?: string;
  summary?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  duration: number; // seconds
  runtime?: number; // minutes
  season?: number;
  airdate?: string;
  sources: MediaSource[];
}

export interface SeriesSeason {
  id?: number;
  seasonNumber: number;
  name?: string;
  episodeCount?: number;
  episodes: SeriesEpisode[];
}

export interface Media {
  id: string; // e.g. "ssis-543" or "tmdb-12345"
  type: MediaType;
  code?: string; // JAV code e.g. "SSIS-543"
  title: string;
  overview?: string; // synopsis for the preview modal
  altTitles?: { th?: string; ja?: string; en?: string };
  country: string; // "JP" | "KR" | "US" | "TH"
  posterUrl: string;
  backdropUrl?: string;
  previewImages: string[]; // hover slideshow / gallery
  actors: string[];
  actresses?: string[];
  tags: string[];
  genres?: string[];
  year?: number;
  studio?: string;
  tmdbId?: string;
  tvmazeId?: string | number;
  isAdult?: boolean;
  trailerUrl?: string;
  rating?: number;
  views: number;
  sources: MediaSource[];
  searchTokens: string[];
  status: MediaStatus;
  updatedAt: number; // epoch ms

  // Extended Rich Metadata
  runtime?: number; // duration in minutes
  releaseDate?: string; // YYYY-MM-DD
  director?: string;
  tagline?: string;
  network?: string; // Broadcast / Streaming network e.g. "HBO", "Netflix"
  castDetails?: CastMember[];
  crewDetails?: CrewMember[];
  extraMeta?: {
    budget?: number;
    revenue?: number;
    schedule?: string;
    label?: string;
    seriesName?: string;
    imdbId?: string;
    officialSite?: string;
    productionCompanies?: Array<{ name: string; logoUrl?: string }>;
    [key: string]: unknown;
  };
  seasons?: SeriesSeason[];
}

export interface Episode {
  id: string; // e.g. "s01e03"
  season: number;
  episode: number;
  title: string;
  overview?: string;
  thumbnailUrl: string;
  duration: number; // seconds
  sources: MediaSource[];
  airedAt?: number;
}

export interface Actress {
  id: string; // romanized name slug e.g. "yua-mikami"
  name: string;
  aliases: string[];
  country: string;
  photoUrl: string;
  studio?: string;
  bio?: string;
  mediaCount: number;
}

export interface Studio {
  id: string;
  name: string;
  country: string;
  logoUrl?: string;
  mediaCount: number;
}

export interface Featured {
  featuredMovieIds: string[];
  featuredJavCodes: string[];
  bannerAnnouncements?: string;
  enabled: boolean;
}

export interface WatchHistoryEntry {
  uid: string;
  mediaId: string;
  episodeId?: string;
  lastWatchedTime: number; // seconds
  duration: number; // seconds
  finished: boolean; // ≥95% watched
  updatedAt: number;
}

export interface Favorite {
  uid: string;
  mediaId: string;
  addedAt: number;
}

export type ReportReason = "broken_link" | "wrong_info" | "inappropriate" | "dmca";

export interface Report {
  mediaId: string;
  serverLabel?: string;
  sourceUrl?: string;
  reporterUid?: string;
  reason: ReportReason;
  status: "open" | "resolved";
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: "admin" | "user";
  premium?: boolean;
  ageVerifiedAt?: number;
  settings?: {
    language: "th" | "en";
    privateMode: boolean;
    blurredJav: boolean;
  };
}