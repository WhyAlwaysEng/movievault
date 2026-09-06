"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, Heart, Play, Share2, Star, X } from "lucide-react";
import Link from "next/link";
import { useUiStore } from "@/lib/store";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { openGhostPlayer } from "@/lib/utils/ghostPlayer";

const TYPE_LABEL: Record<string, string> = {
  movie: "MOVIE",
  series: "SERIES",
  jav: "JAV 18+",
};

export default function PreviewModalHost() {
  const media = useUiStore((s) => s.previewMedia);
  const close = useUiStore((s) => s.closePreview);
  const openLightbox = useUiStore((s) => s.openLightbox);
  const openContextMenu = useUiStore((s) => s.openContextMenu);
  const pushToast = useUiStore((s) => s.pushToast);
  const { isFav, toggle } = useFavorites();
  const router = useRouter();

  if (!media) return null;

  const isJav = media.type === "jav";
  const share = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/watch/${media.id}`,
      );
      pushToast("Link copied to clipboard", "success");
    } catch {
      pushToast("Failed to copy link", "error");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
        className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={`glass-strong relative max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl shadow-glass ${
            isJav ? "ring-1 ring-neon/30" : "ring-1 ring-accent/30"
          }`}
        >
          <button
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-obsidian/70 text-mist backdrop-blur-sm transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          {/* backdrop header */}
          {media.backdropUrl ? (
            <div
              onClick={() => openLightbox(media.backdropUrl!, `${media.title} - Backdrop`)}
              onContextMenu={(e) => {
                e.preventDefault();
                openContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  imageSrc: media.backdropUrl || undefined,
                  media,
                  title: `${media.title} (Backdrop)`,
                });
              }}
              className="relative h-44 w-full overflow-hidden sm:h-56 cursor-pointer group/backdrop"
              title="Click to zoom, right click for menu"
            >
              <Image
                src={media.backdropUrl}
                alt=""
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover transition-transform duration-500 group-hover/backdrop:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-transparent to-transparent" />
            </div>
          ) : (
            <div
              className={`relative h-32 w-full bg-gradient-to-br sm:h-40 ${
                isJav ? "from-neon/30 to-[#0d1117]" : "from-accent/25 to-[#0d1117]"
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] to-transparent" />
            </div>
          )}

          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`rounded px-1.5 py-0.5 font-bold tracking-wider ${
                  isJav ? "bg-neon text-white" : "bg-accent text-obsidian"
                }`}
              >
                {TYPE_LABEL[media.type]}
              </span>
              {isJav && media.code && (
                <span className="text-glow-pink rounded border border-neon/50 px-1.5 py-0.5 font-bold text-neon">
                  {media.code}
                </span>
              )}
              {media.year ? <span className="text-mist">{media.year}</span> : null}
              <span className="text-mist">{media.country}</span>
              {typeof media.rating === "number" ? (
                <span className="flex items-center gap-1 text-amber-300">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {media.rating.toFixed(1)}
                </span>
              ) : null}
              <span className="flex items-center gap-1 text-mist">
                <Eye className="h-3.5 w-3.5" />
                {media.views} views
              </span>
            </div>

            <Link
              href={`/media/${media.id}`}
              onClick={close}
              className="font-display mt-3 block text-xl font-bold text-white transition hover:text-accent hover:underline sm:text-2xl"
              title={`Open ${media.title} detail page`}
            >
              {media.title}
            </Link>

            {media.overview ? (
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                {media.overview}
              </p>
            ) : null}

            {media.actors.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {media.actors.map((actor) => (
                  <Link
                    key={actor}
                    href={`/actress/${encodeURIComponent(actor)}`}
                    onClick={close}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200 transition hover:border-accent/50 hover:text-accent"
                  >
                    {actor}
                  </Link>
                ))}
              </div>
            )}

            {media.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {media.tags.map((tag) => (
                  <span key={tag} className="text-xs text-mist">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {media.previewImages.length > 0 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {media.previewImages.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => openLightbox(img, `${media.title} - Screenshot ${i + 1}`)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      openContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        imageSrc: img,
                        media,
                        title: `${media.title} (Still ${i + 1})`,
                      });
                    }}
                    className="group/still relative h-20 w-14 shrink-0 overflow-hidden rounded border border-white/10 cursor-pointer hover:border-accent/60 transition"
                    title="Click to zoom, right click for menu"
                  >
                    <Image src={img} alt="" fill unoptimized sizes="56px" className="object-cover transition group-hover/still:scale-105" />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  close();
                  openGhostPlayer({
                    title: media.title,
                    sources: media.sources,
                    mediaId: media.id,
                    year: media.year,
                    type: media.type,
                  });
                }}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-neon px-5 py-2.5 text-sm font-semibold text-obsidian shadow-neon-cyan transition hover:brightness-110"
              >
                <Play className="h-4 w-4 fill-current" />
                Play (Private Popup)
              </button>
              <button
                onClick={() => toggle(media.id)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition ${
                  isFav(media.id)
                    ? "border-neon/60 text-neon"
                    : "border-white/10 text-mist hover:text-white"
                }`}
              >
                <Heart className={`h-4 w-4 ${isFav(media.id) ? "fill-current" : ""}`} />
                {isFav(media.id) ? "Favorited" : "Add to Favorites"}
              </button>
              <button
                onClick={share}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-mist transition hover:text-white"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}