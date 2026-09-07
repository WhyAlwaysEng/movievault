"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Square,
  Pencil,
  Trash2,
  Star,
  Film,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { Media } from "@/lib/types";
import { useUiStore } from "@/lib/store";
import MediaCard from "@/components/media/MediaCard";
import type { ViewMode } from "@/components/media/MediaViewSwitcher";

interface MediaShelfViewProps {
  items: Media[];
  viewMode: ViewMode;
  onToggleStatus: (media: Media) => Promise<void>;
  onDelete: (media: Media) => Promise<void>;
  onBatchPublish?: (ids: string[]) => Promise<void>;
  onBatchDraft?: (ids: string[]) => Promise<void>;
  onBatchDelete?: (ids: string[]) => Promise<void>;
  emptyText?: string;
  mediaTypeLabel?: string;
}

export default function MediaShelfView({
  items,
  viewMode,
  onToggleStatus,
  onDelete,
  onBatchPublish,
  onBatchDraft,
  onBatchDelete,
  emptyText = "No items in vault yet",
  mediaTypeLabel = "items",
}: MediaShelfViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchActionRunning, setBatchActionRunning] = useState(false);
  const requestConfirm = useUiStore((s) => s.requestConfirm);

  const allSelected = items.length > 0 && selectedIds.length === items.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((m) => m.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBatchPublish = async () => {
    if (!onBatchPublish || selectedIds.length === 0) return;
    setBatchActionRunning(true);
    try {
      await onBatchPublish(selectedIds);
      setSelectedIds([]);
    } finally {
      setBatchActionRunning(false);
    }
  };

  const handleBatchDraft = async () => {
    if (!onBatchDraft || selectedIds.length === 0) return;
    setBatchActionRunning(true);
    try {
      await onBatchDraft(selectedIds);
      setSelectedIds([]);
    } finally {
      setBatchActionRunning(false);
    }
  };

  const handleBatchDelete = async () => {
    if (!onBatchDelete || selectedIds.length === 0) return;
    const ok = await requestConfirm({
      title: `ลบ ${selectedIds.length} ${mediaTypeLabel}`,
      message: `คุณต้องการลบรายการที่เลือกทั้งหมด ${selectedIds.length} รายการใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      confirmText: "ลบทั้งหมดที่เลือก",
      cancelText: "ยกเลิก",
      kind: "danger",
    });
    if (!ok) return;
    setBatchActionRunning(true);
    try {
      await onBatchDelete(selectedIds);
      setSelectedIds([]);
    } finally {
      setBatchActionRunning(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="glass card-surface p-12 text-center text-sm text-mist">
        <Film className="mx-auto mb-3 h-10 w-10 text-accent/60" />
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Batch Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs text-mist">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-slate-200 transition hover:text-white"
          >
            {allSelected ? (
              <CheckSquare className="h-4 w-4 text-accent" />
            ) : (
              <Square className="h-4 w-4 text-mist" />
            )}
            <span>Select All ({items.length})</span>
          </button>
          {selectedIds.length > 0 && (
            <span className="font-semibold text-accent">
              {selectedIds.length} selected
            </span>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            {onBatchPublish && (
              <button
                type="button"
                onClick={handleBatchPublish}
                disabled={batchActionRunning}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
              >
                Publish Selected
              </button>
            )}
            {onBatchDraft && (
              <button
                type="button"
                onClick={handleBatchDraft}
                disabled={batchActionRunning}
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
              >
                Move to Drafts
              </button>
            )}
            {onBatchDelete && (
              <button
                type="button"
                onClick={handleBatchDelete}
                disabled={batchActionRunning}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1 text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                Delete Selected
              </button>
            )}
          </div>
        )}
      </div>

      {/* MODE 1: CARD GRID VIEW */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((m) => {
            const isSelected = selectedIds.includes(m.id);
            const hasStreams = Boolean(m.sources && m.sources.length > 0);
            return (
              <div key={m.id} className="group relative flex flex-col h-full">
                {/* Checkbox badge */}
                <button
                  type="button"
                  onClick={() => toggleSelectOne(m.id)}
                  className={
                    "absolute top-2 left-2 z-20 rounded-md p-1 backdrop-blur-md transition " +
                    (isSelected
                      ? "bg-accent text-obsidian shadow-neon-cyan"
                      : "bg-black/60 text-white/70 opacity-0 group-hover:opacity-100 hover:text-white")
                  }
                  title="Select item"
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>

                {/* Status Indicator Pill */}
                <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                  <span
                    className={
                      "rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider backdrop-blur-md border " +
                      (m.status === "published"
                        ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
                        : "bg-amber-950/80 border-amber-500/50 text-amber-300")
                    }
                  >
                    {m.status === "published" ? "Live" : "Draft"}
                  </span>
                </div>

                {/* Media Card Preview */}
                <MediaCard media={m} />

                {/* Quick Stream Status & Action Bar Below Card */}
                <div className="mt-2 flex items-center justify-between gap-1 px-1 text-[11px]">
                  <span
                    className="flex items-center gap-1 text-mist"
                    title={hasStreams ? `${m.sources.length} Stream(s) Linked` : "No Stream Linked"}
                  >
                    {hasStreams ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-amber-400/80" />
                    )}
                    <span>{hasStreams ? `${m.sources.length} stream` : "no stream"}</span>
                  </span>

                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition">
                    <Link
                      href={`/media/${m.id}`}
                      className="rounded p-1 text-accent hover:bg-accent/10"
                      title="Manage Streams & Details"
                    >
                      <Pencil className="h-3 w-3" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDelete(m)}
                      className="rounded p-1 text-mist hover:text-red-400 hover:bg-red-400/10"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODE 2: DETAILED LIST VIEW */}
      {viewMode === "list" && (
        <div className="glass card-surface divide-y divide-white/5 rounded-2xl overflow-hidden">
          {items.map((m) => {
            const isSelected = selectedIds.includes(m.id);
            const hasStreams = Boolean(m.sources && m.sources.length > 0);
            return (
              <div
                key={m.id}
                className={
                  "flex flex-wrap items-center gap-4 px-4 py-3 transition hover:bg-white/[0.02] " +
                  (isSelected ? "bg-accent/5" : "")
                }
              >
                <button
                  type="button"
                  onClick={() => toggleSelectOne(m.id)}
                  className="text-mist hover:text-white"
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-accent" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>

                {/* Poster Thumbnail */}
                <Link
                  href={`/media/${m.id}`}
                  className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5 group"
                >
                  {m.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.posterUrl}
                      alt=""
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[10px] text-mist font-bold text-center p-1">
                      {m.code || "NO POSTER"}
                    </div>
                  )}
                </Link>

                {/* Content info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {m.code && (
                      <span className="rounded bg-neon/20 px-1.5 py-0.5 text-[10px] font-bold font-mono text-neon border border-neon/30">
                        {m.code}
                      </span>
                    )}
                    <Link
                      href={`/media/${m.id}`}
                      className="truncate text-sm font-semibold text-white hover:text-accent transition"
                    >
                      {m.title}
                    </Link>
                  </div>

                  <p className="mt-0.5 flex flex-wrap items-center gap-2.5 text-xs text-mist">
                    {m.studio && <span className="text-slate-300">{m.studio}</span>}
                    {m.actors.length > 0 && (
                      <span className="text-neon/90 font-medium">
                        {m.actors.slice(0, 3).join(", ")}
                        {m.actors.length > 3 ? "..." : ""}
                      </span>
                    )}
                    {m.year && <span>{m.year}</span>}
                    {typeof m.rating === "number" && (
                      <span className="flex items-center gap-0.5 text-amber-300">
                        <Star className="h-3 w-3 fill-current" />
                        {m.rating.toFixed(1)}
                      </span>
                    )}
                    <span>{m.views.toLocaleString()} views</span>
                    <span
                      className={
                        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold " +
                        (hasStreams
                          ? "border-emerald-400/40 text-emerald-300"
                          : "border-amber-400/40 text-amber-300")
                      }
                    >
                      {hasStreams ? `${m.sources.length} Stream` : "No Stream"}
                    </span>
                    <span
                      className={
                        "rounded border px-1.5 py-0.5 text-[10px] font-bold " +
                        (m.status === "published"
                          ? "border-emerald-400/40 text-emerald-300"
                          : "border-amber-400/40 text-amber-300")
                      }
                    >
                      {m.status === "published" ? "PUBLISHED" : "DRAFT"}
                    </span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/media/${m.id}`}
                    className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/5 px-3 py-1.5 text-xs text-accent transition hover:bg-accent/20"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Manage</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => onToggleStatus(m)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/5"
                  >
                    {m.status === "published" ? "Hide" : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(m)}
                    className="rounded-lg border border-white/10 p-2 text-xs text-mist transition hover:border-red-400/50 hover:text-red-300"
                    title="Delete item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODE 3: COMPACT TABLE VIEW */}
      {viewMode === "compact" && (
        <div className="glass card-surface overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left text-xs text-mist">
            <thead className="border-b border-white/10 bg-white/[0.02] text-[11px] uppercase tracking-wider text-white/70">
              <tr>
                <th className="w-8 py-3 pl-4">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-mist hover:text-white"
                  >
                    {allSelected ? (
                      <CheckSquare className="h-3.5 w-3.5 text-accent" />
                    ) : (
                      <Square className="h-3.5 w-3.5" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3">Title / Code</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Year</th>
                <th className="py-3 px-3">Rating</th>
                <th className="py-3 px-3">Streams</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((m) => {
                const isSelected = selectedIds.includes(m.id);
                const hasStreams = Boolean(m.sources && m.sources.length > 0);
                return (
                  <tr
                    key={m.id}
                    className={
                      "transition hover:bg-white/[0.02] " +
                      (isSelected ? "bg-accent/5" : "")
                    }
                  >
                    <td className="py-2.5 pl-4">
                      <button
                        type="button"
                        onClick={() => toggleSelectOne(m.id)}
                        className="text-mist hover:text-white"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-3.5 w-3.5 text-accent" />
                        ) : (
                          <Square className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2 max-w-md">
                        {m.code && (
                          <span className="shrink-0 rounded bg-neon/20 px-1 py-0.5 text-[9px] font-bold font-mono text-neon">
                            {m.code}
                          </span>
                        )}
                        <Link
                          href={`/media/${m.id}`}
                          className="truncate font-medium text-white hover:text-accent transition"
                        >
                          {m.title}
                        </Link>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-slate-400">
                      {m.type}
                    </td>

                    <td className="py-2.5 px-3 text-slate-300">
                      {m.year || "—"}
                    </td>

                    <td className="py-2.5 px-3">
                      {typeof m.rating === "number" ? (
                        <span className="flex items-center gap-1 font-bold text-amber-300">
                          <Star className="h-3 w-3 fill-current" />
                          {m.rating.toFixed(1)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className={
                          "inline-flex items-center gap-1 text-[11px] " +
                          (hasStreams ? "text-emerald-300" : "text-amber-400/80")
                        }
                      >
                        {hasStreams ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        <span>{m.sources?.length || 0}</span>
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className={
                          "rounded border px-1.5 py-0.5 text-[9px] font-black uppercase " +
                          (m.status === "published"
                            ? "border-emerald-500/40 text-emerald-300"
                            : "border-amber-500/40 text-amber-300")
                        }
                      >
                        {m.status}
                      </span>
                    </td>

                    <td className="py-2.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/media/${m.id}`}
                          className="rounded p-1 text-accent hover:bg-accent/10 transition"
                          title="Manage item"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => onToggleStatus(m)}
                          className="rounded px-2 py-0.5 text-[10px] text-slate-300 hover:bg-white/10 transition"
                        >
                          {m.status === "published" ? "Hide" : "Show"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(m)}
                          className="rounded p-1 text-mist hover:text-red-400 hover:bg-red-400/10 transition"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
