"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { Film, Globe, RotateCcw, Search, UserRound } from "lucide-react";
import { listActresses, type ActressProfile } from "@/lib/api/client";
import EmptyState from "@/components/ui/EmptyState";
import { useUiStore } from "@/lib/store";

type Category = "all" | "jav" | "film";

const CATEGORIES: Array<{ id: Category; label: string }> = [
  { id: "all", label: "All" },
  { id: "jav", label: "AV / JAV" },
  { id: "film", label: "Movies & Series" },
];

function CategoryBadges({ types }: { types: string[] }) {
  const isJav = types.includes("jav");
  const isFilm = types.some((t) => t === "movie" || t === "series");
  if (!isJav && !isFilm) return null;
  return (
    <div className="flex gap-1">
      {isJav && (
        <span className="rounded bg-neon px-1.5 py-0.5 text-[10px] font-bold text-white shadow-neon-pink">
          AV
        </span>
      )}
      {isFilm && (
        <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-obsidian shadow-neon-cyan">
          Film/Series
        </span>
      )}
    </div>
  );
}

function ActressesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = (searchParams.get("category") as Category | null) ?? "all";
  const [category, setCategory] = useState<Category>(
    ["all", "jav", "film"].includes(initial) ? initial : "all",
  );
  const [q, setQ] = useState("");
  const [mediaId, setMediaId] = useState<string>("all");
  const [country, setCountry] = useState<string>("all");

  const openLightbox = useUiStore((s) => s.openLightbox);
  const openContextMenu = useUiStore((s) => s.openContextMenu);

  const { data, isLoading } = useQuery({
    queryKey: ["actresses", category, mediaId, country],
    queryFn: () => listActresses({ category, mediaId, country }),
  });

  const filterOptions = data?.availableFilterOptions;

  const items = useMemo(() => {
    const all = data?.items ?? [];
    if (!q.trim()) return all;
    const needle = q.trim().toLowerCase();
    return all.filter(
      (a) =>
        a.name.toLowerCase().includes(needle) ||
        a.aliases.some((al) => al.toLowerCase().includes(needle)),
    );
  }, [data, q]);

  const counts = useMemo(() => {
    if (data?.counts) {
      return data.counts;
    }
    const all = data?.items ?? [];
    return {
      all: all.length,
      jav: all.filter((a) => a.types?.includes("jav")).length,
      film: all.filter((a) => a.types?.some((t) => t === "movie" || t === "series")).length,
    };
  }, [data]);

  const switchCategory = (c: Category) => {
    setCategory(c);
    router.replace(`/actresses${c === "all" ? "" : `?category=${c}`}`);
  };

  const hasActiveFilters = mediaId !== "all" || country !== "all" || q.trim() !== "";

  const resetFilters = () => {
    setQ("");
    setMediaId("all");
    setCountry("all");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-white">Actors & Actresses</h1>
        <p className="mt-1 text-sm text-mist">
          Cast profiles from API metadata and custom entries — categorized by media type
        </p>
      </div>

      {/* Filter and search bar */}
      <div className="glass card-surface p-4 rounded-2xl space-y-3 border border-white/10">
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Tabs */}
          <div className="glass inline-flex flex-wrap gap-1 rounded-xl p-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => switchCategory(c.id)}
                className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition ${
                  category === c.id
                    ? c.id === "jav"
                      ? "bg-neon/15 text-neon shadow-neon-pink font-semibold"
                      : "bg-accent/15 text-accent shadow-neon-cyan font-semibold"
                    : "text-mist hover:text-white"
                }`}
              >
                {c.label}{" "}
                <span className="text-[11px] opacity-75">
                  ({c.id === "all" ? counts.all : c.id === "jav" ? counts.jav : counts.film})
                </span>
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mist" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search cast names or aliases..."
              className="glass w-full rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm text-white outline-none transition focus:border-accent/60"
            />
          </div>
        </div>

        {/* Second Row: Saved Titles & Country Selectors */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">
          {/* Saved Media Title Selector */}
          <div className="flex items-center gap-1.5 min-w-[200px] flex-1 sm:max-w-xs">
            <Film className="h-4 w-4 text-accent shrink-0" />
            <select
              value={mediaId}
              onChange={(e) => setMediaId(e.target.value)}
              aria-label="Filter by Saved Movie or Series"
              className="glass w-full rounded-xl py-2 px-3 text-xs text-slate-200 outline-none transition focus:border-accent/60 bg-surface/80"
            >
              <option value="all">🎬 All Saved Titles</option>
              {filterOptions?.media?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.type === "jav" ? "[JAV] " : m.type === "series" ? "[Series] " : "[Movie] "}
                  {m.title} {m.year ? `(${m.year})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Country Selector */}
          <div className="flex items-center gap-1.5 min-w-[160px]">
            <Globe className="h-4 w-4 text-neon shrink-0" />
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              aria-label="Filter by Country"
              className="glass w-full rounded-xl py-2 px-3 text-xs text-slate-200 outline-none transition focus:border-accent/60 bg-surface/80"
            >
              <option value="all">🌍 All Countries</option>
              {filterOptions?.countries?.map((c) => (
                <option key={c} value={c}>
                  {c === "US" ? "🇺🇸 United States (US)" : c === "JP" ? "🇯🇵 Japan (JP)" : c}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-mist hover:text-white hover:bg-white/10 transition ml-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl border border-white/10 bg-white/5" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((a: ActressProfile) => (
            <Link
              key={a.id}
              href={`/actress/${a.id}`}
              onContextMenu={(e) => {
                e.preventDefault();
                openContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  imageSrc: a.photoUrl || undefined,
                  title: a.name,
                });
              }}
              className="group glass card-surface overflow-hidden transition hover:border-accent/50 hover:shadow-neon-cyan"
            >
              <div
                onClick={(e) => {
                  if (a.photoUrl) {
                    e.preventDefault();
                    openLightbox(a.photoUrl, a.name);
                  }
                }}
                className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-accent/15 to-neon/15 cursor-pointer"
                title="Click image to zoom, right-click for menu, click card to view profile"
              >
                {a.photoUrl ? (
                  <Image
                    src={a.photoUrl}
                    alt={a.name}
                    fill
                    unoptimized
                    sizes="200px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center">
                    <UserRound className="h-12 w-12 text-mist/60" />
                  </div>
                )}
                <div className="absolute left-2 top-2">
                  <CategoryBadges types={a.types ?? []} />
                </div>
              </div>
              <div className="space-y-1 p-3">
                <h3 className="line-clamp-1 text-sm font-semibold text-white group-hover:text-accent transition">{a.name}</h3>
                <div className="flex items-center justify-between text-xs text-mist">
                  <span>{a.mediaCount} {a.mediaCount === 1 ? "title" : "titles"}</span>
                  {a.country && <span className="text-[10px] text-slate-400">{a.country}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={UserRound}
          title={q || mediaId !== "all" || country !== "all" ? "No Cast Found" : "No actors in this category"}
          description={
            hasActiveFilters
              ? "No cast match your filter criteria — try resetting filters or searching for another name"
              : category === "jav"
                ? "No JAV actresses found yet — actresses are automatically indexed when saving JAV media."
                : "No actors found yet — add titles in library to register cast profiles."
          }
        />
      )}
    </div>
  );
}

export default function ActressesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-mist">Loading...</div>}>
      <ActressesPageContent />
    </Suspense>
  );
}
