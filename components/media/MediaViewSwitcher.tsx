"use client";

import { LayoutGrid, List, AlignJustify } from "lucide-react";

export type ViewMode = "grid" | "list" | "compact";

interface MediaViewSwitcherProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export default function MediaViewSwitcher({ mode, onChange }: MediaViewSwitcherProps) {
  return (
    <div className="flex items-center rounded-xl border border-white/10 bg-surface p-1">
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={
          "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition " +
          (mode === "grid"
            ? "bg-accent text-obsidian shadow-neon-cyan"
            : "text-mist hover:text-white")
        }
        title="Card Grid View"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Cards</span>
      </button>

      <button
        type="button"
        onClick={() => onChange("list")}
        className={
          "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition " +
          (mode === "list"
            ? "bg-accent text-obsidian shadow-neon-cyan"
            : "text-mist hover:text-white")
        }
        title="Detailed List View"
      >
        <List className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">List</span>
      </button>

      <button
        type="button"
        onClick={() => onChange("compact")}
        className={
          "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition " +
          (mode === "compact"
            ? "bg-accent text-obsidian shadow-neon-cyan"
            : "text-mist hover:text-white")
        }
        title="Compact Table View"
      >
        <AlignJustify className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Compact</span>
      </button>
    </div>
  );
}
