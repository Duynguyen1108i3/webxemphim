import type { GenreDto, MovieCardDto, PlaybackSourceDto } from "@streamforge/shared-types";
import { MOVIE_API_CACHE_TTL_MS, MOVIE_API_TIMEOUT_MS } from "./movieApiConfig";

const getTmdbApiKey = () => {
  return localStorage.getItem("streamforge:settings:tmdb_key") || import.meta.env.VITE_TMDB_API_KEY || "";
};
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

// Helper to query TMDB
async function fetchTmdb<T>(path: string, options: FetchOptions = {}): Promise<T> {
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

// Helper to query Cinemeta
async function fetchCinemeta<T>(path: string, options: FetchOptions = {}): Promise<T> {
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

export const movieApi = {
  async getNewMovies(page = 1) {
    if (getTmdbApiKey()) {
      const data = await fetchTmdb<any>(`/trending/all/day?page=${page}`);
      return normalizeList(data?.results || []);
    } else {
      const data = await fetchCinemeta<any>("/catalog/movie/top.json");
      return normalizeCinemetaList(data?.metas || []);
    }
  },

  async getByGenre(slug: string, page = 1) {
    if (getTmdbApiKey()) {
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
      const data = await fetchTmdb<any>(`/discover/movie?with_genres=${genreId}&sort_by=popularity.desc&page=${page}`);
      return normalizeList(data?.results || []);
    } else {
      const genreMap: Record<string, string> = {
        "hanh-dong": "Action",
        "vien-tuong": "Sci-Fi",
        "kinh-di": "Horror",
        "hai-huoc": "Comedy",
        "tinh-cam": "Romance",
        "phieu-luu": "Adventure",
        "hoat-hinh": "Animation",
        "hinh-su": "Crime",
        "tai-lieu": "Documentary"
      };
      const genre = genreMap[slug] || "Action";
      const data = await fetchCinemeta<any>(`/catalog/movie/top/genre=${genre}.json`);
      return normalizeCinemetaList(data?.metas || []);
    }
  },

  async getByCountry(slug: string, page = 1) {
    if (getTmdbApiKey()) {
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
      const data = await fetchTmdb<any>(`/discover/movie?with_origin_country=${region}&sort_by=popularity.desc&page=${page}`);
      return normalizeList(data?.results || []);
    } else {
      // Cinemeta fallback
      const data = await fetchCinemeta<any>("/catalog/movie/top.json");
      return normalizeCinemetaList(data?.metas || []);
    }
  },

  async getByYear(year: string | number, page = 1) {
    if (getTmdbApiKey()) {
      const data = await fetchTmdb<any>(`/discover/movie?primary_release_year=${year}&sort_by=popularity.desc&page=${page}`);
      return normalizeList(data?.results || []);
    } else {
      const data = await fetchCinemeta<any>("/catalog/movie/top.json");
      return normalizeCinemetaList(data?.metas || []);
    }
  },

  async getByList(type: string, page = 1) {
    if (getTmdbApiKey()) {
      if (type === "phim-bo") {
        const data = await fetchTmdb<any>(`/discover/tv?sort_by=popularity.desc&page=${page}`);
        return normalizeList(data?.results || [], "tv");
      } else if (type === "phim-le") {
        const data = await fetchTmdb<any>(`/discover/movie?sort_by=popularity.desc&page=${page}`);
        return normalizeList(data?.results || [], "movie");
      } else if (type === "hoat-hinh") {
        const data = await fetchTmdb<any>(`/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${page}`);
        return normalizeList(data?.results || [], "tv");
      } else if (type === "tv-shows") {
        const data = await fetchTmdb<any>(`/discover/tv?with_genres=10764&sort_by=popularity.desc&page=${page}`);
        return normalizeList(data?.results || [], "tv");
      }
      const data = await fetchTmdb<any>(`/trending/all/day?page=${page}`);
      return normalizeList(data?.results || []);
    } else {
      if (type === "phim-bo" || type === "tv-shows") {
        const data = await fetchCinemeta<any>("/catalog/series/top.json");
        return normalizeCinemetaList(data?.metas || []);
      } else if (type === "phim-le") {
        const data = await fetchCinemeta<any>("/catalog/movie/top.json");
        return normalizeCinemetaList(data?.metas || []);
      } else if (type === "hoat-hinh") {
        const data = await fetchCinemeta<any>("/catalog/series/top/genre=Animation.json");
        return normalizeCinemetaList(data?.metas || []);
      }
      const data = await fetchCinemeta<any>("/catalog/movie/top.json");
      return normalizeCinemetaList(data?.metas || []);
    }
  },

  async searchMovies(keyword: string) {
    if (getTmdbApiKey()) {
      const data = await fetchTmdb<any>(`/search/multi?query=${encodeURIComponent(keyword)}`);
      return normalizeList(data?.results || []);
    } else {
      // Query movie and series search catalogs in parallel
      const [movieSearch, seriesSearch] = await Promise.allSettled([
        fetchCinemeta<any>(`/catalog/movie/top/search=${encodeURIComponent(keyword)}.json`),
        fetchCinemeta<any>(`/catalog/series/top/search=${encodeURIComponent(keyword)}.json`)
      ]);
      const movies = movieSearch.status === "fulfilled" ? (movieSearch.value?.metas || []) : [];
      const series = seriesSearch.status === "fulfilled" ? (seriesSearch.value?.metas || []) : [];
      return normalizeCinemetaList([...movies, ...series]);
    }
  },

  async getMovieDetail(slug: string): Promise<MovieDetailResponse> {
    if (getTmdbApiKey()) {
      let rawMovie: any = null;
      let mediaType: "movie" | "tv" = "movie";

      try {
        rawMovie = await fetchTmdb<any>(`/movie/${slug}?append_to_response=external_ids,videos,credits`);
        mediaType = "movie";
      } catch {
        try {
          rawMovie = await fetchTmdb<any>(`/tv/${slug}?append_to_response=external_ids,videos,credits`);
          mediaType = "tv";
        } catch {
          throw new Error(`Failed to load TMDB movie details: ${slug}`);
        }
      }

      const seasonsList: any[] = [];
      if (mediaType === "tv" && Array.isArray(rawMovie?.seasons)) {
        const validSeasons = rawMovie.seasons.filter((s: any) => s.season_number > 0).slice(0, 3);
        for (const season of validSeasons) {
          try {
            const seasonData = await fetchTmdb<any>(`/tv/${slug}/season/${season.season_number}`);
            seasonsList.push(seasonData);
          } catch {
            // Ignore
          }
        }
      }

      return {
        movie: normalizeMovie(rawMovie, mediaType, seasonsList),
        episodes: seasonsList
      };
    } else {
      // Fetch details from Cinemeta using IMDB ID
      let rawMovie: any = null;
      try {
        const movieRes = await fetchCinemeta<any>(`/meta/movie/${slug}.json`);
        rawMovie = movieRes?.meta;
      } catch {
        try {
          const tvRes = await fetchCinemeta<any>(`/meta/series/${slug}.json`);
          rawMovie = tvRes?.meta;
        } catch {
          throw new Error(`Failed to load Cinemeta metadata for: ${slug}`);
        }
      }
      if (!rawMovie) throw new Error("Metadata is empty");
      
      const movie = normalizeCinemetaMovie(rawMovie);
      return {
        movie,
        episodes: movie.seasons || []
      };
    }
  },

  async getPlayback(slug: string, episodeId?: string | null): Promise<PlaybackSourceDto & { title?: string; currentEpisodeId?: string; episodesList?: any[] }> {
    const { movie } = await this.getMovieDetail(slug);
    const mediaType = movie.mediaType || "movie";
    const tmdbId = movie.tmdbId || movie.id;
    const imdbId = movie.imdbId || movie.id || "";

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

    let selectedStreamUrl = "";
    let streamTitle = `${movie.title}${episodeTitle}`;
    
    try {
      const installedStr = localStorage.getItem("streamforge:addons:installed");
      const installedAddonsList = installedStr ? JSON.parse(installedStr) : [];
      
      const streamAddons = (addonsData as any[]).filter(addon => 
        installedAddonsList.includes(addon.id) && 
        (addon.category === "Torrent" || addon.category === "Movies" || addon.category === "Debrid")
      );

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
              const cleanHttpStream = streamsList.find((s: any) => s.url && s.url.startsWith("http") && !s.url.includes(".mkv"));
              if (cleanHttpStream) {
                selectedStreamUrl = cleanHttpStream.url;
                if (cleanHttpStream.title) {
                  streamTitle = `${movie.title} [${addon.name}] - ${cleanHttpStream.title.split("\n")[0]}`;
                }
                break;
              }
            }
          } catch {
            // Ignore
          }
        }
      }
    } catch (e) {
      console.error("Addon stream resolve failed:", e);
    }

    // Default Embed Player fallback using IMDB ID or TMDB ID
    const alternateSources: { name: string; url: string }[] = [];
    const playId = imdbId || tmdbId;

    if (selectedStreamUrl && !selectedStreamUrl.includes("embed") && !selectedStreamUrl.includes("vidsrc") && !selectedStreamUrl.includes("vidlink")) {
      alternateSources.push({ name: "Addon Stream (Direct)", url: selectedStreamUrl });
    }

    if (mediaType === "movie") {
      alternateSources.push({ name: "Server 1 (Embed.su)", url: `https://embed.su/embed/movie/${playId}` });
      if (imdbId) {
        alternateSources.push({ name: "Server 2 (Vidsrc.to)", url: `https://vidsrc.to/embed/movie/${imdbId}` });
      }
      alternateSources.push({ name: "Server 3 (Vidsrc.xyz)", url: `https://vidsrc.xyz/embed/movie/${playId}` });
      alternateSources.push({ name: "Server 4 (Vidsrc.pro)", url: `https://vidsrc.pro/embed/movie/${playId}` });
      alternateSources.push({ name: "Server 5 (VidLink)", url: `https://vidlink.pro/embed/movie/${playId}` });
    } else {
      alternateSources.push({ name: "Server 1 (Embed.su)", url: `https://embed.su/embed/tv/${playId}/${selectedSeason}/${selectedEpisode}` });
      if (imdbId) {
        alternateSources.push({ name: "Server 2 (Vidsrc.to)", url: `https://vidsrc.to/embed/tv/${imdbId}/${selectedSeason}/${selectedEpisode}` });
      }
      alternateSources.push({ name: "Server 3 (Vidsrc.xyz)", url: `https://vidsrc.xyz/embed/tv/${playId}/${selectedSeason}/${selectedEpisode}` });
      alternateSources.push({ name: "Server 4 (Vidsrc.pro)", url: `https://vidsrc.pro/embed/tv/${playId}/${selectedSeason}/${selectedEpisode}` });
      alternateSources.push({ name: "Server 5 (VidLink)", url: `https://vidlink.pro/embed/tv/${playId}/${selectedSeason}/${selectedEpisode}` });
    }

    if (!selectedStreamUrl && alternateSources.length > 0) {
      selectedStreamUrl = alternateSources[0].url;
    }

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
      hlsUrl: selectedStreamUrl,
      dashUrl: "",
      subtitles: subtitlesList,
      audioTracks: [{ language: "en", label: "English" }],
      introStartSeconds: 0,
      introEndSeconds: 0,
      recapEndSeconds: 0,
      currentEpisodeId: selectedEpisodeId,
      episodesList: allEpisodes,
      alternateSources
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

    const hasKey = !!getTmdbApiKey();
    return {
      rows: [
        rowFrom(hasKey ? "Phim thịnh hành trong ngày" : "Trending Movies", latest),
        rowFrom(hasKey ? "Phim bộ trực tuyến" : "Popular TV Shows", series),
        rowFrom(hasKey ? "Phim lẻ chọn lọc" : "Featured Movies", single),
        rowFrom(hasKey ? "Hoạt hình Nhật (Anime)" : "Japanese Anime Collection", anime),
        rowFrom(hasKey ? "TV Shows đặc sắc" : "Must-Watch TV Shows", tvShows),
        rowFrom(hasKey ? "Phim hành động kịch tính" : "Action & Adventure", action),
        rowFrom(hasKey ? "Phim bộ Hàn Quốc (K-Dramas)" : "Korean Dramas (K-Dramas)", korea)
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

// Cinemeta Normalizers
function normalizeCinemetaList(metas: any[]): NormalizedMovie[] {
  if (!Array.isArray(metas)) return [];
  return metas.map(normalizeCinemetaMovie).filter(Boolean) as NormalizedMovie[];
}

function normalizeCinemetaMovie(item: any): NormalizedMovie {
  const id = String(item.id || item.imdb_id || "");
  const title = item.name || "Untitled";
  const posterUrl = item.poster || createFallbackImage(title);
  const backdropUrl = item.background || posterUrl;
  const year = item.releaseInfo ? parseInt(item.releaseInfo) : new Date().getFullYear();
  const rating = item.imdbRating ? parseFloat(item.imdbRating) : 8.0;

  // Build seasons/episodes
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
    runtimeMinutes: 45,
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

function normalizeCinemetaEpisodes(videos: any[], movieSlug: string, synopsis: string): any[] {
  const seasonsMap: Record<number, any[]> = {};
  videos.forEach((video) => {
    const season = video.season || 1;
    if (!seasonsMap[season]) seasonsMap[season] = [];
    seasonsMap[season].push({
      id: video.id || `${movieSlug}-ep-${season}-${video.episode || video.number || 1}`,
      title: video.title || `Episode ${video.episode || video.number || 1}`,
      synopsis: synopsis,
      runtimeMinutes: 45,
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
    // Ignore
  }
}

function slugify(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
