"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Flame,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUiStore } from "@/lib/store";
import {
  createMedia,
  deleteMedia,
  listAllMedia,
  saveDedicatedJav,
  searchDedicatedJav,
  updateMedia,
  type JavSearchResult,
} from "@/lib/api/client";
import type { Media } from "@/lib/types";
import MediaViewSwitcher, { type ViewMode } from "@/components/media/MediaViewSwitcher";
import MediaShelfView from "@/components/media/MediaShelfView";
import MediaFilterBar, { type FilterState } from "@/components/media/MediaFilterBar";

type Tab = "shelf" | "search" | "manual";

export default function JavVaultPage() {
  const { user } = useAuth();
  const pushToast = useUiStore((s) => s.pushToast);

  // Default to 'shelf' so existing JAV items are displayed first
  const [tab, setTab] = useState<Tab>("shelf");

  if (!user?.isAdmin) {
    return (
      <div className="glass card-surface mx-auto max-w-md p-6 text-center">
        <p className="text-sm text-slate-200">This page is restricted to administrators.</p>
        <p className="mt-2 text-xs text-mist">
          Sign in with an admin account to manage the adult vault.
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
            <Flame className="h-4 w-4" />
            <span>Dedicated Adult Vault (Secured)</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">🔞 Adult Vault (18+)</h1>
          <p className="mt-1 text-sm text-mist">
            Browse stored releases or fetch codes via JAVDB Scraper & Knowledge Engine
          </p>
        </div>

        {/* Tab Switcher: Shelf first, then Search, then Manual */}
        <div className="glass inline-flex rounded-xl p-1 shrink-0">
          <button
            onClick={() => setTab("shelf")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "shelf"
                ? "bg-neon/20 text-neon shadow-neon-pink font-bold"
                : "text-mist hover:text-white"
            }`}
          >
            JAV Shelf
          </button>
          <button
            onClick={() => setTab("search")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "search"
                ? "bg-neon/20 text-neon shadow-neon-pink font-bold"
                : "text-mist hover:text-white"
            }`}
          >
            Search JAVDB Code
          </button>
          <button
            onClick={() => setTab("manual")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "manual"
                ? "bg-neon/20 text-neon shadow-neon-pink font-bold"
                : "text-mist hover:text-white"
            }`}
          >
            + Add Manually
          </button>
        </div>
      </div>

      {tab === "shelf" && <JavShelfTab />}
      {tab === "search" && <JavSearchTab />}
      {tab === "manual" && <ManualJavTab />}
    </div>
  );
}

// ── Tab 1: JAV Shelf (Displayed by Default) ──────────────────────────────────

function JavShelfTab() {
  const pushToast = useUiStore((s) => s.pushToast);
  const requestConfirm = useUiStore((s) => s.requestConfirm);
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAllMedia();
      setItems(res.items.filter((m) => m.type === "jav"));
    } catch {
      pushToast("Failed to load JAV shelf", "error");
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
      pushToast(next === "published" ? "Published" : "Moved to drafts", "success");
      load();
    } catch (e) {
      pushToast((e as Error).message, "error");
    }
  };

  const remove = async (m: Media) => {
    const ok = await requestConfirm({
      title: `ลบผลงาน "${m.code || m.title}"`,
      message: `คุณต้องการลบ "${m.code ? `[${m.code}] ` : ""}${m.title}" ออกจากคลัง JAV ใช่หรือไม่?`,
      confirmText: "ลบผลงาน",
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
        const matchCode = m.code?.toLowerCase().includes(q);
        const matchActor = m.actors.some((a) => a.toLowerCase().includes(q));
        if (!matchTitle && !matchCode && !matchActor) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (filters.sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (filters.sortBy === "views") return (b.views || 0) - (a.views || 0);
      if (filters.sortBy === "year") return (b.year || 0) - (a.year || 0);
      if (filters.sortBy === "title") return (mCode(a)).localeCompare(mCode(b));
      return b.updatedAt - a.updatedAt;
    });

  function mCode(item: Media) {
    return item.code || item.title;
  }

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mv:jav_view");
      if (saved === "grid" || saved === "list" || saved === "compact") return saved;
    }
    return "grid";
  });

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("mv:jav_view", mode);
    }
  };

  const handleBatchPublish = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => updateMedia(id, { status: "published" })));
      pushToast(`Published ${ids.length} JAV titles`, "success");
      load();
    } catch (e) {
      pushToast((e as Error).message, "error");
    }
  };

  const handleBatchDraft = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => updateMedia(id, { status: "draft" })));
      pushToast(`Moved ${ids.length} JAV titles to drafts`, "info");
      load();
    } catch (e) {
      pushToast((e as Error).message, "error");
    }
  };

  const handleBatchDelete = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => deleteMedia(id)));
      pushToast(`Deleted ${ids.length} JAV titles`, "success");
      setItems((prev) => prev.filter((item) => !ids.includes(item.id)));
      load();
    } catch (e) {
      pushToast((e as Error).message, "error");
    }
  };

  if (loading) return <div className="py-12 text-center text-sm text-mist">Loading JAV vault...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <span className="text-xs text-mist">
          Total <strong>{items.length}</strong> JAV titles in vault
        </span>
        <MediaViewSwitcher mode={viewMode} onChange={handleViewChange} />
      </div>

      <MediaFilterBar
        mediaType="jav"
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
        emptyText="No JAV titles matched your filters."
        mediaTypeLabel="JAV titles"
      />
    </div>
  );
}

// ── Tab 2: JAVDB Code Search & Save ──────────────────────────────────────────

function JavSearchTab() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [codeQuery, setCodeQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<JavSearchResult | null>(null);

  const searchJav = async () => {
    const q = codeQuery.trim();
    if (!q) {
      pushToast("Enter a release code e.g. SSIS-842 or IPX-711", "info");
      return;
    }
    setSearching(true);
    setResult(null);
    try {
      const res = await searchDedicatedJav(q);
      if (res.ok && res.result) {
        setResult(res.result);
        pushToast(`Fetched metadata for ${res.result.code}!`, "success");
      } else {
        pushToast(res.error || "No data found for this code", "error");
      }
    } catch (err) {
      pushToast((err as Error).message || "Failed to query JAVDB", "error");
    } finally {
      setSearching(false);
    }
  };

  const saveToVault = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const res = await saveDedicatedJav(result);
      if (res.duplicate) {
        pushToast(`Code ${result.code} is already in vault`, "info");
      } else {
        pushToast(`Saved ${result.code} to adult vault!`, "success");
      }
    } catch (e) {
      pushToast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="glass card-surface border-neon/30 p-5 space-y-3">
        <div className="flex items-center justify-between text-xs text-mist">
          <span className="flex items-center gap-1.5 text-neon font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            JAVDB Hybrid Scraper + Knowledge Resolver Engine (100% Free)
          </span>
          <span className="text-[11px] text-mist/80">Supports S1, IPX, Moodyz, Faleno, Madonna, SOD...</span>
        </div>
        <div className="flex gap-2">
          <input
            value={codeQuery}
            onChange={(e) => setCodeQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchJav()}
            placeholder="Enter release code e.g. SSIS-842, IPX-711, MIDE-900..."
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-neon font-mono uppercase"
          />
          <button
            onClick={searchJav}
            disabled={searching}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-neon to-accent px-6 py-2.5 text-sm font-bold text-obsidian shadow-neon-pink transition hover:brightness-110 disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            <span>{searching ? "Searching..." : "Lookup Code"}</span>
          </button>
        </div>
      </div>

      {/* Result Card */}
      {result && (
        <div className="glass card-surface border border-neon/30 overflow-hidden">
          <div className="grid md:grid-cols-3 gap-6 p-6">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/10 bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.posterUrl} alt={result.title} className="h-full w-full object-cover" />
              <span className="absolute top-2 left-2 rounded bg-neon px-2 py-0.5 text-xs font-mono font-bold text-obsidian shadow-neon-pink">
                {result.code}
              </span>
              <span className="absolute top-2 right-2 rounded bg-black/80 backdrop-blur px-2 py-0.5 text-xs font-bold text-amber-300">
                ⭐ {result.rating.toFixed(1)}
              </span>
            </div>

            <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200">
                    Studio: {result.studio}
                  </span>
                  <span className="rounded bg-neon/15 px-2.5 py-1 text-xs font-semibold text-neon">
                    Actress: {result.actress}
                  </span>
                  <span className="rounded bg-white/10 px-2.5 py-1 text-xs text-mist font-mono">
                    Year {result.year}
                  </span>
                  <span className="text-[11px] text-mist font-mono">
                    [{result.source === "javdb_live" ? "Live Scraper" : "Smart Resolver"}]
                  </span>
                </div>

                <h2 className="font-display text-lg font-bold text-white">{result.title}</h2>
                {result.titleJa && (
                  <p className="text-xs text-mist font-sans">{result.titleJa}</p>
                )}

                <p className="text-xs leading-relaxed text-slate-300">{result.overview}</p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {result.tags.map((t, idx) => (
                    <span key={idx} className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-mist">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex flex-wrap items-center gap-3">
                <button
                  onClick={saveToVault}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-neon to-accent px-6 py-2.5 text-sm font-bold text-obsidian shadow-neon-pink transition hover:brightness-110 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  <span>{saving ? "Saving to Vault..." : "Save to Adult Vault (1-Click)"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Manual JAV Entry ──────────────────────────────────────────────────

function ManualJavTab() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [form, setForm] = useState({
    code: "",
    title: "",
    titleJa: "",
    studio: "",
    actresses: "",
    tags: "",
    overview: "",
    posterUrl: "",
    streamUrl: "",
    rating: "8.8",
  });
  const [busy, setBusy] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const submit = async () => {
    if (!form.code.trim() || !form.title.trim()) {
      pushToast("Code and title are required", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await saveDedicatedJav({
        code: form.code.trim(),
        title: form.title.trim(),
        titleJa: form.titleJa.trim() || undefined,
        studio: form.studio.trim() || undefined,
        actress: form.actresses.split(",")[0]?.trim() || undefined,
        actresses: form.actresses.split(",").map((a) => a.trim()).filter(Boolean),
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        overview: form.overview.trim() || undefined,
        posterUrl: form.posterUrl.trim() || undefined,
        streamUrl: form.streamUrl.trim() || undefined,
        rating: parseFloat(form.rating) || 8.8,
      });
      setCreatedId(res.mediaId || null);
      pushToast(`Saved ${form.code} successfully!`, "success");
    } catch (e) {
      pushToast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-neon";

  return (
    <div className="glass card-surface p-6 space-y-4 max-w-2xl mx-auto border border-neon/20">
      <h2 className="font-display text-base font-bold text-white">Add JAV Manually</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-mist">Release Code (e.g. SSIS-842) *</label>
          <input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="SSIS-842" className={`${inputCls} font-mono uppercase`} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist">Studio / Maker</label>
          <input value={form.studio} onChange={(e) => set("studio", e.target.value)} placeholder="S1, Idea Pocket, Moodyz..." className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-mist">Title *</label>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Title" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-mist">Japanese Title (Optional)</label>
          <input value={form.titleJa} onChange={(e) => set("titleJa", e.target.value)} placeholder="日本語タイトル" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist">Actresses (comma separated)</label>
          <input value={form.actresses} onChange={(e) => set("actresses", e.target.value)} placeholder="Yua Mikami, Eimi Fukada..." className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist">Tags (comma separated)</label>
          <input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="4K, Exclusive..." className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-mist">Poster Image URL</label>
          <input value={form.posterUrl} onChange={(e) => set("posterUrl", e.target.value)} placeholder="https://..." className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-mist">Stream URL (.m3u8 / MP4)</label>
          <input value={form.streamUrl} onChange={(e) => set("streamUrl", e.target.value)} placeholder="https://.../master.m3u8" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-mist">Overview / Synopsis</label>
          <textarea rows={3} value={form.overview} onChange={(e) => set("overview", e.target.value)} className={inputCls} />
        </div>
      </div>
      <div className="pt-2 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg bg-neon px-5 py-2.5 text-sm font-bold text-obsidian shadow-neon-pink transition hover:brightness-110 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {busy ? "Saving..." : "Save JAV Title"}
        </button>
        {createdId && (
          <Link
            href={`/media/${createdId}`}
            className="flex items-center gap-1.5 text-xs text-neon hover:text-white"
          >
            Open details page <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
