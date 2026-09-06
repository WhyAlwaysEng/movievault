import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { actressDir, fileUrl, downloadImage } from "@/lib/storage";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const row = db.prepare("SELECT id FROM actresses WHERE id = ?").get(id);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const imageUrl = body.imageUrl?.trim();
  if (!imageUrl) {
    return NextResponse.json({ error: "missing imageUrl" }, { status: 400 });
  }

  const dir = actressDir(id);
  fs.mkdirSync(dir, { recursive: true });

  const fileName = "photo.jpg";
  const dest = path.join(dir, fileName);

  const ok = await downloadImage(imageUrl, dest);
  if (!ok) {
    return NextResponse.json({ error: "Failed to download image from source URL" }, { status: 502 });
  }

  // Cleanup old formats
  for (const f of fs.readdirSync(dir)) {
    if (f !== fileName && /^photo\./.test(f)) {
      fs.rmSync(path.join(dir, f), { force: true });
    }
  }

  db.prepare("UPDATE actresses SET photo_path = ?, updated_at = ? WHERE id = ?").run(
    fileName,
    Date.now(),
    id,
  );
  audit(session.uid, "actress.photo.search_apply", "actress", id);

  return NextResponse.json({
    ok: true,
    photoUrl: fileUrl("actresses", id, fileName),
  });
}
