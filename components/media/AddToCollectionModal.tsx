"use client";

import { useEffect, useState } from "react";
import { FolderPlus, ListPlus, Plus, X, Check } from "lucide-react";
import { useUiStore } from "@/lib/store";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  item_count: number;
}

export default function AddToCollectionModal({
  mediaId,
  mediaTitle,
  open,
  onClose,
}: {
  mediaId: string;
  mediaTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const pushToast = useUiStore((s) => s.pushToast);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/collections")
      .then((r) => r.json())
      .then((d) => {
        setCollections(d.collections || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const handleAdd = async (colId: string) => {
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_item", collectionId: colId, mediaId }),
      });
      if (res.ok) {
        setAddedIds((p) => ({ ...p, [colId]: true }));
        pushToast(`Added "${mediaTitle}" to collection`, "success");
      }
    } catch {
      pushToast("Failed to add to collection", "error");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTitle.trim(), initialMediaId: mediaId }),
      });
      const data = await res.json();
      if (res.ok) {
        pushToast(`Created "${newTitle}" and added title`, "success");
        setCollections((prev) => [{ id: data.id, name: data.name, description: null, item_count: 1 }, ...prev]);
        setAddedIds((p) => ({ ...p, [data.id]: true }));
        setCreating(false);
        setNewTitle("");
      }
    } catch {
      pushToast("Failed to create collection", "error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="glass w-full max-w-md rounded-2xl border border-white/10 p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-accent">
            <ListPlus className="h-5 w-5" />
            <h2 className="font-display text-base font-bold text-white">Add to Collection</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-mist transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-mist line-clamp-1">
          Select a playlist or custom list for <span className="text-white font-medium">"{mediaTitle}"</span>
        </p>

        {/* Existing Collections List */}
        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="py-6 text-center text-xs text-mist animate-pulse">Loading collections...</div>
          ) : collections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-mist">
              No collections yet. Create your first custom playlist below!
            </div>
          ) : (
            collections.map((c) => {
              const isAdded = addedIds[c.id];
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => !isAdded && handleAdd(c.id)}
                  disabled={isAdded}
                  className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-3 text-left transition hover:border-accent/40 hover:bg-accent/10 disabled:opacity-60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                    <span className="text-[11px] text-mist">{c.item_count} items</span>
                  </div>
                  {isAdded ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                      <Check className="h-4 w-4" /> Added
                    </span>
                  ) : (
                    <Plus className="h-4 w-4 text-mist group-hover:text-accent" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Create New Collection Inline Form */}
        {creating ? (
          <form onSubmit={handleCreate} className="space-y-3 pt-2 border-t border-white/5">
            <input
              type="text"
              autoFocus
              placeholder="e.g. Favorite JAVs, Weekend Watchlist..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-mist/60 focus:border-accent focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-mist transition hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-accent/20 border border-accent/40 px-3 py-1.5 text-xs font-bold text-accent transition hover:bg-accent hover:text-white"
              >
                Create & Add
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-2.5 text-xs font-semibold text-slate-300 transition hover:border-accent/50 hover:bg-accent/5 hover:text-accent"
          >
            <FolderPlus className="h-4 w-4" />
            Create New Collection
          </button>
        )}
      </div>
    </div>
  );
}
