import { NextResponse } from "next/server";
import { tmdbConfigured } from "@/lib/providers/tmdb";
import { isOwnerMode } from "@/lib/server/auth";
import { db } from "@/lib/db";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export async function GET() {
  let dbOk = false;
  let mediaCount = 0;
  let seasonsCount = 0;
  let episodesCount = 0;
  try {
    const rMedia = db.prepare("SELECT COUNT(*) as c FROM media").get() as { c: number };
    const rSeasons = db.prepare("SELECT COUNT(*) as c FROM seasons").get() as { c: number };
    const rEpisodes = db.prepare("SELECT COUNT(*) as c FROM episodes").get() as { c: number };
    mediaCount = rMedia.c;
    seasonsCount = rSeasons.c;
    episodesCount = rEpisodes.c;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const mediaDirExists = fs.existsSync(path.resolve(process.cwd(), "data/media"));
  const dbDirExists = fs.existsSync(path.resolve(process.cwd(), "data/db"));
  const javConfigured = Boolean(process.env.JAV_API_BASE);

  return NextResponse.json({
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptime: Math.round(process.uptime()),
      memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      freeMemMB: Math.round(os.freemem() / 1024 / 1024),
      totalMemMB: Math.round(os.totalmem() / 1024 / 1024),
    },
    database: {
      ok: dbOk,
      engine: "SQLite (better-sqlite3 + WAL)",
      path: "data/db/movievault.db",
      mediaCount,
      seasonsCount,
      episodesCount,
    },
    storage: {
      ok: mediaDirExists && dbDirExists,
      dirs: ["data/db", "data/media", "data/actresses", "data/backups"],
    },
    services: {
      tmdb: {
        ok: tmdbConfigured,
        name: "The Movie Database (TMDB)",
        role: "Movie metadata, posters, backdrops, trailers, cast avatars",
        required: true,
      },
      tvmaze: {
        ok: true,
        name: "TVMaze (Free / Zero-Config)",
        role: "TV Series metadata, full seasons & episode guides",
        required: false,
      },
      javdb: {
        ok: true,
        name: "JavDB Scraper (Built-in)",
        role: "JAV metadata, catalog codes, actresses, preview stills",
        required: false,
      },
      firebaseAuth: {
        ok: !isOwnerMode(),
        name: "Firebase Authentication",
        mode: !isOwnerMode() ? "Multi-User / Cloud Auth" : "Single-Owner Mode (Local)",
        required: false,
      },
      javApiBase: {
        ok: javConfigured,
        name: "External JAV API Base",
        role: "Optional private scraper/proxy adapter",
        required: false,
      },
    },
  });
}