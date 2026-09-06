/**
 * Subtitle utility to convert SubRip (.srt) to WebVTT (.vtt) format in-browser,
 * and create object URLs for HTML5 <track> elements.
 */

export function parseSrtToVtt(srtContent: string): string {
  // Normalize newlines
  let vtt = srtContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Strip byte order mark (BOM) if present
  if (vtt.charCodeAt(0) === 0xfeff) {
    vtt = vtt.slice(1);
  }

  // Convert SRT timestamp format (00:01:23,456) to WebVTT format (00:01:23.456)
  vtt = vtt.replace(
    /(\d{2}:\d{2}:\d{2}),(\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}),(\d{3})/g,
    "$1.$2 --> $3.$4",
  );

  // Ensure header starts with WEBVTT
  if (!vtt.startsWith("WEBVTT")) {
    vtt = `WEBVTT\n\n${vtt}`;
  }

  return vtt;
}

export async function fileToVttUrl(file: File): Promise<string> {
  const text = await file.text();
  const isSrt = file.name.toLowerCase().endsWith(".srt");
  const vttText = isSrt ? parseSrtToVtt(text) : text;
  const blob = new Blob([vttText], { type: "text/vtt" });
  return URL.createObjectURL(blob);
}
