"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Play, Trash2 } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { getResumeMap, type ResumePosition } from "@/lib/utils/playback";
import { useUiStore } from "@/lib/store";

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<Array<{ id: string; pos: ResumePosition }>>([]);
  const pushToast = useUiStore((s) => s.pushToast);

  const refresh = useCallback(() => {
    setEntries(
      Object.entries(getResumeMap())
        .map(([id, pos]) => ({ id, pos }))
        .sort((a, b) => b.pos.updatedAt - a.pos.updatedAt),
    );
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("mv:history.updated", refresh);
    return () => window.removeEventListener("mv:history.updated", refresh);
  }, [refresh]);

  const clearAll = () => {
    localStorage.removeItem("mv:resume");
    refresh();
    pushToast("Watch history cleared", "info");
  };

  const removeOne = (id: string) => {
    const map = getResumeMap();
    delete map[id];
    localStorage.setItem("mv:resume", JSON.stringify(map));
    refresh();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-white">Watch History</h1>
          <p className="mt-1 text-sm text-mist">
            {entries.length > 0
              ? `${entries.length} item${entries.length > 1 ? "s" : ""} — local playback resume positions`
              : "No playback history yet"}
          </p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-mist transition hover:border-red-400/50 hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear All
          </button>
        )}
      </div>

      {entries.length > 0 ? (
        <div className="glass card-surface divide-y divide-white/5">
          {entries.map(({ id, pos }) => {
            const pct = pos.duration > 0 ? Math.min(100, (pos.time / pos.duration) * 100) : 0;
            return (
              <div key={id} className="flex items-center gap-4 px-4 py-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                  <Clock className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-200">{id}</p>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-neon"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-mist">
                    Paused at {fmt(pos.time)} of {fmt(pos.duration)} · {new Date(pos.updatedAt).toLocaleString("en-US")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/watch/${id}`}
                    className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-r from-accent to-neon text-obsidian transition hover:brightness-110"
                    aria-label="Resume"
                  >
                    <Play className="h-4 w-4 fill-current" />
                  </Link>
                  <button
                    onClick={() => removeOne(id)}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-mist transition hover:text-red-300"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Clock}
          title="No Watch History Yet"
          description="Start watching a video to record your progress. Playback positions are saved automatically every 5 seconds."
        />
      )}
    </div>
  );
}