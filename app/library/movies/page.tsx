"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Download,
  ExternalLink,
  Film,
  FolderSync,
  HardDrive,
  Pencil,
  Plus,
  Search,
  Square,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUiStore } from "@/lib/store";
import {
  batchSaveMedia,
  createMedia,
  deleteMedia,
  listAllMedia,
  saveDedicatedMovie,
  scanLocalMedia,
  searchDedicatedMovies,
  updateMedia,
  type LocalScanFile,
  type TmdbResult,
} from "@/lib/api/client";
import type { Media } from "@/lib/types";
import MediaViewSwitcher, { type ViewMode } from "@/components/media/MediaViewSwitcher";
import MediaShelfView from "@/components/media/MediaShelfView";
import MediaFilterBar, { type FilterState } from "@/components/media/MediaFilterBar";

type Tab = "shelf" | "search" | "local" | "manual";

export default function MoviesVaultPage() {
  const { user } = useAuth();
  // Default to 'shelf' so existing movies are displayed first
  const [tab, setTab] = useState<Tab>("shelf");

  if (!user?.isAdmin) {
    return (
      <div className="glass card-surface mx-auto max-w-md p-6 text-center">
        <p className="text-sm text-slate-200">This page is restricted to administrators.</p>
        <p className="mt-2 text-xs text-mist">
          Sign in with an admin account to manage the movie library.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent text-xs font-semibold uppercase tracking-wider">
            <Film className="h-4 w-4" />
            <span>Dedicated Media Vault</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">🎬 Movies Vault</h1>
          <p className="mt-1 text-sm text-mist">
            Browse movies in your collection or search and import high-res titles via TMDB API
          </p>
        </div>

        {/* Tab Switcher: Shelf first, then Search, then Manual */}
        <div className="glass inline-flex rounded-xl p-1 shrink-0">
          <button
            onClick={() => setTab("shelf")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "shelf"
                ? "bg-accent/15 text-accent shadow-neon-cyan font-semibold"
                : "text-mist hover:text-white"
            }`}
          >
            Movie Shelf
          </button>
          <button
            onClick={() => setTab("search")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "search"
                ? "bg-accent/15 text-accent shadow-neon-cyan font-semibold"
                : "text-mist hover:text-white"
            }`}
          >
            Search & Batch Import
          </button>
          <button
            onClick={() => setTab("local")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "local"
                ? "bg-accent/15 text-accent shadow-neon-cyan font-semibold"
                : "text-mist hover:text-white"
            }`}
          >
            Local Video Scanner
          </button>
          <button
            onClick={() => setTab("manual")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "manual"
                ? "bg-accent/15 text-accent shadow-neon-cyan font-semibold"
                : "text-mist hover:text-white"
            }`}
          >
            + Add Manually
          </button>
        </div>
      </div>

      {tab === "shelf" && <MovieShelfTab />}
      {tab === "search" && <MovieSearchTab />}
      {tab === "local" && <LocalMovieScannerTab />}
      {tab === "manual" && <ManualMovieTab />}
    </div>
  );
}

// ── Tab 1: Movie Shelf (Displayed by Default) ───────────────────────────────

