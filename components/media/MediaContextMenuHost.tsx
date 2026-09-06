"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Eye,
  Heart,
  Info,
  Play,
  Share2,
  ZoomIn,
} from "lucide-react";
import { useUiStore } from "@/lib/store";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { openGhostPlayer } from "@/lib/utils/ghostPlayer";

export default function MediaContextMenuHost() {
  const menu = useUiStore((s) => s.contextMenu);
  const close = useUiStore((s) => s.closeContextMenu);
  const openLightbox = useUiStore((s) => s.openLightbox);
  const pushToast = useUiStore((s) => s.pushToast);
  const { isFav, toggle } = useFavorites();
  const router = useRouter();

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const handleScroll = () => close();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("keydown", handleKey);
    };
  }, [close]);

  if (!menu) return null;

  // Keep menu within viewport bounds
  const x = Math.min(menu.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 240);
  const y = Math.min(menu.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 300);

  const media = menu.media;
  const imageSrc = menu.imageSrc || media?.posterUrl || media?.backdropUrl;
  const title = menu.title || media?.title || "Media";

  const handleZoom = () => {
    if (imageSrc) {
      openLightbox(imageSrc, title);
    }
    close();
  };

  const handleViewDetails = () => {
    if (media) {
      router.push(`/media/${media.id}`);
    }
    close();
  };

  const handlePlayPopup = () => {
    if (media) {
      openGhostPlayer({
        title: media.title,
        sources: media.sources,
        mediaId: media.id,
        year: media.year,
        type: media.type,
      });
    }
    close();
  };

  const handleToggleFavorite = () => {
    if (media) {
      toggle(media.id);
      pushToast(isFav(media.id) ? "Removed from Favorites" : "Added to Favorites", "success");
    }
    close();
  };

  const handleCopyLink = async () => {
    try {
      const url = media ? `${window.location.origin}/media/${media.id}` : window.location.href;
      await navigator.clipboard.writeText(url);
      pushToast("Link copied to clipboard", "success");
    } catch {
      pushToast("Failed to copy link", "error");
    }
    close();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${x}px`, top: `${y}px` }}
      className="fixed z-[110] min-w-[220px] max-w-[260px] overflow-hidden rounded-2xl border border-white/15 bg-obsidian/95 p-1.5 shadow-2xl backdrop-blur-xl ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header title */}
      <div className="border-b border-white/10 px-3 py-2">
        <p className="line-clamp-1 text-xs font-bold text-white">{title}</p>
        <p className="text-[10px] text-mist/70">Quick Actions</p>
      </div>

      <div className="py-1 space-y-0.5 text-xs">
        {imageSrc && (
          <button
            onClick={handleZoom}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-medium text-slate-200 transition hover:bg-accent/15 hover:text-accent text-left"
          >
            <ZoomIn className="h-4 w-4 text-accent" />
            <span>Zoom & View Full Cover</span>
          </button>
        )}

        {media && (
          <>
            <button
              onClick={handleViewDetails}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-medium text-slate-200 transition hover:bg-white/10 hover:text-white text-left"
            >
              <Info className="h-4 w-4 text-mist" />
              <span>Go to Details Page</span>
            </button>

            <button
              onClick={handlePlayPopup}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-medium text-slate-200 transition hover:bg-neon/15 hover:text-neon text-left"
            >
              <Play className="h-4 w-4 text-neon fill-current" />
              <span>Play (Ghost Popup)</span>
            </button>

            <button
              onClick={handleToggleFavorite}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-medium text-slate-200 transition hover:bg-white/10 hover:text-white text-left"
            >
              <Heart className={`h-4 w-4 ${isFav(media.id) ? "text-neon fill-current" : "text-mist"}`} />
              <span>{isFav(media.id) ? "Remove Favorite" : "Add to Favorites"}</span>
            </button>
          </>
        )}

        <button
          onClick={handleCopyLink}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-medium text-slate-200 transition hover:bg-white/10 hover:text-white text-left"
        >
          <Share2 className="h-4 w-4 text-mist" />
          <span>Copy Page Link</span>
        </button>
      </div>
    </div>
  );
}
