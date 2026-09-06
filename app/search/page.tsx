"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SearchX } from "lucide-react";
import { useSearchQuery } from "@/lib/hooks/useSearch";
import { isJavCodeLike, normalizeJavCode } from "@/lib/utils/normalize";
import MediaCard from "@/components/media/MediaCard";
import MediaViewSwitcher, { type ViewMode } from "@/components/media/MediaViewSwitcher";
import { MediaGridSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import Link from "next/link";
import { Star, CheckCircle2, AlertCircle, Building2, X } from "lucide-react";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("q") ?? "";
  const initialStudio = searchParams.get("studio") ?? "";
  const [query, setQuery] = useState(initial);
  const [submitted, setSubmitted] = useState(initial);
  const [studio, setStudio] = useState(initialStudio);

  const { data, isLoading } = useSearchQuery(submitted, studio);

  const runSearch = (q: string) => {
    const trimmed = q.trim();
    setQuery(trimmed);
    setSubmitted(trimmed);
  };

  const normalized = isJavCodeLike(submitted) ? normalizeJavCode(submitted) : submitted.toLowerCase();

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mv:search_view");
      if (saved === "grid" || saved === "list" || saved === "compact") return saved;
    }
    return "grid";
  });

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("mv:search_view", mode);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-white">Search Vault</h1>
          <p className="mt-1 text-sm text-mist">
            Search by title, JAV code, or actress/actor name
          </p>
        </div>
        {data && data.items.length > 0 && (
          <MediaViewSwitcher mode={viewMode} onChange={handleViewChange} />
        )}
      </div>

      <div className="relative max-w-2xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            runSearch(e.target.value);
          }}
          placeholder="e.g. SSIS-543, Cyberpunk, Yua Mikami..."
          className="glass w-full rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-accent/60 focus:shadow-neon-cyan"
        />
      </div>

      {/* Active Studio Filter Chip */}
      {studio && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-mist">Filtered by Studio:</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neon/40 bg-neon/15 px-3 py-1 text-xs font-semibold text-neon shadow-sm">
            <Building2 className="h-3.5 w-3.5" />
            <span>{studio}</span>
            <button
              type="button"
              onClick={() => setStudio("")}
              className="ml-1 rounded-full p-0.5 hover:bg-white/20 text-white/80 hover:text-white"
              title="Remove studio filter"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}

      {isJavCodeLike(submitted) && (
        <p className="text-xs text-mist">
          Detected JAV code format → Normalized to{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-accent">{normalized}</code>
        </p>
      )}

      {isLoading ? (
        <MediaGridSkeleton count={8} />
      ) : data && data.items.length > 0 ? (
        <>
          {viewMode === "grid" && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {data.items.map((media) => (
                <MediaCard key={media.id} media={media} />
              ))}
            </div>
          )}

          {viewMode === "list" && (
            <div className="glass card-surface divide-y divide-white/5 rounded-2xl overflow-hidden">
              {data.items.map((m) => {
                const hasStreams = Boolean(m.sources && m.sources.length > 0);
                return (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center gap-4 px-4 py-3 transition hover:bg-white/[0.02]"
                  >
                    <Link
                      href={`/media/${m.id}`}
                      className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5 group"
                    >
                      {m.posterUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.posterUrl}
                          alt=""
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-[10px] text-mist font-bold text-center p-1">
                          {m.code || "NO POSTER"}
                        </div>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {m.code && (
                          <span className="rounded bg-neon/20 px-1.5 py-0.5 text-[10px] font-bold font-mono text-neon border border-neon/30">
                            {m.code}
                          </span>
                        )}
                        <Link
                          href={`/media/${m.id}`}
                          className="truncate text-sm font-semibold text-white hover:text-accent transition"
                        >
                          {m.title}
                        </Link>
                      </div>

                      <p className="mt-0.5 flex flex-wrap items-center gap-2.5 text-xs text-mist">
                        {m.studio && <span className="text-slate-300">{m.studio}</span>}
                        {m.actors.length > 0 && (
                          <span className="text-neon/90 font-medium">
                            {m.actors.slice(0, 3).join(", ")}
                            {m.actors.length > 3 ? "..." : ""}
                          </span>
                        )}
                        {m.year && <span>{m.year}</span>}
                        {typeof m.rating === "number" && (
                          <span className="flex items-center gap-0.5 text-amber-300">
                            <Star className="h-3 w-3 fill-current" />
                            {m.rating.toFixed(1)}
                          </span>
                        )}
                        <span>{m.views.toLocaleString()} views</span>
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                            hasStreams
                              ? "border-emerald-400/40 text-emerald-300"
                              : "border-amber-400/40 text-amber-300"
                          }`}
                        >
                          {hasStreams ? `${m.sources.length} Stream` : "No Stream"}
                        </span>
                      </p>
                    </div>

                    <Link
                      href={`/media/${m.id}`}
                      className="rounded-lg border border-accent/40 bg-accent/5 px-3 py-1.5 text-xs text-accent transition hover:bg-accent/20"
                    >
                      View Details
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === "compact" && (
            <div className="glass card-surface overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs text-mist">
                <thead className="border-b border-white/10 bg-white/[0.02] text-[11px] uppercase tracking-wider text-white/70">
                  <tr>
                    <th className="py-3 px-4">Title / Code</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Year</th>
                    <th className="py-3 px-3">Rating</th>
                    <th className="py-3 px-3">Streams</th>
                    <th className="py-3 pr-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.items.map((m) => {
                    const hasStreams = Boolean(m.sources && m.sources.length > 0);
                    return (
                      <tr key={m.id} className="transition hover:bg-white/[0.02]">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2 max-w-md">
                            {m.code && (
                              <span className="shrink-0 rounded bg-neon/20 px-1 py-0.5 text-[9px] font-bold font-mono text-neon">
                                {m.code}
                              </span>
                            )}
                            <Link
                              href={`/media/${m.id}`}
                              className="truncate font-medium text-white hover:text-accent transition"
                            >
                              {m.title}
                            </Link>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-slate-400">
                          {m.type}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{m.year || "—"}</td>
                        <td className="py-2.5 px-3">
                          {typeof m.rating === "number" ? (
                            <span className="flex items-center gap-1 font-bold text-amber-300">
                              <Star className="h-3 w-3 fill-current" />
                              {m.rating.toFixed(1)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] ${
                              hasStreams ? "text-emerald-300" : "text-amber-400/80"
                            }`}
                          >
                            {hasStreams ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <AlertCircle className="h-3 w-3" />
                            )}
                            <span>{m.sources?.length || 0}</span>
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-right">
                          <Link
                            href={`/media/${m.id}`}
                            className="rounded-lg border border-accent/40 bg-accent/5 px-2.5 py-1 text-[11px] text-accent transition hover:bg-accent/20"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : submitted || studio ? (
        <EmptyState
          icon={SearchX}
          title="No Results Found"
          description={
            data && !data.configured
              ? "Database not connected — please check your environment configuration"
              : studio && submitted
                ? `No matches found for "${submitted}" within studio "${studio}"`
                : studio
                  ? `No titles found from studio "${studio}"`
                  : `No matches found for "${submitted}" — try another keyword, JAV code, or cast name`
          }
        />
      ) : (
        <EmptyState
          icon={Search}
          title="Ready to Search"
          description="Search by media title, JAV code, or actor/actress name. Results update automatically as you type."
        />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<MediaGridSkeleton count={8} />}>
      <SearchPageContent />
    </Suspense>
  );
}
