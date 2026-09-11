import type { NormalizedMovie } from "./types";
import { createFallbackImage, normalizePhim4kImageUrl } from "./imageProxy";

export function normalizePhim4kList(items: any[], imageCdnUrl?: unknown): NormalizedMovie[] {
  if (!Array.isArray(items)) return [];
  return items.map(item => normalizePhim4kMovie(item, false, imageCdnUrl)).filter(Boolean) as NormalizedMovie[];
}

export function normalizePhim4kMovie(item: any, isDetail = false, imageCdnUrl?: unknown): NormalizedMovie {
  if (!item) return null as any;
  const title = item.name || item.origin_name || "Untitled";
  const slug = item.slug || "";
  const posterUrl = normalizePhim4kImageUrl(item.poster_url || item.poster || item.image, imageCdnUrl) || createFallbackImage(title);
  const thumbUrl = normalizePhim4kImageUrl(item.thumb_url || item.backdrop_url || item.backdrop, imageCdnUrl);
  const backdropUrl = thumbUrl || posterUrl;
  const year = item.year || new Date().getFullYear();
  const rating = item.imdb?.vote_average ? parseFloat(item.imdb.vote_average) : 8.0;
  const parsedRuntime = item.time ? (parseInt(item.time.match(/\d+/)?.[0] || "45", 10)) : 45;

  let seasons: any[] = [];
  if (Array.isArray(item.episodes)) {
    const seasonsMap: Record<number, any[]> = {};
    item.episodes.forEach((server: any) => {
      const serverData = server.server_data || [];
      serverData.forEach((ep: any, idx: number) => {
        const season = 1;
        if (!seasonsMap[season]) seasonsMap[season] = [];
        if (!seasonsMap[season].some(existing => existing.episodeNumber === idx + 1)) {
          seasonsMap[season].push({
            id: ep.slug || `${slug}-ep-${idx + 1}`,
            title: ep.name || `Tập ${idx + 1}`,
            synopsis: item.content || item.description || "",
            runtimeMinutes: parsedRuntime,
            posterUrl: backdropUrl,
            seasonNumber: season,
            episodeNumber: idx + 1
          });
        }
      });
    });

    seasons = Object.keys(seasonsMap).map((seasonNumStr) => {
      const seasonNum = parseInt(seasonNumStr);
      return {
        id: `${slug}-season-${seasonNum}`,
        title: `Mùa ${seasonNum}`,
        episodes: seasonsMap[seasonNum].sort((a, b) => a.episodeNumber - b.episodeNumber)
      };
    });
  }

  return {
    id: slug,
    slug: slug,
    title,
    synopsis: item.content || item.description || "",
    posterUrl,
    backdropUrl,
    trailerUrl: null,
    releaseYear: year,
    runtimeMinutes: parsedRuntime,
    maturityRating: "PG_13",
    averageRating: rating,
    genres: Array.isArray(item.category) ? item.category.map((g: any) => ({ id: g.slug || g.name, name: g.name, slug: g.slug })) : [],
    name: item.name || title,
    origin_name: item.origin_name || title,
    poster: posterUrl,
    thumb: backdropUrl,
    year,
    quality: item.quality || "FHD",
    lang: item.lang || "Vietsub",
    episode_current: item.episode_current || "",
    category: Array.isArray(item.category) ? item.category : [],
    country: Array.isArray(item.country) ? item.country : [],
    description: item.content || item.description || "",
    cast: Array.isArray(item.actor) 
      ? item.actor.filter(Boolean) 
      : (typeof item.actor === "string" ? item.actor.split(",").map((s: string) => s.trim()).filter(Boolean) : []),
    director: Array.isArray(item.director) 
      ? item.director.filter(Boolean).join(", ") 
      : (typeof item.director === "string" ? item.director : ""),
    tags: Array.isArray(item.category) ? item.category.map((g: any) => g.name) : [],
    match: Math.round(rating * 10),
    reviews: [],
    seasons,
    imdbId: item.imdb?.id || "",
    tmdbId: item.tmdb?.id || "",
    mediaType: item.type === "series" ? "tv" : "movie"
  };
}
