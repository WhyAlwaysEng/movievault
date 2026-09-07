"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Film, Heart, Play, Sparkles } from "lucide-react";
import type { Media } from "@/lib/types";
import { openGhostPlayer } from "@/lib/utils/ghostPlayer";

interface HeroCarouselProps {
  items: Media[];
}

export default function HeroCarousel({ items }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-8 sm:p-14">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-neon/[0.08] blur-3xl" />

        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Media Vault 4K
          </span>

          <h1 className="font-display mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Movie<span className="text-accent">Vault</span>
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-mist">
            High-definition 4K streaming vault for movies, series, and adult content. Seamless playback with private history-free popups.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => router.push("/search")}
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-95"
            >
              <Film className="h-4 w-4" />
              Explore Catalog
            </button>
            <button
              onClick={() => router.push("/favorites")}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              <Heart className="h-4 w-4 text-neon" />
              Favorites
            </button>
          </div>
        </div>
      </section>
    );
  }

  const current = items[Math.min(index, items.length - 1)];
  const isJav = current.type === "jav";
  const backdropSrc = current.backdropUrl || current.posterUrl || "";
  const posterSrc = current.posterUrl || current.backdropUrl || "";

  // Clean JAV title: remove redundant brackets code from beginning
  const heroDisplayTitle = isJav && current.code
    ? current.title.replace(new RegExp(`^[\\[【\\(]?\\s*${current.code}\\s*[\\]】\\)]?\\s*`, "i"), "").trim() || current.title
    : current.title;

  const leadActor = current.actors && current.actors.length > 0 ? current.actors[0] : null;

  return (
    <section className="group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#07090c] shadow-glass">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="relative min-h-[420px] sm:h-[480px] w-full overflow-hidden flex flex-col justify-between"
        >
          {/* ─────────────────────────────────────────────────────────────
             UNIFIED CINEMATIC BACKDROP BACKGROUND (Movie/Series style)
             with rich gradients and atmospheric color aura
             ───────────────────────────────────────────────────────────── */}
          {backdropSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={backdropSrc}
              alt={current.title}
              className={`absolute inset-0 h-full w-full object-cover ${
                isJav ? "opacity-25 blur-sm scale-105" : "object-center sm:object-[center_25%] opacity-40 sm:opacity-50"
              } transition-transform duration-700 ease-out`}
            />
          ) : null}

          {/* Atmospheric ambient underglow / vignette */}
          <div className="absolute inset-0 bg-[#07090c]/40 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07090c] via-[#07090c]/85 to-[#07090c]/40 sm:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07090c] via-[#07090c]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07090c]/60 via-transparent to-transparent sm:from-[#07090c]/30" />

          {/* ─────────────────────────────────────────────────────────────
             FLOATING 3D POSTER CARD ON THE RIGHT (Like JAV layout)
             Shows 2:3 vertical poster for Movie/Series or horizontal jacket for JAV
             ───────────────────────────────────────────────────────────── */}
          {posterSrc && (
            <div className="pointer-events-none absolute right-6 lg:right-12 top-1/2 hidden -translate-y-1/2 md:flex md:items-center md:justify-center z-10">
              <div className="relative group/poster perspective-1000">
                {/* Atmospheric neon underglow matching theme colors */}
                <div
                  className={`absolute -inset-3 rounded-2xl blur-2xl opacity-60 group-hover/poster:opacity-90 transition-opacity duration-500 ${
                    isJav
                      ? "bg-gradient-to-r from-neon/40 via-purple-500/30 to-accent/40"
                      : "bg-gradient-to-r from-accent/30 via-cyan-500/20 to-blue-600/30"
                  }`}
                />

                {/* Poster Cover */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={posterSrc}
                  alt={current.title}
                  className={`relative rounded-2xl object-cover shadow-2xl border border-white/20 ring-1 ring-white/10 transition-all duration-500 ease-out hover:scale-105 hover:border-white/40 ${
                    isJav
                      ? "h-[250px] w-[370px] lg:h-[310px] lg:w-[460px] xl:h-[340px] xl:w-[505px]"
                      : "h-[300px] w-[200px] lg:h-[360px] lg:w-[240px] xl:h-[390px] xl:w-[260px]"
                  }`}
                />

                {current.code && isJav && (
                  <div className="absolute bottom-3 left-3 rounded-md bg-black/85 backdrop-blur-md px-2.5 py-1 font-mono text-xs font-bold text-neon border border-neon/50 shadow-md">
                    {current.code}
                  </div>
                )}

                {/* Quality or Rating badge for Movies & Series */}
                {!isJav && typeof current.rating === "number" && current.rating > 0 && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-black/80 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-amber-300 border border-amber-400/30 shadow-lg">
                    ★ {current.rating.toFixed(1)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Content Overlay (Left Column) */}
          <div className="relative z-10 flex flex-col justify-end p-6 sm:p-10 lg:p-12 max-w-full md:max-w-[50%] lg:max-w-[48%] xl:max-w-xl flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`rounded-md px-2.5 py-1 font-medium tracking-wide backdrop-blur-md ${
                  isJav
                    ? "bg-neon/20 border border-neon/40 text-neon"
                    : "bg-white/10 text-white"
                }`}
              >
                {isJav ? "18+ JAV" : current.type.toUpperCase()}
              </span>

              {isJav && current.code && (
                <span className="rounded-md border border-white/20 bg-black/60 px-2 py-0.5 font-mono text-xs font-bold text-white">
                  {current.code}
                </span>
              )}

              {current.studio && (
                <Link
                  href={`/search?studio=${encodeURIComponent(current.studio)}`}
                  className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-mist hover:text-white hover:border-white/30 backdrop-blur-md transition-colors"
                  title={`View more from ${current.studio}`}
                >
                  <Building2 className="h-3 w-3 text-accent" />
                  <span>{current.studio}</span>
                </Link>
              )}

              {current.year && (
                <span className="text-white/70">{current.year}</span>
              )}

              {typeof current.rating === "number" && (
                <span className="flex items-center gap-1 text-amber-300 font-medium">
                  ★ {current.rating.toFixed(1)}
                </span>
              )}

              {current.country && (
                <span className="text-mist/70">· {current.country}</span>
              )}
            </div>

            {/* Lead Actor highlight */}
            {leadActor && (
              <p className={`mt-3 text-sm font-semibold ${isJav ? "text-neon/90" : "text-accent/90"}`}>
                ⭐ {leadActor}
                {current.actors.length > 1 && (
                  <span className="ml-1 text-xs text-mist/60 font-normal">
                    (+{current.actors.length - 1} คน)
                  </span>
                )}
              </p>
            )}

            <h2
              className="font-display mt-2 line-clamp-2 text-xl font-bold tracking-tight text-white sm:text-3xl leading-tight"
              title={current.title}
            >
              {heroDisplayTitle}
            </h2>

            {current.overview && (
              <p className="mt-2 line-clamp-2 text-xs sm:text-sm leading-relaxed text-mist/85 max-w-md">
                {current.overview}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() =>
                  openGhostPlayer({
                    title: current.title,
                    sources: current.sources,
                    mediaId: current.id,
                    year: current.year,
                    type: current.type,
                  })
                }
                className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-95 shadow-lg shadow-white/10"
              >
                <Play className="h-4 w-4 fill-current" />
                Play Now (Private Popup)
              </button>
              <button
                onClick={() => router.push(`/media/${current.id}`)}
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/15"
              >
                More Details
              </button>
            </div>
          </div>

          {/* Clean Pagination Dots */}
          {items.length > 1 && (
            <div className="relative z-10 flex gap-2 pb-6 px-6 sm:px-12 justify-start sm:justify-start">
              {items.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => setIndex(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? "w-6 bg-white" : "w-2 bg-white/30 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}