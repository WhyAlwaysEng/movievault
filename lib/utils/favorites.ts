"use client";

import { FAVORITES_KEY } from "@/lib/constants";

// Favorites — local fallback until Firebase auth + Firestore are configured (§3 `favorites`).
// Swap for Firestore docs (uid, mediaId, addedAt) behind the owner-only rules once live.

export function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

/** Returns the new "is favorite" state. */
export function toggleFavorite(mediaId: string): boolean {
  const current = getFavorites();
  const has = current.includes(mediaId);
  const next = has ? current.filter((id) => id !== mediaId) : [...current, mediaId];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return !has;
}

export function isFavorite(mediaId: string): boolean {
  return getFavorites().includes(mediaId);
}