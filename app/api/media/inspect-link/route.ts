import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export interface ExtractedServer {
  label: string;
  url: string;
  kind: "embed" | "hls";
  host?: string;
}

const KNOWN_STREAM_HOSTS: Record<string, string> = {
  "streamtape.com": "StreamTape",
  "doodstream.com": "DoodStream",
  "dood.to": "DoodStream",
  "dood.so": "DoodStream",
  "dood.pm": "DoodStream",
  "dood.ws": "DoodStream",
  "voe.sx": "VOE",
  "emturbovid.com": "TurboVid",
  "turbovid.me": "TurboVid",
  "streamwish.to": "StreamWish",
  "filemoon.sx": "FileMoon",
  "mixdrop.co": "MixDrop",
  "vidcloud.co": "VidCloud",
  "upstream.to": "UpStream",
  "vidsrc.to": "VidSrc",
  "streamcrypt.net": "StreamCrypt",
  "ok.ru": "OK.ru",
  "drive.google.com": "Google Drive",
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { url?: string };
    const rawUrl = (body.url ?? "").trim();
    if (!rawUrl) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // 1. Extract potential JAV / Catalog code from URL slug or params
    let code: string | null = null;
    const urlMatch = rawUrl.match(/([a-zA-Z]{2,6}[-_]\d{2,6}|fc2[-_]ppv[-_]\d{4,8})/i);
    if (urlMatch) {
      code = urlMatch[1].toUpperCase().replace("_", "-");
    }

    // 2. Duplicate Check in Media table
    if (code) {
      const existingMedia = db
        .prepare(
          `SELECT id, type, code, title, poster_path, status, created_at 
           FROM media 
           WHERE code = ? OR code = ? OR title LIKE ?
           LIMIT 1`
        )
        .get(code, code.toLowerCase(), `%${code}%`) as any;

      if (existingMedia) {
        return NextResponse.json({
          exists: true,
          inWaitingList: false,
          code,
          existingMedia: {
            id: existingMedia.id,
            title: existingMedia.title,
            code: existingMedia.code,
            type: existingMedia.type,
            posterUrl: existingMedia.poster_path,
            status: existingMedia.status,
          },
          message: `Code ${code} is already in your MovieVault library!`,
        });
      }

      // Check if already in Waiting List (pending)
      const existingWaiting = db
        .prepare(
          `SELECT id, code, title, source_url, poster_url, status, created_at 
           FROM waiting_list 
           WHERE (code = ? OR title LIKE ?) AND status = 'pending'
           LIMIT 1`
        )
        .get(code, `%${code}%`) as any;

      if (existingWaiting) {
        return NextResponse.json({
          exists: false,
          inWaitingList: true,
          code,
          waitingItem: existingWaiting,
          message: `Code ${code} is already in your Waiting List pending approval.`,
        });
      }
    }

    // 3. Fetch Webpage HTML
    const fetchRes = await fetch(rawUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ja;q=0.8,th;q=0.7",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!fetchRes.ok) {
      return NextResponse.json(
        { error: `Target website returned status ${fetchRes.status}` },
        { status: 502 }
      );
    }

    const html = await fetchRes.text();

    // 4. Extract Title
    let title = "";
    const itempropTitle = html.match(/<meta[^>]+itemprop=["']name["'][^>]+content=["']([^"']+)["']/i);
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    const docTitle = html.match(/<title>([^<]+)<\/title>/i);

    if (itempropTitle) title = itempropTitle[1];
    else if (ogTitle) title = ogTitle[1];
    else if (docTitle) title = docTitle[1];

    title = title
      .replace(/&#8211;/g, "-")
      .replace(/&amp;/g, "&")
      .replace(/\s*[-|]\s*JAVX\.CC$/i, "")
      .replace(/\s*[-|]\s*Watch Online.*$/i, "")
      .trim();

    // If code wasn't found in URL, search in the extracted Title
    if (!code && title) {
      const titleCodeMatch = title.match(/([a-zA-Z]{2,6}[-_]\d{2,6}|fc2[-_]ppv[-_]\d{4,8})/i);
      if (titleCodeMatch) {
        code = titleCodeMatch[1].toUpperCase().replace("_", "-");
      }
    }

    // 5. Extract Poster Image
    let posterUrl: string | null = null;
    const itempropThumb = html.match(
      /<meta[^>]+itemprop=["']thumbnailUrl["'][^>]+content=["']([^"']+)["']/i
    );
    const ogImage = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    );

    if (itempropThumb) posterUrl = itempropThumb[1];
    else if (ogImage) posterUrl = ogImage[1];

    // 6. Extract Overview
    let overview: string | null = null;
    const itempropDesc = html.match(
      /<meta[^>]+itemprop=["']description["'][^>]+content=["']([^"']+)["']/i
    );
    const ogDesc = html.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i
    );

    if (itempropDesc) overview = itempropDesc[1];
    else if (ogDesc) overview = ogDesc[1];

    // 7. Extract Video Frames & Backup Servers (Strict Filtering)
    const servers: ExtractedServer[] = [];
    const seenUrls = new Set<string>();
    const currentDomain = parsedUrl.hostname.replace(/^www\./, "");

    const isGarbageUrl = (link: string) => {
      if (!link || link.startsWith("javascript:") || link.startsWith("#")) return true;
      try {
        const u = new URL(link);
        const h = u.hostname.replace(/^www\./, "");
        if (h === currentDomain) {
          if (!u.pathname.includes("embed") && !u.pathname.includes("player") && !u.pathname.includes(".mp4") && !u.pathname.includes(".m3u8")) {
            return true;
          }
        }
        if (h.includes("twitter") || h.includes("x.com") || h.includes("facebook") || h.includes("google.com/s2") || h.includes("cloudflare")) {
          return true;
        }
        return false;
      } catch {
        return true;
      }
    };

    // Strategy A: Dedicated Source Tabs (e.g. #sourcetabs in JAVX, etc.)
    const sourceTabsSection = html.match(/<div[^>]+id=["']sourcetabs["'][^>]*>([\s\S]*?)<\/div>/i);
    if (sourceTabsSection) {
      const tabLinks = sourceTabsSection[1].matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);
      for (const m of tabLinks) {
        const sUrl = m[1];
        const innerText = m[2].replace(/<[^>]+>/g, "").trim();
        if (!isGarbageUrl(sUrl) && !seenUrls.has(sUrl)) {
          seenUrls.add(sUrl);
          const u = new URL(sUrl);
          const host = u.hostname.replace(/^www\./, "");
          const hostName = KNOWN_STREAM_HOSTS[host] || host;
          servers.push({
            label: innerText || hostName,
            url: sUrl,
            kind: sUrl.includes(".m3u8") ? "hls" : "embed",
            host,
          });
        }
      }
    }

    // Strategy B: Video Player Iframes
    const playerSection = html.match(/<div[^>]+class=["'][^"']*(?:video-player|responsive-player|player-area)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi);
    const searchScope = playerSection ? playerSection.join("\n") : html;

    const iframeMatches = searchScope.matchAll(/<iframe[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/gi);
    for (const m of iframeMatches) {
      const ifUrl = m[1];
      if (!isGarbageUrl(ifUrl) && !seenUrls.has(ifUrl)) {
        seenUrls.add(ifUrl);
        const u = new URL(ifUrl);
        const host = u.hostname.replace(/^www\./, "");
        servers.push({
          label: KNOWN_STREAM_HOSTS[host] || `Frame (${host})`,
          url: ifUrl,
          kind: ifUrl.includes(".m3u8") ? "hls" : "embed",
          host,
        });
      }
    }

    // Strategy C: Scan for Known Video Streaming Hosts in entire page
    const knownHostsList = Object.keys(KNOWN_STREAM_HOSTS)
      .map((h) => h.replace(".", "\\."))
      .join("|");
    const streamHostRegex = new RegExp(`(https?:\\/\\/(?:www\\.)?(?:${knownHostsList})\\/[a-zA-Z0-9_\\-\\.\\/]+)`, "gi");

    for (const m of html.matchAll(streamHostRegex)) {
      const link = m[1];
      if (!isGarbageUrl(link) && !seenUrls.has(link)) {
        seenUrls.add(link);
        const u = new URL(link);
        const host = u.hostname.replace(/^www\./, "");
        servers.push({
          label: KNOWN_STREAM_HOSTS[host] || host,
          url: link,
          kind: "embed",
          host,
        });
      }
    }

    // Assign clean sequential labeling
    const finalServers = servers.map((s, idx) => ({
      ...s,
      label: `Server ${idx + 1} (${s.label})`,
    }));

    return NextResponse.json({
      exists: false,
      inWaitingList: false,
      code: code || "UNKNOWN",
      title: title || (code ? `JAV Release ${code}` : "Extracted Video Stream"),
      posterUrl,
      overview,
      sourceUrl: rawUrl,
      type: code ? "jav" : "movie",
      servers: finalServers,
      serversCount: finalServers.length,
    });
  } catch (err: any) {
    console.error("Inspect link error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to inspect link" },
      { status: 500 }
    );
  }
}
