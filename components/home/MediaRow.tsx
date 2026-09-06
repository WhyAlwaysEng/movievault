"use client";

import { useRef } from "react";
import type { Media } from "@/lib/types";
import MediaCard from "@/components/media/MediaCard";
import { ChevronLeft, ChevronRight, Film } from "lucide-react";

interface MediaRowProps {
  title: string;
  items: Media[];
  accent?: "cyan" | "pink";
  emptyHint?: string;
  loading?: boolean;
}

export default function MediaRow({
  title,
  items,
  accent = "cyan",
  emptyHint = "No content available in this section yet",
  loading = false,
}: MediaRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const offset = dir === "left" ? -460 : 460;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <section className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={`h-2 w-2 rounded-full ${
              accent === "pink" ? "bg-neon" : "bg-accent"
            }`}
          />
          <h2 className="font-display text-base font-bold tracking-tight text-white/90">
            {title}
          </h2>
          {items.length > 0 && (
            <span className="text-xs text-mist/60">({items.length})</span>
          )}
        </div>

        {items.length > 4 && (
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => scroll("left")}
              aria-label="Scroll left"
              className="grid h-7 w-7 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-mist transition hover:border-white/20 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              aria-label="Scroll right"
              className="grid h-7 w-7 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-mist transition hover:border-white/20 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex gap-5 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-80 w-48 shrink-0 animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.02] sm:w-56 md:w-60"
            />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div
          ref={scrollRef}
          className="scrollbar-none flex gap-5 overflow-x-auto pb-3 scroll-smooth items-stretch"
        >
          {items.map((media) => (
            <div key={media.id} className="w-48 shrink-0 sm:w-56 md:w-60 flex flex-col">
              <MediaCard media={media} />
            </div>
          ))}
        </div>
      ) : (
        <div className="glass flex items-center justify-between rounded-2xl border border-white/5 px-6 py-6 text-sm text-mist">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-mist">
              <Film className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium text-slate-300">{emptyHint}</p>
              <p className="mt-0.5 text-xs text-mist/70">
                New titles will appear here automatically once published.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}