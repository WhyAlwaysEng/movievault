"use client";

import { Heart, Trash2 } from "lucide-react";
import { useFavorites } from "@/lib/hooks/useFavorites";
import EmptyState from "@/components/ui/EmptyState";
import { useUiStore } from "@/lib/store";

export default function FavoritesPage() {
  const { ids } = useFavorites();
  const pushToast = useUiStore((s) => s.pushToast);

  const clearAll = () => {
    localStorage.setItem("mv:favorites", "[]");
    pushToast("Favorites cleared", "info");
    // force re-render
    window.dispatchEvent(new Event("mv:favorites.cleared"));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-white">Favorites</h1>
          <p className="mt-1 text-sm text-mist">
            {ids.length > 0 ? `${ids.length} item${ids.length > 1 ? "s" : ""}` : "No favorites yet"}
          </p>
        </div>
        {ids.length > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-mist transition hover:border-red-400/50 hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear All
          </button>
        )}
      </div>

      {ids.length > 0 ? (
        <div className="glass card-surface divide-y divide-white/5">
          {ids.map((id) => (
            <div key={id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-slate-200">{id}</span>
              <span className="text-xs text-mist">media id</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Heart}
          title="No Favorites Yet"
          description="Click the heart icon on any media card to add it to your favorites."
        />
      )}
    </div>
  );
}