"use client";

import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { searchMedia } from "@/lib/api/client";

/** 400ms-debounced search engine (§5.3 of the plan). */
export function useSearchQuery(rawQuery: string, studio?: string) {
  const debounced = useDebounce(rawQuery, 400);

  return useQuery({
    queryKey: ["search", debounced, studio ?? ""],
    queryFn: () => searchMedia(debounced, studio),
    enabled: Boolean(debounced.trim() || studio?.trim()),
  });
}