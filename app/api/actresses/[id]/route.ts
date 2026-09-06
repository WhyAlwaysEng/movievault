import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/server/auth";
import { rowToMedia, rowsToMedia } from "@/lib/server/mapper";
import { refreshMediaCounts, slugify, upsertActress } from "@/lib/server/actresses";
import { containsJapanese, extractAndTranslateActress } from "@/lib/utils/translate";
import { audit } from "@/lib/server/audit";
import { actressDir, fileUrl } from "@/lib/storage";
import fs from "node:fs";
import { cachedAsync, serverCache } from "@/lib/server/cache";

interface ActressRow {
  id: string;
  name: string;
  aliases: string;
  country: string | null;
  studio: string | null;
  bio: string | null;
  photo_path: string | null;
  media_count: number;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id).trim();

  const payload = await cachedAsync(`actress:detail:${decodedId}`, 180, () => {
    const slug = slugify(decodedId);
    const { nameEn, nameJa } = extractAndTranslateActress(decodedId);

    let row = db
      .prepare(
        `SELECT * FROM actresses 
         WHERE id = ? 
            OR id = ? 
            OR LOWER(name) = LOWER(?)
            OR LOWER(name) = LOWER(?)
            OR (length(?) > 0 AND LOWER(name) = LOWER(?))
            OR aliases LIKE ?
            OR aliases LIKE ?
            OR (length(?) > 0 AND aliases LIKE ?)
         LIMIT 1`,
      )
      .get(
        id,
        slug,
        decodedId,
        nameEn,
        nameJa || "",
        nameJa || "",
        `%"${decodedId}"%`,
        `%"${nameEn}"%`,
        nameJa || "",
        `%"${nameJa || "___"}"%`,
      ) as ActressRow | undefined;

    // Fallback: create or link actress profile if queried by valid name
    if (!row && decodedId.length > 1) {
      const candidateId = upsertActress(decodedId);
      row = db.prepare("SELECT * FROM actresses WHERE id = ?").get(candidateId) as ActressRow | undefined;
    }

    if (!row) return null;

    // If stored name is Japanese and English name is available, promote English as primary
    if (containsJapanese(row.name) && nameEn && !containsJapanese(nameEn)) {
      const aliases: string[] = JSON.parse(row.aliases || "[]");
      if (!aliases.includes(row.name)) aliases.push(row.name);
      if (nameJa && !aliases.includes(nameJa)) aliases.push(nameJa);
      db.prepare("UPDATE actresses SET name = ?, aliases = ?, updated_at = ? WHERE id = ?").run(
        nameEn,
        JSON.stringify(aliases),
        Date.now(),
        row.id,
      );
      row.name = nameEn;
      row.aliases = JSON.stringify(aliases);
    }

    const works = db
      .prepare(
        `SELECT DISTINCT m.* FROM media m
         LEFT JOIN media_actors ma ON ma.media_id = m.id
         WHERE ma.actress_id = ? 
            OR ma.actress_id = ?
            OR m.extra_meta LIKE ?
            OR m.extra_meta LIKE ?
         ORDER BY m.year DESC, m.updated_at DESC LIMIT 100`,
      )
      .all(row.id, id, `%"${decodedId}"%`, `%"${row.name}"%`) as Array<Record<string, unknown>>;

    const resolvedCountry =
      row.country ||
      works.find((w: any) => w.country && w.country.trim() !== "")?.country ||
      null;

    return {
      actress: {
        id: row.id,
        name: row.name,
        aliases: JSON.parse(row.aliases || "[]"),
        country: resolvedCountry,
        studio: row.studio,
        bio: row.bio,
        mediaCount: row.media_count,
        photoUrl: row.photo_path
          ? (row.photo_path.startsWith("http")
              ? row.photo_path
              : fileUrl("actresses", row.id, row.photo_path))
          : "",
      },
      works: rowsToMedia(works as never),
    };
  });

  if (!payload) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const row = db.prepare("SELECT * FROM actresses WHERE id = ?").get(id) as ActressRow | undefined;
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json()) as {
    name?: string;
    aliases?: string[];
    country?: string;
    studio?: string;
    bio?: string;
  };
  const now = Date.now();

  db.prepare(
    `UPDATE actresses SET name = COALESCE(?, name), aliases = COALESCE(?, aliases),
       country = COALESCE(?, country), studio = COALESCE(?, studio),
       bio = COALESCE(?, bio), updated_at = ?
     WHERE id = ?`,
  ).run(
    body.name ?? null,
    body.aliases ? JSON.stringify(body.aliases) : null,
    body.country ?? null,
    body.studio ?? null,
    body.bio ?? null,
    now,
    id,
  );

  audit(session.uid, "actress.update", "actress", id, { name: body.name ?? row.name });
  serverCache.invalidateByPrefix("actress:");
  const fresh = db.prepare("SELECT * FROM actresses WHERE id = ?").get(id) as ActressRow;
  return NextResponse.json({
    actress: {
      id: fresh.id,
      name: fresh.name,
      aliases: JSON.parse(fresh.aliases || "[]"),
      country: fresh.country,
      studio: fresh.studio,
      bio: fresh.bio,
      mediaCount: fresh.media_count,
      photoUrl: fresh.photo_path ? fileUrl("actresses", fresh.id, fresh.photo_path) : "",
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  db.prepare("DELETE FROM actresses WHERE id = ?").run(id);
  fs.rmSync(actressDir(id), { recursive: true, force: true });
  refreshMediaCounts();
  serverCache.invalidateByPrefix("actress:");
  audit(session.uid, "actress.delete", "actress", id);

  return NextResponse.json({ ok: true });
}