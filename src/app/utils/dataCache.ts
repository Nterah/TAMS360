/**
 * Simple localStorage-backed cache with TTL.
 * Returns cached data immediately; caller can refresh in background.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export function getCacheEntry<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`cache_${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > entry.ttl) {
      localStorage.removeItem(`cache_${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCacheEntry<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl: ttlMs };
    localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
  } catch { /* storage quota */ }
}

export function invalidateCache(key: string): void {
  localStorage.removeItem(`cache_${key}`);
}

export function invalidateCachePrefix(prefix: string): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(`cache_${prefix}`))
    .forEach((k) => localStorage.removeItem(k));
}

/**
 * Load data with stale-while-revalidate:
 * 1. Immediately returns cached data (if available) via onData callback
 * 2. Always fetches fresh data in background and calls onData again with updated result
 * 3. Caches the fresh result for next time
 */
export async function loadWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  onData: (data: T, fromCache: boolean) => void,
  ttlMs = DEFAULT_TTL_MS
): Promise<void> {
  const cached = getCacheEntry<T>(key);
  if (cached !== null) {
    onData(cached, true);
  }
  try {
    const fresh = await fetcher();
    setCacheEntry(key, fresh, ttlMs);
    onData(fresh, false);
  } catch (e) {
    // If fetch fails but we served cache, that's fine
    if (cached === null) throw e;
  }
}
