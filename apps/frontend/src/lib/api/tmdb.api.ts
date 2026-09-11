import type { NormalizedMovie, FetchOptions } from "./types";
import { readCache, writeCache } from "./cache";
import { createFallbackImage, slugify } from "./imageProxy";
import { MOVIE_API_CACHE_TTL_MS, MOVIE_API_TIMEOUT_MS } from "../movieApiConfig";

export const getTmdbApiKey = () => {
  return localStorage.getItem("streamforge:settings:tmdb_key") || import.meta.env.VITE_TMDB_API_KEY || "";
};

export const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export async function fetchTmdb<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const key = getTmdbApiKey();
  const separator = path.includes("?") ? "&" : "?";
  const url = `${TMDB_BASE_URL}/${path.replace(/^\//, "")}${separator}api_key=${key}&language=vi-VN`;
  const cacheKey = `tmdb:v3:${url}`;

  const cached = readCache<T>(cacheKey, options.cacheTtlMs ?? MOVIE_API_CACHE_TTL_MS);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? MOVIE_API_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      const enUrl = `${TMDB_BASE_URL}/${path.replace(/^\//, "")}${separator}api_key=${key}&language=en-US`;
      const enResponse = await fetch(enUrl, { signal: controller.signal });
      if (!enResponse.ok) {
        throw new Error(`TMDB API call failed: ${response.status}`);
      }
      const data = (await enResponse.json()) as T;
      writeCache(cacheKey, data);
      return data;
    }
    const data = (await response.json()) as T;
    writeCache(cacheKey, data);
    return data;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function normalizeList(results: any[], forceType?: "movie" | "tv"): NormalizedMovie[] {
  if (!Array.isArray(results)) return [];
  return results
    .map((item) => {
      const mediaType = forceType || item.media_type || (item.first_air_date ? "tv" : "movie");
      return normalizeMovie(item, mediaType);
    })
    .filter(Boolean) as NormalizedMovie[];
}

export function normalizeMovie(input: any, mediaType: "movie" | "tv", seasonsList: any[] = []): NormalizedMovie {
  const id = String(input?.id || "");
  const title = input?.title || input?.name || "Untitled";
  const originName = input?.original_title || input?.original_name || title;
  
  const posterPath = input?.poster_path;
  const backdropPath = input?.backdrop_path;
  const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : createFallbackImage(title);
  const backdropUrl = backdropPath ? `https://image.tmdb.org/t/p/original${backdropPath}` : posterUrl;
  
  const dateStr = input?.release_date || input?.first_air_date || "";
  const year = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
  
  const voteAverage = input?.vote_average || 8;
  const imdbId = input?.external_ids?.imdb_id || input?.imdb_id || "";

  const seasons = seasonsList.map((season: any) => ({
    id: `${id}-season-${season.season_number}`,
    title: season.name || `Season ${season.season_number}`,
    episodes: (season.episodes || []).map((ep: any) => ({
      id: `${id}-ep-${season.season_number}-${ep.episode_number}`,
      title: ep.name || `Episode ${ep.episode_number}`,
      synopsis: ep.overview || "",
      runtimeMinutes: ep.runtime || 45,
      posterUrl: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : backdropUrl,
      seasonNumber: season.season_number,
      episodeNumber: ep.episode_number
    }))
  }));

  const genres = Array.isArray(input?.genres) 
    ? input.genres.map((g: any) => ({ id: String(g.id), name: g.name, slug: slugify(g.name) }))
    : [];

  return {
    id,
    slug: id,
    title,
    synopsis: input?.overview || "",
    posterUrl,
    backdropUrl,
    trailerUrl: input?.videos?.results?.[0]?.key ? `https://www.youtube.com/watch?v=${input.videos.results[0].key}` : null,
    releaseYear: year,
    runtimeMinutes: input?.runtime || 45,
    maturityRating: "PG_13",
    averageRating: voteAverage,
    genres,
    name: title,
    origin_name: originName,
    poster: posterUrl,
    thumb: backdropUrl,
    year,
    quality: "4K Ultra HD",
    lang: input?.original_language || "en",
    episode_current: mediaType === "tv" ? "TV Series" : "Movie",
    category: genres,
    country: Array.isArray(input?.origin_country) ? input.origin_country.map((c: string) => ({ id: c, name: c, slug: c })) : [],
    description: input?.overview || "",
    cast: Array.isArray(input?.credits?.cast) ? input.credits.cast.slice(0, 5).map((c: any) => c.name) : [],
    director: Array.isArray(input?.credits?.crew) 
      ? input.credits.crew.filter((c: any) => c.job === "Director").map((c: any) => c.name).join(", ") 
      : "",
    tags: genres.map((g: any) => g.name),
    match: Math.min(99, Math.round(voteAverage * 10)),
    reviews: [],
    seasons,
    imdbId,
    tmdbId: id,
    mediaType
  };
}
