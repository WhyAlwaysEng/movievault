"use client";

import { create } from "zustand";
import type { Media } from "@/lib/types";

// ── UI store: age gate, preview modal, toasts ──────────────────────────────

export type ToastKind = "info" | "success" | "error";

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface UiState {
  ageVerified: boolean;
  confirmAge: () => void;
  pinRequired: boolean;
  setPinRequired: (value: boolean) => void;
  previewMedia: Media | null;
  openPreview: (media: Media) => void;
  closePreview: () => void;
  lightboxImage: { src: string; title?: string } | null;
  openLightbox: (src: string, title?: string) => void;
  closeLightbox: () => void;
  contextMenu: {
    x: number;
    y: number;
    imageSrc?: string;
    media?: Media;
    title?: string;
  } | null;
  openContextMenu: (data: { x: number; y: number; imageSrc?: string; media?: Media; title?: string }) => void;
  closeContextMenu: () => void;
  toasts: Toast[];
  pushToast: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: number) => void;
  bossKeyActive: boolean;
  setBossKey: (active: boolean) => void;
  toggleBossKey: () => void;
  vaultUnlocked: boolean;
  setVaultUnlocked: (unlocked: boolean) => void;
  toggleVault: () => void;
}

let toastSeq = 0;

export const useUiStore = create<UiState>()((set) => ({
  ageVerified: true,
  confirmAge: () => set({ ageVerified: true }),
  pinRequired: false,
  setPinRequired: (value) => set({ pinRequired: value }),
  previewMedia: null,
  openPreview: (media) => set({ previewMedia: media }),
  closePreview: () => set({ previewMedia: null }),
  lightboxImage: null,
  openLightbox: (src, title) => set({ lightboxImage: { src, title } }),
  closeLightbox: () => set({ lightboxImage: null }),
  contextMenu: null,
  openContextMenu: (data) => set({ contextMenu: data }),
  closeContextMenu: () => set({ contextMenu: null }),
  toasts: [],
  pushToast: (message, kind = "info") => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, kind }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  bossKeyActive: false,
  setBossKey: (active) => set({ bossKeyActive: active }),
  toggleBossKey: () => set((s) => ({ bossKeyActive: !s.bossKeyActive })),
  vaultUnlocked: true,
  setVaultUnlocked: (unlocked) => set({ vaultUnlocked: unlocked }),
  toggleVault: () => set((s) => ({ vaultUnlocked: !s.vaultUnlocked })),
}));

// ── Player store: source failover index, playback rate ─────────────────────

interface PlayerState {
  sourceIndex: number;
  playbackRate: number;
  setSourceIndex: (index: number) => void;
  setPlaybackRate: (rate: number) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>()((set) => ({
  sourceIndex: 0,
  playbackRate: 1,
  setSourceIndex: (index) => set({ sourceIndex: index }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  reset: () => set({ sourceIndex: 0, playbackRate: 1 }),
}));