import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/server/auth";
import { setMediaActresses } from "@/lib/server/actresses";
import { buildSearchTokens } from "@/lib/utils/normalize";
import { scrapeJavDb } from "@/lib/providers/javdb";

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { code?: string; autoSave?: boolean };
  const rawCode = (body.code ?? "").trim();
  if (!rawCode) return NextResponse.json({ error: "code required" }, { status: 400 });

  try {
    const item = await scrapeJavDb(rawCode);
    const mediaId = `jav-${item.code.toLowerCase()}`;

    // If autoSave is requested, save directly into SQLite
    if (body.autoSave) {
      const existing = db.prepare("SELECT id FROM media WHERE id = ? OR code = ?").get(mediaId, item.code);
      if (existing) {
        return NextResponse.json({
          ok: true,
          duplicate: true,
          mediaId,
          message: `Code ${item.code} is already in the vault`,
        });
      }

      const now = Date.now();
      const tokens = JSON.stringify(
        buildSearchTokens(item.title, { ja: item.titleJa }, item.code, [
          ...(item.actresses || []),
          item.studio,
          ...(item.tags || []),
        ]),
      );

      const extraMeta = JSON.stringify({
        label: item.label || item.studio,
        seriesName: item.series,
        seriesJa: item.titleJa,
        directorJa: item.titleJa,
        actressDetails: item.actressDetails,
        previewImages: item.previewImages,
        magnets: item.magnets || [],
      });

      db.transaction(() => {
        db.prepare(`
          INSERT INTO media (
            id, type, code, title, title_th, title_ja, title_en, overview, country,
            year, studio, rating, votes, views, director, runtime, release_date,
            extra_meta, status, poster_path, backdrop_path,
            search_tokens, created_at, updated_at
          ) VALUES (
            ?, 'jav', ?, ?, ?, ?, ?, ?, 'JP',
            ?, ?, ?, 120, 0, ?, ?, ?,
            ?, 'published', ?, ?,
            ?, ?, ?
          )
        `).run(
          mediaId,
          item.code,
          item.title,
          item.title,
          item.titleJa || null,
          item.title,
          item.overview,
          item.year,
          item.studio,
          item.rating,
          item.director || null,
          item.duration || 120,
          item.releaseDate || null,
          extraMeta,
          item.posterUrl,
          item.backdropUrl || item.posterUrl,
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
        if (item.tags && item.tags.length > 0) {
          const tagStmt = db.prepare("INSERT OR IGNORE INTO media_tags (media_id, tag) VALUES (?, ?)");
          for (const t of item.tags) {
            tagStmt.run(mediaId, t);
          }
        }

        // Link Actresses only if actual actresses exist
        if (item.actressDetails && item.actressDetails.length > 0) {
          setMediaActresses(mediaId, item.actressDetails, "JP");
        } else if (item.actresses && item.actresses.length > 0) {
          setMediaActresses(mediaId, item.actresses, "JP");
        }
      })();
    }

    return NextResponse.json({
      ok: true,
      code: item.code,
      studio: item.studio,
      studioJa: item.studioJa,
      label: item.label,
      series: item.series,
      director: item.director,
      actress: item.actress || "",
      actresses: item.actresses || [],
      actressDetails: item.actressDetails || [],
      title: item.title,
      titleJa: item.titleJa,
      overview: item.overview,
      year: item.year,
      rating: item.rating,
      tags: item.tags,
      posterUrl: item.posterUrl,
      backdropUrl: item.backdropUrl,
      previewImages: item.previewImages,
      magnets: item.magnets,
      mediaId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch JAV metadata" },
      { status: 500 },
    );
  }
}
