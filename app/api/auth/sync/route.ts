import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isOwnerMode, ownerSession, verifyFirebaseToken } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  if (isOwnerMode()) return NextResponse.json(ownerSession());

  const body = (await req.json().catch(() => ({}))) as { idToken?: string };
  if (!body.idToken) return NextResponse.json({ error: "missing token" }, { status: 401 });

  const user = await verifyFirebaseToken(body.idToken);
  if (!user) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const now = Date.now();

  db.prepare(
    `INSERT INTO users (uid, email, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(uid) DO UPDATE SET email = excluded.email, updated_at = excluded.updated_at`,
  ).run(
    user.uid,
    user.email,
    user.email && adminEmails.includes(user.email.toLowerCase()) ? "admin" : "user",
    now,
    now,
  );

  const row = db.prepare("SELECT role FROM users WHERE uid = ?").get(user.uid) as {
    role: string;
  };
  const isAdmin = row.role === "admin";

  const res = NextResponse.json({ uid: user.uid, email: user.email, isAdmin, role: row.role });
  res.cookies.set("mv_token", body.idToken, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}