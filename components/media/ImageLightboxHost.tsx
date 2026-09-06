"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Download,
  Maximize2,
  Minimize2,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
  ExternalLink,
} from "lucide-react";
import { useUiStore } from "@/lib/store";

export default function ImageLightboxHost() {
  const lightbox = useUiStore((s) => s.lightboxImage);
  const close = useUiStore((s) => s.closeLightbox);

  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (lightbox) {
      setScale(1);
      setRotation(0);
    }
  }, [lightbox]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(s + 0.25, 4));
      if (e.key === "-") setScale((s) => Math.max(s - 0.25, 0.5));
      if (e.key === "0") {
        setScale(1);
        setRotation(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  if (!lightbox) return null;

  const handleDownload = async () => {
    try {
      const res = await fetch(lightbox.src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(lightbox.title || "image").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(lightbox.src, "_blank");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-black/90 p-4 backdrop-blur-md"
      >
        {/* Top bar controls */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="glass-strong z-10 flex w-full max-w-4xl items-center justify-between rounded-2xl border border-white/10 px-4 py-2.5 shadow-2xl"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="h-2 w-2 rounded-full bg-accent shadow-neon-cyan shrink-0" />
            <span className="line-clamp-1 text-sm font-semibold text-white">
              {lightbox.title || "Image Viewer"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
              className="rounded-lg p-2 text-mist hover:bg-white/10 hover:text-white transition"
              title="Zoom out (-)"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-[44px] text-center font-mono text-xs text-mist">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(s + 0.25, 4))}
              className="rounded-lg p-2 text-mist hover:bg-white/10 hover:text-white transition"
              title="Zoom in (+)"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="rounded-lg p-2 text-mist hover:bg-white/10 hover:text-white transition"
              title="Rotate 90°"
            >
              <RotateCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setScale(1);
                setRotation(0);
              }}
              className="rounded-lg p-2 text-mist hover:bg-white/10 hover:text-white transition"
              title="Reset Zoom (0)"
            >
              {scale === 1 ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
            <div className="mx-1 h-4 w-px bg-white/10" />
            <button
              onClick={handleDownload}
              className="rounded-lg p-2 text-mist hover:bg-white/10 hover:text-white transition"
              title="Download Image"
            >
              <Download className="h-4 w-4" />
            </button>
            <a
              href={lightbox.src}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg p-2 text-mist hover:bg-white/10 hover:text-white transition"
              title="Open Original in New Tab"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              onClick={close}
              className="rounded-lg bg-white/10 p-2 text-white hover:bg-rose-500/30 hover:text-rose-300 transition ml-1"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Image viewport with zoom and pan */}
        <div
          className="relative flex flex-1 w-full items-center justify-center overflow-hidden py-4 cursor-grab active:cursor-grabbing"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <motion.div
            drag
            dragConstraints={{ left: -600, right: 600, top: -400, bottom: 400 }}
            animate={{ scale, rotate: rotation }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex items-center justify-center max-h-[82vh] max-w-[90vw]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.src}
              alt={lightbox.title || "Enlarged view"}
              className="max-h-[80vh] max-w-[85vw] object-contain rounded-xl shadow-2xl select-none ring-1 ring-white/10"
              draggable={false}
            />
          </motion.div>
        </div>

        {/* Bottom hint */}
        <div className="z-10 text-center text-xs text-mist/60 select-none pb-1">
          Scroll or drag to pan · Double click / Use toolbar to zoom · Press Esc to exit
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
