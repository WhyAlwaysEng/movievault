import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "@/lib/db";
import { mimeFor, safeSegment } from "@/lib/storage";

const ALLOWED_BUCKETS = new Set(["media", "actresses"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const [bucket, id, ...rest] = segments;

  if (!ALLOWED_BUCKETS.has(bucket) || !id || rest.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (segments.some((s) => !/^[A-Za-z0-9._-]+$/.test(s))) {
    return NextResponse.json({ error: "bad path" }, { status: 404 });
  }

  const base = path.resolve(DATA_DIR, safeSegment(bucket), safeSegment(id));
  const filePath = path.resolve(base, ...rest.map(safeSegment));
  if (!filePath.startsWith(base + path.sep)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const contentType = mimeFor(filePath);

  // Range support (needed for seeking in progressive mp4/mkv playback)
  const range = req.headers.get("range");
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match && match[1] ? parseInt(match[1], 10) : 0;
    const end = match && match[2] ? parseInt(match[2], 10) : stat.size - 1;
    if (start >= stat.size || start > end) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
    }
    const chunk = fs.readFileSync(filePath).subarray(start, end + 1);
    return new NextResponse(chunk, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(chunk.length),
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  const body = fs.readFileSync(filePath);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(body.length),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400",
    },
  });
}