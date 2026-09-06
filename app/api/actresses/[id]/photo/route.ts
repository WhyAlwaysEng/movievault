import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { actressDir, fileUrl } from "@/lib/storage";
import fs from "node:fs";
import path from "node:path";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const row = db.prepare("SELECT id FROM actresses WHERE id = ?").get(id);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 15MB limit" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
  const buf = Buffer.from(await file.arrayBuffer());

  const dir = actressDir(id);
  fs.mkdirSync(dir, { recursive: true });
  const fileName = `photo${ext}`;
  fs.writeFileSync(path.join(dir, fileName), buf);

  // keep only the newest photo
  for (const f of fs.readdirSync(dir)) {
    if (f !== fileName && /^photo\./.test(f)) fs.rmSync(path.join(dir, f), { force: true });
  }

  db.prepare("UPDATE actresses SET photo_path = ?, updated_at = ? WHERE id = ?").run(
    fileName,
    Date.now(),
    id,
  );
  audit(session.uid, "actress.photo", "actress", id);

  return NextResponse.json({ photoUrl: fileUrl("actresses", id, fileName) });
}