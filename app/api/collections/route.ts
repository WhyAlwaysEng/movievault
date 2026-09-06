import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rowToMedia } from "@/lib/server/mapper";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const collectionId = searchParams.get("id");

  if (collectionId) {
    const col = db.prepare("SELECT * FROM collections WHERE id = ?").get(collectionId) as
      | { id: string; name: string; description: string | null; created_at: number; updated_at: number }
      | undefined;
    if (!col) return NextResponse.json({ error: "Collection not found" }, { status: 404 });

    const items = db
      .prepare(
        `SELECT m.* FROM media m
         JOIN collection_items ci ON ci.media_id = m.id
         WHERE ci.collection_id = ?
         ORDER BY ci.sort ASC, ci.added_at DESC`,
      )
      .all(collectionId) as Array<Record<string, unknown>>;

    return NextResponse.json({
      collection: col,
      items: items.map((w) => rowToMedia(w as never)),
    });
  }

  const collections = db
    .prepare(
      `SELECT c.*, COUNT(ci.media_id) AS item_count
       FROM collections c
       LEFT JOIN collection_items ci ON ci.collection_id = c.id
       GROUP BY c.id
       ORDER BY c.updated_at DESC`,
    )
    .all();

  return NextResponse.json({ collections });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const now = Date.now();

    // Add item to collection
    if (body.action === "add_item") {
      const { collectionId, mediaId } = body;
      if (!collectionId || !mediaId) {
        return NextResponse.json({ error: "collectionId and mediaId required" }, { status: 400 });
      }

      db.prepare(
        `INSERT OR IGNORE INTO collection_items (collection_id, media_id, added_at) VALUES (?, ?, ?)`,
      ).run(collectionId, mediaId, now);

      db.prepare("UPDATE collections SET updated_at = ? WHERE id = ?").run(now, collectionId);
      return NextResponse.json({ ok: true });
    }

    // Remove item from collection
    if (body.action === "remove_item") {
      const { collectionId, mediaId } = body;
      db.prepare("DELETE FROM collection_items WHERE collection_id = ? AND media_id = ?").run(
        collectionId,
        mediaId,
      );
      return NextResponse.json({ ok: true });
    }

    // Create new collection
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Collection name required" }, { status: 400 });
    }

    const id = `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const description = body.description ? String(body.description).trim() : null;

    db.prepare(
      `INSERT INTO collections (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    ).run(id, name, description, now, now);

    if (body.initialMediaId) {
      db.prepare(
        `INSERT OR IGNORE INTO collection_items (collection_id, media_id, added_at) VALUES (?, ?, ?)`,
      ).run(id, body.initialMediaId, now);
    }

    return NextResponse.json({ ok: true, id, name });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    db.prepare("DELETE FROM collections WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
