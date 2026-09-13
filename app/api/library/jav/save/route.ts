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
  translateStudio,
  translateDirectorName,
} from "@/lib/utils/translate";

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    code: string;
    title: string;
    titleJa?: string;
    studio?: string;
    studioJa?: string;
    label?: string;
    labelJa?: string;
    series?: string;
    seriesJa?: string;
    director?: string;
    directorJa?: string;
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
  const rawActressList = (body.actresses && body.actresses.length > 0
    ? body.actresses
    : body.actress && body.actress.trim() ? [body.actress] : []
  ).filter(Boolean);

  const actressList = rawActressList.map((a) => a.trim()).filter(Boolean);
  const actressName = actressList[0] || "";
  const studio = translateStudio(body.studio || "Japan AV Studio");
  const label = body.label ? translateStudio(body.label) : studio;
  const director = body.director ? translateDirectorName(body.director) : undefined;
  const series = body.series ? await translateText(body.series) : undefined;
  const tags = translateTags(body.tags || [code, studio, "4K Ultra HD"]);

  // Ensure title is translated into English if it contains Japanese
  const originalTitle = body.titleJa || body.title;
  const englishTitle = containsJapanese(body.title)
    ? await translateText(body.title)
    : body.title;

  const starringText = actressList.length > 0 ? `, starring ${actressList.join(", ")}` : "";
  const seriesText = series ? ` as part of "${series}"` : "";
  const overview = body.overview && !containsJapanese(body.overview)
    ? body.overview
    : `Official adult feature from studio ${studio}${seriesText}${starringText} (Catalog code ${code}).`;

  const previewImages = (body.previewImages || []).filter(
    (url) =>
      typeof url === "string" &&
      url.startsWith("http") &&
      !url.includes("/v/") &&
      (/\.(jpe?g|png|webp)($|\?)/i.test(url) || url.includes("/samples/")),
  );

  const extraMeta = JSON.stringify({
    label,
    labelJa: body.labelJa || (body.label && containsJapanese(body.label) ? body.label : undefined),
    maker: studio,
    makerJa: body.studioJa || (body.studio && containsJapanese(body.studio) ? body.studio : undefined),
    seriesName: series,
    seriesJa: body.seriesJa || (body.series && containsJapanese(body.series) ? body.series : undefined),
    directorJa: body.directorJa || (body.director && containsJapanese(body.director) ? body.director : undefined),
    actressDetails: body.actressDetails && body.actressDetails.length > 0
      ? body.actressDetails.map((a) => ({ ...a, name: translateActressName(a.name) }))
      : (actressList.length ? actressList.map((name) => ({ name })) : undefined),
    previewImages,
    magnets: body.magnets || [],
  });

  const tokenList = [studio, ...tags];
  if (actressName) tokenList.push(actressName);
  const tokens = buildSearchTokens(
    englishTitle,
    { ja: originalTitle, en: code },
    code,
    tokenList,
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
      director || null,
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

    // Link Actresses only if non-empty
    if (body.actressDetails && body.actressDetails.length > 0) {
      setMediaActresses(mediaId, body.actressDetails, "JP");
    } else if (actressList.length > 0) {
      setMediaActresses(mediaId, actressList, "JP");
    }
  })();

  audit(session.uid, "library.save_jav", "media", mediaId, {
    code,
    title: englishTitle,
    actresses: actressList,
  });

  return NextResponse.json({
    ok: true,
    duplicate: false,
    media: rowToMedia(getMediaRow(mediaId)!),
  });
}
