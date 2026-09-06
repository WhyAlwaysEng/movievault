import { db } from "@/lib/db";
import { containsJapanese, extractAndTranslateActress } from "@/lib/utils/translate";

// Actress sync helpers — both API saves and manual edits funnel through these,
// so the actress pages always stay in sync (§ requirement: two-way sync).

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Upsert an actress by name (matches existing id/name/alias); returns actress id. */
export function upsertActress(name: string, photoUrl?: string): string {
  const clean = name.trim();
  if (!clean) return "";
  const { nameEn, nameJa } = extractAndTranslateActress(clean);
  const primaryName = nameEn || clean;
  const id = slugify(primaryName) || `a-${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();

  const existing = db
    .prepare(
      `SELECT id, name, aliases, photo_path FROM actresses 
       WHERE id = ? 
          OR id = ? 
          OR LOWER(name) = LOWER(?) 
          OR LOWER(name) = LOWER(?) 
          OR aliases LIKE ? 
          OR aliases LIKE ?
       LIMIT 1`,
    )
    .get(
      id,
      slugify(clean),
      primaryName,
      clean,
      `%"${clean}"%`,
      `%"${primaryName}"%`,
    ) as { id: string; name: string; aliases: string; photo_path: string | null } | undefined;

  if (existing) {
    const aliases: string[] = JSON.parse(existing.aliases || "[]");
    let changed = false;
    let newName = existing.name;

    // Promote English name as primary if existing is Japanese
    if (containsJapanese(existing.name) && !containsJapanese(primaryName)) {
      if (!aliases.includes(existing.name)) aliases.push(existing.name);
      newName = primaryName;
      changed = true;
    }

    if (nameJa && !aliases.includes(nameJa) && newName !== nameJa) {
      aliases.push(nameJa);
      changed = true;
    }
    if (clean !== newName && !aliases.includes(clean)) {
      aliases.push(clean);
      changed = true;
    }

    const newPhoto = !existing.photo_path && photoUrl ? photoUrl : existing.photo_path;
    if (changed || newPhoto !== existing.photo_path) {
      db.prepare(
        "UPDATE actresses SET name = ?, aliases = ?, photo_path = ?, updated_at = ? WHERE id = ?",
      ).run(newName, JSON.stringify(aliases), newPhoto, now, existing.id);
    }
    return existing.id;
  }

  const initialAliases: string[] = [];
  if (nameJa && nameJa !== primaryName) initialAliases.push(nameJa);
  if (clean !== primaryName && !initialAliases.includes(clean)) initialAliases.push(clean);

  db.prepare(
    `INSERT INTO actresses (id, name, aliases, photo_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, primaryName, JSON.stringify(initialAliases), photoUrl || null, now, now);
  return id;
}

/** Link an actress to a media title. */
export function linkActress(mediaId: string, actressId: string) {
  db.prepare("INSERT OR IGNORE INTO media_actors (media_id, actress_id) VALUES (?, ?)").run(
    mediaId,
    actressId,
  );
}

/** Recompute media_count for one or all actresses. */
export function refreshMediaCounts(actressIds?: string[]) {
  if (!actressIds) {
    db.exec(`UPDATE actresses SET media_count =
      (SELECT COUNT(*) FROM media_actors WHERE media_actors.actress_id = actresses.id)`);
    return;
  }
  const stmt = db.prepare(`UPDATE actresses SET media_count =
    (SELECT COUNT(*) FROM media_actors WHERE media_actors.actress_id = ?) WHERE id = ?`);
  for (const id of actressIds) stmt.run(id, id);
}

/** Replace the actress set on a media title from an array of names or cast objects. */
export function setMediaActresses(
  mediaId: string,
  names: Array<string | { name: string; avatarUrl?: string }>,
) {
  const keep = new Set<string>();
  for (const item of names) {
    const raw = typeof item === "string" ? item : item.name;
    const photoUrl = typeof item === "object" ? item.avatarUrl : undefined;
    const id = upsertActress(raw, photoUrl);
    if (id) {
      linkActress(mediaId, id);
      keep.add(id);
    }
  }
  if (keep.size > 0) {
    const placeholders = [...keep].map(() => "?").join(",");
    const removed = db
      .prepare(
        `SELECT actress_id FROM media_actors WHERE media_id = ? AND actress_id NOT IN (${placeholders})`,
      )
      .all(mediaId, ...keep) as Array<{ actress_id: string }>;
    db.prepare(
      `DELETE FROM media_actors WHERE media_id = ? AND actress_id NOT IN (${placeholders})`,
    ).run(mediaId, ...keep);
    refreshMediaCounts(removed.map((r) => r.actress_id));
  } else {
    const removed = db
      .prepare("SELECT actress_id FROM media_actors WHERE media_id = ?")
      .all(mediaId) as Array<{ actress_id: string }>;
    db.prepare("DELETE FROM media_actors WHERE media_id = ?").run(mediaId);
    refreshMediaCounts(removed.map((r) => r.actress_id));
  }
  refreshMediaCounts([...keep]);
}