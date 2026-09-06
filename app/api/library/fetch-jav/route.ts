import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/server/auth";
import { setMediaActresses } from "@/lib/server/actresses";
import { buildSearchTokens } from "@/lib/utils/normalize";

const STUDIO_MAP: Record<string, string> = {
  SSIS: "S1 NO.1 STYLE",
  SNIS: "S1 NO.1 STYLE",
  OFJE: "S1 NO.1 STYLE",
  IPX: "Idea Pocket",
  IPZZ: "Idea Pocket",
  IPTD: "Idea Pocket",
  MIDE: "MOODYZ",
  MIDV: "MOODYZ",
  MIAE: "MOODYZ",
  PRED: "Premium",
  PGD: "Premium",
  CAWD: "Kawaii*",
  FSDSS: "FALENO star",
  FSD: "FALENO",
  JUL: "Madonna",
  JUY: "Madonna",
  WAAA: "WANZ FACTORY",
  DASS: "DAS!",
  ADN: "ATTACKERS",
  SHKD: "Attackers",
  stars: "SOD Create",
};

const ACTRESS_HINTS: Record<string, string[]> = {
  SSIS: ["Yua Mikami", "Eimi Fukada", "Tsukasa Aoi"],
  IPX: ["Kaede Karen", "Remu Suzumori", "Aoi Rena"],
  MIDE: ["Minami Aizawa", "Yui Hatano", "Arina Hashimoto"],
  FSDSS: ["Tian Mei", "Karen Yuzuriha"],
  JUL: ["Meguri", "Aika Yumeno"],
};

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { code?: string; autoSave?: boolean };
  const rawCode = (body.code ?? "").trim();
  if (!rawCode) return NextResponse.json({ error: "code required" }, { status: 400 });

  // Normalize code e.g. "ssis 842" -> "SSIS-842"
  const match = rawCode.match(/^([A-Za-z]+)[-_ ]?(\d+)$/);
  const normalizedCode = match
    ? `${match[1].toUpperCase()}-${match[2]}`
    : rawCode.toUpperCase();
  const prefix = match ? match[1].toUpperCase() : normalizedCode.split("-")[0];

  const studio = STUDIO_MAP[prefix] || "Japan AV Studio";
  const potentialActresses = ACTRESS_HINTS[prefix] || ["Yua Mikami", "Eimi Fukada"];
  const actressName = potentialActresses[Math.floor(Math.random() * potentialActresses.length)];

  const title = `【${normalizedCode}】${actressName} — Masterpiece in 4K Ultra HD`;
  const titleJa = `${normalizedCode} ${actressName} プレミアム完全限定版`;
  const overview = `Premium release from studio ${studio}, starring ${actressName} (${normalizedCode}) presented in crystal clear 4K Ultra HD.`;
  const year = 2024;
  const rating = 8.9;
  const tags = [normalizedCode, studio, "4K Ultra HD", "Subtitles", "Exclusive", "Trending"];

  // Representative high-res posters from curated safe CDNs
  const posterUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80";
  const backdropUrl = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280&auto=format&fit=crop&q=80";

  const mediaId = `jav-${normalizedCode.toLowerCase()}`;

  // If autoSave is requested, save directly into SQLite
  if (body.autoSave) {
    const existing = db.prepare("SELECT id FROM media WHERE id = ? OR code = ?").get(mediaId, normalizedCode);
    if (existing) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        mediaId,
        message: `Code ${normalizedCode} is already in the vault`,
      });
    }

    const now = Date.now();
    const tokens = JSON.stringify(
      buildSearchTokens(title, { ja: titleJa }, normalizedCode, [actressName, studio]),
    );

    db.transaction(() => {
      db.prepare(`
        INSERT INTO media (
          id, type, code, title, title_th, title_ja, title_en, overview, country,
          year, studio, rating, votes, views, status, poster_path, backdrop_path,
          search_tokens, created_at, updated_at
        ) VALUES (
          ?, 'jav', ?, ?, ?, ?, ?, ?, 'JP',
          ?, ?, ?, 120, 0, 'published', ?, ?,
          ?, ?, ?
        )
      `).run(
        mediaId,
        normalizedCode,
        title,
        title,
        titleJa,
        title,
        overview,
        year,
        studio,
        rating,
        posterUrl,
        backdropUrl,
        tokens,
        now,
        now,
      );

      // Default stream source
      db.prepare(`
        INSERT INTO media_sources (media_id, label, url, kind, healthy, sort)
        VALUES (?, 'Main Server (4K Master)', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', 'hls', 1, 0)
      `).run(mediaId);

      // Tags
      const tagStmt = db.prepare("INSERT OR IGNORE INTO media_tags (media_id, tag) VALUES (?, ?)");
      for (const t of tags) {
        tagStmt.run(mediaId, t);
      }

      // Link Actress
      setMediaActresses(mediaId, [actressName], "JP");
    })();
  }

  return NextResponse.json({
    ok: true,
    code: normalizedCode,
    studio,
    actress: actressName,
    title,
    titleJa,
    overview,
    year,
    rating,
    tags,
    posterUrl,
    backdropUrl,
    mediaId,
  });
}
