"use client";

import { useCallback, useState } from "react";
import { getFavorites, toggleFavorite } from "@/lib/utils/favorites";
import { useUiStore } from "@/lib/store";

export function useFavorites() {
  const [ids, setIds] = useState<string[]>(() => getFavorites());
  const pushToast = useUiStore((s) => s.pushToast);

  const toggle = useCallback(
    (mediaId: string) => {
      const nowFavorite = toggleFavorite(mediaId);
      setIds(getFavorites());
      pushToast(
        nowFavorite ? "Added to Favorites ♥" : "Removed from Favorites",
        nowFavorite ? "success" : "info",
      );
    },
    [pushToast],
  );

  const isFav = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, toggle, isFav };
}