import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isJavCodeLike } from "@/lib/utils/normalize";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type"); // "movie" | "series" | "jav" | null

  try {
    const typeClause = type ? "WHERE m.type = ?" : "";
    const typeParam = type ? [type] : [];

    // 1. Unique Studios (fetch first so we can filter studio names out of genres)
    const studioClause = type
      ? "WHERE type = ? AND studio IS NOT NULL AND studio != ''"
      : "WHERE studio IS NOT NULL AND studio != ''";
    const studioRows = db
      .prepare(
        `SELECT DISTINCT studio FROM media ${studioClause} ORDER BY studio ASC`
      )
      .all(...typeParam) as Array<{ studio: string }>;
    const studios = studioRows.map((r) => r.studio);
    const studioSet = new Set(studios.map((s) => s.trim().toLowerCase()));

    // 2. Unique Genres / Tags from media_tags
    // Filter out:
    //  - JAV codes (e.g. SSIS-543, IPX-711, FC2-PPV-123456)
    //  - Studio names (e.g. S1 NO.1 STYLE, MOODYZ, etc.)
    const tagRows = db
      .prepare(
        `SELECT DISTINCT mt.tag
         FROM media_tags mt
         JOIN media m ON m.id = mt.media_id
         ${typeClause}
         ORDER BY mt.tag ASC`
      )
      .all(...typeParam) as Array<{ tag: string }>;

    const genres = tagRows
      .map((r) => r.tag.trim())
      .filter((tag) => {
        if (!tag) return false;
        // Filter out JAV codes
        if (isJavCodeLike(tag) || /^[A-Z0-9]{2,6}[-_]?\d{2,6}$/i.test(tag)) {
          return false;
        }
        // Filter out studio names
        if (studioSet.has(tag.toLowerCase())) {
          return false;
        }
        return true;
      });

    // 3. Unique Years (Descending)
    const yearClause = type
      ? "WHERE type = ? AND year IS NOT NULL AND year > 0"
      : "WHERE year IS NOT NULL AND year > 0";
    const yearRows = db
      .prepare(
        `SELECT DISTINCT year FROM media ${yearClause} ORDER BY year DESC`
      )
      .all(...typeParam) as Array<{ year: number }>;
    const years = yearRows.map((r) => r.year);

    // 4. Unique Countries
    const countryClause = type
      ? "WHERE type = ? AND country IS NOT NULL AND country != ''"
      : "WHERE country IS NOT NULL AND country != ''";
    const countryRows = db
      .prepare(
        `SELECT DISTINCT country FROM media ${countryClause} ORDER BY country ASC`
      )
      .all(...typeParam) as Array<{ country: string }>;
    const countries = countryRows.map((r) => r.country);

    // 5. Unique Actresses / Cast
    const actressRows = db
      .prepare(
        `SELECT DISTINCT a.name
         FROM actresses a
         JOIN media_actors ma ON ma.actress_id = a.id
         JOIN media m ON m.id = ma.media_id
         ${typeClause}
         ORDER BY a.name ASC`
      )
      .all(...typeParam) as Array<{ name: string }>;
    const actresses = actressRows.map((r) => r.name);

    return NextResponse.json({
      genres,
      studios,
      years,
      countries,
      actresses,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
