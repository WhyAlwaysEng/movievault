"use client";

import { useEffect } from "react";
import { useUiStore } from "@/lib/store";

export default function KeyboardShortcuts() {
  const closePreview = useUiStore((s) => s.closePreview);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // "/" → focus search bar (plan §5.6)
      if (e.key === "/" && !typing) {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
      // Esc → close popups/modals (plan §5.6)
      else if (e.key === "Escape") {
        closePreview();
        (document.activeElement as HTMLElement | null)?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePreview]);

  return null;
}