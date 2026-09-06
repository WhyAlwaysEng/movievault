"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Play, Tv, X, Zap } from "lucide-react";
import { openGhostPlayer } from "@/lib/utils/ghostPlayer";
import { PUBLIC_TEST_STREAM } from "@/lib/constants";

interface StreamLinkModalProps {
  open: boolean;
  onClose: () => void;
}

const SAMPLE_STREAMS = [
  { label: "Mux Public Test (HLS)", url: PUBLIC_TEST_STREAM },
  { label: "Big Buck Bunny (MP4)", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
  { label: "Tears of Steel (HLS)", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
];

export default function StreamLinkModal({ open, onClose }: StreamLinkModalProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  if (!open) return null;

  const handlePlay = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    openGhostPlayer({
      title: title.trim() || "Streamed Video",
      streamUrl: url.trim(),
    });
    onClose();
  };

  const handleSample = (sampleUrl: string, sampleLabel: string) => {
    setUrl(sampleUrl);
    setTitle(sampleLabel);
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 backdrop-blur-md">
      <div className="glass-strong relative w-full max-w-lg rounded-2xl border border-accent/30 p-6 shadow-glass">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-mist transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-accent to-neon text-obsidian shadow-neon-cyan">
            <Tv className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-white">
              Stream Video from URL (Private Popup)
            </h2>
            <p className="text-xs text-mist">
              Launches an isolated chromeless player window without saving to browser history
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handlePlay} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Video URL (.m3u8 / .mp4 / embed)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/stream.m3u8"
              required
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-mist/60 outline-none transition focus:border-accent/60 focus:bg-white/[0.08]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Video Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Custom Stream or Episode 1"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-mist/60 outline-none transition focus:border-accent/60 focus:bg-white/[0.08]"
            />
          </div>

          {/* Preset samples */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-mist">
              ⚡ Quick Test Streams:
            </p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_STREAMS.map((sample) => (
                <button
                  type="button"
                  key={sample.label}
                  onClick={() => handleSample(sample.url, sample.label)}
                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:border-accent/40 hover:text-accent"
                >
                  <Zap className="h-3 w-3 text-accent" />
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action button */}
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-neon py-2.5 text-sm font-semibold text-obsidian shadow-neon-cyan transition hover:brightness-110 active:scale-95"
          >
            <Play className="h-4 w-4 fill-current" />
            Launch Private Popup Player
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <span className="text-mist">ต้องการสแกนเฟรมเว็บหรือเช็คความซ้ำซ้อน?</span>
          <Link
            href="/waiting-list"
            onClick={onClose}
            className="flex items-center gap-1 text-accent hover:underline font-semibold"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>ไปที่ Waiting List →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
