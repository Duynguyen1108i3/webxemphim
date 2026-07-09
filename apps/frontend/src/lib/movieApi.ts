import type { GenreDto, MovieCardDto, PlaybackSourceDto } from "@streamforge/shared-types";
import { MOVIE_API_CACHE_TTL_MS, MOVIE_API_TIMEOUT_MS } from "./movieApiConfig";

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || "9a12c85d77f24523de7e112d7c189b4b";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export type NormalizedMovie = MovieCardDto & {
  name: string;
  origin_name: string;
  poster: string;
  thumb: string;
  year: number;
  quality: string;
  lang: string;
  episode_current: string;
  category: Array<{ id?: string; name?: string; slug?: string }>;
  country: Array<{ id?: string; name?: string; slug?: string }>;
  description: string;
  cast: string[];
  director: string;
  tags: string[];
  match?: number;
  reviews?: Array<{ id: string; body: string }>;
  seasons?: Array<{
    id: string;
    title: string;
    episodes: Array<{
      id: string;
      title: string;
      synopsis: string;
      runtimeMinutes: number;
      posterUrl: string;
      seasonNumber: number;
      episodeNumber: number;
    }>;
  }>;
  imdbId?: string;
  tmdbId?: string;
  mediaType?: "movie" | "tv";
};

export type MovieRowsResponse = { rows: Array<{ title: string; items: NormalizedMovie[]; ranked?: boolean }> };
export type MovieDetailResponse = { movie: NormalizedMovie; episodes: any[] };

type FetchOptions = { timeoutMs?: number; cacheTtlMs?: number };

