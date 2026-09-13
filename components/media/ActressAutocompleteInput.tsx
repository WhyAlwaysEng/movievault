"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";
import { Plus, Search, UserRound, X, Check } from "lucide-react";
import { listActresses, type ActressProfile } from "@/lib/api/client";
import { translateActressName, containsJapanese } from "@/lib/utils/translate";

interface ActressAutocompleteInputProps {
  selected: string[];
  onChange: (actresses: string[]) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  maxItems?: number;
}

export default function ActressAutocompleteInput({
  selected,
  onChange,
  placeholder = "Search existing actress or type new name...",
  className = "",
  label,
  maxItems,
}: ActressAutocompleteInputProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [allActresses, setAllActresses] = useState<ActressProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing actresses once on mount
  useEffect(() => {
    let active = true;
    setLoading(true);
    listActresses({ limit: 500 })
      .then((res) => {
        if (active && res.items) {
          setAllActresses(res.items);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Filter actresses based on query
  const filteredActresses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allActresses.slice(0, 10);

    return allActresses
      .filter((a) => {
        const matchName = a.name.toLowerCase().includes(q);
        const matchAlias = a.aliases?.some((al) => al.toLowerCase().includes(q));
        return matchName || matchAlias;
      })
      .slice(0, 15);
  }, [allActresses, query]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addActress = (rawName: string) => {
    const trimmed = rawName.trim();
    if (!trimmed) return;

    // Check if matches an existing actress profile (by name or alias)
    const matched = allActresses.find(
      (a) =>
        a.name.toLowerCase() === trimmed.toLowerCase() ||
        a.aliases?.some((al) => al.toLowerCase() === trimmed.toLowerCase()),
    );

    const finalName = matched ? matched.name : trimmed;

    if (!selected.includes(finalName)) {
      if (maxItems && selected.length >= maxItems) {
        onChange([...selected.slice(1), finalName]);
      } else {
        onChange([...selected, finalName]);
      }
    }
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeActress = (name: string) => {
    onChange(selected.filter((a) => a !== name));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightIdx((prev) => (prev + 1) % Math.max(filteredActresses.length + 1, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev - 1 + filteredActresses.length + 1) % Math.max(filteredActresses.length + 1, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && filteredActresses.length > 0 && highlightIdx < filteredActresses.length) {
        addActress(filteredActresses[highlightIdx].name);
      } else if (query.trim()) {
        addActress(query);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative space-y-2 ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-mist">
          {label}
        </label>
      )}

      {/* Selected Actress Chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {selected.map((actress) => {
            const profile = allActresses.find((a) => a.name.toLowerCase() === actress.toLowerCase());
            const jaAlias = profile?.aliases?.find((al) => containsJapanese(al));

            return (
              <span
                key={actress}
                className="inline-flex items-center gap-1.5 rounded-full border border-neon/30 bg-neon/10 px-3 py-1 text-xs font-semibold text-white shadow-sm"
              >
                {profile?.photoUrl ? (
                  <span className="relative h-4 w-4 overflow-hidden rounded-full shrink-0">
                    <Image src={profile.photoUrl} alt="" fill unoptimized className="object-cover" />
                  </span>
                ) : (
                  <UserRound className="h-3.5 w-3.5 text-neon" />
                )}
                <span>{actress}</span>
                {jaAlias && (
                  <span className="text-[10px] text-rose-300 font-normal">
                    ({jaAlias})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeActress(actress)}
                  className="rounded-full p-0.5 text-mist transition hover:bg-white/10 hover:text-red-300"
                  aria-label={`Remove ${actress}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Input Box */}
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-3 text-mist">
          <Search className="h-4 w-4" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlightIdx(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-16 text-sm text-white placeholder:text-mist/60 outline-none transition focus:border-neon focus:bg-white/10"
        />
        {query.trim() && (
          <button
            type="button"
            onClick={() => addActress(query)}
            className="absolute right-2 flex items-center gap-1 rounded-md bg-neon px-2.5 py-1 text-xs font-bold text-obsidian shadow-sm transition hover:brightness-110"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown List */}
      {open && (
        <div className="glass-strong absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-neon/30 bg-obsidian/95 p-1 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          {filteredActresses.length > 0 ? (
            <div className="space-y-0.5">
              <div className="px-2 py-1 text-[11px] font-semibold text-mist uppercase tracking-wider">
                {query.trim() ? "Matching Actresses in Vault" : "Recent / Top Actresses"}
              </div>
              {filteredActresses.map((a, idx) => {
                const isSelected = selected.includes(a.name);
                const isHighlighted = idx === highlightIdx;
                const jaAlias = a.aliases?.find((al) => containsJapanese(al));

                return (
                  <button
                    key={a.id || a.name}
                    type="button"
                    onClick={() => addActress(a.name)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition ${
                      isHighlighted
                        ? "bg-neon/20 text-white"
                        : "text-slate-200 hover:bg-white/5 hover:text-white"
                    } ${isSelected ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                        {a.photoUrl ? (
                          <Image src={a.photoUrl} alt={a.name} fill unoptimized className="object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-[10px] font-bold text-neon">
                            {a.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white truncate">{a.name}</span>
                          {isSelected && (
                            <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-normal">
                              <Check className="h-3 w-3" /> Selected
                            </span>
                          )}
                        </div>
                        {jaAlias && (
                          <span className="text-[11px] text-rose-300/90 block truncate">
                            🇯🇵 {jaAlias}
                          </span>
                        )}
                      </div>
                    </div>
                    {typeof a.mediaCount === "number" && a.mediaCount > 0 && (
                      <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-mist shrink-0">
                        {a.mediaCount} {a.mediaCount === 1 ? "work" : "works"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-mist">
              {loading ? (
                <span>Searching vault...</span>
              ) : (
                <span>No existing actress found for &quot;{query}&quot;</span>
              )}
            </div>
          )}

          {/* Quick Option to Add Exact Query as New Actress */}
          {query.trim() && !filteredActresses.some((a) => a.name.toLowerCase() === query.trim().toLowerCase()) && (
            <button
              type="button"
              onClick={() => addActress(query)}
              className="flex w-full items-center gap-2 rounded-lg border-t border-white/10 px-3 py-2 text-left text-xs text-neon transition hover:bg-neon/15"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>
                Add new actress: <strong className="text-white">&quot;{query.trim()}&quot;</strong>
                {containsJapanese(query.trim()) && (
                  <span className="ml-1 text-slate-300 font-normal">
                    (translates to: {translateActressName(query.trim())})
                  </span>
                )}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
