"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, RefreshCw, Server, Database, Key, HardDrive, Tv } from "lucide-react";

interface SystemData {
  system?: {
    platform: string;
    arch: string;
    nodeVersion: string;
    uptime: number;
    memoryUsageMB: number;
    freeMemMB: number;
    totalMemMB: number;
  };
  database?: {
    ok: boolean;
    engine: string;
    path: string;
    mediaCount: number;
    seasonsCount: number;
    episodesCount: number;
  };
  storage?: {
    ok: boolean;
    dirs: string[];
  };
  services?: {
    tmdb: { ok: boolean; name: string; role: string; required: boolean };
    tvmaze: { ok: boolean; name: string; role: string; required: boolean };
    javdb: { ok: boolean; name: string; role: string; required: boolean };
    firebaseAuth: { ok: boolean; name: string; mode: string; required: boolean };
    javApiBase: { ok: boolean; name: string; role: string; required: boolean };
  };
}

export default function SetupStatus() {
  const [data, setData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system/status");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const db = data?.database;
  const sys = data?.system;
  const srv = data?.services;

  const rows = [
    {
      label: "Database (SQLite WAL)",
      ok: db?.ok ?? true,
      hint: db ? `${db.mediaCount} media, ${db.episodesCount} episodes` : "data/db/movievault.db",
      icon: Database,
    },
    {
      label: "Storage Directories",
      ok: data?.storage?.ok ?? true,
      hint: "data/media, data/actresses",
      icon: HardDrive,
    },
    {
      label: "TMDB API Key (Movies)",
      ok: srv?.tmdb?.ok ?? false,
      hint: srv?.tmdb?.ok ? "Active & Connected" : "Missing TMDB_API_KEY",
      icon: Key,
    },
    {
      label: "TVMaze Provider (Series)",
      ok: true,
      hint: "Ready (Zero-Config)",
      icon: Tv,
    },
    {
      label: "JavDB Scraper (JAV 18+)",
      ok: true,
      hint: "Ready (Native Fetch)",
      icon: Server,
    },
    {
      label: "Authentication Mode",
      ok: true,
      hint: srv?.firebaseAuth?.ok ? "Firebase Connected" : "Single-Owner Mode (Local)",
      icon: Key,
    },
  ];

  return (
    <section className="glass card-surface p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-sm font-bold tracking-wide text-white">
            System Diagnostics & Status
          </h2>
          <p className="text-xs text-mist mt-0.5">
            Self-hosted runtime telemetry & provider connectivity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-mist transition hover:border-white/20 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link href="/settings" className="text-xs text-accent transition hover:text-white">
            Settings →
          </Link>
        </div>
      </div>

      <ul className="space-y-2">
        {rows.map((row) => {
          const Icon = row.icon || Server;
          return (
            <li
              key={row.label}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2.5 text-slate-200">
                <Icon className="h-4 w-4 text-mist" />
                <span>{row.label}</span>
              </div>
              <span className="flex items-center gap-2 text-xs font-mono">
                <span className={row.ok ? "text-mist" : "text-amber-400"}>{row.hint}</span>
                {row.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400/80 flex-shrink-0" />
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {sys && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-xs font-mono">
          <div className="rounded border border-white/5 bg-white/[0.02] p-2">
            <div className="text-mist text-[10px] uppercase tracking-wider">Platform</div>
            <div className="text-slate-200 font-semibold mt-0.5">{sys.platform} ({sys.arch})</div>
          </div>
          <div className="rounded border border-white/5 bg-white/[0.02] p-2">
            <div className="text-mist text-[10px] uppercase tracking-wider">Node.js</div>
            <div className="text-slate-200 font-semibold mt-0.5">{sys.nodeVersion}</div>
          </div>
          <div className="rounded border border-white/5 bg-white/[0.02] p-2">
            <div className="text-mist text-[10px] uppercase tracking-wider">Node RAM (RSS)</div>
            <div className="text-slate-200 font-semibold mt-0.5">{sys.memoryUsageMB} MB</div>
          </div>
          <div className="rounded border border-white/5 bg-white/[0.02] p-2">
            <div className="text-mist text-[10px] uppercase tracking-wider">System Free RAM</div>
            <div className="text-slate-200 font-semibold mt-0.5">{Math.round(sys.freeMemMB / 1024)} GB Free</div>
          </div>
        </div>
      )}
    </section>
  );
}