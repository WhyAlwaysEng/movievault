import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pending";

    const rows = db
      .prepare(
        `SELECT id, code, title, source_url, poster_url, overview, servers_json, type, status, created_at, updated_at
         FROM waiting_list
         WHERE status = ?
         ORDER BY created_at DESC`
      )
      .all(status) as any[];

    const items = rows.map((r) => {
      let servers = [];
      try {
        servers = JSON.parse(r.servers_json || "[]");
      } catch {}
      return {
        ...r,
        servers,
      };
    });

    const countRow = db
      .prepare(`SELECT COUNT(*) as count FROM waiting_list WHERE status = 'pending'`)
      .get() as { count: number } | undefined;

    return NextResponse.json({
      items,
      count: countRow?.count ?? items.length,
    });
  } catch (err: any) {
    console.error("Fetch waiting list error:", err);
    return NextResponse.json({ error: "Failed to fetch waiting list" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      code,
      title,
      sourceUrl,
      posterUrl,
      overview,
      servers = [],
      type = "jav",
    } = body;

    if (!title || !sourceUrl) {
      return NextResponse.json(
        { error: "Title and source URL are required" },
        { status: 400 }
      );
    }

    const existing = db
      .prepare(
        `SELECT id, code, title FROM waiting_list WHERE (source_url = ? OR (code IS NOT NULL AND code = ?)) AND status = 'pending' LIMIT 1`
      )
      .get(sourceUrl, code || "") as any;

    if (existing) {
      return NextResponse.json(
        {
          error: `Already in waiting list with code ${existing.code || existing.title}`,
          item: existing,
        },
        { status: 409 }
      );
    }

    const id = "wl-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
    const now = Date.now();

    db.prepare(
      `INSERT INTO waiting_list (
        id, code, title, source_url, poster_url, overview, servers_json, type, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
    ).run(
      id,
      code ? code.toUpperCase() : null,
      title.trim(),
      sourceUrl.trim(),
      posterUrl || null,
      overview || null,
      JSON.stringify(servers),
      type,
      now,
      now
    );

    return NextResponse.json({
      success: true,
      id,
      message: "Added to waiting list successfully",
    });
  } catch (err: any) {
    console.error("Add to waiting list error:", err);
    return NextResponse.json({ error: "Failed to add to waiting list" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const clearAll = searchParams.get("clearAll") === "true";

    if (clearAll) {
      db.prepare(`DELETE FROM waiting_list WHERE status = 'pending'`).run();
      return NextResponse.json({ success: true, message: "Cleared all pending items" });
    }

    if (!id) {
      return NextResponse.json({ error: "Item ID required" }, { status: 400 });
    }

    db.prepare(`DELETE FROM waiting_list WHERE id = ?`).run(id);
    return NextResponse.json({ success: true, message: "Deleted from waiting list" });
  } catch (err: any) {
    console.error("Delete waiting list error:", err);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
