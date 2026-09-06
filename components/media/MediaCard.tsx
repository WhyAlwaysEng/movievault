"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { Heart, Star } from "lucide-react";
import type { Media } from "@/lib/types";
import { useUiStore } from "@/lib/store";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { loadResume, type ResumePosition } from "@/lib/utils/playback";

const TYPE_LABEL: Record<Media["type"], string> = {
  movie: "MOVIE",
  series: "SERIES",
  jav: "JAV 18+",
};

export default function MediaCard({ media }: { media: Media }) {
  const openPreview = useUiStore((s) => s.openPreview);
  const openContextMenu = useUiStore((s) => s.openContextMenu);
  const ageVerified = useUiStore((s) => s.ageVerified);
  const { isFav, toggle } = useFavorites();

  const isJav = media.type === "jav";
  const blurred = isJav && !ageVerified;
  const images =
    media.previewImages.length > 0
      ? media.previewImages
      : media.posterUrl
        ? [media.posterUrl]
        : [];

  const [slide, setSlide] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [resume, setResume] = useState<ResumePosition | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const pos = loadResume(media.id);
    if (pos && pos.duration > 0 && pos.time / pos.duration < 0.95 && pos.time > 5) {
      setResume(pos);
    }
  }, [media.id]);

  const stopSlideshow = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const startSlideshow = () => {
    if (images.length < 2) return;
    stopSlideshow();
    timer.current = setInterval(() => {
      setSlide((s) => (s + 1) % images.length);
    }, 1200);
  };

  useEffect(() => stopSlideshow, []);

  const currentImage = images[slide % Math.max(images.length, 1)] ?? "";

  // Clean JAV title: remove redundant code brackets e.g. "【SSIS-543】 " or "[SSIS-543] "
  const displayTitle = isJav && media.code
    ? media.title.replace(new RegExp(`^[\\[【\\(]?\\s*${media.code}\\s*[\\]】\\)]?\\s*`, "i"), "").trim() || media.title
    : media.title;

  const leadActor = media.actors && media.actors.length > 0 ? media.actors[0] : null;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openContextMenu({
      x: e.clientX,
      y: e.clientY,
      media,
      imageSrc: currentImage || media.posterUrl,
      title: media.title,
    });
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onMouseEnter={startSlideshow}
      onMouseLeave={stopSlideshow}
      onClick={() => openPreview(media)}
      onContextMenu={handleContextMenu}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && openPreview(media)}
      className="group relative flex h-full flex-col cursor-pointer overflow-hidden rounded-2xl border border-white/[0.07] bg-surface/60 shadow-subtle transition-all duration-300 hover:border-white/[0.18] hover:shadow-glass"
    >
      <div className="relative aspect-[2/3] w-full shrink-0 overflow-hidden bg-obsidian">
        {currentImage && !imgError ? (
          <Image
            src={currentImage}
            alt={media.title}
            fill
            unoptimized
            sizes="(max-width: 768px) 50vw, 20vw"
            onError={() => setImgError(true)}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-white/[0.02] p-4 text-center">
            <span className="font-display text-xs font-medium text-white/60">
              {media.title}
            </span>
          </div>
        )}

        {/* 18+ blur before age gate */}
        {blurred && (
          <div className="absolute inset-0 grid place-items-center bg-obsidian/85 backdrop-blur-md">
            <span className="rounded-full border border-neon/30 bg-neon/10 px-3 py-1 text-xs font-bold text-neon">
              18+
            </span>
          </div>
        )}

        {/* Minimal Type Badge */}
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
          <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white/90 backdrop-blur-md">
            {TYPE_LABEL[media.type]}
          </span>
          {isJav && media.code && (
            <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-neon/90 backdrop-blur-md">
              {media.code}
            </span>
          )}
        </div>

        {/* Floating Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggle(media.id);
          }}
          aria-label="Add to favorites"
          className={`absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-black/50 text-white/70 backdrop-blur-md transition hover:scale-110 hover:text-white ${
            isFav(media.id) ? "text-neon !opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${isFav(media.id) ? "fill-current text-neon" : ""}`} />
        </button>

        {/* Watch Progress Bar */}
        {resume && (
          <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/80 z-10 overflow-hidden">
            <div
              className={`h-full ${isJav ? "bg-neon shadow-neon-pink" : "bg-accent shadow-neon-cyan"} transition-all duration-300`}
              style={{ width: `${Math.min(100, (resume.time / resume.duration) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Card Details: flex-1 flex-col with h-[3.2rem] uniform title box */}
      <div className="flex flex-1 flex-col justify-between p-3.5 space-y-2">
        <div className="space-y-1">
          {isJav && leadActor && (
            <div className="flex items-center gap-1.5">
              <span className="line-clamp-1 text-[11px] font-semibold text-neon/90 hover:underline">
                {leadActor}
              </span>
              {media.actors.length > 1 && (
                <span className="text-[10px] text-mist/60">+{media.actors.length - 1}</span>
              )}
            </div>
          )}
          <Link
            href={`/media/${media.id}`}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="line-clamp-2 h-[2.5rem] text-xs font-semibold leading-5 text-white/95 transition hover:text-accent hover:underline"
            title={media.title}
          >
            {displayTitle}
          </Link>
        </div>

        <div className="flex items-center justify-between pt-1 text-[11px] text-mist/80 border-t border-white/[0.04]">
          <div className="flex items-center gap-1.5">
            {media.year && <span>{media.year}</span>}
            {media.year && <span>•</span>}
            <span>{media.country}</span>
            {media.studio && (
              <>
                <span>•</span>
                <Link
                  href={`/search?studio=${encodeURIComponent(media.studio)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="max-w-[75px] truncate text-mist/60 hover:text-accent hover:underline transition-colors"
                  title={`Browse all titles from ${media.studio}`}
                >
                  {media.studio}
                </Link>
              </>
            )}
          </div>
          {typeof media.rating === "number" && (
            <span className="flex items-center gap-1 text-amber-300/90 font-medium shrink-0">
              <Star className="h-3 w-3 fill-current" />
              {media.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}