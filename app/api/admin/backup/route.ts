import { NextRequest, NextResponse } from "next/server";
import { db, DATA_DIR } from "@/lib/db";
import { requireAdmin } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import fs from "node:fs";
import path from "node:path";

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const backupsDir = path.join(DATA_DIR, "backups");
  if (!fs.existsSync(backupsDir)) {
    return NextResponse.json({ backups: [] });
  }

  const files = fs
    .readdirSync(backupsDir)
    .filter((f) => f.endsWith(".db"))
    .sort()
    .reverse()
    .map((name) => {
      const full = path.join(backupsDir, name);
      const stat = fs.statSync(full);
      return {
        name,
        size: stat.size,
        createdAt: stat.mtimeMs,
      };
    });

  return NextResponse.json({ backups: files });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const backupsDir = path.join(DATA_DIR, "backups");
  fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(backupsDir, `movievault-${stamp}.db`);

  await db.backup(dest);

  // rotate: keep the newest 14
  const files = fs
    .readdirSync(backupsDir)
    .filter((f) => f.endsWith(".db"))
    .sort()
    .reverse();
  for (const old of files.slice(14)) fs.rmSync(path.join(backupsDir, old), { force: true });

  audit(session.uid, "admin.backup", "system", dest, { bytes: fs.statSync(dest).size });
  return NextResponse.json({ ok: true, path: dest, bytes: fs.statSync(dest).size });
}