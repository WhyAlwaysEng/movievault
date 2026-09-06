// Search normalization utilities (§2 / §8.4 of the plan)

/** "ssis-543", "SSIS 543", "ssis.543" → "SSIS-543" */
export function normalizeJavCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s._]+/g, "-")
    .replace(/[^A-Z0-9-]/g, "");
}

/** Loose JAV-code pattern: 2–6 letters + digits, e.g. SSIS-543, MIDV-212 */
export function isJavCodeLike(query: string): boolean {
  return /^[A-Z0-9]{2,6}-\d{1,5}$/i.test(query.trim());
}

/** Lowercased search tokens for the `searchTokens` array on media docs. */
export function buildSearchTokens(
  title: string,
  altTitles?: { th?: string; ja?: string; en?: string },
  code?: string,
  actors: string[] = [],
): string[] {
  const parts = [title, altTitles?.th, altTitles?.ja, altTitles?.en];
  if (code) parts.push(normalizeJavCode(code));
  parts.push(...actors);
  return Array.from(new Set(parts.filter(Boolean).map((p) => p!.toLowerCase())));
}

export function formatYear(year?: number): string {
  return year ? String(year) : "";
}