"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { History, Search } from "lucide-react";
import { SEARCH_HISTORY_KEY } from "@/lib/constants";

export default function SearchBar() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  const submit = (q?: string) => {
    const query = (q ?? value).trim();
    if (!query) return;
    try {
      const history = JSON.parse(
        localStorage.getItem(SEARCH_HISTORY_KEY) ?? "[]",
      ) as string[];
      const next = [query, ...history.filter((h) => h !== query)].slice(0, 6);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      setRecent(next);
    } catch {
      /* storage unavailable */
    }
    setFocused(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="relative w-full max-w-2xl">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" />
      <input
        id="global-search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => {
          setFocused(true);
          try {
            setRecent(
              JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) ?? "[]") as string[],
            );
          } catch {
            setRecent([]);
          }
        }}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder="Search titles, JAV codes (e.g. SSIS-543), actors..."
        className="glass w-full rounded-full py-2.5 pl-10 pr-12 text-sm text-white outline-none transition focus:border-accent/60 focus:shadow-neon-cyan"
      />
      <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-sans text-[10px] text-mist sm:block">
        /
      </kbd>

      {focused && recent.length > 0 && (
        <div className="glass-strong absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl shadow-glass">
          {recent.map((q) => (
            <button
              key={q}
              onMouseDown={(e) => {
                e.preventDefault();
                submit(q);
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-200 transition-colors hover:bg-white/5"
            >
              <History className="h-3.5 w-3.5 text-mist" />
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}