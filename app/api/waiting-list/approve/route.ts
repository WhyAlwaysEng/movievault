import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildSearchTokens } from "@/lib/utils/normalize";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ids, approveAll = false } = body;

    let targetIds: string[] = [];
    if (approveAll) {
      const rows = db.prepare(`SELECT id FROM waiting_list WHERE status = 'pending'`).all() as any[];
      targetIds = rows.map((r) => r.id);
    } else if (Array.isArray(ids)) {
      targetIds = ids;
    } else if (id) {
      targetIds = [id];
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ error: "No items to approve" }, { status: 400 });
    }

    const approvedMedia = [];
    const now = Date.now();

    for (const wlId of targetIds) {
      const item = db
        .prepare(`SELECT * FROM waiting_list WHERE id = ? AND status = 'pending'`)
        .get(wlId) as any;

      if (!item) continue;

      let servers: Array<{ label: string; url: string; kind?: string }> = [];
      try {
        servers = JSON.parse(item.servers_json || "[]");
      } catch {}

      const mediaId = item.code
        ? item.code.toLowerCase().replace(/[^a-z0-9_-]/g, "")
        : "m-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);

      const existing = db
        .prepare(`SELECT id FROM media WHERE id = ? OR (code IS NOT NULL AND code = ?) LIMIT 1`)
        .get(mediaId, item.code || "") as any;

      let finalMediaId = mediaId;
      if (existing) {
        finalMediaId = mediaId + "-" + Math.random().toString(36).slice(2, 6);
      }

      const searchTokens = buildSearchTokens(item.title, item.code || undefined);

      db.prepare(
        `INSERT INTO media (
          id, type, code, title, overview, status, poster_path, search_tokens, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'published', ?, ?, ?, ?)`
      ).run(
        finalMediaId,
        item.type || "jav",
        item.code || null,
        item.title,
        item.overview || null,
        item.poster_url || null,
        searchTokens,
        now,
        now
      );

      if (servers.length > 0) {
        const insertSource = db.prepare(
          `INSERT INTO media_sources (media_id, label, url, kind, healthy, sort)
           VALUES (?, ?, ?, ?, 1, ?)`
        );
        servers.forEach((s, idx) => {
          insertSource.run(
            finalMediaId,
            s.label || `Server ${idx + 1}`,
            s.url,
            s.kind || "embed",
            idx
          );
        });
      }

      db.prepare(
        `UPDATE waiting_list SET status = 'imported', updated_at = ? WHERE id = ?`
      ).run(now, wlId);

      approvedMedia.push({
        id: finalMediaId,
        code: item.code,
        title: item.title,
        serversCount: servers.length,
      });
    }

    return NextResponse.json({
      success: true,
      approvedCount: approvedMedia.length,
      items: approvedMedia,
      message: `Successfully imported ${approvedMedia.length} item(s) to Vault`,
    });
  } catch (err: any) {
    console.error("Approve waiting list error:", err);
    return NextResponse.json({ error: "Failed to approve items" }, { status: 500 });
  }
}
