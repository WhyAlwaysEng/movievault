"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clapperboard,
  Eye,
  EyeOff,
  Film,
  Heart,
  History,
  Lock,
  LogOut,
  Mail,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  User,
  UserCheck,
} from "lucide-react";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { getFirebaseApp, isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUiStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signOut, signInLocal } = useAuth();
  const pushToast = useUiStore((s) => s.pushToast);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter both email and password");
      return;
    }

    setBusy(true);
    setError("");

    try {
      if (isFirebaseConfigured) {
        const app = getFirebaseApp();
        if (!app) throw new Error("Firebase app not initialized");
        const auth = getAuth(app);
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        // Local Vault Mode login
        const role = email.toLowerCase().includes("admin") ? "admin" : "user";
        signInLocal(email, role);
      }

      pushToast("Signed in successfully. Welcome to MovieVault!", "success");
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred during authentication";
      if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password") || msg.includes("auth/user-not-found")) {
        setError("Incorrect email or password");
      } else if (msg.includes("auth/too-many-requests")) {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
      pushToast("Signed out successfully", "info");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-xs tracking-wider text-mist">Loading account...</p>
        </div>
      </div>
    );
  }

  // ── Profile View (Logged in) ────────────────────────────────────────────────
  if (user) {
    return (
      <div className="mx-auto max-w-lg space-y-6 pt-4">
        <div className="glass card-surface relative overflow-hidden rounded-2xl p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-accent/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-neon/15 blur-3xl" />

          {/* Profile Header */}
          <div className="relative flex flex-col items-center text-center">
            <div className="relative mb-4">
              <span className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-accent to-neon shadow-neon-cyan">
                <User className="h-10 w-10 text-obsidian" />
              </span>
              <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 ring-4 ring-obsidian">
                <UserCheck className="h-3.5 w-3.5 text-white" />
              </span>
            </div>

            <h1 className="font-display text-xl font-bold tracking-wide text-white">
              User Profile
            </h1>
            <p className="mt-1 break-all text-sm text-slate-300">
              {user.email || user.uid}
            </p>

            {/* Role Badge */}
            <div className="mt-3 flex items-center gap-2">
              {user.isAdmin ? (
                <span className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent shadow-neon-cyan">
                  <Shield className="h-3.5 w-3.5" />
                  Vault Administrator
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full border border-neon/40 bg-neon/10 px-3 py-1 text-xs font-semibold text-neon shadow-neon-pink">
                  <Sparkles className="h-3.5 w-3.5" />
                  VIP Member
                </span>
              )}
            </div>
          </div>

          {/* Status Cards */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-6 text-left">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
              <span className="text-[11px] text-mist">Stream Quality</span>
              <p className="mt-0.5 font-display text-sm font-semibold text-white">
                4K Ultra HD
              </p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
              <span className="text-[11px] text-mist">Security Mode</span>
              <p className="mt-0.5 font-display text-sm font-semibold text-emerald-400">
                Protected
              </p>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="mt-6 space-y-2 border-t border-white/10 pt-6">
            <p className="text-xs font-medium uppercase tracking-wider text-mist">
              Quick Menu
            </p>
            <div className="grid grid-cols-2 gap-2">
              {user.isAdmin && (
                <Link
                  href="/library"
                  className="flex items-center gap-2.5 rounded-lg border border-accent/20 bg-accent/5 px-3.5 py-2.5 text-xs font-medium text-accent transition hover:bg-accent/15"
                >
                  <Film className="h-4 w-4" />
                  Manage Library
                </Link>
              )}
              <Link
                href="/favorites"
                className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                <Heart className="h-4 w-4 text-neon" />
                Favorites
              </Link>
              <Link
                href="/history"
                className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                <History className="h-4 w-4 text-cyan-400" />
                Watch History
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                <Settings className="h-4 w-4 text-mist" />
                Settings
              </Link>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-2.5 border-t border-white/10 pt-6">
            <button
              onClick={() => router.push("/")}
              className="w-full rounded-lg bg-gradient-to-r from-accent to-neon px-4 py-2.5 text-sm font-semibold text-obsidian shadow-neon-cyan transition hover:brightness-110"
            >
              Back to Home
            </button>
            <button
              onClick={handleSignOut}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 px-4 py-2.5 text-sm text-red-400 transition hover:border-red-500/40 hover:bg-red-500/10 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Login / Register View ───────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-md space-y-6 pt-4">
      {/* Brand Header */}
      <div className="text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-neon shadow-neon-cyan">
          <Clapperboard className="h-7 w-7 text-obsidian" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-wide text-white">
          Sign In to Movie<span className="text-accent">Vault</span>
        </h1>
        <p className="mt-1 text-sm text-mist">
          Access your private 4K movies, series, and media vault
        </p>
      </div>

      {/* Main Form Card */}
      <div className="glass card-surface relative overflow-hidden rounded-2xl p-6 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />

        {/* Input Fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">
              Email Address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-mist" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-mist/40 outline-none transition focus:border-accent/60 focus:bg-white/[0.08]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-mist" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder-mist/40 outline-none transition focus:border-accent/60 focus:bg-white/[0.08]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-mist hover:text-white"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-accent to-neon py-2.5 text-sm font-semibold text-obsidian shadow-neon-cyan transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Authenticating…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}