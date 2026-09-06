// JAV provider — pluggable adapter.
//
// No reliable free no-key JAV REST API exists (JavDB requires membership,
// JavLibrary has no public API), so the default is MANUAL ENTRY (fully supported
// in the library page). To plug in a scraper/API later, implement `javSearch`
// and return entries shaped like JavHit — nothing else needs to change.
//
// Optional: set JAV_API_BASE to any JSON endpoint and JAV_API_KEY, then override
// javSearch below to call it.

export interface JavHit {
  code: string; // e.g. "SSIS-543"
  title: string;
  actresses: string[];
  studio?: string;
  year?: number;
  tags?: string[];
  posterUrl?: string;
  overview?: string;
}

export async function javSearch(_query: string): Promise<JavHit[]> {
  // TODO(adapter): point at your JAV API/scraper here.
  return [];
}

export const javConfigured = false;