function MovieShelfTab() {
  const pushToast = useUiStore((s) => s.pushToast);
  const requestConfirm = useUiStore((s) => s.requestConfirm);
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAllMedia();
      setItems(res.items.filter((m) => m.type === "movie"));
    } catch {
      pushToast("Failed to load movie shelf", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (m: Media) => {
    const next = m.status === "published" ? "draft" : "published";
    try {
      await updateMedia(m.id, { status: next });
      pushToast(next === "published" ? "Movie published" : "Moved to drafts", "success");
      load();
    } catch (e) {
      pushToast((e as Error).message, "error");
    }
  };

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mv:movies_view");
      if (saved === "grid" || saved === "list" || saved === "compact") return saved;
    }
    return "grid";
  });

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("mv:movies_view", mode);
    }
  };

  const remove = async (m: Media) => {
    const ok = await requestConfirm({
      title: `ลบภาพยนตร์ "${m.title}"`,
      message: `คุณต้องการลบ "${m.title}" ออกจากคลังภาพยนตร์ใช่หรือไม่?`,
      confirmText: "ลบภาพยนตร์",
      cancelText: "ยกเลิก",
      kind: "danger",
    });
    if (!ok) return;

    try {
      await deleteMedia(m.id);
      pushToast("Deleted successfully", "success");
      setItems((prev) => prev.filter((item) => item.id !== m.id));
      load();
    } catch (e) {
      pushToast((e as Error).message, "error");
    }
  };

  const handleBatchPublish = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => updateMedia(id, { status: "published" })));
      pushToast(`Published ${ids.length} movies`, "success");
      load();
    } catch (e) {
      pushToast((e as Error).message, "error");
    }
  };

  const handleBatchDraft = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => updateMedia(id, { status: "draft" })));
      pushToast(`Moved ${ids.length} movies to drafts`, "info");
      load();
    } catch (e) {
      pushToast((e as Error).message, "error");
    }
  };

  const handleBatchDelete = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => deleteMedia(id)));
      pushToast(`Deleted ${ids.length} movies`, "success");
      setItems((prev) => prev.filter((item) => !ids.includes(item.id)));
      load();
    } catch (e) {
      pushToast((e as Error).message, "error");
    }
  };

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    genre: "all",
    studio: "all",
    year: "all",
    country: "all",
    actress: "all",
    status: "all",
    sortBy: "newest",
  });

  const filteredItems = items
    .filter((m) => {
      if (filters.status !== "all" && m.status !== filters.status) return false;
      if (filters.studio !== "all" && m.studio !== filters.studio) return false;
      if (filters.year !== "all" && String(m.year) !== filters.year) return false;
      if (filters.country && filters.country !== "all" && m.country !== filters.country) return false;
      if (filters.actress && filters.actress !== "all" && !m.actors.includes(filters.actress)) return false;
      if (filters.genre !== "all" && !m.tags.includes(filters.genre)) return false;
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchActor = m.actors.some((a) => a.toLowerCase().includes(q));
        if (!matchTitle && !matchActor) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (filters.sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (filters.sortBy === "views") return (b.views || 0) - (a.views || 0);
      if (filters.sortBy === "year") return (b.year || 0) - (a.year || 0);
      if (filters.sortBy === "title") return a.title.localeCompare(b.title);
      return b.updatedAt - a.updatedAt;
    });

  if (loading) return <div className="py-12 text-center text-sm text-mist">Loading movies in vault...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <span className="text-xs text-mist">
          Total <strong>{items.length}</strong> movies in vault
        </span>
        <MediaViewSwitcher mode={viewMode} onChange={handleViewChange} />
      </div>

      <MediaFilterBar
        mediaType="movie"
        filters={filters}
        onChange={setFilters}
        totalCount={items.length}
        filteredCount={filteredItems.length}
      />

      <MediaShelfView
        items={filteredItems}
        viewMode={viewMode}
        onToggleStatus={toggleStatus}
        onDelete={remove}
        onBatchPublish={handleBatchPublish}
        onBatchDraft={handleBatchDraft}
        onBatchDelete={handleBatchDelete}
        emptyText="No movies match your selected filters."
        mediaTypeLabel="movies"
      />
    </div>
  );
}

// ── Tab 2: TMDB Movie Search & Save ──────────────────────────────────────────

