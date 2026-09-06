"use client";

import { useEffect } from "react";
import { X, Play } from "lucide-react";

interface TrailerModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  trailerUrl?: string | null;
  title: string;
}

export function extractYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}

export default function TrailerModal({
  isOpen,
  open,
  onClose,
  trailerUrl,
  title,
}: TrailerModalProps) {
  const visible = isOpen ?? open ?? false;
  const videoId = extractYouTubeId(trailerUrl);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (visible) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible, onClose]);

  if (!visible || !videoId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-obsidian shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-5 py-3.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Play className="h-4 w-4 text-accent fill-current" />
            <span>Official Trailer: {title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-mist transition hover:bg-white/10 hover:text-white"
            aria-label="Close trailer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Frame */}
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
            title={`Trailer for ${title}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}