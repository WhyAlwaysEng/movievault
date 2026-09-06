const Database = require("better-sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "..", "data", "db", "movievault.db");
const db = new Database(dbPath);
console.log("Resetting MovieVault database at:", dbPath);
db.pragma("foreign_keys = ON");
const clearAll = db.transaction(() => {
  const tables = ["episodes", "seasons", "media_sources", "media_images", "media_tags", "media_actresses", "media"];
  const counts = {};
  for (const table of tables) {
    try {
      const info = db.prepare(`DELETE FROM ${table}`).run();
      counts[table] = info.changes;
    } catch (e) {
      console.warn("Could not clear table", table, e.message);
    }
  }
  return counts;
});
const results = clearAll();
console.log("Successfully wiped database records:");
console.table(results);
db.pragma("vacuum");
console.log("Database VACUUM completed.");