import { NextRequest, NextResponse } from "next/server";
import { scrapeJavDb } from "@/lib/providers/javdb";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ ok: false, error: "query required" }, { status: 400 });
  }

  try {
    const item = await scrapeJavDb(q);
    return NextResponse.json({ ok: true, result: item });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