async function fetchJson<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${TMDB_BASE_URL}/${path.replace(/^\//, "")}${separator}api_key=${TMDB_API_KEY}&language=vi-VN`;
  const cacheKey = `tmdb:v3:${url}`;

  // Read cache
  const cached = readCache<T>(cacheKey, options.cacheTtlMs ?? MOVIE_API_CACHE_TTL_MS);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? MOVIE_API_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      // If vietnamese failed, fallback to english
      const enUrl = `${TMDB_BASE_URL}/${path.replace(/^\//, "")}${separator}api_key=${TMDB_API_KEY}&language=en-US`;
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

export const movieApi = {
  async getNewMovies(page = 1) {
    const data = await fetchJson<any>(`/trending/all/day?page=${page}`);
    return normalizeList(data?.results || []);
  },

  async getByGenre(slug: string, page = 1) {
    // Map common Vietnamese OPhim genres slugs to TMDB IDs
    const genreMap: Record<string, number> = {
      "hanh-dong": 28,
      "vien-tuong": 878,
      "kinh-di": 27,
      "hai-huoc": 35,
      "tinh-cam": 10749,
      "phieu-luu": 12,
      "hoat-hinh": 16,
      "hinh-su": 80,
      "tai-lieu": 99,
      "gia-dinh": 10751,
      "gia-tuong": 14,
      "lich-su": 36,
      "am-nhac": 10402,
      "bi-an": 9648,
      "chien-tranh": 10752
    };
    const genreId = genreMap[slug] || 28;
    const data = await fetchJson<any>(`/discover/movie?with_genres=${genreId}&sort_by=popularity.desc&page=${page}`);
    return normalizeList(data?.results || []);
  },

  async getByCountry(slug: string, page = 1) {
    // Map country codes
    const countryMap: Record<string, string> = {
      "au-my": "US,GB,FR,DE",
      "han-quoc": "KR",
      "trung-quoc": "CN",
      "nhat-ban": "JP",
      "thai-lan": "TH",
      "hong-kong": "HK",
      "dai-loan": "TW",
      "viet-nam": "VN"
    };
    const region = countryMap[slug] || "US";
    const data = await fetchJson<any>(`/discover/movie?with_origin_country=${region}&sort_by=popularity.desc&page=${page}`);
    return normalizeList(data?.results || []);
  },

  async getByYear(year: string | number, page = 1) {
    const data = await fetchJson<any>(`/discover/movie?primary_release_year=${year}&sort_by=popularity.desc&page=${page}`);
    return normalizeList(data?.results || []);
  },

  async getByList(type: string, page = 1) {
    if (type === "phim-bo") {
      const data = await fetchJson<any>(`/discover/tv?sort_by=popularity.desc&page=${page}`);
      return normalizeList(data?.results || [], "tv");
    } else if (type === "phim-le") {
      const data = await fetchJson<any>(`/discover/movie?sort_by=popularity.desc&page=${page}`);
      return normalizeList(data?.results || [], "movie");
    } else if (type === "hoat-hinh") {
      // Anime list (Japanese animation genre 16)
      const data = await fetchJson<any>(`/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${page}`);
      return normalizeList(data?.results || [], "tv");
    } else if (type === "tv-shows") {
      const data = await fetchJson<any>(`/discover/tv?with_genres=10764&sort_by=popularity.desc&page=${page}`);
      return normalizeList(data?.results || [], "tv");
    }
    const data = await fetchJson<any>(`/trending/all/day?page=${page}`);
    return normalizeList(data?.results || []);
  },

  async searchMovies(keyword: string) {
    const data = await fetchJson<any>(`/search/multi?query=${encodeURIComponent(keyword)}`);
    return normalizeList(data?.results || []);
  },

  async getMovieDetail(slug: string): Promise<MovieDetailResponse> {
    // Determine type by trying movie first, then falling back to tv show
    let rawMovie: any = null;
    let mediaType: "movie" | "tv" = "movie";

    try {
      rawMovie = await fetchJson<any>(`/movie/${slug}?append_to_response=external_ids,videos,credits`);
      mediaType = "movie";
    } catch {
      try {
        rawMovie = await fetchJson<any>(`/tv/${slug}?append_to_response=external_ids,videos,credits`);
        mediaType = "tv";
      } catch (e) {
        throw new Error(`Failed to load details for TMDB ID: ${slug}`);
      }
    }

    // Build seasons & episodes if series
    const seasonsList: any[] = [];
    if (mediaType === "tv" && Array.isArray(rawMovie?.seasons)) {
      // Populate first season or two to limit requests
      const validSeasons = rawMovie.seasons.filter((s: any) => s.season_number > 0).slice(0, 3);
      for (const season of validSeasons) {
        try {
          const seasonData = await fetchJson<any>(`/tv/${slug}/season/${season.season_number}`);
          seasonsList.push(seasonData);
        } catch {
          // Ignore failed season loads
        }
      }
    }

    const movie = normalizeMovie(rawMovie, mediaType, seasonsList);
    return {
      movie,
      episodes: seasonsList
    };
  },

  async getPlayback(slug: string, episodeId?: string | null): Promise<PlaybackSourceDto & { title?: string; currentEpisodeId?: string; episodesList?: any[] }> {
    const { movie } = await this.getMovieDetail(slug);
    const mediaType = movie.mediaType || "movie";
    const tmdbId = movie.id;
    const imdbId = movie.imdbId || "";

    // Parse requested episode
    let selectedSeason = 1;
    let selectedEpisode = 1;
    let selectedEpisodeId = "";
    let episodeTitle = "";

    const seasons = movie.seasons || [];
    const allEpisodes: any[] = [];

    seasons.forEach((s: any) => {
      s.episodes.forEach((ep: any) => {
        allEpisodes.push({
          id: ep.id,
          title: ep.title,
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber
        });
      });
    });

    if (mediaType === "tv" && allEpisodes.length > 0) {
      let epObj = allEpisodes.find((ep) => ep.id === episodeId);
      if (!epObj) {
        epObj = allEpisodes[0];
      }
      selectedSeason = epObj.seasonNumber;
      selectedEpisode = epObj.episodeNumber;
      selectedEpisodeId = epObj.id;
      episodeTitle = ` - S${selectedSeason}E${selectedEpisode} - ${epObj.title}`;
    }

    // Look for stream URLs from installed Stremio Addons in local storage
    let selectedStreamUrl = "";
    let streamTitle = `${movie.title}${episodeTitle}`;
    
    try {
      const installedStr = localStorage.getItem("streamforge:addons:installed");
      const installedAddonsList = installedStr ? JSON.parse(installedStr) : [];
      
      // Filter stream addons (AIOStreams, Torrentio, Comet)
      const streamAddons = (addonsData as any[]).filter(addon => 
        installedAddonsList.includes(addon.id) && 
        (addon.category === "Torrent" || addon.category === "Movies" || addon.category === "Debrid")
      );

      // Query manifest URLs for streams
      for (const addon of streamAddons) {
        const rootUrl = addon.manifestUrl.replace("/manifest.json", "");
        const queryId = mediaType === "movie" ? imdbId : `${imdbId}:${selectedSeason}:${selectedEpisode}`;
        
        if (queryId) {
          const streamEndpoint = `${rootUrl}/stream/${mediaType}/${encodeURIComponent(queryId)}.json`;
          try {
            const res = await fetch(streamEndpoint);
            if (res.ok) {
              const resData = await res.json();
              const streamsList = resData?.streams || [];
              
              // Find a clean HTTP stream (from Debrid) or fallback to first stream
              const cleanHttpStream = streamsList.find((s: any) => s.url && s.url.startsWith("http") && !s.url.includes(".mkv"));
              if (cleanHttpStream) {
                selectedStreamUrl = cleanHttpStream.url;
                if (cleanHttpStream.title) {
                  streamTitle = `${movie.title} [${addon.name}] - ${cleanHttpStream.title.split("\n")[0]}`;
                }
                break;
              }
            }
          } catch (e) {
            // Ignore addon errors
          }
        }
      }
    } catch (e) {
      console.error("Addon stream resolve failed:", e);
    }

    // Default Embed Player fallback if no streams are found
    if (!selectedStreamUrl) {
      if (mediaType === "movie") {
        selectedStreamUrl = `https://embed.su/embed/movie/${tmdbId}`;
      } else {
        selectedStreamUrl = `https://embed.su/embed/tv/${tmdbId}/${selectedSeason}/${selectedEpisode}`;
      }
    }

    // Fetch subtitle tracks from installed subtitle addons
    const subtitlesList: any[] = [];
    try {
      const installedStr = localStorage.getItem("streamforge:addons:installed");
      const installedAddonsList = installedStr ? JSON.parse(installedStr) : [];
      const subtitleAddons = (addonsData as any[]).filter(addon => 
        installedAddonsList.includes(addon.id) && addon.category === "Subtitle"
      );

      for (const addon of subtitleAddons) {
        const rootUrl = addon.manifestUrl.replace("/manifest.json", "");
        const queryId = mediaType === "movie" ? imdbId : `${imdbId}:${selectedSeason}:${selectedEpisode}`;
        if (queryId) {
          const subEndpoint = `${rootUrl}/subtitles/${mediaType}/${encodeURIComponent(queryId)}.json`;
          try {
            const res = await fetch(subEndpoint);
            if (res.ok) {
              const resData = await res.json();
              const subs = resData?.subtitles || [];
              subs.forEach((sub: any) => {
                subtitlesList.push({
                  language: sub.lang || "en",
                  label: sub.label || sub.lang || "Subtitle",
                  url: sub.url
                });
              });
            }
          } catch {
            // Ignore
          }
        }
      }
    } catch {
      // Ignore
    }

    return {
      movieId: movie.id,
      title: streamTitle,
      hlsUrl: selectedStreamUrl, // VideoPlayer embeds this if iframe URL
      dashUrl: "",
      subtitles: subtitlesList,
      audioTracks: [{ language: "en", label: "English" }],
      introStartSeconds: 0,
      introEndSeconds: 0,
      recapEndSeconds: 0,
      currentEpisodeId: selectedEpisodeId,
      episodesList: allEpisodes,
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
        rowFrom("Phim thịnh hành trong ngày", latest),
        rowFrom("Phim bộ trực tuyến", series),
        rowFrom("Phim lẻ chọn lọc", single),
        rowFrom("Hoạt hình Nhật (Anime)", anime),
        rowFrom("TV Shows đặc sắc", tvShows),
        rowFrom("Phim hành động kịch tính", action),
        rowFrom("Phim bộ Hàn Quốc (K-Dramas)", korea)
      ].filter((row) => row.items.length > 0)
    };
  }
};

// Seed Addons Data fallback for local require
import addonsData from "../data/addons.json";

function normalizeList(results: any[], forceType?: "movie" | "tv"): NormalizedMovie[] {
  if (!Array.isArray(results)) return [];
  return results
    .map((item) => {
      const mediaType = forceType || item.media_type || (item.first_air_date ? "tv" : "movie");
      return normalizeMovie(item, mediaType);
    })
    .filter(Boolean) as NormalizedMovie[];
}

function normalizeMovie(input: any, mediaType: "movie" | "tv", seasonsList: any[] = []): NormalizedMovie {
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

  // Map seasons
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

function rowFrom(title: string, result: PromiseSettledResult<NormalizedMovie[]>, ranked = false) {
  return { title, ranked, items: result.status === "fulfilled" ? result.value : [] };
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
    // Storage can be unavailable in private mode
  }
}

function slugify(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
