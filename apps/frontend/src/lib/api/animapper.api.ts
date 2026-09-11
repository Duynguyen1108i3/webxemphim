import type { NormalizedMovie, MovieRowsResponse } from "./types";
import { readCache, writeCache } from "./cache";
import { createFallbackImage, proxyImageUrl, slugify } from "./imageProxy";
import { MOVIE_API_CACHE_TTL_MS } from "../movieApiConfig";

export function getAnimeRootTitle(title: string): string {
  let cleaned = title
    .replace(/Season\s+\d+/gi, "")
    .replace(/Final\s+Season/gi, "")
    .replace(/Part\s+\d+/gi, "")
    .replace(/THE\s+FINAL\s+CHAPTERS/gi, "")
    .replace(/Special\s+\d+/gi, "");

  const parts = cleaned.split(/[:\-\(\)]/);
  if (parts.length > 0) {
    const firstPart = parts[0].trim();
    if (firstPart.length >= 4) {
      cleaned = firstPart;
    }
  }

  return cleaned.replace(/\s+/g, " ").trim();
}

export function cleanSeasonTitle(title: string, rootTitle: string, index: number): string {
  let cleaned = title
    .replace(new RegExp(rootTitle, "gi"), "")
    .replace(/Kimetsu no Yaiba/gi, "")
    .replace(/[:\-\(\)]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.toLowerCase() === "tv" || cleaned.toLowerCase() === "ona") {
    return `Season ${index + 1}`;
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function normalizeAniMapperMovie(item: any, isDetail = false): NormalizedMovie {
  if (!item) return null as any;
  
  const title = item.titles?.en || item.titles?.["ja-ro"] || item.titles?.ja || "Untitled Anime";
  const originName = item.titles?.ja || title;
  const id = String(item.id || "");
  
  const rawPoster = item.images?.coverXl || item.images?.coverLg || item.images?.coverMd || "";
  const rawBackdrop = item.images?.bannerUrl || rawPoster;
  const posterUrl = rawPoster ? proxyImageUrl(rawPoster) : createFallbackImage(title);
  const backdropUrl = rawBackdrop ? proxyImageUrl(rawBackdrop) : posterUrl;
  
  const year = item.seasonYear || new Date().getFullYear();
  const rating = 8.5;

  return {
    id,
    slug: id,
    title,
    synopsis: item.descriptions?.en || "",
    posterUrl,
    backdropUrl,
    trailerUrl: item.trailer?.trailerId ? `https://www.youtube.com/watch?v=${item.trailer.trailerId}` : null,
    releaseYear: year,
    runtimeMinutes: item.unitDurationMin || 24,
    maturityRating: "PG_13",
    averageRating: rating,
    genres: Array.isArray(item.genres) 
      ? item.genres.map((g: any) => ({ id: String(g.id || g.name), name: g.name, slug: slugify(g.name) }))
      : [],
    name: title,
    origin_name: originName,
    poster: posterUrl,
    thumb: backdropUrl,
    year,
    quality: "HD",
    lang: "ja",
    episode_current: item.format || "TV",
    category: [],
    country: [{ id: "JP", name: "Japan", slug: "japan" }],
    description: item.descriptions?.en || "",
    cast: [],
    director: "",
    tags: [],
    match: 95,
    reviews: [],
    seasons: [],
    imdbId: "",
    tmdbId: id,
    mediaType: "tv"
  };
}

export async function getAnimeRows(page = 1): Promise<MovieRowsResponse> {
  try {
    const cacheKey = `streamforge:anime-rows:p${page}`;
    const cached = readCache<MovieRowsResponse>(cacheKey, MOVIE_API_CACHE_TTL_MS);
    if (cached) return cached;

    // 1. Fetch latest anime list
    const listRes = await fetch(`https://api.animapper.net/api/v1/search?title=&mediaType=ANIME&limit=40&offset=${(page - 1) * 40}`);
    if (!listRes.ok) throw new Error("AniMapper list query failed");
    const listData = await listRes.json();
    const rawList = listData.results || [];
    
    const normalizedAll = rawList.map((item: any) => normalizeAniMapperMovie(item)).filter(Boolean);
    
    const series = normalizedAll.filter((item: NormalizedMovie) => item.episode_current !== "MOVIE");
    const movies = normalizedAll.filter((item: NormalizedMovie) => item.episode_current === "MOVIE");
    
    // 2. Fetch popular curated list
    const popularTitles = ["One Piece", "Kimetsu no Yaiba", "Conan", "Spy x Family", "Naruto", "Jujutsu Kaisen", "Frieren", "Chainsaw Man"];
    const popularPromises = popularTitles.map(title => 
      fetch(`https://api.animapper.net/api/v1/search?title=${encodeURIComponent(title)}&mediaType=ANIME&limit=1`)
        .then(res => res.json())
        .then(data => data.results?.[0] || null)
        .catch(() => null)
    );
    const popularResults = await Promise.all(popularPromises);
    const popularNormalized = popularResults
      .filter(Boolean)
      .map(item => normalizeAniMapperMovie(item))
      .filter(Boolean);
      
    const response: MovieRowsResponse = {
      rows: [
        { title: "Anime Đang Thịnh Hành", items: popularNormalized },
        { title: "Phim Bộ Anime Mới Cập Nhật", items: series },
        { title: "Phim Lẻ Anime Đặc Sắc", items: movies }
      ].filter(r => r.items.length > 0)
    };
    
    writeCache(cacheKey, response);
    return response;
  } catch (e) {
    console.error("Failed to load anime rows:", e);
    return { rows: [] };
  }
}