function MovieSearchTab() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<TmdbResult[]>([]);
  const [configured, setConfigured] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchSaving, setBatchSaving] = useState(false);

  const run = async () => {
    if (!q.trim()) return;
    setSearching(true);
    setSelectedIds([]);
    try {
      const res = await searchDedicatedMovies(q);
      setResults(res.results);
      setConfigured(res.configured);
      if (res.results.length === 0) {
        pushToast("No movies found. Try another query", "info");
      }
    } catch (err) {
      pushToast((err as Error).message || "Search failed", "error");
    } finally {
      setSearching(false);
    }
  };

  const save = async (r: TmdbResult) => {
    setSaving(r.tmdbId);
    try {
      const res = await saveDedicatedMovie(r.tmdbId);
      if (res.duplicate) {
        pushToast(`"${r.title}" is already in your library`, "info");
      } else {
        pushToast(`Saved "${r.title}" to movie vault!`, "success");
      }
    } catch (e) {
      pushToast((e as Error).message, "error");
    } finally {
      setSaving(null);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === results.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(results.map((r) => r.tmdbId));
    }
  };

  const handleBatchImport = async () => {
    if (selectedIds.length === 0) return;
    const itemsToSave = results
      .filter((r) => selectedIds.includes(r.tmdbId))
      .map((r) => ({
        id: r.tmdbId,
        title: r.title,
        year: r.year,
        posterUrl: r.posterUrl,
      }));

    setBatchSaving(true);
    try {
      const res = await batchSaveMedia("movie", itemsToSave);
      pushToast(
        `Batch Import: Saved ${res.savedCount} movies (${res.duplicateCount} duplicates skipped)`,
        "success",
      );
      setSelectedIds([]);
    } catch (err) {
      pushToast((err as Error).message || "Batch save failed", "error");
    } finally {
      setBatchSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="glass card-surface p-5">
        <div className="mb-3 flex items-center justify-between text-xs text-mist">
          <span>Source: TMDB Movie API (Global & Multilingual)</span>
          {!configured && (
            <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-300 font-mono">
              TMDB_API_KEY not configured
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="Search movies e.g. Inception, Oppenheimer, Dune, Interstellar..."
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-accent/60"
          />
          <button
            onClick={run}
            disabled={searching}
            className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-obsidian shadow-neon-cyan transition hover:brightness-110 disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            <span>{searching ? "Searching..." : "Search"}</span>
          </button>
        </div>
      </div>

      {/* Batch Action Toolbar */}
      {results.length > 0 && (
        <div className="glass card-surface flex flex-wrap items-center justify-between gap-3 p-3 text-xs">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-slate-200 hover:text-white"
          >
            {selectedIds.length === results.length ? (
              <CheckSquare className="h-4 w-4 text-accent" />
            ) : (
              <Square className="h-4 w-4 text-mist" />
            )}
            <span>
              {selectedIds.length === results.length ? "Deselect All" : "Select All"} ({results.length})
            </span>
          </button>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-accent font-semibold">
                {selectedIds.length} movie(s) selected
              </span>
              <button
                onClick={handleBatchImport}
                disabled={batchSaving}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-neon px-4 py-1.5 font-semibold text-obsidian shadow-neon-cyan transition hover:brightness-110 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{batchSaving ? "Importing..." : `Import Selected (${selectedIds.length})`}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {searching ? (
        <div className="py-12 text-center text-sm text-mist">Searching movie database...</div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {results.map((r) => {
            const isSelected = selectedIds.includes(r.tmdbId);
            return (
              <div
                key={r.tmdbId}
                onClick={() => toggleSelect(r.tmdbId)}
                className={`glass card-surface group relative flex flex-col overflow-hidden transition cursor-pointer ${
                  isSelected ? "border-accent ring-1 ring-accent" : "hover:border-accent/40"
                }`}
              >
                {/* Selection Checkbox */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(r.tmdbId);
                  }}
                  className="absolute top-2 left-2 z-10 grid h-6 w-6 place-items-center rounded bg-black/70 backdrop-blur transition hover:bg-black"
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-accent" />
                  ) : (
                    <Square className="h-4 w-4 text-white/70" />
                  )}
                </button>

                <div className="relative aspect-[2/3] w-full overflow-hidden bg-white/5">
                  {r.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.posterUrl}
                      alt={r.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center p-3 text-center text-xs text-mist">
                      {r.title}
                    </div>
                  )}
                  {r.rating ? (
                    <span className="absolute top-2 right-2 rounded bg-black/70 backdrop-blur px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                      ⭐ {r.rating.toFixed(1)}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col justify-between p-3">
                  <div>
                    <h3 className="line-clamp-1 text-sm font-semibold text-white group-hover:text-accent">
                      {r.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-mist">{r.year || "N/A"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      save(r);
                    }}
                    disabled={saving === r.tmdbId}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-accent/40 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent hover:text-obsidian disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {saving === r.tmdbId ? "Saving..." : "Save to Vault"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center text-sm text-mist">
          Type a movie title to search and import metadata, posters, and cast automatically.
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Manual Movie Entry ────────────────────────────────────────────────

function ManualMovieTab() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [form, setForm] = useState({
    title: "",
    titleTh: "",
    year: "",
    country: "US",
    director: "",
    overview: "",
    posterUrl: "",
    trailerUrl: "",
    rating: "",
  });
  const [busy, setBusy] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const submit = async () => {
    if (!form.title.trim()) {
      pushToast("Movie title is required", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await createMedia({
        type: "movie",
        title: form.title.trim(),
        titleTh: form.titleTh.trim() || undefined,
        year: form.year ? parseInt(form.year, 10) : undefined,
        country: form.country.trim() || undefined,
        studio: form.director.trim() || undefined,
        overview: form.overview.trim() || undefined,
        posterUrl: form.posterUrl.trim() || undefined,
        trailerUrl: form.trailerUrl.trim() || undefined,
        rating: form.rating ? parseFloat(form.rating) : undefined,
      });
      setCreatedId(res.media.id);
      pushToast(`Saved movie "${form.title}" to vault`, "success");
    } catch (e) {
      pushToast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-accent/60";

  return (
    <div className="glass card-surface p-6 space-y-4 max-w-2xl mx-auto">
      <h2 className="font-display text-base font-bold text-white">Add Movie Manually</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-mist">Movie Title (Original / Primary) *</label>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Dune: Part Two" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist">Alternate / Translated Title</label>
          <input value={form.titleTh} onChange={(e) => set("titleTh", e.target.value)} placeholder="e.g. Local Title" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist">Release Year</label>
          <input value={form.year} onChange={(e) => set("year", e.target.value)} placeholder="2024" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist">Director / Studio</label>
          <input value={form.director} onChange={(e) => set("director", e.target.value)} placeholder="Denis Villeneuve" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist">Rating (0-10)</label>
          <input value={form.rating} onChange={(e) => set("rating", e.target.value)} placeholder="8.6" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-mist">Poster Image URL</label>
          <input value={form.posterUrl} onChange={(e) => set("posterUrl", e.target.value)} placeholder="https://..." className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-mist">Synopsis / Overview</label>
          <textarea rows={3} value={form.overview} onChange={(e) => set("overview", e.target.value)} className={inputCls} />
        </div>
      </div>
      <div className="pt-2 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-obsidian shadow-neon-cyan transition hover:brightness-110 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {busy ? "Saving..." : "Save Movie"}
        </button>
        {createdId && (
          <Link
            href={`/media/${createdId}`}
            className="flex items-center gap-1.5 text-xs text-accent hover:text-white"
          >
            Open details to configure stream links <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Tab 4: Local Video Scanner ───────────────────────────────────────────────

function LocalMovieScannerTab() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [scanDir, setScanDir] = useState("data/media/videos");
  const [files, setFiles] = useState<LocalScanFile[]>([]);
  const [scanning, setScanning] = useState(false);
  const [savingFile, setSavingFile] = useState<string | null>(null);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await scanLocalMedia(scanDir);
      setFiles(res.files);
      if (res.files.length === 0) {
        pushToast(`No video files found in ${res.scanDir}`, "info");
      } else {
        pushToast(`Found ${res.files.length} video file(s)`, "success");
      }
    } catch (err) {
      pushToast((err as Error).message || "Failed to scan local media", "error");
    } finally {
      setScanning(false);
    }
  };

  const handleCreateMediaFromFile = async (file: LocalScanFile) => {
    setSavingFile(file.filename);
    try {
      // Create local media record with this video linked as primary source
      const res = await createMedia({
        type: "movie",
        title: file.suggestedTitle,
        year: file.suggestedYear,
      });

      // Update stream source
      if (res.media?.id) {
        await updateMedia(res.media.id, {
          sources: [
            {
              label: `Local Video (${file.filename})`,
              url: file.streamUrl,
              kind: "local",
            },
          ],
        });
        pushToast(`Created "${file.suggestedTitle}" linked to local file!`, "success");
      }
    } catch (err) {
      pushToast((err as Error).message || "Failed to create media", "error");
    } finally {
      setSavingFile(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="glass card-surface p-5">
        <div className="mb-3 flex items-center justify-between text-xs text-mist">
          <div className="flex items-center gap-1.5 text-accent">
            <HardDrive className="h-4 w-4" />
            <span className="font-semibold">Local File & Drive Scanner (OrangePi / NAS)</span>
          </div>
          <span>Scans .mp4, .mkv, .webm, .avi</span>
        </div>
        <p className="text-xs text-slate-300 mb-3">
          Drop your movie files into <code className="text-accent bg-black/40 px-1.5 py-0.5 rounded font-mono">{scanDir}</code> (or a mounted USB drive/NAS path) and scan to play directly without downloading.
        </p>
        <div className="flex gap-2">
          <input
            value={scanDir}
            onChange={(e) => setScanDir(e.target.value)}
            placeholder="data/media/videos or /mnt/storage/movies"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white font-mono outline-none transition focus:border-accent/60"
          />
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-obsidian shadow-neon-cyan transition hover:brightness-110 disabled:opacity-50"
          >
            <FolderSync className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
            <span>{scanning ? "Scanning..." : "Scan Directory"}</span>
          </button>
        </div>
      </div>

      {scanning ? (
        <div className="py-12 text-center text-sm text-mist">Scanning storage for video files...</div>
      ) : files.length > 0 ? (
        <div className="glass card-surface divide-y divide-white/5">
          {files.map((f) => (
            <div key={f.relativePath} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{f.suggestedTitle}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-mist font-mono">
                  <span className="text-accent font-semibold">{f.filename}</span>
                  <span>•</span>
                  <span>{f.sizeFormatted}</span>
                  {f.suggestedYear && (
                    <>
                      <span>•</span>
                      <span>Year: {f.suggestedYear}</span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCreateMediaFromFile(f)}
                  disabled={savingFile === f.filename}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-neon px-3.5 py-1.5 text-xs font-semibold text-obsidian shadow-neon-cyan transition hover:brightness-110 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{savingFile === f.filename ? "Adding..." : "Add to Vault"}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass card-surface p-12 text-center text-sm text-mist">
          <HardDrive className="mx-auto mb-3 h-10 w-10 text-accent/60" />
          No local video files discovered yet. Place video files in <code className="text-white font-mono">{scanDir}</code> and click Scan.
        </div>
      )}
    </div>
  );
}
