"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Download,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Square,
  Tv,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUiStore } from "@/lib/store";
import {
  batchSaveMedia,
  createMedia,
  deleteMedia,
  listAllMedia,
  saveDedicatedSeries,
  searchDedicatedSeries,
  updateMedia,
  type SeriesSearchResult,
} from "@/lib/api/client";
import type { Media } from "@/lib/types";
import MediaViewSwitcher, { type ViewMode } from "@/components/media/MediaViewSwitcher";
import MediaShelfView from "@/components/media/MediaShelfView";
import MediaFilterBar, { type FilterState } from "@/components/media/MediaFilterBar";

type Tab = "shelf" | "search" | "manual";

export default function SeriesVaultPage() {
  const { user } = useAuth();
  // Default to 'shelf' so existing series are displayed first
  const [tab, setTab] = useState<Tab>("shelf");

  if (!user?.isAdmin) {
    return (
      <div className="glass card-surface mx-auto max-w-md p-6 text-center">
        <p className="text-sm text-slate-200">This page is restricted to administrators.</p>
        <p className="mt-2 text-xs text-mist">
          Sign in with an admin account to manage the series library.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-neon text-xs font-semibold uppercase tracking-wider">
            <Tv className="h-4 w-4" />
            <span>Dedicated TV Series Vault</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">📺 Series Vault</h1>
          <p className="mt-1 text-sm text-mist">
            Browse series in your library or import titles & episodic trees via TVMaze API (100% Free, Zero-Key)
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
            Series Shelf
          </button>
          <button
            onClick={() => setTab("search")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "search"
                ? "bg-accent/15 text-accent shadow-neon-cyan font-semibold"
                : "text-mist hover:text-white"
            }`}
          >
            Search & Import
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

      {tab === "shelf" && <SeriesShelfTab />}
      {tab === "search" && <SeriesSearchTab />}
      {tab === "manual" && <ManualSeriesTab />}
    </div>
  );
}

// ── Tab 1: Series Shelf (Displayed by Default) ───────────────────────────────

function SeriesShelfTab() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAllMedia();
      setItems(res.items.filter((m) => m.type === "series"));
    } catch {
      pushToast("Failed to load series shelf", "error");
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
      pushToast(next === "published" ? "Series published" : "Moved to drafts", "success");
      load();
    } catch (e) {
      pushToast((e as Error).message, "error");
    }
  };

  const remove = async (m: Media) => {
    if (!confirm(`Delete series "${m.title}" from library?`)) return;
    try {
      await deleteMedia(m.id);
      pushToast("Deleted successfully", "success");
      load();
    } catch (e) {
      pushToast((e as Error).message, "error");
    }
  };

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mv:series_view");
      if (saved === "grid" || saved === "list" || saved === "compact") return saved;
    }
    return "grid";
  });

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("mv:series_view", mode);
    }
  };

  const handleBatchPublish = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => updateMedia(id, { status: "published" })));
      pushToast(`Published ${ids.length} series`, "success");
      load();
    } catch (e) {
      pushToast((e as Error).message, "error");
    }
  };

  const handleBatchDraft = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => updateMedia(id, { status: "draft" })));
      pushToast(`Moved ${ids.length} series to drafts`, "info");
      load();
    } catch (e) {
      pushToast((e as Error).message, "error");
    }
  };

  const handleBatchDelete = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => deleteMedia(id)));
      pushToast(`Deleted ${ids.length} series`, "success");
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

  if (loading) return <div className="py-12 text-center text-sm text-mist">Loading series in vault...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <span className="text-xs text-mist">
          Total <strong>{items.length}</strong> series in vault
        </span>
        <MediaViewSwitcher mode={viewMode} onChange={handleViewChange} />
      </div>

      <MediaFilterBar
        mediaType="series"
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
        emptyText="No series match your selected filters."
        mediaTypeLabel="series"
      />
    </div>
  );
}

// ── Tab 2: Series Search & Save ──────────────────────────────────────────────

function SeriesSearchTab() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [q, setQ] = useState("");
  const [source, setSource] = useState<"tvmaze" | "tmdb">("tvmaze");
  const [results, setResults] = useState<SeriesSearchResult[]>([]);
  const [tmdbConfigured, setTmdbConfigured] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchSaving, setBatchSaving] = useState(false);

  const run = async () => {
    if (!q.trim()) return;
    setSearching(true);
    setSelectedIds([]);
    try {
      const res = await searchDedicatedSeries(q, source);
      setResults(res.results);
      setTmdbConfigured(res.tmdbConfigured);
      if (res.results.length === 0) {
        pushToast("No series found for this query", "info");
      }
    } catch (err) {
      pushToast((err as Error).message || "Search failed", "error");
    } finally {
      setSearching(false);
    }
  };

  const save = async (r: SeriesSearchResult) => {
    setSaving(r.id);
    try {
      const res = await saveDedicatedSeries({
        source: r.source,
        id: r.id,
        title: r.title,
        overview: r.overview,
        year: r.year,
        genres: r.genres,
        rating: r.rating,
        posterUrl: r.posterUrl,
      });
      if (res.duplicate) {
        pushToast(`"${r.title}" is already in your library`, "info");
      } else {
        pushToast(
          `Saved "${r.title}" to series vault! ${
            res.episodeCount > 0 ? `(${res.episodeCount} episodes generated)` : ""
          }`,
          "success",
        );
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
      setSelectedIds(results.map((r) => r.id));
    }
  };

  const handleBatchImport = async () => {
    if (selectedIds.length === 0) return;
    const itemsToSave = results
      .filter((r) => selectedIds.includes(r.id))
      .map((r) => ({
        id: r.id,
        title: r.title,
        year: r.year,
        posterUrl: r.posterUrl,
      }));

    setBatchSaving(true);
    try {
      const res = await batchSaveMedia("series", itemsToSave);
      pushToast(
        `Batch Import: Saved ${res.savedCount} series (${res.duplicateCount} duplicates skipped)`,
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
      <div className="glass card-surface p-5 space-y-3">
        {/* Source Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-mist">Search Engine:</span>
            <div className="inline-flex rounded-lg bg-white/5 p-0.5 text-xs">
              <button
                onClick={() => setSource("tvmaze")}
                className={`rounded px-3 py-1.5 font-medium transition ${
                  source === "tvmaze" ? "bg-accent text-obsidian font-bold shadow-neon-cyan" : "text-mist hover:text-white"
                }`}
              >
                TVMaze (100% Free, No Key)
              </button>
              <button
                onClick={() => setSource("tmdb")}
                className={`rounded px-3 py-1.5 font-medium transition ${
                  source === "tmdb" ? "bg-accent text-obsidian font-bold shadow-neon-cyan" : "text-mist hover:text-white"
                }`}
              >
                TMDB TV
              </button>
            </div>
          </div>
          <span className="text-[11px] text-mist">
            {source === "tvmaze"
              ? "⚡ Zero-Config: Auto-generates season & episode trees"
              : tmdbConfigured
              ? "✨ Global multilingual metadata & 4K backdrops"
              : "⚠️ TMDB_API_KEY not set in environment"}
          </span>
        </div>

        {/* Search Input */}
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder={
              source === "tvmaze"
                ? "Search series e.g. Stranger Things, Wednesday, Breaking Bad..."
                : "Search series e.g. The Last of Us, Succession, Severance..."
            }
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-accent/60"
          />
          <button
            onClick={run}
            disabled={searching}
            className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-obsidian shadow-neon-cyan transition hover:brightness-110 disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            <span>{searching ? "Searching..." : "Search Series"}</span>
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
              <CheckSquare className="h-4 w-4 text-neon" />
            ) : (
              <Square className="h-4 w-4 text-mist" />
            )}
            <span>
              {selectedIds.length === results.length ? "Deselect All" : "Select All"} ({results.length})
            </span>
          </button>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-neon font-semibold">
                {selectedIds.length} series selected
              </span>
              <button
                onClick={handleBatchImport}
                disabled={batchSaving}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-neon to-accent px-4 py-1.5 font-semibold text-obsidian shadow-neon-pink transition hover:brightness-110 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{batchSaving ? "Importing..." : `Import Selected (${selectedIds.length})`}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {searching ? (
        <div className="py-12 text-center text-sm text-mist">Searching series database...</div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {results.map((r) => {
            const isSelected = selectedIds.includes(r.id);
            return (
              <div
                key={`${r.source}-${r.id}`}
                onClick={() => toggleSelect(r.id)}
                className={`glass card-surface group relative flex flex-col overflow-hidden transition cursor-pointer ${
                  isSelected ? "border-neon ring-1 ring-neon" : "hover:border-accent/40"
                }`}
              >
                {/* Selection Checkbox */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(r.id);
                  }}
                  className="absolute top-2 left-2 z-10 grid h-6 w-6 place-items-center rounded bg-black/70 backdrop-blur transition hover:bg-black"
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-neon" />
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
                  {r.network && (
                    <span className="absolute top-2 right-2 rounded bg-black/80 backdrop-blur px-1.5 py-0.5 text-[9px] font-bold text-accent">
                      {r.network}
                    </span>
                  )}
                  {r.rating ? (
                    <span className="absolute bottom-2 right-2 rounded bg-black/80 backdrop-blur px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                      ⭐ {typeof r.rating === "number" ? r.rating.toFixed(1) : r.rating}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col justify-between p-3">
                  <div>
                    <h3 className="line-clamp-1 text-sm font-semibold text-white group-hover:text-accent">
                      {r.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-mist">
                      {r.year || "N/A"} {r.status ? `· ${r.status}` : ""}
                    </p>
                    {r.genres.length > 0 && (
                      <p className="mt-1 line-clamp-1 text-[11px] text-mist/70">
                        {r.genres.join(", ")}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      save(r);
                    }}
                    disabled={saving === r.id}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-accent/40 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent hover:text-obsidian disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {saving === r.id ? "Saving..." : "Save to Vault"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center text-sm text-mist">
          Search series to import — TVMaze automatically downloads seasons and episode lists.
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Manual Series Entry ───────────────────────────────────────────────

function ManualSeriesTab() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [form, setForm] = useState({
    title: "",
    titleTh: "",
    year: "",
    studio: "",
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
      pushToast("Series title is required", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await createMedia({
        type: "series",
        title: form.title.trim(),
        titleTh: form.titleTh.trim() || undefined,
        year: form.year ? parseInt(form.year, 10) : undefined,
        studio: form.studio.trim() || undefined,
        overview: form.overview.trim() || undefined,
        posterUrl: form.posterUrl.trim() || undefined,
        trailerUrl: form.trailerUrl.trim() || undefined,
        rating: form.rating ? parseFloat(form.rating) : undefined,
      });
      setCreatedId(res.media.id);
      pushToast(`Saved series "${form.title}" to vault`, "success");
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
      <h2 className="font-display text-base font-bold text-white">Add Series Manually</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-mist">Series Title *</label>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Breaking Bad" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist">Alternate / Local Title</label>
          <input value={form.titleTh} onChange={(e) => set("titleTh", e.target.value)} placeholder="e.g. Local Title" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist">Premiered Year</label>
          <input value={form.year} onChange={(e) => set("year", e.target.value)} placeholder="2023" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist">Network / Platform</label>
          <input value={form.studio} onChange={(e) => set("studio", e.target.value)} placeholder="Netflix, HBO, Disney+..." className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist">Rating (0-10)</label>
          <input value={form.rating} onChange={(e) => set("rating", e.target.value)} placeholder="9.0" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-mist">Poster Image URL</label>
          <input value={form.posterUrl} onChange={(e) => set("posterUrl", e.target.value)} placeholder="https://..." className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-mist">Synopsis</label>
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
          {busy ? "Saving..." : "Save Series"}
        </button>
        {createdId && (
          <Link
            href={`/media/${createdId}`}
            className="flex items-center gap-1.5 text-xs text-accent hover:text-white"
          >
            Open details to configure seasons & episodes <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
