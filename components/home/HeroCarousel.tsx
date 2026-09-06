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
  const imageSrc = current.backdropUrl || current.posterUrl || "";

  // Clean JAV title: remove redundant brackets code from beginning
  const heroDisplayTitle = isJav && current.code
    ? current.title.replace(new RegExp(`^[\\[【\\(]?\\s*${current.code}\\s*[\\]】\\)]?\\s*`, "i"), "").trim() || current.title
    : current.title;

  const leadActor = current.actors && current.actors.length > 0 ? current.actors[0] : null;

  // Determine if item has portrait poster or is JAV
  const isPortraitLayout = isJav || !current.backdropUrl || current.backdropUrl === current.posterUrl;
  const posterSrc = current.posterUrl || current.backdropUrl || "";

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
          {isPortraitLayout ? (
            /* ─────────────────────────────────────────────────────────────
               ADAPTIVE JAV / PORTRAIT COVER LAYOUT:
               Ambient blurred aura in background + 3D floating right poster card
               Full cover visibility with 0% cropping, high-end Apple TV style
               ───────────────────────────────────────────────────────────── */
            <>
              {/* Ambient Glow Aura */}
              {posterSrc && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={posterSrc}
                    alt=""
                    className="absolute -right-20 -top-20 h-[140%] w-[140%] max-w-none object-cover opacity-20 blur-3xl saturate-150"
                  />
                  <div className="absolute inset-0 bg-[#07090c]/75 backdrop-blur-xl" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07090c] via-transparent to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#07090c] via-[#07090c]/80 to-transparent" />
                </div>
              )}

              {/* 3D Floating Full Jacket Cover on the Right (Visible on tablet & desktop) */}
              {posterSrc && (
                <div className="pointer-events-none absolute right-6 lg:right-10 top-1/2 hidden -translate-y-1/2 md:flex md:items-center md:justify-center z-10">
                  <div className="relative group/poster perspective-1000">
                    {/* Atmospheric neon underglow matching jacket colors */}
                    <div className="absolute -inset-3 rounded-2xl bg-gradient-to-r from-neon/40 via-purple-500/30 to-accent/40 blur-2xl opacity-70 group-hover/poster:opacity-90 transition-opacity duration-500" />
                    
                    {/* Real JAV Jacket aspect ratio (800x537 ~ 1.49:1), full cover with 0% crop */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={posterSrc}
                      alt={current.title}
                      className="relative h-[250px] w-[370px] lg:h-[310px] lg:w-[460px] xl:h-[340px] xl:w-[505px] rounded-2xl object-cover shadow-2xl border border-white/20 ring-1 ring-white/10 transition-all duration-500 ease-out hover:scale-105 hover:border-white/35"
                    />

                    {current.code && (
                      <div className="absolute bottom-3 left-3 rounded-md bg-black/85 backdrop-blur-md px-2.5 py-1 font-mono text-xs font-bold text-neon border border-neon/50 shadow-md">
                        {current.code}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               CINEMATIC HORIZONTAL BACKDROP LAYOUT (Movies & Series):
               Full-bleed widescreen fill with subtle pan & multi-directional mask
               ───────────────────────────────────────────────────────────── */
            <>
              {imageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageSrc}
                  alt={current.title}
                  className="absolute inset-0 h-full w-full object-cover object-center sm:object-[center_25%] transition-transform duration-700 ease-out"
                />
              ) : null}

              <div className="absolute inset-0 bg-gradient-to-r from-[#07090c] via-[#07090c]/70 to-transparent sm:via-[#07090c]/60" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07090c] via-[#07090c]/30 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#07090c]/60 via-transparent to-transparent sm:from-[#07090c]/40" />
            </>
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
            {isJav && leadActor && (
              <p className="mt-3 text-sm font-semibold text-neon/90">
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