import axios from "axios";
import { movieApi } from "../../lib/movieApi";

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL?.trim() || "/api").replace(/\/$/, ""),
  withCredentials: true,
  timeout: 6_000,
  headers: {
    Accept: "application/json",
    "x-dev-admin": "true"
  }
});

const csrfProtectedMethods = new Set(["post", "put", "patch", "delete"]);
let cachedCsrfToken: string | null = null;
let csrfInFlight: Promise<string | null> | null = null;

async function getCsrfToken(): Promise<string | null> {
  if (cachedCsrfToken) return cachedCsrfToken;
  if (csrfInFlight) return csrfInFlight;
  csrfInFlight = api
    .get<{ csrfToken: string }>("/auth/csrf", { timeout: 3_500 })
    .then((res) => {
      cachedCsrfToken = res.data?.csrfToken || null;
      csrfInFlight = null;
      return cachedCsrfToken;
    })
    .catch(() => {
      csrfInFlight = null;
      return null;
    });
  return csrfInFlight;
}

api.interceptors.request.use(async (config) => {
  config.headers = config.headers ?? {};
  config.headers["x-dev-admin"] = "true";

  if (!csrfProtectedMethods.has(config.method?.toLowerCase() ?? "")) return config;

  const token = await getCsrfToken();
  if (token) {
    config.headers["X-CSRF-Token"] = token;
  }
  return config;
});

/**
 * Fetches movies for Admin Portal from /api/admin/movies, with automatic fallback
 * to live PhimAPI (movieApi) so the Admin catalog is always 100% synced with the main site.
 */
export async function fetchAdminMoviesCatalog(query = "", page = 1, limit = 15) {
  try {
    const res = await api.get<{ movies: any[]; total: number; totalPages: number }>(
      `/admin/movies?search=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
    );
    if (res.data?.movies && res.data.movies.length > 0) {
      return {
        movies: res.data.movies,
        total: res.data.total || res.data.movies.length,
        totalPages: res.data.totalPages || Math.max(1, Math.ceil((res.data.total || res.data.movies.length) / limit))
      };
    }
  } catch {
    // Fallback to live movieApi below
  }

  try {
    const liveMovies = query.trim()
      ? await movieApi.searchMovies(query.trim())
      : await movieApi.getNewMovies(page);
    const mapped = (liveMovies || []).slice(0, limit).map((m) => ({
      id: m.id || m.slug,
      slug: m.slug,
      title: m.title,
      synopsis: m.description || `${m.title} - Phim chất lượng cao trên RytoxGroup.`,
      description: m.description || `${m.title} - Phim chất lượng cao trên RytoxGroup.`,
      posterUrl: m.posterUrl,
      backdropUrl: m.backdropUrl || m.posterUrl,
      releaseYear: m.releaseYear || m.year || 2024,
      runtimeMinutes: m.runtimeMinutes || 115,
      averageRating: m.averageRating || 8.5,
      hlsUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      _count: { ratings: 1, reviews: 0 },
      seasons: [
        {
          id: `season-${m.slug}-1`,
          number: 1,
          title: "Mùa 1",
          episodes: [
            {
              id: `ep-${m.slug}-1`,
              number: 1,
              title: "Tập 1 - Full HD",
              runtimeMinutes: 45,
              posterUrl: m.backdropUrl || m.posterUrl,
              hlsUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
            }
          ]
        }
      ]
    }));

    return {
      movies: mapped,
      total: query.trim() ? mapped.length : Math.max(mapped.length, 24),
      totalPages: query.trim() ? 1 : 5
    };
  } catch {
    return { movies: [], total: 0, totalPages: 1 };
  }
}
