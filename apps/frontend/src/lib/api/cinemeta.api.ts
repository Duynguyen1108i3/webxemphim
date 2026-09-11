import type { NormalizedMovie, FetchOptions } from "./types";
import { readCache, writeCache } from "./cache";
import { createFallbackImage, slugify } from "./imageProxy";
import { MOVIE_API_CACHE_TTL_MS, MOVIE_API_TIMEOUT_MS } from "../movieApiConfig";

export async function fetchCinemeta<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const url = `https://v3-cinemeta.strem.io/${path.replace(/^\//, "")}`;
  const cacheKey = `cinemeta:${url}`;

  const cached = readCache<T>(cacheKey, options.cacheTtlMs ?? MOVIE_API_CACHE_TTL_MS);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? MOVIE_API_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("Cinemeta request failed");
    const data = (await response.json()) as T;
    writeCache(cacheKey, data);
    return data;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function normalizeCinemetaList(metas: any[]): NormalizedMovie[] {
  if (!Array.isArray(metas)) return [];
  return metas.map(normalizeCinemetaMovie).filter(Boolean) as NormalizedMovie[];
}

export function normalizeCinemetaMovie(item: any): NormalizedMovie {
  const id = String(item.id || item.imdb_id || "");
  const title = item.name || "Untitled";
  const posterUrl = item.poster || createFallbackImage(title);
  const backdropUrl = item.background || posterUrl;
  const year = item.releaseInfo ? parseInt(item.releaseInfo) : new Date().getFullYear();
  const rating = item.imdbRating ? parseFloat(item.imdbRating) : 8.0;

  const seasons = Array.isArray(item.videos) ? normalizeCinemetaEpisodes(item.videos, id, item.description || "") : [];

  return {
    id,
    slug: id,
    title,
    synopsis: item.description || "",
    posterUrl,
    backdropUrl,
    trailerUrl: null,
    releaseYear: year,
    runtimeMinutes: item.runtime ? parseInt(String(item.runtime).match(/\d+/)?.[0] || "45", 10) : 45,
    maturityRating: "PG_13",
    averageRating: rating,
    genres: Array.isArray(item.genres) ? item.genres.map((g: string) => ({ id: g, name: g, slug: slugify(g) })) : [],
    name: title,
    origin_name: title,
    poster: posterUrl,
    thumb: backdropUrl,
    year,
    quality: "4K Ultra HD",
    lang: "en",
    episode_current: item.type === "series" ? "TV Series" : "Movie",
    category: [],
    country: [],
    description: item.description || "",
    cast: [],
    director: "",
    tags: Array.isArray(item.genres) ? item.genres : [],
    match: Math.round(rating * 10),
    reviews: [],
    seasons,
    imdbId: id,
    tmdbId: "",
    mediaType: item.type === "series" || item.type === "show" ? "tv" : "movie"
  };
}

export function normalizeCinemetaEpisodes(videos: any[], movieSlug: string, synopsis: string): any[] {
  const seasonsMap: Record<number, any[]> = {};
  videos.forEach((video) => {
    const season = video.season || 1;
    if (!seasonsMap[season]) seasonsMap[season] = [];
    seasonsMap[season].push({
      id: video.id || `${movieSlug}-ep-${season}-${video.episode || video.number || 1}`,
      title: video.title || `Episode ${video.episode || video.number || 1}`,
      synopsis: synopsis,
      runtimeMinutes: video.runtime ? parseInt(String(video.runtime).match(/\d+/)?.[0] || "45", 10) : 45,
      posterUrl: video.thumbnail || "",
      seasonNumber: season,
      episodeNumber: video.episode || video.number || 1
    });
  });

  return Object.keys(seasonsMap).map((seasonNumStr) => {
    const seasonNum = parseInt(seasonNumStr);
    return {
      id: `${movieSlug}-season-${seasonNum}`,
      title: `Season ${seasonNum}`,
      episodes: seasonsMap[seasonNum].sort((a, b) => a.episodeNumber - b.episodeNumber)
    };
  });
}
