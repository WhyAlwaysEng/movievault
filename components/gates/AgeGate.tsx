"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { usePathname } from "next/navigation";
import LoginPage from "@/app/login/page";
import { Clapperboard } from "lucide-react";

export default function AgeGate() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // If already on the dedicated /login route, do nothing
  if (pathname === "/login") return null;

  // While checking session state
  if (loading) {
    return (
      <div className="fixed inset-0 z-[99] flex flex-col items-center justify-center bg-obsidian text-white">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-neon animate-pulse shadow-neon-cyan">
          <Clapperboard className="h-7 w-7 text-obsidian" />
        </div>
        <p className="mt-4 font-display text-xs font-semibold tracking-widest text-mist uppercase">
          Securing Media Vault...
        </p>
      </div>
    );
  }

  // If user is not authenticated, lock whole app and display Login view
  if (!user) {
    return (
      <div className="fixed inset-0 z-[99] overflow-y-auto bg-obsidian px-4 py-8 flex flex-col justify-center">
        <LoginPage />
      </div>
    );
  }

  return null;
}