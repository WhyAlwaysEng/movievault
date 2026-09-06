import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/server/auth";

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const qbUrl = (db.prepare("SELECT value FROM app_meta WHERE key = ?").get("qb_url") as { value: string } | undefined)?.value || "http://127.0.0.1:8080";
  const qbUsername = (db.prepare("SELECT value FROM app_meta WHERE key = ?").get("qb_username") as { value: string } | undefined)?.value || "admin";
  const qbSavePath = (db.prepare("SELECT value FROM app_meta WHERE key = ?").get("qb_savepath") as { value: string } | undefined)?.value || "/mnt/storage/movievault/downloads";

  return NextResponse.json({
    qbUrl,
    qbUsername,
    qbSavePath,
  });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    // 1. Save configuration
    if (body.action === "save_config") {
      const { qbUrl, qbUsername, qbPassword, qbSavePath } = body;
      const setMeta = db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)");
      if (qbUrl) setMeta.run("qb_url", qbUrl.trim().replace(/\/+$/, ""));
      if (qbUsername) setMeta.run("qb_username", qbUsername.trim());
      if (qbPassword) setMeta.run("qb_password", qbPassword);
      if (qbSavePath) setMeta.run("qb_savepath", qbSavePath.trim());

      return NextResponse.json({ ok: true, message: "Settings saved" });
    }

    // 2. Send magnet to qBittorrent
    if (body.action === "add_torrent") {
      const magnet = body.magnet;
      if (!magnet || !magnet.startsWith("magnet:")) {
        return NextResponse.json({ error: "Invalid magnet link" }, { status: 400 });
      }

      const qbUrl = (db.prepare("SELECT value FROM app_meta WHERE key = ?").get("qb_url") as { value: string } | undefined)?.value || "http://127.0.0.1:8080";
      const qbUsername = (db.prepare("SELECT value FROM app_meta WHERE key = ?").get("qb_username") as { value: string } | undefined)?.value || "admin";
      const qbPassword = (db.prepare("SELECT value FROM app_meta WHERE key = ?").get("qb_password") as { value: string } | undefined)?.value || "adminadmin";
      const qbSavePath = (db.prepare("SELECT value FROM app_meta WHERE key = ?").get("qb_savepath") as { value: string } | undefined)?.value || "/mnt/storage/movievault/downloads";

      // Step A: Login to qBittorrent WebAPI
      let cookie = "";
      try {
        const loginRes = await fetch(`${qbUrl}/api/v2/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ username: qbUsername, password: qbPassword }).toString(),
          signal: AbortSignal.timeout(5000),
        });

        const setCookieHeader = loginRes.headers.get("set-cookie");
        if (setCookieHeader) {
          cookie = setCookieHeader.split(";")[0];
        }
      } catch (e) {
        return NextResponse.json(
          { error: `Cannot connect to qBittorrent at ${qbUrl}. Check if qBittorrent is running on Orange Pi.` },
          { status: 502 },
        );
      }

      // Step B: Send torrent
      const form = new URLSearchParams();
      form.append("urls", magnet);
      if (qbSavePath) form.append("savepath", qbSavePath);
      if (body.category) form.append("category", body.category);

      const addRes = await fetch(`${qbUrl}/api/v2/torrents/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: form.toString(),
        signal: AbortSignal.timeout(6000),
      });

      if (!addRes.ok) {
        return NextResponse.json(
          { error: `qBittorrent returned HTTP ${addRes.status}` },
          { status: 500 },
        );
      }

      return NextResponse.json({ ok: true, message: "Torrent added to qBittorrent successfully" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
