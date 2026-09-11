import { MOVIE_API_CACHE_TTL_MS } from "../movieApiConfig";

export function readCache<T>(key: string, ttlMs = MOVIE_API_CACHE_TTL_MS): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expiresAt: number; data: T };
    if (Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T, ttlMs = MOVIE_API_CACHE_TTL_MS) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ expiresAt: Date.now() + ttlMs, data }));
  } catch {
    // Ignore storage quota errors
  }
}
