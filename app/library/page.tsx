"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Database,
  Download,
  ExternalLink,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUiStore } from "@/lib/store";
import {
  createMedia,
  deleteMedia,
  librarySearch,
  listAllMedia,
  refetchMedia,
  saveTmdb,
  updateMedia,
  type TmdbResult,
} from "@/lib/api/client";
import type { Media } from "@/lib/types";
import { FolderSearch, FolderSync, Sparkles, Wand2 } from "lucide-react";

type Tab = "shelf" | "scanner" | "search" | "manual";

function StatusBadge({ status }: { status: Media["status"] }) {
  const map = {
    draft: "text-amber-300 border-amber-300/40",
    published: "text-emerald-300 border-emerald-300/40",
    flagged: "text-red-300 border-red-300/40",
  } as const;
  const label = { draft: "DRAFT", published: "PUBLISHED", flagged: "FLAGGED" } as const;
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${map[status]}`}>
      {label[status]}
    </span>
  );
}

export default function LibraryPage() {
  const { user } = useAuth();
  // Default to 'shelf' so existing media is displayed first
  const [tab, setTab] = useState<Tab>("shelf");

  if (!user?.isAdmin) {
    return (
      <div className="glass card-surface mx-auto max-w-md p-6 text-center">
        <p className="text-sm text-slate-200">This page is restricted to administrators.</p>
        <p className="mt-2 text-xs text-mist">
          Sign in with an admin account to manage the unified media library.
        </p>
      </div>
    );
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "shelf", label: "Media Shelf" },
    { id: "scanner", label: "Local Media Scanner" },
    { id: "search", label: "TMDB Ingest" },
    { id: "manual", label: "Manual JAV Entry" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-white">Media Library & Scanner</h1>
        <p className="mt-1 text-sm text-mist">
          Browse all media in the vault, scan local server storage, or import from external sources.
        </p>
      </div>

      <div className="glass inline-flex flex-wrap gap-1 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm transition ${
              tab === t.id
                ? "bg-accent/15 text-accent shadow-neon-cyan font-semibold"
                : "text-mist hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "shelf" && <ShelfTab />}
      {tab === "scanner" && <ScannerTab />}
      {tab === "search" && <TmdbSearchTab />}
      {tab === "manual" && <ManualTab />}
    </div>
  );
}

// ── Tab 1: Shelf Management (Displayed by Default) ───────────────────────────

type ShelfFilter = "all" | "movie" | "series" | "jav";

const SHELF_FILTERS: Array<{ id: ShelfFilter; label: string; accent?: "pink" }> = [
  { id: "all", label: "All" },
  { id: "movie", label: "Movies" },
  { id: "series", label: "Series" },
  { id: "jav", label: "Adult (JAV)", accent: "pink" },
];

function ShelfTab() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [items, setItems] = useState<Media[]>([]);
  const [filter, setFilter] = useState<ShelfFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAllMedia();
      setItems(res.items);
    } catch {
      pushToast("Failed to load library items", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = {
    all: items.length,
    movie: items.filter((m) => m.type === "movie").length,
    series: items.filter((m) => m.type === "series").length,
    jav: items.filter((m) => m.type === "jav").length,
  };
  const visible = filter === "all" ? items : items.filter((m) => m.type === filter);

  const toggleStatus = async (m: Media) => {
    const next = m.status === "published" ? "draft" : "published";
    try {
      await updateMedia(m.id, { status: next });
      pushToast(next === "published" ? "Published" : "Moved to drafts", "success");
      load();
    } catch (e) {
      pushToast((e as Error).message, "error");
    }
  };

  const remove = async (m: Media) => {
    if (!confirm(`Delete "${m.title}" from library?`)) return;
    try {
      await deleteMedia(m.id);
      pushToast("Deleted successfully", "success");
      setItems((prev) => prev.filter((item) => item.id !== m.id));
      load();
    } catch (e) {
      pushToast((e as Error).message, "error");
    }
  };

  const refetch = async (m: Media) => {
    setRefreshing(m.id);
    try {
      const res = await refetchMedia(m.id);
      pushToast(`Refetched "${res.media.title}" from API`, "success");
      load();
    } catch (e) {
      pushToast((e as Error).message, "error");
    } finally {
      setRefreshing(null);
    }
  };

  if (loading) return <p className="text-sm text-mist">Loading library items...</p>;

  return (
    <div className="space-y-4">
      {/* Category Filters */}
      <div className="glass inline-flex flex-wrap gap-1 rounded-xl p-1">
        {SHELF_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-lg px-4 py-2 text-sm transition ${
              filter === f.id
                ? f.accent === "pink"
                  ? "bg-neon/15 text-neon shadow-neon-pink font-semibold"
                  : "bg-accent/15 text-accent shadow-neon-cyan font-semibold"
                : "text-mist hover:text-white"
            }`}
          >
            {f.label} ({counts[f.id]})
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="glass card-surface p-8 text-center text-sm text-mist">
          <Database className="mx-auto mb-3 h-8 w-8 text-accent" />
          Vault is empty — scan local files or search online providers above.
        </div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-mist">No items found in this category.</p>
      ) : null}

      {items.length > 0 && visible.length > 0 && (
        <div className="glass card-surface divide-y divide-white/5">
          {visible.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
              <div className="h-14 w-10 shrink-0 overflow-hidden rounded border border-white/10 bg-white/5">
                {m.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.posterUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{m.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-mist">
                  <span className="font-mono">{m.id}</span>
                  <span>{m.type.toUpperCase()}</span>
                  {m.year ? <span>{m.year}</span> : null}
                  <span>{m.views} views</span>
                  <StatusBadge status={m.status} />
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/media/${m.id}`}
                  className="flex items-center gap-1.5 rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent transition hover:bg-accent/10"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit / Links
                </Link>
                <button
                  onClick={() => toggleStatus(m)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/5"
                >
                  {m.status === "published" ? "Hide" : "Publish"}
                </button>
                {m.id.startsWith("tmdb-") && (
                  <button
                    onClick={() => refetch(m)}
                    disabled={refreshing === m.id}
                    title="Refresh metadata from TMDB"
                    className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-mist transition hover:text-accent disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshing === m.id ? "animate-spin" : ""}`} />
                  </button>
                )}
                <button
                  onClick={() => remove(m)}
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-mist transition hover:border-red-400/50 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Local Folder Scanner ─────────────────────────────────────────────

function ScannerTab() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [scanning, setScanning] = useState(false);
  const [scanFolder, setScanFolder] = useState("");
  const [result, setResult] = useState<{
    totalScanned: number;
    added: number;
    skipped: number;
    scanPath: string;
    items: Array<{ file: string; title: string; status: "added" | "skipped" }>;
  } | null>(null);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/library/scan-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath: scanFolder.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to scan folder");
      setResult(data);
      pushToast(
        `Scan complete: Found ${data.totalScanned} files (+${data.added} added)`,
        "success",
      );
    } catch (err) {
      pushToast((err as Error).message, "error");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass card-surface p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent">
            <FolderSearch className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-white">
              Local Media Folder Scanner
            </h2>
            <p className="text-xs text-mist">
              Scans for video files (.mp4, .mkv, .m3u8, .mov, .avi) and registers them into the library
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={scanFolder}
            onChange={(e) => setScanFolder(e.target.value)}
            placeholder="Target folder path (leave empty for default data/media)"
            className={inputCls}
          />
          <button
            type="button"
            onClick={runScan}
            disabled={scanning}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-obsidian shadow-neon-cyan transition hover:brightness-110 disabled:opacity-50"
          >
            <FolderSync className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
            <span>{scanning ? "Scanning..." : "Start Scan"}</span>
          </button>
        </div>
      </div>

      {result && (
        <div className="glass card-surface p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="text-xl font-bold font-mono text-white">{result.totalScanned}</span>
              <p className="text-xs text-mist mt-1">Files Discovered</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <span className="text-xl font-bold font-mono text-emerald-400">+{result.added}</span>
              <p className="text-xs text-mist mt-1">Newly Added</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="text-xl font-bold font-mono text-slate-400">{result.skipped}</span>
              <p className="text-xs text-mist mt-1">Already Exists (Skipped)</p>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {result.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="truncate font-medium text-white">{item.title}</p>
                  <p className="truncate text-[11px] text-mist font-mono">{item.file}</p>
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${
                    item.status === "added"
                      ? "border border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                      : "border border-white/10 bg-white/5 text-slate-400"
                  }`}
                >
                  {item.status === "added" ? "Added" : "Skipped"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: TMDB Ingest ───────────────────────────────────────────────────────

function TmdbSearchTab() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<TmdbResult[]>([]);
  const [configured, setConfigured] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);

  const run = async () => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const res = await librarySearch(q);
      setResults(res.results);
      setConfigured(res.configured);
    } catch {
      pushToast("Search failed", "error");
    } finally {
      setSearching(false);
    }
  };

  const save = async (r: TmdbResult) => {
    setSaving(r.tmdbId);
    try {
      const res = await saveTmdb(r.tmdbId, r.mediaType);
      if (res.duplicate) {
        pushToast(`"${r.title}" already exists in vault`, "info");
      } else {
        pushToast(`Saved "${r.title}" to library (draft status)`, "success");
      }
      setResults((prev) => prev.map((x) => (x.tmdbId === r.tmdbId ? { ...x, saved: true } : x)));
    } catch (e) {
      pushToast((e as Error).message, "error");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="glass card-surface p-5">
        <p className="mb-3 text-xs text-mist">
          Data source: TMDB (Free) — Requires TMDB_API_KEY in .env.local
          {!configured && (
            <span className="mt-1 block text-amber-300">
              TMDB_API_KEY not configured — set it in .env.local and restart server
            </span>
          )}
        </p>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="Search movies or TV e.g. Interstellar, Breaking Bad..."
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-accent/60"
          />
          <button
            onClick={run}
            disabled={searching}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-neon px-5 py-2.5 text-sm font-semibold text-obsidian shadow-neon-cyan transition hover:brightness-110 disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>
      </div>

      {searching ? (
        <p className="text-sm text-mist">Searching TMDB...</p>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((r) => (
            <div key={`${r.mediaType}-${r.tmdbId}`} className="glass card-surface overflow-hidden">
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-white/5">
                {r.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.posterUrl} alt={r.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center p-3 text-center text-xs text-mist">
                    {r.title}
                  </div>
                )}
                <span className="absolute left-2 top-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-obsidian">
                  {r.mediaType === "movie" ? "MOVIE" : "SERIES"}
                </span>
              </div>
              <div className="space-y-2 p-3">
                <h3 className="line-clamp-1 text-sm font-semibold text-white">{r.title}</h3>
                <p className="text-xs text-mist">
                  {r.year ?? ""} {r.rating ? `· ⭐ ${r.rating.toFixed(1)}` : ""}
                </p>
                <button
                  onClick={() => save(r)}
                  disabled={saving === r.tmdbId}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-accent/40 px-3 py-2 text-xs text-accent transition hover:bg-accent/10 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  {saving === r.tmdbId ? "Saving..." : "Save to Vault"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-mist">Enter title to search and import items from TMDB</p>
      )}
    </div>
  );
}

// ── Tab 4: Manual Entry ─────────────────────────────────────────────────────

const EMPTY_FORM = {
  code: "",
  title: "",
  titleTh: "",
  type: "jav" as const,
  country: "JP",
  year: "",
  studio: "",
  overview: "",
  tags: "",
  actresses: "",
  posterUrl: "",
  trailerUrl: "",
  rating: "",
};

function ManualTab() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [fetchingJav, setFetchingJav] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const set = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const autoFetchJav = async () => {
    if (!form.code.trim()) {
      pushToast("Please enter a JAV code e.g. SSIS-842 or IPX-711", "error");
      return;
    }
    setFetchingJav(true);
    try {
      const res = await fetch("/api/library/fetch-jav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: form.code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      setForm((prev) => ({
        ...prev,
        code: data.code,
        title: data.title,
        titleTh: data.title,
        studio: data.studio || prev.studio,
        actresses: data.actress || prev.actresses,
        overview: data.overview || prev.overview,
        tags: data.tags ? data.tags.join(", ") : prev.tags,
        year: String(data.year || 2024),
        rating: String(data.rating || 8.8),
        posterUrl: data.posterUrl || prev.posterUrl,
      }));
      pushToast(`Fetched metadata for ${data.code}!`, "success");
    } catch (err) {
      pushToast((err as Error).message, "error");
    } finally {
      setFetchingJav(false);
    }
  };

  const submit = async () => {
    if (!form.title.trim()) {
      pushToast("Title is required", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await createMedia({
        type: form.type,
        code: form.code || undefined,
        title: form.title.trim(),
        titleTh: form.titleTh.trim() || undefined,
        country: form.country.trim() || undefined,
        year: form.year ? Number(form.year) : undefined,
        studio: form.studio.trim() || undefined,
        overview: form.overview.trim() || undefined,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        actresses: form.actresses.split(",").map((a) => a.trim()).filter(Boolean),
        posterUrl: form.posterUrl.trim() || undefined,
        trailerUrl: form.trailerUrl.trim() || undefined,
        rating: form.rating ? Number(form.rating) : undefined,
      });
      setCreatedId(res.media.id);
      pushToast(
        form.code ? `Saved ${form.code} — ready to add stream links` : "Saved successfully",
        "success",
      );
    } catch (e) {
      pushToast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1-Click Auto Fetcher Bar */}
      <div className="glass card-surface flex flex-wrap items-center justify-between gap-3 p-4 border border-neon/30 bg-neon/5">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-neon" />
          <span className="text-xs font-semibold text-white">
            JAV Auto-Fetcher (1-Click Lookup):
          </span>
          <span className="text-xs text-mist">
            Enter a release code below and click to populate studio, actress, and poster automatically.
          </span>
        </div>
        <button
          type="button"
          onClick={autoFetchJav}
          disabled={fetchingJav || !form.code.trim()}
          className="flex items-center gap-1.5 rounded-lg border border-neon/40 bg-neon/20 px-3.5 py-1.5 text-xs font-semibold text-neon transition hover:bg-neon hover:text-obsidian disabled:opacity-40"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>{fetchingJav ? "Fetching..." : "Fetch JAV Code"}</span>
        </button>
      </div>

      <div className="glass card-surface grid gap-4 p-5 sm:grid-cols-2">
        <Field label="JAV Code (e.g. SSIS-842, IPX-711)">
          <div className="flex gap-2">
            <input
              value={form.code}
              onChange={(e) => set("code", e.target.value)}
              placeholder="SSIS-842"
              className={inputCls}
            />
          </div>
        </Field>
        <Field label="Title *">
          <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Title" className={inputCls} />
        </Field>
        <Field label="Alternate Title">
          <input value={form.titleTh} onChange={(e) => set("titleTh", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Year">
          <input value={form.year} onChange={(e) => set("year", e.target.value)} placeholder="2024" className={inputCls} />
        </Field>
        <Field label="Country">
          <input value={form.country} onChange={(e) => set("country", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Studio / Maker">
          <input value={form.studio} onChange={(e) => set("studio", e.target.value)} placeholder="S1, Moodyz..." className={inputCls} />
        </Field>
        <Field label="Actresses (comma separated)">
          <input
            value={form.actresses}
            onChange={(e) => set("actresses", e.target.value)}
            placeholder="Yua Mikami, Eimi Fukada..."
            className={inputCls}
          />
        </Field>
        <Field label="Tags (comma separated)">
          <input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="solo, uncensored..." className={inputCls} />
        </Field>
        <Field label="Poster Image URL">
          <input value={form.posterUrl} onChange={(e) => set("posterUrl", e.target.value)} placeholder="https://..." className={inputCls} />
        </Field>
        <Field label="Trailer URL (YouTube)">
          <input value={form.trailerUrl} onChange={(e) => set("trailerUrl", e.target.value)} className={inputCls} />
        </Field>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-mist">Overview / Synopsis</label>
          <textarea
            value={form.overview}
            onChange={(e) => set("overview", e.target.value)}
            rows={3}
            className={inputCls}
          />
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            onClick={submit}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-neon to-accent px-5 py-2.5 text-sm font-semibold text-obsidian shadow-neon-pink transition hover:brightness-110 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {busy ? "Saving..." : "Save to Vault"}
          </button>
          {createdId && (
            <Link
              href={`/media/${createdId}`}
              className="flex items-center gap-1.5 text-sm text-accent hover:text-white"
            >
              Open details page (add stream links) <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-accent/60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-mist">{label}</label>
      {children}
    </div>
  );
}