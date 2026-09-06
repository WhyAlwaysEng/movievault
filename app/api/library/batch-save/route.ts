import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { tmdbConfigured } from "@/lib/providers/tmdb";

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    type: "movie" | "series";
    items: Array<{ id: number; title: string; year?: number; posterUrl?: string }>;
  };

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }

  const results: Array<{ id: number; title: string; success: boolean; duplicate?: boolean; error?: string }> = [];
  const origin = req.nextUrl.origin;

  for (const item of body.items) {
    try {
      if (body.type === "movie") {
        const saveRes = await fetch(`${origin}/api/library/movies/save`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cookie": req.headers.get("cookie") || "",
            "Authorization": req.headers.get("authorization") || "",
          },
          body: JSON.stringify({ tmdbId: item.id }),
        });
        const json = await saveRes.json();
        results.push({
          id: item.id,
          title: item.title,
          success: saveRes.ok,
          duplicate: json.duplicate,
          error: json.error,
        });
      } else {
        const saveRes = await fetch(`${origin}/api/library/series/save`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cookie": req.headers.get("cookie") || "",
            "Authorization": req.headers.get("authorization") || "",
          },
          body: JSON.stringify({
            source: "tvmaze",
            id: item.id,
            title: item.title,
            year: item.year,
            posterUrl: item.posterUrl,
          }),
        });
        const json = await saveRes.json();
        results.push({
          id: item.id,
          title: item.title,
          success: saveRes.ok,
          duplicate: json.duplicate,
          error: json.error,
        });
      }
    } catch (err) {
      results.push({
        id: item.id,
        title: item.title,
        success: false,
        error: (err as Error).message,
      });
    }
  }

  const savedCount = results.filter((r) => r.success && !r.duplicate).length;
  const duplicateCount = results.filter((r) => r.duplicate).length;

  return NextResponse.json({
    ok: true,
    totalProcessed: results.length,
    savedCount,
    duplicateCount,
    results,
  });
}