/**
 * Lightweight, zero-dependency In-Memory LRU/TTL Cache for MovieVault.
 * Ideal for Orange Pi / Node.js servers to drastically cut SQLite subquery load.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private maxEntries: number;
  private hits = 0;
  private misses = 0;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }

    // Refresh LRU order (delete & re-insert)
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds = 60): void {
    if (this.store.size >= this.maxEntries) {
      // Evict oldest entry (first item in Map)
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Invalidate all keys starting with the given prefix (e.g. "media:" or "actress:").
   */
  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.store.clear();
  }

  stats(): { size: number; maxEntries: number; hits: number; misses: number; hitRate: string } {
    const total = this.hits + this.misses;
    const rate = total > 0 ? ((this.hits / total) * 100).toFixed(1) + "%" : "0%";
    return {
      size: this.store.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
      hitRate: rate,
    };
  }
}

// Global shared cache instance for server routes
export const serverCache = new MemoryCache(500);

/**
 * Cache helper wrapper: fetches or computes value if not in cache.
 */
export async function cachedAsync<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T> | T,
): Promise<T> {
  const cached = serverCache.get<T>(key);
  if (cached !== undefined) {
    return cached;
  }

  const result = await fetcher();
  serverCache.set(key, result, ttlSeconds);
  return result;
}
