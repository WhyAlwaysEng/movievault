"use client";

import { useEffect, useRef } from "react";
import { useUiStore } from "@/lib/store";

export default function InvisibleVaultGate() {
  const vaultUnlocked = useUiStore((s) => s.vaultUnlocked);
  const setVaultUnlocked = useUiStore((s) => s.setVaultUnlocked);
  const pushToast = useUiStore((s) => s.pushToast);
  const keyBuffer = useRef<string[]>([]);

  // Load initial unlocked state from localStorage if available
  useEffect(() => {
    try {
      const stored = localStorage.getItem("mv:vault_unlocked");
      if (stored === "true") {
        setVaultUnlocked(true);
      }
    } catch {
      /* ignore */
    }
  }, [setVaultUnlocked]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger secret code if user is typing in form fields
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // 1. Shortcut: Ctrl + Shift + V (or Cmd + Shift + V)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "V" || e.key === "v")) {
        e.preventDefault();
        const nextState = !vaultUnlocked;
        setVaultUnlocked(nextState);
        try {
          localStorage.setItem("mv:vault_unlocked", String(nextState));
        } catch {
          /* ignore */
        }
        if (nextState) {
          pushToast("🔓 Adult Vault unlocked (18+ content visible)", "success");
        } else {
          pushToast("🔒 Adult Vault locked — Safe mode active", "info");
        }
        return;
      }

      // 2. Secret sequence: "vault"
      if (!isInput && e.key.length === 1) {
        keyBuffer.current.push(e.key.toLowerCase());
        if (keyBuffer.current.length > 10) {
          keyBuffer.current.shift();
        }
        const recentKeys = keyBuffer.current.join("");
        if (recentKeys.endsWith("vault")) {
          keyBuffer.current = [];
          const nextState = !vaultUnlocked;
          setVaultUnlocked(nextState);
          try {
            localStorage.setItem("mv:vault_unlocked", String(nextState));
          } catch {
            /* ignore */
          }
          if (nextState) {
            pushToast("🔓 Adult Vault unlocked (18+ content visible)", "success");
          } else {
            pushToast("🔒 Adult Vault locked — Safe mode active", "info");
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [vaultUnlocked, setVaultUnlocked, pushToast]);

  return null; // Invisible global listener
}
