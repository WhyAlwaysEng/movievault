"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Heart, History, Home, Library, Search, Settings, Tv } from "lucide-react";
import { NAV_LINKS } from "@/lib/constants";

const ICONS = {
  "/": Home,
  "/search": Search,
  "/library/movies": Film,
  "/library/series": Tv,
  "/favorites": Heart,
  "/history": History,
  "/settings": Settings,
} as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="glass-strong fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-white/10 px-2 py-2 lg:hidden">
      {NAV_LINKS.map((link) => {
        const Icon = ICONS[link.href as keyof typeof ICONS] || Library;
        const active = pathname === link.href;
        // Clean emoji prefix for clean compact mobile bottom nav
        const cleanLabel = link.label.replace(/^[\p{Emoji}\s]+/u, "");
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-label={link.label}
            className={`flex flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] transition-colors ${
              active ? "text-accent font-semibold" : "text-mist hover:text-white"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate max-w-[60px] text-center">{cleanLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}