import type { GenreDto, MovieCardDto, PlaybackSourceDto } from "@streamforge/shared-types";
import { APP_DOMAIN_CDN_IMAGE, BASE_URL, MOVIE_API_CACHE_TTL_MS, MOVIE_API_RETRIES, MOVIE_API_TIMEOUT_MS } from "./movieApiConfig";

type OPhimCategory = { id?: string; name?: string; slug?: string };
type OPhimEpisode = { name?: string; slug?: string; filename?: string; link_embed?: string; link_m3u8?: string; link?: string };
type OPhimServer = { server_name?: string; server_data?: OPhimEpisode[] };
type OPhimMovie = Record<string, any> & {
  _id?: string;
  slug?: string;
  name?: string;
  origin_name?: string;
  poster_url?: string;
  thumb_url?: string;
  year?: number | string;
  quality?: string;
  lang?: string;
  episode_current?: string;
  category?: OPhimCategory[];
  country?: OPhimCategory[];
  content?: string;
  time?: string;
};

export type NormalizedMovie = MovieCardDto & {
  name: string;
  origin_name: string;
  poster: string;
  thumb: string;
  year: number;
  quality: string;
  lang: string;
  episode_current: string;
  category: OPhimCategory[];
  country: OPhimCategory[];
  description: string;
  cast: string[];
  director: string;
  tags: string[];
  match?: number;
  reviews?: Array<{ id: string; body: string }>;
  seasons?: Array<{
    id: string;
    title: string;
    episodes: Array<{ id: string; title: string; synopsis: string; runtimeMinutes: number; posterUrl: string; link_m3u8?: string; link_embed?: string; link?: string }>;
  }>;
};

export type MovieRowsResponse = { rows: Array<{ title: string; items: NormalizedMovie[]; ranked?: boolean }> };
export type MovieDetailResponse = { movie: NormalizedMovie; episodes: OPhimServer[] };

type FetchOptions = { timeoutMs?: number; retries?: number; cacheTtlMs?: number };

class MovieApiError extends Error {
  constructor(message: string, public readonly url: string, public readonly status?: number) {
    super(message);
    this.name = "MovieApiError";
  }
}

async function fetchJson<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const url = toUrl(path);
  const cacheKey = `ophim:v2:${url}`;
  const cached = readCache<T>(cacheKey, options.cacheTtlMs ?? MOVIE_API_CACHE_TTL_MS);
  if (cached) return cached;

  const retries = options.retries ?? MOVIE_API_RETRIES;
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? MOVIE_API_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new MovieApiError(`OPhim request failed with ${response.status}`, url, response.status);
      const data = (await response.json()) as T;
      writeCache(cacheKey, data);
      return data;
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await delay(180 * attempt);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new MovieApiError("OPhim request failed", url);
}

