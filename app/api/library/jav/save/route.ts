import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/server/auth";
import { getMediaRow, rowToMedia } from "@/lib/server/mapper";
import { setMediaActresses } from "@/lib/server/actresses";
import { audit } from "@/lib/server/audit";
import { buildSearchTokens } from "@/lib/utils/normalize";
import { normalizeJavCode } from "@/lib/providers/javdb";
import {
  containsJapanese,
  translateText,
  translateTags,
  translateActressName,
} from "@/lib/utils/translate";

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    code: string;
    title: string;
    titleJa?: string;
    studio?: string;
    label?: string;
    series?: string;
    director?: string;
    duration?: number;
    releaseDate?: string;
    actress?: string;
    actresses?: string[];
    actressDetails?: Array<{ name: string; avatarUrl?: string }>;
    previewImages?: string[];
    year?: number;
    rating?: number;
    tags?: string[];
    posterUrl?: string;
    backdropUrl?: string;
    overview?: string;
    streamUrl?: string;
    magnets?: Array<{
      title: string;
      size?: string;
      date?: string;
      magnetUrl: string;
      isSubtitled?: boolean;
      isHD?: boolean;
    }>;
  };

  const rawCode = (body.code || "").trim();
  if (!rawCode || !body.title) {
    return NextResponse.json({ error: "code and title required" }, { status: 400 });
  }

  const { code } = normalizeJavCode(rawCode);
  const mediaId = `jav-${code.toLowerCase()}`;

  const dup = db.prepare("SELECT id FROM media WHERE id = ? OR code = ?").get(mediaId, code) as
    | { id: string }
    | undefined;
  if (dup) {
    return NextResponse.json({ ok: true, duplicate: true, mediaId: dup.id });
  }

  const now = Date.now();
  const rawActressList = body.actresses && body.actresses.length > 0
    ? body.actresses
    : body.actress ? [body.actress] : [];
  const actressList = rawActressList.map(translateActressName);
  const actressName = actressList[0] || "Unknown";
  const studio = body.studio || "Japan AV Studio";
  const tags = translateTags(body.tags || [code, studio, "4K Ultra HD"]);

  // Ensure title is translated into English if it contains Japanese
  const originalTitle = body.titleJa || body.title;
  const englishTitle = containsJapanese(body.title)
    ? await translateText(body.title)
    : body.title;
  const overview = body.overview && !containsJapanese(body.overview)
    ? body.overview
    : `Official adult feature from studio ${studio}, starring ${actressList.join(", ") || actressName} (Catalog code ${code}).`;

  const previewImages = (body.previewImages || []).filter(
    (url) =>
      typeof url === "string" &&
      url.startsWith("http") &&
      !url.includes("/v/") &&
      (/\.(jpe?g|png|webp)($|\?)/i.test(url) || url.includes("/samples/")),
  );

  const extraMeta = JSON.stringify({
    label: body.label || studio,
    seriesName: body.series || undefined,
    actressDetails: body.actressDetails
      ? body.actressDetails.map(a => ({ ...a, name: translateActressName(a.name) }))
      : (actressList.length ? actressList.map(name => ({ name })) : undefined),
    previewImages,
    magnets: body.magnets || [],
  });

  const tokens = buildSearchTokens(
    englishTitle,
    { ja: originalTitle, en: code },
    code,
    [actressName, studio, ...tags],
  ).join(" ");

  db.transaction(() => {
    db.prepare(`
      INSERT INTO media (
        id, type, code, title, title_th, title_ja, title_en, overview, country,
        year, studio, rating, votes, views, director, runtime, release_date,
        extra_meta, status, poster_path, backdrop_path,
        search_tokens, created_at, updated_at
      ) VALUES (
        ?, 'jav', ?, ?, ?, ?, ?, ?, 'JP',
        ?, ?, ?, 150, 0, ?, ?, ?,
        ?, 'published', ?, ?,
        ?, ?, ?
      )
    `).run(
      mediaId,
      code,
      englishTitle,
      englishTitle,
      originalTitle || null,
      code,
      overview || null,
      body.year || 2024,
      studio,
      body.rating || 8.8,
      body.director || null,
      body.duration || 120,
      body.releaseDate || null,
      extraMeta,
      body.posterUrl || null,
      body.backdropUrl || body.posterUrl || null,
      tokens,
      now,
      now,
    );

    // Default stream source
    const stream = body.streamUrl?.trim() || "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
    db.prepare(`
      INSERT INTO media_sources (media_id, label, url, kind, healthy, sort)
      VALUES (?, 'Main Server (4K Master)', ?, 'hls', 1, 0)
    `).run(mediaId, stream);

    // Preview images
    if (previewImages.length > 0) {
      const insImg = db.prepare(
        "INSERT INTO media_images (media_id, kind, path, sort) VALUES (?, 'preview', ?, ?)",
      );
      previewImages.forEach((p, idx) => {
        insImg.run(mediaId, p, idx);
      });
    }

    // Tags
    const tagStmt = db.prepare("INSERT OR IGNORE INTO media_tags (media_id, tag) VALUES (?, ?)");
    for (const t of tags) {
      tagStmt.run(mediaId, t.trim());
    }

    // Link Actresses
    if (body.actressDetails && body.actressDetails.length > 0) {
      setMediaActresses(mediaId, body.actressDetails);
    } else if (actressList.length > 0) {
      setMediaActresses(mediaId, actressList);
    }
  })();

  audit(session.uid, "library.save_jav", "media", mediaId, {
    code,
    title: body.title,
    actresses: actressList,
  });

  return NextResponse.json({
    ok: true,
    duplicate: false,
    media: rowToMedia(getMediaRow(mediaId)!),
  });
}
