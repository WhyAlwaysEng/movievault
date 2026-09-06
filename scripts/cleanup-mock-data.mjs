import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../data/db/movievault.db");
const db = new Database(dbPath);

console.log("🧹 Cleaning mock data from:", dbPath);

// ── 1. Mock media IDs from seed-sample-media.mjs ────────────────────────────
const mockMediaIds = [
  "m-blade-runner-2049",
  "m-inception",
  "m-john-wick-4",
  "m-interstellar",
  "m-cyberpunk-edgerunners",
  "m-altered-carbon",
  "ssis-001",
  "mide-888",
  "prem-102",
];

// ── 2. Mock actress IDs from seed-sample-media.mjs ──────────────────────────
const mockActressIds = [
  "yua-mikami",
  "eimi-fukada",
  "karen-kaede",
];

// ── 3. Orphan seed actresses (no media links) ───────────────────────────────
const orphanSeedActressIds = [
  "shion-utsunomiya",  // no media links, seed leftover
  "tsukasa-aoi",       // duplicate of a-2opqxr (the real one)
];

const cleanup = db.transaction(() => {
  // ── Delete mock media and all related data (FK cascades) ──────────────────
  let mediaDeleted = 0;
  for (const id of mockMediaIds) {
    // Delete related tables first (in case FK cascades are not set up)
    db.prepare("DELETE FROM media_sources WHERE media_id = ?").run(id);
    db.prepare("DELETE FROM media_tags WHERE media_id = ?").run(id);
    db.prepare("DELETE FROM media_actors WHERE media_id = ?").run(id);
    db.prepare("DELETE FROM media_images WHERE media_id = ?").run(id);
    // Delete episodes via seasons
    const seasonIds = db.prepare("SELECT id FROM seasons WHERE media_id = ?").all(id);
    for (const s of seasonIds) {
      db.prepare("DELETE FROM episodes WHERE season_id = ?").run(s.id);
    }
    db.prepare("DELETE FROM seasons WHERE media_id = ?").run(id);
    // Delete from favorites & watch_history if any
    db.prepare("DELETE FROM favorites WHERE media_id = ?").run(id);
    db.prepare("DELETE FROM watch_history WHERE media_id = ?").run(id);
    // Delete the media row itself
    const r = db.prepare("DELETE FROM media WHERE id = ?").run(id);
    mediaDeleted += r.changes;
  }
  console.log(`  ✓ Deleted ${mediaDeleted} mock media items`);

  // ── Delete mock actresses ─────────────────────────────────────────────────
  let actressDeleted = 0;
  for (const id of [...mockActressIds, ...orphanSeedActressIds]) {
    // Clean any remaining links
    db.prepare("DELETE FROM media_actors WHERE actress_id = ?").run(id);
    const r = db.prepare("DELETE FROM actresses WHERE id = ?").run(id);
    actressDeleted += r.changes;
  }
  console.log(`  ✓ Deleted ${actressDeleted} mock/orphan actresses`);

  // ── Merge duplicate Tsukasa Aoi ───────────────────────────────────────────
  // Keep a-2opqxr (real, has media links), absorb tsukasa-aoi aliases if it still exists
  const realTsukasa = db.prepare("SELECT id, aliases FROM actresses WHERE id = 'a-2opqxr'").get();
  if (realTsukasa) {
    console.log(`  ✓ Real Tsukasa Aoi (a-2opqxr) confirmed present`);
  }

  // ── Recompute media_count for all remaining actresses ─────────────────────
  db.exec(`UPDATE actresses SET media_count =
    (SELECT COUNT(*) FROM media_actors WHERE media_actors.actress_id = actresses.id)`);
  console.log(`  ✓ Recomputed media_count for all actresses`);

  // ── Report remaining data ─────────────────────────────────────────────────
  const remainingMedia = db.prepare("SELECT id, type, title FROM media ORDER BY type, title").all();
  const remainingActresses = db.prepare("SELECT id, name, media_count FROM actresses ORDER BY name").all();

  console.log(`\n📊 Remaining data:`);
  console.log(`  Media: ${remainingMedia.length} items`);
  for (const m of remainingMedia) {
    console.log(`    ${m.type} | ${m.id} | ${m.title}`);
  }
  console.log(`  Actresses: ${remainingActresses.length} entries`);
  for (const a of remainingActresses) {
    console.log(`    ${a.id} | ${a.name} | media_count=${a.media_count}`);
  }

  // ── Check for any remaining duplicates ────────────────────────────────────
  const dupes = db.prepare("SELECT name, COUNT(*) as cnt FROM actresses GROUP BY name HAVING cnt > 1").all();
  if (dupes.length > 0) {
    console.log(`\n⚠️  Remaining duplicate actress names:`);
    for (const d of dupes) console.log(`    ${d.name} x${d.cnt}`);
  } else {
    console.log(`\n✅ No duplicate actress names remain`);
  }
});

cleanup();
console.log("\n🎉 Cleanup complete!");