export const movieApi = {
  async getNewMovies(page = 1) {
    const data = await fetchJson<any>(`/danh-sach/phim-moi-cap-nhat?page=${page}`);
    return normalizeList(data);
  },

  async getByGenre(slug: string, page = 1) {
    const data = await fetchJson<any>(`/v1/api/the-loai/${encodeURIComponent(slug)}?page=${page}`);
    return normalizeList(data);
  },

  async getByCountry(slug: string, page = 1) {
    const data = await fetchJson<any>(`/v1/api/quoc-gia/${encodeURIComponent(slug)}?page=${page}`);
    return normalizeList(data);
  },

  async getByYear(year: string | number, page = 1) {
    const data = await fetchJson<any>(`/v1/api/nam/${encodeURIComponent(String(year))}?page=${page}`);
    return normalizeList(data);
  },

  async getByList(type: string, page = 1) {
    const data = await fetchJson<any>(`/v1/api/danh-sach/${encodeURIComponent(type)}?page=${page}`);
    return normalizeList(data);
  },

  async searchMovies(keyword: string) {
    const data = await fetchJson<any>(`/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}`);
    return normalizeList(data);
  },

  async getMovieDetail(slug: string): Promise<MovieDetailResponse> {
    const data = await fetchJson<any>(`/phim/${encodeURIComponent(slug)}`);
    const cdn = getCdn(data);
    const episodes = Array.isArray(data?.episodes) ? data.episodes : [];
    return {
      movie: normalizeMovie(data?.movie, cdn, episodes),
      episodes
    };
  },

  async getPlayback(slug: string): Promise<PlaybackSourceDto & { title?: string }> {
    const { movie, episodes } = await this.getMovieDetail(slug);
    const playable = episodes.flatMap((server) => server.server_data ?? []).find((episode) => episode.link_m3u8 || episode.link || episode.link_embed);
    const hlsUrl = playable?.link_m3u8 || playable?.link || playable?.link_embed || movie.trailerUrl || "";
    if (!hlsUrl) throw new MovieApiError("Playback source not available", `/phim/${slug}`);
    return {
      movieId: movie.id,
      title: movie.title,
      hlsUrl,
      dashUrl: "",
      subtitles: [],
      audioTracks: [{ language: "vi", label: "Vietnamese" }],
      introStartSeconds: 0,
      introEndSeconds: 0,
      recapEndSeconds: 0
    };
  },

  async getHomeRows(): Promise<MovieRowsResponse> {
    const [latest, series, single, anime, tvShows, action, korea] = await Promise.allSettled([
      this.getNewMovies(1),
      this.getByList("phim-bo", 1),
      this.getByList("phim-le", 1),
      this.getByList("hoat-hinh", 1),
      this.getByList("tv-shows", 1),
      this.getByGenre("hanh-dong", 1),
      this.getByCountry("han-quoc", 1)
    ]);

    return {
      rows: [
        rowFrom("Phim mới cập nhật", latest),
        rowFrom("Phim bộ", series),
        rowFrom("Phim lẻ", single),
        rowFrom("Hoạt hình", anime),
        rowFrom("TV Shows", tvShows),
        rowFrom("Hành động", action),
        rowFrom("Hàn Quốc", korea)
      ].filter((row) => row.items.length > 0)
    };
  }
};

function normalizeList(data: any): NormalizedMovie[] {
  const cdn = getCdn(data);
  const items = data?.items ?? data?.data?.items ?? data?.movies ?? [];
  return Array.isArray(items) ? items.map((item) => normalizeMovie(item, cdn)) : [];
}

function normalizeMovie(input: OPhimMovie | null | undefined, cdn = APP_DOMAIN_CDN_IMAGE, episodes: OPhimServer[] = []): NormalizedMovie {
  const slug = String(input?.slug ?? input?._id ?? "");
  const name = String(input?.name ?? input?.origin_name ?? "Untitled");
  const originName = String(input?.origin_name ?? name);
  const poster = resolveImage(input?.poster_url, cdn);
  const thumb = resolveImage(input?.thumb_url, cdn) || poster;
  const fallback = createFallbackImage(name);
  const posterUrl = poster || thumb || fallback;
  const backdropUrl = thumb || poster || fallback;
  const categories = Array.isArray(input?.category) ? input.category : [];
  const countries = Array.isArray(input?.country) ? input.country : [];
  const runtimeMinutes = parseRuntime(input?.time);
  const description = stripHtml(input?.content || input?.description || originName);
  const voteAverage = Number(input?.tmdb?.vote_average ?? input?.imdb?.vote_average ?? input?.rating ?? 8);

  return {
    id: slug,
    slug,
    title: name,
    synopsis: description,
    posterUrl,
    backdropUrl,
    trailerUrl: input?.trailer_url || null,
    releaseYear: Number(input?.year || new Date().getFullYear()),
    runtimeMinutes,
    maturityRating: "TV_14",
    averageRating: Number.isFinite(voteAverage) ? voteAverage : 8,
    genres: normalizeGenres(categories),
    name,
    origin_name: originName,
    poster: posterUrl,
    thumb: backdropUrl,
    year: Number(input?.year || new Date().getFullYear()),
    quality: String(input?.quality ?? ""),
    lang: String(input?.lang ?? ""),
    episode_current: String(input?.episode_current ?? ""),
    category: categories,
    country: countries,
    description,
    cast: Array.isArray(input?.actor) ? input.actor.filter(Boolean).map(String) : [],
    director: Array.isArray(input?.director) ? input.director.filter(Boolean).join(", ") : "",
    tags: [...categories, ...countries].map((item) => item.name).filter(Boolean) as string[],
    match: Math.min(99, Math.round((Number.isFinite(voteAverage) ? voteAverage : 8) * 10 + 10)),
    reviews: [],
    seasons: normalizeEpisodes(episodes, { movieSlug: slug, synopsis: description, runtimeMinutes, posterUrl: backdropUrl })
  };
}

