import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export interface PhotoSearchResult {
  title: string;
  image: string;
  thumbnail: string;
  source?: string;
  width?: number;
  height?: number;
}

/**
 * Fetch images from Bing Images (Reliable, no aggressive rate limiting/CAPTCHA).
 */
async function searchBingImages(query: string): Promise<PhotoSearchResult[]> {
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&FORM=HDRSC2`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9,ja;q=0.8,th;q=0.7",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Bing search failed with status ${res.status}`);
  }

  const html = await res.text();
  const matches = [...html.matchAll(/class="iusc"[^>]*?m="([^"]+)"/g)];
  const results: PhotoSearchResult[] = [];

  for (const m of matches) {
    try {
      const decoded = m[1].replace(/&quot;/g, '"');
      const data = JSON.parse(decoded);
      if (data.murl && (data.murl.startsWith("http://") || data.murl.startsWith("https://"))) {
        results.push({
          title: data.t || query,
          image: data.murl,
          thumbnail: data.turl || data.murl,
          source: "Bing",
          width: typeof data.ow === "number" ? data.ow : undefined,
          height: typeof data.oh === "number" ? data.oh : undefined,
        });
      }
    } catch {}
  }

  return results.slice(0, 45);
}

/**
 * Fallback to DuckDuckGo Images.
 */
async function searchDdgImages(query: string): Promise<PhotoSearchResult[]> {
  const tokenRes = await fetch(
    `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    },
  );

  const tokenHtml = await tokenRes.text();
  const vqdMatch =
    tokenHtml.match(/vqd=["']?([0-9-_]+)/) || tokenHtml.match(/vqd=([0-9-_]+)/);

  if (!vqdMatch) return [];

  const vqd = vqdMatch[1];
  const imgRes = await fetch(
    `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://duckduckgo.com/",
      },
      signal: AbortSignal.timeout(8000),
    },
  );

  if (!imgRes.ok) return [];

  const data = await imgRes.json();
  const rawResults = (data.results || []) as Array<{
    title: string;
    image: string;
    thumbnail: string;
    source?: string;
    width?: number;
    height?: number;
  }>;

  return rawResults
    .filter((r) => r.image)
    .slice(0, 40)
    .map((r) => ({
      title: r.title || query,
      image: r.image,
      thumbnail: r.thumbnail || r.image,
      source: "DuckDuckGo",
      width: r.width,
      height: r.height,
    }));
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const row = db.prepare("SELECT id, name, aliases FROM actresses WHERE id = ?").get(id) as
    | { id: string; name: string; aliases: string }
    | undefined;

  if (!row) {
    return NextResponse.json({ error: "Actress not found" }, { status: 404 });
  }

  let customQuery = req.nextUrl.searchParams.get("q")?.trim();
  if (!customQuery) {
    let aliases: string[] = [];
    try {
      aliases = JSON.parse(row.aliases || "[]");
    } catch {
      aliases = [];
    }
    const jpName = aliases.find((a) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(a));
    customQuery = jpName ? `${row.name} ${jpName}` : row.name;
  }

  try {
    // 1. Try Bing Images first (fast, reliable, does not 403 on repeated calls)
    let results = await searchBingImages(customQuery).catch(() => []);

    // 2. If Bing returned empty, fallback to DuckDuckGo
    if (results.length === 0) {
      results = await searchDdgImages(customQuery).catch(() => []);
    }

    return NextResponse.json({
      query: customQuery,
      results,
    });
  } catch (err) {
    return NextResponse.json(
      {
        query: customQuery,
        results: [],
        error: (err as Error).message,
      },
      { status: 500 },
    );
  }
}
