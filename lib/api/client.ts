"use client";

import type { Media } from "@/lib/types";
import { getFirebaseApp, isFirebaseConfigured } from "@/lib/firebase";
import { getAuth } from "firebase/auth";

// Client data layer for the self-hosted backend — all reads/writes go through
// the BFF API routes (SQLite + local files). Firestore is no longer the catalog.

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};
  try {
    if (isFirebaseConfigured) {
      const app = getFirebaseApp();
      if (app) {
        const auth = getAuth(app);
        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken();
          if (token) {
            return { Authorization: `Bearer ${token}` };
          }
        }
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const saved = localStorage.getItem("mv:user");
    if (saved) {
      const u = JSON.parse(saved);
      if (u.email) {
        return { Authorization: `Bearer local:${u.email}` };
      }
    }
  } catch {
    /* ignore */
  }

  return {};
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const headers = new Headers(init?.headers);
  for (const [key, val] of Object.entries(authHeaders)) {
    if (!headers.has(key)) {
      headers.set(key, val);
    }
  }

  const res = await fetch(path, {
    ...init,
    headers,
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) message = j.error;
    } catch {
      /* not json */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// ── catalog ─────────────────────────────────────────────────────────────────

export function searchMedia(
  q: string,
  studio?: string,
): Promise<{ items: Media[]; configured: boolean }> {
  const p = new URLSearchParams();
  if (q.trim()) p.set("q", q.trim());
  if (studio?.trim()) p.set("studio", studio.trim());
  return api(`/api/search?${p.toString()}`);
}

export async function fetchMediaById(
  id: string,
): Promise<(Media & { seriesWorks?: Media[] }) | null> {
  try {
    const d = await api<{ media: Media; seriesWorks?: Media[] }>(`/api/media/${encodeURIComponent(id)}`);
    return { ...d.media, seriesWorks: d.seriesWorks || [] };
  } catch {
    return null;
  }
}

export function fetchMediaList(
  opts: { type?: string; sort?: string; count?: number } = {},
): Promise<{ items: Media[]; configured: boolean }> {
  const p = new URLSearchParams();
  if (opts.type) p.set("type", opts.type);
  p.set("sort", opts.sort ?? "views");
  p.set("limit", String(opts.count ?? 24));
  return api(`/api/media?${p.toString()}`);
}

export interface FilterOptions {
  genres: string[];
  studios: string[];
  years: number[];
  countries: string[];
  actresses: string[];
}

export function fetchFilterOptions(type?: "movie" | "series" | "jav"): Promise<FilterOptions> {
  const q = type ? `?type=${type}` : "";
  return api<FilterOptions>(`/api/media/filters${q}`);
}

export function listAllMedia(): Promise<{ items: Media[] }> {
  return api("/api/media?status=all&limit=500");
}

// ── library ingest ──────────────────────────────────────────────────────────

export interface TmdbResult {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  overview?: string;
  year?: number;
  rating?: number;
  posterUrl?: string | null;
  backdropUrl?: string | null;
}

export function librarySearch(q: string): Promise<{ configured: boolean; results: TmdbResult[] }> {
  return api(`/api/library/search?provider=tmdb&q=${encodeURIComponent(q)}`);
}

export function saveTmdb(tmdbId: number, type: "movie" | "tv") {
  return api<{ ok: boolean; duplicate?: boolean; mediaId?: string; media?: Media }>(
    "/api/library/save-tmdb",
    json("POST", { tmdbId, type }),
  );
}

// ── Dedicated 3-Vault API methods ──────────────────────────────────────────

export function searchDedicatedMovies(q: string) {
  return api<{ configured: boolean; results: TmdbResult[] }>(
    `/api/library/movies/search?q=${encodeURIComponent(q)}`,
  );
}

export function saveDedicatedMovie(tmdbId: number) {
  return api<{ ok: boolean; duplicate?: boolean; mediaId?: string; media?: Media }>(
    "/api/library/movies/save",
    json("POST", { tmdbId }),
  );
}

export interface SeriesSearchResult {
  source: "tvmaze" | "tmdb";
  id: number;
  title: string;
  year?: number;
  genres: string[];
  status?: string;
  network?: string;
  rating?: number;
  posterUrl?: string;
  overview?: string;
}

export function searchDedicatedSeries(q: string, source: "tvmaze" | "tmdb" = "tvmaze") {
  return api<{ source: string; results: SeriesSearchResult[]; tmdbConfigured: boolean }>(
    `/api/library/series/search?q=${encodeURIComponent(q)}&source=${source}`,
  );
}

export function saveDedicatedSeries(item: {
  source: "tvmaze" | "tmdb";
  id: number;
  title: string;
  overview?: string;
  year?: number;
  genres?: string[];
  rating?: number;
  posterUrl?: string;
}) {
  return api<{ ok: boolean; duplicate?: boolean; mediaId?: string; media?: Media; episodeCount: number }>(
    "/api/library/series/save",
    json("POST", item),
  );
}

export interface JavSearchResult {
  code: string;
  title: string;
  titleJa?: string;
  studio: string;
  label?: string;
  series?: string;
  director?: string;
  duration?: number;
  releaseDate?: string;
  actress: string;
  actresses: string[];
  actressDetails?: Array<{ name: string; avatarUrl?: string }>;
  year: number;
  rating: number;
  tags: string[];
  posterUrl: string;
  backdropUrl?: string;
  previewImages?: string[];
  overview: string;
  source: "javdb_live" | "javdb_resolver";
}

export function searchDedicatedJav(q: string) {
  return api<{ ok: boolean; result: JavSearchResult; error?: string }>(
    `/api/library/jav/search?q=${encodeURIComponent(q)}`,
  );
}

export function saveDedicatedJav(item: Partial<JavSearchResult> & { code: string; title: string; streamUrl?: string }) {
  return api<{ ok: boolean; duplicate?: boolean; mediaId?: string; media?: Media }>(
    "/api/library/jav/save",
    json("POST", item),
  );
}

export function refetchMedia(mediaId: string) {
  return api<{ media: Media }>("/api/library/refetch", json("POST", { mediaId }));
}

export interface MediaPayload {
  type?: string;
  code?: string;
  title: string;
  titleTh?: string;
  overview?: string;
  country?: string;
  year?: number;
  studio?: string;
  tags?: string[];
  actresses?: string[];
  posterUrl?: string;
  trailerUrl?: string;
  rating?: number;
}

export function createMedia(payload: MediaPayload) {
  return api<{ media: Media }>("/api/media", json("POST", payload));
}

export function updateMedia(id: string, payload: Record<string, unknown>) {
  return api<{ media: Media }>(`/api/media/${encodeURIComponent(id)}`, json("PATCH", payload));
}

export function deleteMedia(id: string) {
  return api(`/api/media/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ── actresses ───────────────────────────────────────────────────────────────

export interface ActressProfile {
  id: string;
  name: string;
  aliases: string[];
  country?: string | null;
  studio?: string | null;
  bio?: string | null;
  mediaCount: number;
  types?: string[];
  photoUrl: string;
}

export function getActress(id: string): Promise<{ actress: ActressProfile; works: Media[] }> {
  return api(`/api/actresses/${encodeURIComponent(id)}`);
}

export interface ActressFilterOptions {
  media: Array<{ id: string; title: string; type: string; year: number | null }>;
  countries: string[];
}

export function listActresses(
  opts: { q?: string; category?: "all" | "jav" | "film"; mediaId?: string; country?: string } = {},
): Promise<{
  items: ActressProfile[];
  counts?: { all: number; jav: number; film: number };
  availableFilterOptions?: ActressFilterOptions;
}> {
  const p = new URLSearchParams();
  if (opts.q) p.set("q", opts.q);
  if (opts.category && opts.category !== "all") p.set("category", opts.category);
  if (opts.mediaId && opts.mediaId !== "all") p.set("mediaId", opts.mediaId);
  if (opts.country && opts.country !== "all") p.set("country", opts.country);
  const qs = p.toString();
  return api(`/api/actresses${qs ? `?${qs}` : ""}`);
}

export function updateActress(id: string, payload: Record<string, unknown>) {
  return api<{ media: Media }>(`/api/actresses/${encodeURIComponent(id)}`, json("PATCH", payload));
}

export function deleteActress(id: string) {
  return api(`/api/actresses/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function uploadActressPhoto(id: string, file: File): Promise<{ photoUrl: string }> {
  const form = new FormData();
  form.append("file", file);
  return api(`/api/actresses/${encodeURIComponent(id)}/photo`, { method: "POST", body: form });
}

export interface PhotoSearchResultItem {
  title: string;
  image: string;
  thumbnail: string;
  source?: string;
  width?: number;
  height?: number;
}

export function searchActressPhotos(
  id: string,
  q?: string,
): Promise<{ query: string; results: PhotoSearchResultItem[]; warning?: string; error?: string }> {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return api(`/api/actresses/${encodeURIComponent(id)}/search-photos${qs}`);
}

export function applyActressPhotoOnline(
  id: string,
  imageUrl: string,
): Promise<{ ok: boolean; photoUrl: string }> {
  return api(`/api/actresses/${encodeURIComponent(id)}/apply-photo`, json("POST", { imageUrl }));
}

// ── admin ───────────────────────────────────────────────────────────────────

export function backupDb() {
  return api<{ ok: boolean; path: string; bytes: number }>("/api/admin/backup", { method: "POST" });
}

// ── local scanner & batch importer ──────────────────────────────────────────

export interface LocalScanFile {
  filename: string;
  relativePath: string;
  fullPath: string;
  sizeBytes: number;
  sizeFormatted: string;
  streamUrl: string;
  suggestedTitle: string;
  suggestedYear?: number;
}

export function scanLocalMedia(dir?: string) {
  const q = dir ? `?dir=${encodeURIComponent(dir)}` : "";
  return api<{ scanDir: string; totalFiles: number; files: LocalScanFile[] }>(`/api/library/scan${q}`);
}

export function batchSaveMedia(
  type: "movie" | "series",
  items: Array<{ id: number; title: string; year?: number; posterUrl?: string | null }>,
) {
  return api<{
    ok: boolean;
    totalProcessed: number;
    savedCount: number;
    duplicateCount: number;
    results: Array<{ id: number; title: string; success: boolean; duplicate?: boolean; error?: string }>;
  }>("/api/library/batch-save", json("POST", { type, items }));
}