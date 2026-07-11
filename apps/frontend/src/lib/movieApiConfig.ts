export const BASE_URL = "https://ophim1.com";
// Fallback for Phim4K v1 endpoints. Their payload normally includes this
// value as `APP_DOMAIN_CDN_IMAGE`; it is kept here for detail responses and
// for a safe fallback when that metadata is absent.
export const APP_DOMAIN_CDN_IMAGE = "https://free1.phim4k.dpdns.org/img";
export const MOVIE_API_CACHE_TTL_MS = 5 * 60 * 1000;
export const MOVIE_API_TIMEOUT_MS = 10_000;
export const MOVIE_API_RETRIES = 3;
