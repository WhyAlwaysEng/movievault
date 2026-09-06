"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import HeroCarousel from "@/components/home/HeroCarousel";
import MediaRow from "@/components/home/MediaRow";
import ContinueWatchingRow from "@/components/home/ContinueWatchingRow";
import { fetchMediaList } from "@/lib/api/client";
import { Clapperboard, Film, Flame, Play, Shield, Sparkles, Tv, Zap } from "lucide-react";

const CATEGORIES = [
  { label: "All", href: "/search", icon: Sparkles, accent: "cyan" },
  { label: "Movies", href: "/search?type=movie", icon: Film, accent: "cyan" },
  { label: "Series", href: "/search?type=series", icon: Tv, accent: "cyan" },
  { label: "Trending", href: "/search?sort=views", icon: Flame, accent: "cyan" },
  { label: "18+ JAV", href: "/search?type=jav", icon: Flame, accent: "pink", adultOnly: true },
] as const;

export default function HomePage() {
  const trending = useQuery({
    queryKey: ["media", "trending"],
    queryFn: () => fetchMediaList({ sort: "views", count: 12 }),
  });
  const latest = useQuery({
    queryKey: ["media", "latest"],
    queryFn: () => fetchMediaList({ sort: "created", count: 12 }),
  });
  const jav = useQuery({
    queryKey: ["media", "jav"],
    queryFn: () => fetchMediaList({ type: "jav", sort: "created", count: 12 }),
  });

  const heroItems = trending.data?.items ?? [];

  return (
    <div className="space-y-10">
      {/* Hero Showcase */}
      <HeroCarousel items={heroItems} />

      {/* Quick Category Bar */}
      <section className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isPink = cat.accent === "pink";
          return (
            <Link
              key={cat.label}
              href={cat.href}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                isPink
                  ? "border-neon/30 bg-neon/5 text-neon hover:border-neon hover:bg-neon/15 hover:shadow-neon-pink"
                  : "border-white/10 bg-white/5 text-slate-200 hover:border-accent/50 hover:bg-accent/10 hover:text-accent hover:shadow-neon-cyan"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{cat.label}</span>
            </Link>
          );
        })}
      </section>

      {/* Streaming Highlights */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="glass rounded-2xl border border-white/5 p-4 transition hover:border-accent/30">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent">
            <Zap className="h-4 w-4" />
          </span>
          <h3 className="mt-3 font-display text-sm font-bold text-white">4K Ultra HD</h3>
          <p className="mt-1 text-xs text-mist">High-bitrate streaming with zero buffering</p>
        </div>

        <div className="glass rounded-2xl border border-white/5 p-4 transition hover:border-accent/30">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-400/10 text-cyan-400">
            <Play className="h-4 w-4" />
          </span>
          <h3 className="mt-3 font-display text-sm font-bold text-white">Auto-Resume</h3>
          <p className="mt-1 text-xs text-mist">Picks up right where you left off</p>
        </div>

        <div className="glass rounded-2xl border border-white/5 p-4 transition hover:border-neon/30">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-neon/10 text-neon">
            <Shield className="h-4 w-4" />
          </span>
          <h3 className="mt-3 font-display text-sm font-bold text-white">Stealth & PIN</h3>
          <p className="mt-1 text-xs text-mist">Encrypted passcode protection for adult vault</p>
        </div>

        <div className="glass rounded-2xl border border-white/5 p-4 transition hover:border-accent/30">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400/10 text-emerald-400">
            <Clapperboard className="h-4 w-4" />
          </span>
          <h3 className="mt-3 font-display text-sm font-bold text-white">All-in-one Vault</h3>
          <p className="mt-1 text-xs text-mist">Movies, episodic series & actress databases</p>
        </div>
      </section>

      {/* Continue Watching (Instant Resume) */}
      <ContinueWatchingRow initialMediaPool={[...heroItems, ...(latest.data?.items ?? []), ...(jav.data?.items ?? [])]} />

      {/* Media Rows */}
      <MediaRow
        title="Trending Movies & Series"
        items={trending.data?.items ?? []}
        loading={trending.isLoading}
        emptyHint="No trending titles available yet"
      />

      <MediaRow
        title="Recently Added to Vault"
        items={latest.data?.items ?? []}
        loading={latest.isLoading}
        emptyHint="No newly added titles found"
      />

      <MediaRow
        title="Asian & Adult JAV Vault"
        accent="pink"
        items={jav.data?.items ?? []}
        loading={jav.isLoading}
        emptyHint="No adult titles found"
      />
    </div>
  );
}