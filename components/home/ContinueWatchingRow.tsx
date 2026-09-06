"use client";

import { useEffect, useState } from "react";
import type { Media } from "@/lib/types";
import { getResumeMap } from "@/lib/utils/playback";
import { fetchMediaById } from "@/lib/api/client";
import MediaRow from "@/components/home/MediaRow";

export default function ContinueWatchingRow({ initialMediaPool = [] }: { initialMediaPool?: Media[] }) {
  const [continueItems, setContinueItems] = useState<Media[]>([]);

  useEffect(() => {
    async function load() {
      const map = getResumeMap();
      const validEntries = Object.entries(map)
        .filter(([, pos]) => pos.duration > 0 && pos.time / pos.duration < 0.95 && pos.time > 5)
        .sort((a, b) => b[1].updatedAt - a[1].updatedAt);

      if (validEntries.length === 0) {
        setContinueItems([]);
        return;
      }

      const poolMap = new Map<string, Media>(initialMediaPool.map((m) => [m.id, m]));
      const items: Media[] = [];

      for (const [id] of validEntries.slice(0, 10)) {
        if (poolMap.has(id)) {
          items.push(poolMap.get(id)!);
        } else {
          try {
            const data = await fetchMediaById(id);
            if (data) {
              items.push(data);
            }
          } catch {
            /* ignore 404/network */
          }
        }
      }

      setContinueItems(items);
    }

    load();
    window.addEventListener("mv:history.updated", load);
    return () => window.removeEventListener("mv:history.updated", load);
  }, []);

  if (continueItems.length === 0) return null;

  return (
    <MediaRow
      title="Continue Watching"
      accent="cyan"
      items={continueItems}
    />
  );
}
