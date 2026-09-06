"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Camera,
  Check,
  Download,
  ExternalLink,
  Film,
  Filter,
  Globe,
  Loader2,
  Pencil,
  Play,
  RotateCw,
  Save,
  Search,
  Sparkles,
  Star,
  Trash2,
  UserRound,
  Video,
  X,
  ZoomIn,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUiStore } from "@/lib/store";
import {
  applyActressPhotoOnline,
  deleteActress,
  getActress,
  searchActressPhotos,
  updateActress,
  uploadActressPhoto,
  type ActressProfile,
  type PhotoSearchResultItem,
} from "@/lib/api/client";
import type { Media } from "@/lib/types";
import { containsJapanese } from "@/lib/utils/translate";

export default function ActressPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const router = useRouter();
  const { user } = useAuth();
  const pushToast = useUiStore((s) => s.pushToast);
  const canEdit = user?.isAdmin ?? false;

  const [data, setData] = useState<{ actress: ActressProfile; works: Media[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [showPhotoFinder, setShowPhotoFinder] = useState(false);

  // Actress Hub: Studio & Timeline Filters
  const [selectedStudio, setSelectedStudio] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"year_desc" | "year_asc" | "rating" | "views">("year_desc");
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("timeline");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getActress(id));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="mx-auto max-w-4xl animate-pulse rounded-xl border border-white/10 bg-white/5 p-8" />;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/actresses" className="inline-flex items-center gap-2 text-sm text-mist transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to Cast List
        </Link>
        <EmptyState
          icon={UserRound}
          title="Cast Member Not Found"
          description={`No profile found for "${id}". When added to any media, a profile page will be created automatically.`}
        />
      </div>
    );
  }

  const { actress, works } = data;

  if (editing) {
    return (
      <EditActressForm
        actress={actress}
        onCancel={() => setEditing(false)}
        onSaved={async () => {
          setData(await getActress(id));
          setEditing(false);
        }}
        onDeleted={() => {
          window.location.href = "/actresses";
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <Link href="/actresses" className="inline-flex items-center gap-2 text-sm text-mist transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to Cast List
        </Link>
        {canEdit && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 rounded-lg border border-accent/40 px-4 py-2 text-sm text-accent transition hover:bg-accent/10"
          >
            <Pencil className="h-4 w-4" />
            Edit Profile
          </button>
        )}
      </div>

      <div className="glass card-surface flex flex-col items-center gap-5 p-8 text-center sm:flex-row sm:text-left">
        <div className="relative shrink-0">
          <div className="h-28 w-28 overflow-hidden rounded-full border-2 border-accent/40 shadow-neon-cyan">
            {actress.photoUrl ? (
              <Image src={actress.photoUrl} alt={actress.name} fill unoptimized sizes="112px" className="object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-gradient-to-br from-accent/30 to-neon/30">
                <UserRound className="h-12 w-12 text-obsidian" />
              </div>
            )}
          </div>
          {canEdit && <PhotoUpload actressId={actress.id} onDone={load} />}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <h1 className="font-display text-2xl font-bold text-white">{actress.name}</h1>
            <span className="rounded-full border border-neon/30 bg-neon/10 px-2.5 py-0.5 text-xs font-semibold text-neon">
              AV Idol
            </span>
          </div>
          {actress.aliases.find((a) => containsJapanese(a)) && (
            <div className="mt-2 flex items-center justify-center sm:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300">
                🇯🇵 Japanese Name:{" "}
                <span className="font-bold">
                  {actress.aliases.find((a) => containsJapanese(a))}
                </span>
              </span>
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm text-mist sm:justify-start">
            {actress.country && <span>{actress.country}</span>}
            {actress.studio && <span>· {actress.studio}</span>}
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs text-accent">
              {works.length} {works.length === 1 ? "title" : "titles"}
            </span>
          </div>
          {actress.aliases.filter((a) => !containsJapanese(a)).length > 0 && (
            <p className="mt-2 text-xs text-mist">
              Aliases: {actress.aliases.filter((a) => !containsJapanese(a)).join(", ")}
            </p>
          )}
          {actress.bio && <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">{actress.bio}</p>}

          {/* Quick Photo Search Links */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 pt-2 sm:justify-start">
            <button
              type="button"
              onClick={() => setShowPhotoFinder(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-neon px-3.5 py-1.5 text-xs font-bold text-obsidian shadow-neon-cyan transition hover:brightness-110"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>ค้นหารูปภาพในระบบ (Anonymous Popup)</span>
            </button>

            {(() => {
              const jpName = actress.aliases.find((a) => containsJapanese(a));
              const query = jpName ? `${actress.name} ${jpName}` : actress.name;
              return (
                <div className="flex items-center gap-1.5 text-xs text-mist">
                  <span className="text-mist/70">| แหล่งภายนอก:</span>
                  <a
                    href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-mist transition hover:border-accent/40 hover:text-white"
                    title="เปิดค้นหา Google Images ในแท็บใหม่"
                  >
                    <span>Google</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                  <a
                    href={`https://duckduckgo.com/?iax=images&ia=images&q=${encodeURIComponent(query)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-amber-300/80 transition hover:border-amber-400/40 hover:text-amber-200"
                    title="เปิดค้นหา DuckDuckGo ในแท็บใหม่"
                  >
                    <span>DDG</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── Filmography & Works Timeline Hub ── */}
      <div className="space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold text-white">
                Works & Filmography
              </h2>
              <span className="rounded-full border border-neon/40 bg-neon/15 px-2.5 py-0.5 text-xs font-semibold text-neon">
                {works.length} Total
              </span>
              {works.filter((w) => w.sources && w.sources.length > 0).length > 0 && (
                <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                  {works.filter((w) => w.sources && w.sources.length > 0).length} Ready to Stream
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-mist">
              Chronological release timeline and studio distribution for {actress.name}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Switcher: Grid vs Timeline */}
            <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("timeline")}
                className={`rounded-lg px-2.5 py-1 transition ${
                  viewMode === "timeline"
                    ? "bg-accent text-obsidian font-bold shadow-neon-cyan"
                    : "text-mist hover:text-white"
                }`}
              >
                📅 Timeline
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`rounded-lg px-2.5 py-1 transition ${
                  viewMode === "grid"
                    ? "bg-accent text-obsidian font-bold shadow-neon-cyan"
                    : "text-mist hover:text-white"
                }`}
              >
                ▦ Grid
              </button>
            </div>

            {/* Studio Filter Dropdown */}
            {(() => {
              const studios = Array.from(
                new Set(works.map((w) => w.studio).filter(Boolean)),
              ) as string[];
              if (studios.length <= 1) return null;
              return (
                <select
                  value={selectedStudio}
                  onChange={(e) => setSelectedStudio(e.target.value)}
                  className="rounded-xl border border-white/10 bg-obsidian/80 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-accent"
                >
                  <option value="all">All Studios ({studios.length})</option>
                  {studios.map((st) => (
                    <option key={st} value={st}>
                      {st} ({works.filter((w) => w.studio === st).length})
                    </option>
                  ))}
                </select>
              );
            })()}

            {/* Year Filter Dropdown */}
            {(() => {
              const years = Array.from(
                new Set(works.map((w) => w.year).filter((y): y is number => Boolean(y))),
              ).sort((a, b) => b - a);
              if (years.length <= 1) return null;
              return (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="rounded-xl border border-white/10 bg-obsidian/80 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-accent"
                >
                  <option value="all">All Years</option>
                  {years.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              );
            })()}

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="rounded-xl border border-white/10 bg-obsidian/80 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-accent"
            >
              <option value="year_desc">Latest First</option>
              <option value="year_asc">Oldest First</option>
              <option value="rating">Top Rated</option>
              <option value="views">Most Views</option>
            </select>
          </div>
        </div>

        {/* Filtered & Sorted Works Presentation */}
        {(() => {
          let list = [...works];
          if (selectedStudio !== "all") {
            list = list.filter((w) => w.studio === selectedStudio);
          }
          if (selectedYear !== "all") {
            list = list.filter((w) => String(w.year) === selectedYear);
          }
          list.sort((a, b) => {
            if (sortOrder === "year_asc") return (a.year || 0) - (b.year || 0);
            if (sortOrder === "rating") return (b.rating || 0) - (a.rating || 0);
            if (sortOrder === "views") return (b.views || 0) - (a.views || 0);
            return (b.year || 0) - (a.year || 0);
          });

          if (list.length === 0) {
            return (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <p className="text-sm text-mist">No titles match the selected filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudio("all");
                    setSelectedYear("all");
                  }}
                  className="mt-2 text-xs text-accent hover:underline"
                >
                  Clear filters
                </button>
              </div>
            );
          }

          if (viewMode === "timeline") {
            // Group by year
            const grouped = list.reduce<Record<string, Media[]>>((acc, m) => {
              const yr = m.year ? String(m.year) : "Year Unknown";
              if (!acc[yr]) acc[yr] = [];
              acc[yr].push(m);
              return acc;
            }, {});

            const sortedYears = Object.keys(grouped).sort((a, b) => {
              if (sortOrder === "year_asc") return a.localeCompare(b);
              return b.localeCompare(a);
            });

            return (
              <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-2 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-accent before:via-neon before:to-white/10">
                {sortedYears.map((yr) => (
                  <div key={yr} className="relative space-y-3">
                    {/* Timeline Year Node */}
                    <div className="flex items-center gap-3">
                      <div className="absolute -left-6 sm:-left-8 h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 border-accent bg-obsidian shadow-neon-cyan translate-x-[2px] sm:translate-x-[4px]" />
                      <span className="font-display text-base font-bold text-accent">
                        {yr}
                      </span>
                      <span className="text-xs text-mist">
                        ({grouped[yr].length} {grouped[yr].length === 1 ? "release" : "releases"})
                      </span>
                    </div>

                    {/* Works Cards for this Year */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {grouped[yr].map((m) => {
                        const hasStream = Boolean(m.sources && m.sources.length > 0);
                        return (
                          <Link
                            key={m.id}
                            href={`/media/${m.id}`}
                            className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-accent/50 hover:shadow-neon-cyan"
                          >
                            <div className="relative aspect-[2/3] w-full overflow-hidden bg-white/5">
                              {m.posterUrl ? (
                                <Image
                                  src={m.posterUrl}
                                  alt={m.title}
                                  fill
                                  unoptimized
                                  sizes="200px"
                                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                              ) : (
                                <div className="grid h-full w-full place-items-center p-3 text-center text-xs text-mist">
                                  {m.title}
                                </div>
                              )}
                              {m.type === "jav" && m.code && (
                                <span className="absolute right-1.5 top-1.5 rounded border border-neon/50 bg-obsidian/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-neon backdrop-blur-sm">
                                  {m.code}
                                </span>
                              )}
                              <span
                                className={`absolute left-1.5 bottom-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold backdrop-blur-md ${
                                  hasStream
                                    ? "border border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
                                    : "border border-white/10 bg-black/60 text-mist"
                                }`}
                              >
                                {hasStream ? "Ready" : "Metadata"}
                              </span>
                            </div>

                            <div className="space-y-1 p-2.5 flex-1 flex flex-col justify-between">
                              <div>
                                <p className="line-clamp-2 text-xs font-semibold text-white leading-tight">
                                  {m.title}
                                </p>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-mist pt-1 border-t border-white/5">
                                <span className="truncate max-w-[80px]">
                                  {m.studio || (m.year ? String(m.year) : "")}
                                </span>
                                {typeof m.rating === "number" && (
                                  <span className="flex items-center gap-0.5 text-amber-300 font-bold">
                                    ★ {m.rating.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          }

          // Grid View
          return (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {list.map((m) => {
                const hasStream = Boolean(m.sources && m.sources.length > 0);
                return (
                  <Link
                    key={m.id}
                    href={`/media/${m.id}`}
                    className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-accent/50 hover:shadow-neon-cyan"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-white/5">
                      {m.posterUrl ? (
                        <Image
                          src={m.posterUrl}
                          alt={m.title}
                          fill
                          unoptimized
                          sizes="200px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center p-3 text-center text-xs text-mist">
                          {m.title}
                        </div>
                      )}
                      {m.type === "jav" && m.code && (
                        <span className="absolute right-1.5 top-1.5 rounded border border-neon/50 bg-obsidian/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-neon backdrop-blur-sm">
                          {m.code}
                        </span>
                      )}
                      <span
                        className={`absolute left-1.5 bottom-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold backdrop-blur-md ${
                          hasStream
                            ? "border border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
                            : "border border-white/10 bg-black/60 text-mist"
                        }`}
                      >
                        {hasStream ? "Ready" : "Metadata"}
                      </span>
                    </div>

                    <div className="space-y-1 p-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="line-clamp-2 text-xs font-semibold text-white leading-tight">
                          {m.title}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-mist pt-1 border-t border-white/5">
                        <span className="truncate max-w-[80px]">
                          {m.studio || (m.year ? String(m.year) : "")}
                        </span>
                        {typeof m.rating === "number" && (
                          <span className="flex items-center gap-0.5 text-amber-300 font-bold">
                            ★ {m.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          );
        })()}
      </div>

      {showPhotoFinder && (
        <AnonymousPhotoModal
          actress={actress}
          onClose={() => setShowPhotoFinder(false)}
          onPhotoApplied={load}
        />
      )}
    </div>
  );
}

function PhotoUpload({ actressId, onDone }: { actressId: string; onDone: () => void }) {
  const pushToast = useUiStore((s) => s.pushToast);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      await uploadActressPhoto(actressId, file);
      pushToast("Photo uploaded successfully", "success");
      onDone();
    } catch (e) {
      pushToast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <label className="absolute -bottom-2 -right-2 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-gradient-to-r from-accent to-neon text-obsidian shadow-neon-cyan transition hover:brightness-110">
      {busy ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-obsidian/30 border-t-obsidian" />
      ) : (
        <Camera className="h-4 w-4" />
      )}
      <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
    </label>
  );
}

function AnonymousPhotoModal({
  actress,
  onClose,
  onPhotoApplied,
}: {
  actress: ActressProfile;
  onClose: () => void;
  onPhotoApplied: () => void;
}) {
  const pushToast = useUiStore((s) => s.pushToast);
  const openLightbox = useUiStore((s) => s.openLightbox);
  const jpName = actress.aliases.find((a) => containsJapanese(a));
  const defaultQuery = jpName ? `${actress.name} ${jpName}` : actress.name;

  const [query, setQuery] = useState(defaultQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PhotoSearchResultItem[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoSearchResultItem | null>(null);
  const [applying, setApplying] = useState(false);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSelectedPhoto(null);
    try {
      const res = await searchActressPhotos(actress.id, searchQuery.trim());
      setResults(res.results || []);
      if (res.results?.length === 0) {
        pushToast("ไม่พบรูปภาพ ลองปรับคำค้นหาดูอีกครั้ง", "info");
      }
    } catch (e) {
      pushToast((e as Error).message || "ค้นหารูปภาพล้มเหลว", "error");
    } finally {
      setLoading(false);
    }
  }, [actress.id, pushToast]);

  useEffect(() => {
    handleSearch(defaultQuery);
  }, [defaultQuery, handleSearch]);

  const handleApply = async (item: PhotoSearchResultItem) => {
    setApplying(true);
    try {
      await applyActressPhotoOnline(actress.id, item.image);
      pushToast("อัปเดตรูปประจำตัวเรียบร้อยแล้ว!", "success");
      onPhotoApplied();
      onClose();
    } catch (e) {
      pushToast((e as Error).message || "ไม่สามารถตั้งรูปนี้ได้", "error");
    } finally {
      setApplying(false);
    }
  };

  const handleDownload = async (item: PhotoSearchResultItem) => {
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(item.image)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanName = `${actress.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-photo.jpg`;
      a.download = cleanName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      pushToast("ดาวน์โหลดรูปภาพสำเร็จ", "success");
    } catch {
      window.open(item.image, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/85 p-3 backdrop-blur-md">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent/20 text-accent">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display flex items-center gap-2 text-base font-bold text-white">
                <span>Anonymous Photo Finder</span>
                <span className="rounded-full border border-neon/30 bg-neon/10 px-2 py-0.5 text-[10px] text-neon">
                  Bing & DDG Engine
                </span>
              </h2>
              <p className="text-xs text-mist">
                ค้นหารูปภาพแบบไม่ระบุตัวตน ไม่เก็บประวัติ ดูตัวอย่าง ดาวน์โหลด หรือกดตั้งเป็นรูปโปรไฟล์ได้ทันที
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-mist transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar & Quick Tags */}
        <div className="border-b border-white/10 bg-white/[0.02] p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(query);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ระบุชื่อหรือคำค้นหา..."
                className="w-full rounded-xl border border-white/15 bg-obsidian/60 py-2 pl-10 pr-4 text-sm text-white placeholder-mist/60 outline-none transition focus:border-accent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-accent/20 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent/30 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>ค้นหา</span>
            </button>
          </form>

          {/* Quick preset tags */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-mist/80">คำค้นหาด่วน:</span>
            <button
              type="button"
              onClick={() => {
                setQuery(actress.name);
                handleSearch(actress.name);
              }}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-mist transition hover:border-accent hover:text-accent"
            >
              {actress.name}
            </button>
            {jpName && (
              <button
                type="button"
                onClick={() => {
                  setQuery(`${actress.name} ${jpName}`);
                  handleSearch(`${actress.name} ${jpName}`);
                }}
                className="rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-300 transition hover:border-rose-400 hover:text-white"
              >
                🇯🇵 {jpName}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const q = `${actress.name} portrait profile`;
                setQuery(q);
                handleSearch(q);
              }}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-mist transition hover:border-accent hover:text-accent"
            >
              + Portrait
            </button>
          </div>
        </div>

        {/* Results Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-accent" />
              <p className="mt-3 text-sm text-mist">กำลังค้นหารูปภาพแบบไม่ระบุตัวตน...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {results.map((item, idx) => {
                const isSelected = selectedPhoto?.image === item.image;
                return (
                  <div
                    key={idx}
                    className={`group relative flex flex-col overflow-hidden rounded-xl border bg-black/40 transition hover:shadow-lg ${
                      isSelected
                        ? "border-accent ring-2 ring-accent/50"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-white/5">
                      {/* Proxy image preview to avoid CORS/broken image blocks */}
                      <img
                        src={`/api/proxy-image?url=${encodeURIComponent(item.thumbnail || item.image)}`}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          // fallback to direct url if proxy fails
                          (e.currentTarget as HTMLImageElement).src = item.thumbnail || item.image;
                        }}
                      />

                      {/* Hover action overlay */}
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => openLightbox(`/api/proxy-image?url=${encodeURIComponent(item.image)}`, item.title)}
                          className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 text-white transition hover:bg-white/40 hover:scale-110"
                          title="ซูมดูรูปเต็ม"
                        >
                          <ZoomIn className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(item)}
                          className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 text-white transition hover:bg-white/40 hover:scale-110"
                          title="ดาวน์โหลดรูปลงเครื่อง"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>

                      {item.width && item.height && (
                        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[9px] text-white/80 font-mono">
                          {item.width}×{item.height}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-2">
                      <p className="line-clamp-1 text-[11px] text-mist" title={item.title}>
                        {item.title}
                      </p>
                      <button
                        type="button"
                        disabled={applying}
                        onClick={() => handleApply(item)}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-accent/40 bg-accent/15 py-1 text-xs font-semibold text-accent transition hover:border-accent hover:bg-accent/25"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>ตั้งเป็นรูปโปรไฟล์</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-10 w-10 text-mist/40" />
              <p className="mt-3 text-sm text-mist">ไม่พบผลลัพธ์</p>
              <p className="text-xs text-mist/60">ลองเปลี่ยนชื่อค้นหาหรือเพิ่มคำเช่น portrait หรือชื่อญี่ปุ่น</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-5 py-3">
          <span className="text-xs text-mist">
            ผลการค้นหา: <strong className="text-white">{results.length}</strong> รูปภาพ
          </span>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/15 px-4 py-1.5 text-xs text-mist transition hover:border-white/30 hover:text-white"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}

function EditActressForm({
  actress,
  onCancel,
  onSaved,
  onDeleted,
}: {
  actress: ActressProfile;
  onCancel: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const pushToast = useUiStore((s) => s.pushToast);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(actress.name);
  const [aliases, setAliases] = useState(actress.aliases.join(", "));
  const [country, setCountry] = useState(actress.country ?? "");
  const [studio, setStudio] = useState(actress.studio ?? "");
  const [bio, setBio] = useState(actress.bio ?? "");

  const save = async () => {
    setBusy(true);
    try {
      await updateActress(actress.id, {
        name,
        aliases: aliases.split(",").map((a) => a.trim()).filter(Boolean),
        country,
        studio,
        bio,
      });
      pushToast("Profile saved successfully", "success");
      onSaved();
    } catch (e) {
      pushToast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete profile "${actress.name}"? (Links in media will also be removed)`)) return;
    try {
      await deleteActress(actress.id);
      pushToast("Profile deleted", "success");
      onDeleted();
    } catch (e) {
      pushToast((e as Error).message, "error");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-white">Edit Profile</h1>
        <button onClick={onCancel} className="text-sm text-mist transition hover:text-white">
          Cancel
        </button>
      </div>
      <div className="glass card-surface grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-mist">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist">Aliases (comma separated)</label>
          <input value={aliases} onChange={(e) => setAliases(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist">Country</label>
          <input value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist">Studio / Network</label>
          <input value={studio} onChange={(e) => setStudio(e.target.value)} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-mist">Biography</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className={inputCls} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-neon px-5 py-2.5 text-sm font-semibold text-obsidian shadow-neon-cyan transition hover:brightness-110 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Save
        </button>
        <button
          onClick={remove}
          className="ml-auto flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-mist transition hover:border-red-400/50 hover:text-red-300"
        >
          <Trash2 className="h-4 w-4" />
          Delete Profile
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-accent/60";