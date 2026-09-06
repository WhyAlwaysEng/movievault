"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Clapperboard,
  Clock,
  Film,
  Flame,
  FolderSync,
  Heart,
  History,
  Home,
  Library,
  LogIn,
  Search,
  Settings,
  Shield,
  Tv,
  User,
  Users,
} from "lucide-react";
import { NAV_LINKS } from "@/lib/constants";
import { useAuth } from "@/components/auth/AuthProvider";

const ICONS = {
  "/": Home,
  "/search": Search,
  "/library/movies": Film,
  "/library/series": Tv,
  "/favorites": Heart,
  "/history": History,
  "/settings": Settings,
} as const;

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const waitingQuery = useQuery({
    queryKey: ["waiting-list"],
    queryFn: async () => {
      const res = await fetch("/api/waiting-list");
      if (!res.ok) return { items: [], count: 0 };
      return res.json();
    },
    refetchInterval: 20000,
  });
  const waitingCount = waitingQuery.data?.count ?? 0;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col gap-5 border-r border-white/10 bg-white/[0.03] p-5 backdrop-blur-md lg:flex">
      <Link href="/" className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-accent to-neon shadow-neon-cyan">
          <Clapperboard className="h-5 w-5 text-obsidian" />
        </span>
        <div>
          <span className="font-display text-lg font-bold tracking-wide text-white">
            Movie<span className="text-accent">Vault</span>
          </span>
          <p className="text-[10px] text-mist">Hybrid Media Engine</p>
        </div>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV_LINKS.map((link) => {
          const Icon = ICONS[link.href as keyof typeof ICONS] || Library;
          const active =
            pathname === link.href ||
            (link.href === "/" && pathname.startsWith("/media"));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent/15 text-accent shadow-neon-cyan"
                  : "text-mist hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          );
        })}

        {/* 🔞 Adult Vault (JAV) */}
        <Link
          href="/library/jav"
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
            pathname === "/library/jav"
              ? "bg-neon/15 text-neon shadow-neon-pink"
              : "text-neon/80 hover:bg-neon/10 hover:text-neon"
          }`}
        >
          <Flame className="h-4 w-4 shrink-0 text-neon" />
          Adult Vault (18+)
        </Link>

        {/* Actresses */}
        <Link
          href="/actresses"
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
            pathname === "/actresses" || pathname.startsWith("/actress/")
              ? "bg-neon/10 text-neon shadow-neon-pink"
              : "text-mist hover:bg-white/5 hover:text-white"
          }`}
        >
          <Users className="h-4 w-4 shrink-0" />
          Actresses
        </Link>

        {/* Waiting List (Staging Queue) */}
        <Link
          href="/waiting-list"
          className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
            pathname === "/waiting-list"
              ? "bg-accent/15 text-accent shadow-neon-cyan"
              : "text-mist hover:bg-white/5 hover:text-white"
          }`}
        >
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 shrink-0" />
            <span>Waiting List</span>
          </div>
          {waitingCount > 0 && (
            <span className="rounded-full bg-accent/20 border border-accent/40 px-2 py-0.5 text-[11px] font-bold font-mono text-accent">
              {waitingCount}
            </span>
          )}
        </Link>

        {/* Local Scanner link for Admin */}
        {user?.isAdmin && (
          <Link
            href="/library"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs transition-colors mt-2 text-mist hover:text-white ${
              pathname === "/library" ? "text-accent" : ""
            }`}
          >
            <FolderSync className="h-3.5 w-3.5" />
            Local Scanner
          </Link>
        )}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        {/* User Card */}
        <Link
          href="/login"
          className="glass group flex items-center gap-3 rounded-xl border border-white/10 p-3 transition hover:border-accent/40 hover:bg-white/[0.06]"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent to-neon text-obsidian shadow-neon-cyan">
            {user ? <User className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white group-hover:text-accent">
              {user ? user.email?.split("@")[0] || "Vault User" : "Sign In"}
            </p>
            <p className="flex items-center gap-1 text-[11px] text-mist">
              {user ? (
                <>
                  {user.isAdmin ? (
                    <span className="flex items-center gap-1 text-accent">
                      <Shield className="h-2.5 w-2.5" />
                      Admin
                    </span>
                  ) : (
                    <span className="text-neon">VIP Member</span>
                  )}
                </>
              ) : (
                "Click to sign in"
              )}
            </p>
          </div>
        </Link>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[11px] leading-relaxed text-mist">
          <p className="font-display font-semibold tracking-wide text-slate-300">
            3 DEDICATED VAULTS
          </p>
          <p className="mt-0.5 text-mist/80">
            Movies • Series • JAV
          </p>
        </div>
      </div>
    </aside>
  );
}