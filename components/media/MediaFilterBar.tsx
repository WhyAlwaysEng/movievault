"use client";

import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, X, RotateCcw } from "lucide-react";
import type { FilterOptions } from "@/lib/api/client";
import { fetchFilterOptions } from "@/lib/api/client";

export interface FilterState {
  search: string;
  genre: string;
  studio: string;
  year: string;
  country: string;
  actress: string;
  status: string;
  sortBy: string;
}

interface MediaFilterBarProps {
  mediaType?: "movie" | "series" | "jav";
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
}

function formatCountryName(c: string): string {
  const map: Record<string, string> = {
    US: "🇺🇸 United States (US)",
    JP: "🇯🇵 Japan (JP)",
    CN: "🇨🇳 China (CN)",
    KR: "🇰🇷 South Korea (KR)",
    TH: "🇹🇭 Thailand (TH)",
    HK: "🇭🇰 Hong Kong (HK)",
    TW: "🇹🇼 Taiwan (TW)",
    GB: "🇬🇧 United Kingdom (UK)",
    FR: "🇫🇷 France (FR)",
  };
  return map[c.toUpperCase()] || c;
}

export default function MediaFilterBar({
  mediaType,
  filters,
  onChange,
  totalCount,
  filteredCount,
}: MediaFilterBarProps) {
  const [options, setOptions] = useState<FilterOptions>({
    genres: [],
    studios: [],
    years: [],
    countries: [],
    actresses: [],
  });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchFilterOptions(mediaType)
      .then((res) => setOptions(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [mediaType]);

  const update = (key: keyof FilterState, val: string) => {
    onChange({ ...filters, [key]: val });
  };

  const hasActiveFilters =
    filters.search !== "" ||
    filters.genre !== "all" ||
    filters.studio !== "all" ||
    filters.year !== "all" ||
    (filters.country && filters.country !== "all") ||
    (filters.actress && filters.actress !== "all") ||
    filters.status !== "all" ||
    filters.sortBy !== "newest";

  const resetFilters = () => {
    onChange({
      search: "",
      genre: "all",
      studio: "all",
      year: "all",
      country: "all",
      actress: "all",
      status: "all",
      sortBy: "newest",
    });
  };

  return (
    <div className="glass rounded-2xl border border-white/10 p-4 space-y-3">
      {/* Primary Row: Search + Quick Selects + Filter Toggle */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Keyword Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mist" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            placeholder={
              mediaType === "jav"
                ? "Search by code, actress, or title..."
                : "Search by title, keyword, cast..."
            }
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-8 py-2 text-xs text-white placeholder-mist/60 focus:border-accent focus:outline-none"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => update("search", "")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mist hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dynamic Studio / Network Selector */}
        {options.studios.length > 0 && (
          <select
            value={filters.studio}
            onChange={(e) => update("studio", e.target.value)}
            aria-label="Filter by Studio or Network"
            className="rounded-xl border border-white/10 bg-surface px-3 py-2 text-xs text-slate-200 focus:border-accent focus:outline-none"
          >
            <option value="all">All Studios / Networks</option>
            {options.studios.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        )}

        {/* Dynamic Genre / Category Selector */}
        {options.genres.length > 0 && (
          <select
            value={filters.genre}
            onChange={(e) => update("genre", e.target.value)}
            aria-label="Filter by Genre"
            className="rounded-xl border border-white/10 bg-surface px-3 py-2 text-xs text-slate-200 focus:border-accent focus:outline-none max-w-[180px]"
          >
            <option value="all">All Genres</option>
            {options.genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        )}

        {/* Sort Order */}
        <select
          value={filters.sortBy}
          onChange={(e) => update("sortBy", e.target.value)}
          aria-label="Sort order"
          className="rounded-xl border border-white/10 bg-surface px-3 py-2 text-xs text-slate-200 focus:border-accent focus:outline-none"
        >
          <option value="newest">Newest Added</option>
          <option value="year">Release Year (Latest)</option>
          <option value="rating">Highest Rated</option>
          <option value="views">Most Viewed</option>
          <option value="title">Title (A-Z)</option>
        </select>

        {/* Toggle Advanced Filters Button */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={
            "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition " +
            (expanded || hasActiveFilters
              ? "border-accent/40 bg-accent/10 text-accent shadow-neon-cyan"
              : "border-white/10 bg-surface text-mist hover:text-white")
          }
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="ml-0.5 rounded-full bg-accent px-1.5 py-0.2 text-[10px] font-bold text-obsidian">
              Active
            </span>
          )}
        </button>
      </div>

      {/* Expandable Advanced Filter Panel */}
      {expanded && (
        <div className="pt-3 border-t border-white/5 grid gap-3 sm:grid-cols-2 md:grid-cols-4 animate-in fade-in">
          {/* Release Year Filter */}
          <div>
            <label className="text-[11px] font-medium text-mist block mb-1">
              Release Year
            </label>
            <select
              value={filters.year}
              onChange={(e) => update("year", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-surface px-3 py-1.5 text-xs text-slate-200 focus:border-accent focus:outline-none"
            >
              <option value="all">All Years</option>
              {options.years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Country Filter */}
          <div>
            <label className="text-[11px] font-medium text-mist block mb-1">
              Country
            </label>
            <select
              value={filters.country || "all"}
              onChange={(e) => update("country", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-surface px-3 py-1.5 text-xs text-slate-200 focus:border-accent focus:outline-none"
            >
              <option value="all">All Countries</option>
              {options.countries.map((c) => (
                <option key={c} value={c}>
                  {formatCountryName(c)}
                </option>
              ))}
            </select>
          </div>

          {/* Cast / Actress Filter */}
          <div>
            <label className="text-[11px] font-medium text-mist block mb-1">
              Actor / Actress
            </label>
            <select
              value={filters.actress || "all"}
              onChange={(e) => update("actress", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-surface px-3 py-1.5 text-xs text-slate-200 focus:border-accent focus:outline-none"
            >
              <option value="all">All Cast Members</option>
              {options.actresses.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Publication Status */}
          <div>
            <label className="text-[11px] font-medium text-mist block mb-1">
              Catalog Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => update("status", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-surface px-3 py-1.5 text-xs text-slate-200 focus:border-accent focus:outline-none"
            >
              <option value="all">All Statuses (Live & Draft)</option>
              <option value="published">Published Only</option>
              <option value="draft">Drafts Only</option>
            </select>
          </div>
        </div>
      )}

      {/* Active Filter Chips Bar & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px]">
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.genre !== "all" && (
            <span className="flex items-center gap-1 rounded-md bg-accent/10 border border-accent/30 px-2 py-0.5 text-accent">
              Genre: {filters.genre}
              <button
                type="button"
                onClick={() => update("genre", "all")}
                className="hover:text-white ml-0.5"
              >
                ×
              </button>
            </span>
          )}
          {filters.studio !== "all" && (
            <span className="flex items-center gap-1 rounded-md bg-accent/10 border border-accent/30 px-2 py-0.5 text-accent">
              Studio: {filters.studio}
              <button
                type="button"
                onClick={() => update("studio", "all")}
                className="hover:text-white ml-0.5"
              >
                ×
              </button>
            </span>
          )}
          {filters.year !== "all" && (
            <span className="flex items-center gap-1 rounded-md bg-accent/10 border border-accent/30 px-2 py-0.5 text-accent">
              Year: {filters.year}
              <button
                type="button"
                onClick={() => update("year", "all")}
                className="hover:text-white ml-0.5"
              >
                ×
              </button>
            </span>
          )}
          {filters.country && filters.country !== "all" && (
            <span className="flex items-center gap-1 rounded-md bg-neon/10 border border-neon/30 px-2 py-0.5 text-neon">
              Country: {filters.country}
              <button
                type="button"
                onClick={() => update("country", "all")}
                className="hover:text-white ml-0.5"
              >
                ×
              </button>
            </span>
          )}
          {filters.actress && filters.actress !== "all" && (
            <span className="flex items-center gap-1 rounded-md bg-accent/10 border border-accent/30 px-2 py-0.5 text-accent">
              Cast: {filters.actress}
              <button
                type="button"
                onClick={() => update("actress", "all")}
                className="hover:text-white ml-0.5"
              >
                ×
              </button>
            </span>
          )}
          {filters.status !== "all" && (
            <span className="flex items-center gap-1 rounded-md bg-accent/10 border border-accent/30 px-2 py-0.5 text-accent">
              Status: {filters.status}
              <button
                type="button"
                onClick={() => update("status", "all")}
                className="hover:text-white ml-0.5"
              >
                ×
              </button>
            </span>
          )}
        </div>

        <span className="text-mist ml-auto">
          Showing <strong>{filteredCount}</strong> of <strong>{totalCount}</strong> {mediaType || "titles"}
        </span>
      </div>
    </div>
  );
}
