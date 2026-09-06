import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/server/auth";
import { rowsToMedia } from "@/lib/server/mapper";
import { isJavCodeLike, normalizeJavCode } from "@/lib/utils/normalize";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const studio = (url.searchParams.get("studio") ?? "").trim();

  if (!q && !studio) return NextResponse.json({ items: [], configured: true });

  const statusClause = session.isAdmin ? "" : "AND m.status = 'published'";

  if (studio && !q) {
    const rows = db
      .prepare(
        `SELECT m.* FROM media m
         WHERE (m.studio LIKE ? OR m.network LIKE ?)
         ${statusClause}
         ORDER BY m.views DESC LIMIT 40`,
      )
      .all(`%${studio}%`, `%${studio}%`) as Array<Record<string, unknown>>;

    return NextResponse.json({ items: rowsToMedia(rows as never), configured: true });
  }

  const token = isJavCodeLike(q) ? normalizeJavCode(q) : q.toLowerCase();
  const like = `%${token}%`;

  if (studio) {
    const studioLike = `%${studio}%`;
    const rows = db
      .prepare(
        `SELECT m.* FROM media m
         WHERE (m.studio LIKE ? OR m.network LIKE ?)
           AND (m.search_tokens LIKE ? OR m.code LIKE ? OR m.title LIKE ?
                OR m.title_th LIKE ? OR m.title_ja LIKE ? OR m.title_en LIKE ?
                OR EXISTS (
                  SELECT 1 FROM media_actors ma JOIN actresses a ON a.id = ma.actress_id
                  WHERE ma.media_id = m.id AND (a.name LIKE ? OR a.aliases LIKE ?)
                ))
         ${statusClause}
         ORDER BY m.views DESC LIMIT 30`,
      )
      .all(studioLike, studioLike, like, like, like, like, like, like, like, like) as Array<Record<string, unknown>>;

    return NextResponse.json({ items: rowsToMedia(rows as never), configured: true });
  }

  const rows = db
    .prepare(
      `SELECT m.* FROM media m
       WHERE (m.search_tokens LIKE ? OR m.code LIKE ? OR m.title LIKE ?
              OR m.title_th LIKE ? OR m.title_ja LIKE ? OR m.title_en LIKE ?
              OR EXISTS (
                SELECT 1 FROM media_actors ma JOIN actresses a ON a.id = ma.actress_id
                WHERE ma.media_id = m.id AND (a.name LIKE ? OR a.aliases LIKE ?)
              ))
       ${statusClause}
       ORDER BY m.views DESC LIMIT 24`,
    )
    .all(like, like, like, like, like, like, like, like) as Array<Record<string, unknown>>;

  return NextResponse.json({ items: rowsToMedia(rows as never), configured: true });
}