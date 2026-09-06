"use client";

import { useState } from "react";
import Link from "next/link";
import SearchBar from "@/components/search/SearchBar";
import { useAuth } from "@/components/auth/AuthProvider";
import { LogIn, Shield, Tv, User } from "lucide-react";
import StreamLinkModal from "@/components/media/StreamLinkModal";

export default function TopBar() {
  const { user, loading } = useAuth();
  const [streamModalOpen, setStreamModalOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-obsidian/80 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <SearchBar />
        </div>

        {/* Stealth & Quick Action Suite */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Stream from Link Button */}
          <button
            type="button"
            onClick={() => setStreamModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-accent/25 bg-accent/5 px-2.5 py-1.5 text-xs font-semibold text-accent transition hover:border-accent/50 hover:bg-accent/15"
            title="Stream from Link (Private Popup)"
          >
            <Tv className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Play URL</span>
          </button>
        </div>

        {!loading && (
          <div className="shrink-0">
            {user ? (
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 transition hover:border-accent/40 hover:bg-white/10"
                title={user.email ?? "Profile"}
              >
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-accent to-neon text-obsidian shadow-neon-cyan">
                  <User className="h-4 w-4" />
                </div>
                <div className="hidden flex-col text-left sm:flex">
                  <span className="max-w-[110px] truncate text-xs font-medium text-white">
                    {user.email?.split("@")[0] ?? "User"}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-accent">
                    {user.isAdmin && <Shield className="h-2.5 w-2.5" />}
                    {user.isAdmin ? "Admin" : "VIP"}
                  </span>
                </div>
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent to-neon px-3.5 py-1.5 text-xs font-semibold text-obsidian shadow-neon-cyan transition hover:brightness-110"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        )}
      </div>

      <StreamLinkModal
        open={streamModalOpen}
        onClose={() => setStreamModalOpen(false)}
      />
    </header>
  );
}