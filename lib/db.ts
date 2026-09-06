import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// ── Self-hosted SQLite backend (Orange Pi) ─────────────────────────────────
// Database + files live under DATA_DIR (default: <project>/data).
// Firebase Auth is used ONLY for login; everything else is local.

export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), "data");

fs.mkdirSync(path.join(DATA_DIR, "db"), { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, "media"), { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, "actresses"), { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, "backups"), { recursive: true });

const db = new Database(path.join(DATA_DIR, "db", "movievault.db"));
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("cache_size = -32000"); // 32MB cache
db.pragma("temp_store = MEMORY");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  uid             TEXT PRIMARY KEY,
  email           TEXT UNIQUE,
  role            TEXT NOT NULL DEFAULT 'user',
  premium         INTEGER NOT NULL DEFAULT 0,
  premium_since   INTEGER,
  pin_hash        TEXT,
  age_verified_at INTEGER,
  settings        TEXT NOT NULL DEFAULT '{}',
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS media (
  id             TEXT PRIMARY KEY,           -- tmdb-{id} | {jav-code} | m-{rand}
  type           TEXT NOT NULL CHECK(type IN ('movie','series','jav')),
  code           TEXT,
  title          TEXT NOT NULL,
  title_th       TEXT,
  title_ja       TEXT,
  title_en       TEXT,
  overview       TEXT,
  country        TEXT,
  year           INTEGER,
  studio         TEXT,
  tmdb_id        INTEGER,
  rating         REAL,
  votes          INTEGER,
  views          INTEGER NOT NULL DEFAULT 0,
  trailer_url    TEXT,
  director       TEXT,
  runtime        INTEGER,
  release_date   TEXT,
  tagline        TEXT,
  network        TEXT,
  extra_meta     TEXT NOT NULL DEFAULT '{}',
  status         TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','flagged')),
  poster_path    TEXT,
  backdrop_path  TEXT,
  search_tokens  TEXT NOT NULL DEFAULT '',
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_tmdb  ON media(tmdb_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_code  ON media(code);
CREATE INDEX IF NOT EXISTS idx_media_type_status ON media(type, status);
CREATE INDEX IF NOT EXISTS idx_media_status_views ON media(status, views);

CREATE TABLE IF NOT EXISTS media_sources (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  media_id        TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  url             TEXT NOT NULL,
  kind            TEXT NOT NULL DEFAULT 'hls' CHECK(kind IN ('hls','embed','local','other')),
  healthy         INTEGER NOT NULL DEFAULT 1,
  last_checked_at INTEGER,
  sort            INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS media_images (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  kind     TEXT NOT NULL CHECK(kind IN ('poster','backdrop','preview')),
  path     TEXT NOT NULL,
  sort     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS media_tags (
  media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  tag      TEXT NOT NULL,
  PRIMARY KEY (media_id, tag)
);

CREATE TABLE IF NOT EXISTS actresses (
  id          TEXT PRIMARY KEY,              -- normalized slug e.g. "yua-mikami"
  name        TEXT NOT NULL,
  aliases     TEXT NOT NULL DEFAULT '[]',    -- JSON array of alternate spellings
  country     TEXT,
  studio      TEXT,
  bio         TEXT,
  photo_path  TEXT,
  media_count INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_actresses_name ON actresses(name);

CREATE TABLE IF NOT EXISTS media_actors (
  media_id   TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  actress_id TEXT NOT NULL REFERENCES actresses(id) ON DELETE CASCADE,
  PRIMARY KEY (media_id, actress_id)
);
CREATE INDEX IF NOT EXISTS idx_media_actors_actress ON media_actors(actress_id);

CREATE TABLE IF NOT EXISTS seasons (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  media_id      TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  UNIQUE (media_id, season_number)
);

CREATE TABLE IF NOT EXISTS episodes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id      INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title          TEXT,
  overview       TEXT,
  thumbnail_path TEXT,
  duration       INTEGER NOT NULL DEFAULT 0,
  sources        TEXT NOT NULL DEFAULT '[]',
  UNIQUE (season_id, episode_number)
);

CREATE TABLE IF NOT EXISTS favorites (
  uid      TEXT NOT NULL,
  media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  added_at INTEGER NOT NULL,
  PRIMARY KEY (uid, media_id)
);

CREATE TABLE IF NOT EXISTS watch_history (
  uid        TEXT NOT NULL,
  media_id   TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  episode_id INTEGER,
  position   REAL NOT NULL DEFAULT 0,
  duration   REAL NOT NULL DEFAULT 0,
  finished   INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (uid, media_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  media_id     TEXT NOT NULL,
  source_label TEXT,
  source_url   TEXT,
  reason       TEXT,
  status       TEXT NOT NULL DEFAULT 'open',
  created_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_uid    TEXT,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  detail      TEXT,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS waiting_list (
  id           TEXT PRIMARY KEY,
  code         TEXT,
  title        TEXT NOT NULL,
  source_url   TEXT NOT NULL,
  poster_url   TEXT,
  overview     TEXT,
  servers_json TEXT NOT NULL DEFAULT '[]',
  type         TEXT NOT NULL DEFAULT 'jav',
  status       TEXT NOT NULL DEFAULT 'pending', -- pending, imported, rejected
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_waiting_code ON waiting_list(code);
CREATE INDEX IF NOT EXISTS idx_waiting_status ON waiting_list(status);

CREATE TABLE IF NOT EXISTS collections (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS collection_items (
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  media_id      TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  sort          INTEGER NOT NULL DEFAULT 0,
  added_at      INTEGER NOT NULL,
  PRIMARY KEY (collection_id, media_id)
);
`);

// Safe column migrations for existing SQLite database instances
try {
  const mediaCols = new Set(
    (db.prepare("PRAGMA table_info(media)").all() as Array<{ name: string }>).map((c) => c.name),
  );
  if (!mediaCols.has("director")) db.exec("ALTER TABLE media ADD COLUMN director TEXT;");
  if (!mediaCols.has("runtime")) db.exec("ALTER TABLE media ADD COLUMN runtime INTEGER;");
  if (!mediaCols.has("release_date")) db.exec("ALTER TABLE media ADD COLUMN release_date TEXT;");
  if (!mediaCols.has("tagline")) db.exec("ALTER TABLE media ADD COLUMN tagline TEXT;");
  if (!mediaCols.has("network")) db.exec("ALTER TABLE media ADD COLUMN network TEXT;");
  if (!mediaCols.has("extra_meta")) db.exec("ALTER TABLE media ADD COLUMN extra_meta TEXT NOT NULL DEFAULT '{}';");
} catch (_e) {
  // Ignore if already upgraded
}

export { db };