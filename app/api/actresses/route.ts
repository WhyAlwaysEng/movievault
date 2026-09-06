import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fileUrl } from "@/lib/storage";
import { cachedAsync } from "@/lib/server/cache";

// Actress list with category filter ("all" | "jav" | "film") and per-actress
// media-type badges (which categories an actress appears in).

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const category = url.searchParams.get("category") ?? "all";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 500);

  const mediaId = (url.searchParams.get("mediaId") ?? "").trim();
  const country = (url.searchParams.get("country") ?? "").trim();

  // Cache key based on query filters
  const cacheKey = `actress:list:${q}:${category}:${mediaId}:${country}:${limit}`;

  const fetchActresses = () => {
    const conditions: string[] = [];
    const params: unknown[] = [];
  if (q) {
    conditions.push("(a.name LIKE ? OR a.aliases LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }
  if (category === "jav") {
    conditions.push(
      `EXISTS (SELECT 1 FROM media_actors ma JOIN media m ON m.id = ma.media_id
        WHERE ma.actress_id = a.id AND m.type = 'jav')`,
    );
  } else if (category === "film") {
    conditions.push(
      `EXISTS (SELECT 1 FROM media_actors ma JOIN media m ON m.id = ma.media_id
        WHERE ma.actress_id = a.id AND m.type IN ('movie','series'))`,
    );
  }
  if (mediaId && mediaId !== "all") {
    conditions.push(
      `EXISTS (SELECT 1 FROM media_actors ma WHERE ma.actress_id = a.id AND ma.media_id = ?)`,
    );
    params.push(mediaId);
  }
  if (country && country !== "all") {
    conditions.push(
      `(a.country = ? OR EXISTS (SELECT 1 FROM media_actors ma JOIN media m ON m.id = ma.media_id WHERE ma.actress_id = a.id AND m.country = ?))`,
    );
    params.push(country, country);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `SELECT a.id, a.name, a.aliases, a.country, a.studio, a.bio, a.photo_path,
         (SELECT COUNT(*) FROM media_actors mc WHERE mc.actress_id = a.id) AS media_count,
         (SELECT GROUP_CONCAT(DISTINCT m.type)
            FROM media_actors mg JOIN media m ON m.id = mg.media_id
            WHERE mg.actress_id = a.id) AS types
       FROM actresses a
       ${where}
       ORDER BY media_count DESC, a.name ASC
       LIMIT ?`,
    )
    .all(...params, limit) as Array<Record<string, unknown>>;

  // Distinct saved media titles and countries for filters
  const mediaFilterRows = db
    .prepare(
      `SELECT DISTINCT m.id, m.title, m.type, m.year FROM media m
       JOIN media_actors ma ON ma.media_id = m.id
       ORDER BY m.title ASC`
    )
    .all() as Array<{ id: string; title: string; type: string; year: number | null }>;

  const countryFilterRows = db
    .prepare(
      `SELECT DISTINCT country FROM (
         SELECT country FROM actresses WHERE country IS NOT NULL AND country != ''
         UNION
         SELECT m.country FROM media m JOIN media_actors ma ON ma.media_id = m.id WHERE m.country IS NOT NULL AND m.country != ''
       ) ORDER BY country ASC`
    )
    .all() as Array<{ country: string }>;

  // Overall category counts for tabs
  const countRow = db
    .prepare(
      `SELECT
         COUNT(*) AS total_all,
         COUNT(CASE WHEN EXISTS (
           SELECT 1 FROM media_actors ma JOIN media m ON m.id = ma.media_id
           WHERE ma.actress_id = a.id AND m.type = 'jav'
         ) THEN 1 END) AS total_jav,
         COUNT(CASE WHEN EXISTS (
           SELECT 1 FROM media_actors ma JOIN media m ON m.id = ma.media_id
           WHERE ma.actress_id = a.id AND m.type IN ('movie','series')
         ) THEN 1 END) AS total_film
       FROM actresses a`,
    )
    .get() as { total_all: number; total_jav: number; total_film: number } | undefined;

    return {
      counts: {
        all: countRow?.total_all ?? 0,
        jav: countRow?.total_jav ?? 0,
        film: countRow?.total_film ?? 0,
      },
      availableFilterOptions: {
        media: mediaFilterRows,
        countries: countryFilterRows.map((c) => c.country),
      },
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        aliases: JSON.parse((r.aliases as string) || "[]"),
        country: r.country ?? null,
        studio: r.studio ?? null,
        bio: r.bio ?? null,
        mediaCount: (r.media_count as number) ?? 0,
        types: ((r.types as string) ?? "").split(",").filter(Boolean),
        photoUrl: r.photo_path
          ? ((r.photo_path as string).startsWith("http")
              ? (r.photo_path as string)
              : fileUrl("actresses", r.id as string, r.photo_path as string))
          : "",
      })),
    };
  };

  const payload = await cachedAsync(cacheKey, 120, fetchActresses);
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
    },
  });
}