function normalizeEpisodes(
  servers: OPhimServer[],
  movie: { movieSlug: string; synopsis: string; runtimeMinutes: number; posterUrl: string }
): NormalizedMovie["seasons"] {
  return servers.map((server, serverIndex) => ({
    id: `${movie.movieSlug}-server-${serverIndex}`,
    title: server.server_name || `Server ${serverIndex + 1}`,
    episodes: (server.server_data ?? []).map((episode, episodeIndex) => ({
      id: `${movie.movieSlug}-${serverIndex}-${episode.slug || episodeIndex}`,
      title: episode.name || `Episode ${episodeIndex + 1}`,
      synopsis: movie.synopsis,
      runtimeMinutes: movie.runtimeMinutes || 45,
      posterUrl: movie.posterUrl,
      link_m3u8: episode.link_m3u8,
      link_embed: episode.link_embed,
      link: episode.link
    }))
  }));
}

function normalizeGenres(categories: OPhimCategory[]): GenreDto[] {
  return categories
    .filter((item) => item?.name)
    .map((item) => ({ id: String(item.id ?? item.slug ?? item.name), name: String(item.name), slug: String(item.slug ?? slugify(item.name)) }));
}

function rowFrom(title: string, result: PromiseSettledResult<NormalizedMovie[]>, ranked = false) {
  return { title, ranked, items: result.status === "fulfilled" ? result.value : [] };
}

function getCdn(data: any) {
  return data?.APP_DOMAIN_CDN_IMAGE ?? data?.data?.APP_DOMAIN_CDN_IMAGE ?? APP_DOMAIN_CDN_IMAGE;
}

function resolveImage(value: unknown, cdn: string) {
  const path = String(value ?? "").trim().replace(/\\/g, "/");
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return encodeURI(path);
  if (path.startsWith("//")) return `https:${path}`;
  const cleanPath = path.replace(/^\//, "");
  const cdnBase = normalizeCdnBase(cdn, cleanPath);
  return encodeURI(`${cdnBase}/${cleanPath}`);
}

function normalizeCdnBase(cdn: string, imagePath: string) {
  const base = String(cdn || APP_DOMAIN_CDN_IMAGE).trim().replace(/\/$/, "");
  const origin = getOrigin(base);
  if (/^uploads\//i.test(imagePath)) return origin;
  if (/\/uploads\/movies$/i.test(base)) return base;
  if (/^https?:\/\/[^/]+$/i.test(base)) return `${base}/uploads/movies`;
  return base;
}

function getOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "https://img.ophim.live";
  }
}

function createFallbackImage(title: string) {
  const safeTitle = escapeXml(title).slice(0, 38);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#1f1f1f"/><stop offset=".55" stop-color="#111"/><stop offset="1" stop-color="#2a0d10"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><rect width="1280" height="720" fill="#000" opacity=".22"/><text x="64" y="590" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-size="54" font-weight="800">${safeTitle}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (char) => {
    const entities: Record<string, string> = { "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;", "'": "&#39;" };
    return entities[char] ?? char;
  });
}

function parseRuntime(value: unknown) {
  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : 45;
}

function stripHtml(value: unknown) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toUrl(path: string) {
  return `${BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function readCache<T>(key: string, ttlMs: number): T | null {
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

function writeCache<T>(key: string, data: T) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ expiresAt: Date.now() + MOVIE_API_CACHE_TTL_MS, data }));
  } catch {
    // Storage can be unavailable in private mode; requests still work without cache.
  }
}

function slugify(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
