import type { GenreDto, MovieCardDto, PlaybackSourceDto } from "@streamforge/shared-types";
import { APP_DOMAIN_CDN_IMAGE, MOVIE_API_CACHE_TTL_MS, MOVIE_API_TIMEOUT_MS } from "./movieApiConfig";

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
      const res = await fetch(`https://free1.phim4k.lol/danh-sach/phim-moi-cap-nhat-v3?page=${page}`);
      if (!res.ok) return [];
      const data = await res.json();
      return normalizePhim4kList(data?.items || []);
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
        "hanh-dong": "hanh-dong",
        "vien-tuong": "vien-tuong",
        "kinh-di": "kinh-di",
        "hai-huoc": "hai-huoc",
        "tinh-cam": "tinh-cam",
        "phieu-luu": "phieu-luu",
        "hoat-hinh": "hoat-hinh",
        "hinh-su": "hinh-su",
        "tai-lieu": "tai-lieu"
      };
      const category = genreMap[slug] || "hanh-dong";
      const res = await fetch(`https://free1.phim4k.lol/v1/api/the-loai/${category}?page=${page}`);
      if (!res.ok) return [];
      const data = await res.json();
      return normalizePhim4kList(data?.data?.items || [], data?.data?.APP_DOMAIN_CDN_IMAGE);
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
      const countryMap: Record<string, string> = {
        "au-my": "au-my",
        "han-quoc": "han-quoc",
        "trung-quoc": "trung-quoc",
        "nhat-ban": "nhat-ban",
        "thai-lan": "thai-lan",
        "hong-kong": "hong-kong",
        "dai-loan": "dai-loan",
        "viet-nam": "viet-nam"
      };
      const region = countryMap[slug] || "au-my";
      const res = await fetch(`https://free1.phim4k.lol/v1/api/quoc-gia/${region}?page=${page}`);
      if (!res.ok) return [];
      const data = await res.json();
      return normalizePhim4kList(data?.data?.items || [], data?.data?.APP_DOMAIN_CDN_IMAGE);
    }
  },

  async getByYear(year: string | number, page = 1) {
    if (getTmdbApiKey()) {
      const data = await fetchTmdb<any>(`/discover/movie?primary_release_year=${year}&sort_by=popularity.desc&page=${page}`);
      return normalizeList(data?.results || []);
    } else {
      const res = await fetch(`https://free1.phim4k.lol/danh-sach/phim-moi-cap-nhat-v3?page=${page}`);
      if (!res.ok) return [];
      const data = await res.json();
      return normalizePhim4kList(data?.items || []);
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
      let listName = "phim-moi-cap-nhat-v3";
      let isV1 = true;
      if (type === "phim-bo" || type === "tv-shows") {
        listName = "phim-bo";
      } else if (type === "phim-le") {
        listName = "phim-le";
      } else if (type === "hoat-hinh") {
        listName = "hoat-hinh";
      } else {
        isV1 = false;
      }

      if (isV1) {
        const res = await fetch(`https://free1.phim4k.lol/v1/api/danh-sach/${listName}?page=${page}`);
        if (!res.ok) return [];
        const data = await res.json();
        return normalizePhim4kList(data?.data?.items || [], data?.data?.APP_DOMAIN_CDN_IMAGE);
      } else {
        const res = await fetch(`https://free1.phim4k.lol/danh-sach/phim-moi-cap-nhat-v3?page=${page}`);
        if (!res.ok) return [];
        const data = await res.json();
        return normalizePhim4kList(data?.items || []);
      }
    }
  },

  async searchMovies(keyword: string, page = 1) {
    if (getTmdbApiKey()) {
      const data = await fetchTmdb<any>(`/search/multi?query=${encodeURIComponent(keyword)}&page=${page}`);
      return normalizeList(data?.results || []);
    } else {
      const res = await fetch(`https://free1.phim4k.lol/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`);
      if (!res.ok) return [];
      const data = await res.json();
      return normalizePhim4kList(data?.data?.items || [], data?.data?.APP_DOMAIN_CDN_IMAGE);
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
      if (/^\d+$/.test(slug)) {
        const res = await fetch(`https://api.animapper.net/api/v1/metadata?id=${slug}`);
        if (!res.ok) throw new Error(`AniMapper metadata failed for: ${slug}`);
        const data = await res.json();
        if (!data || !data.result) throw new Error("Metadata is empty");

        const rawAnime = data.result;
        const mainTitle = rawAnime.titles.en || rawAnime.titles.ja || "";
        const rootTitle = getAnimeRootTitle(mainTitle);

        // Fetch related franchise entries from AniMapper search
        let relatedSeasons: any[] = [];
        try {
          const searchRes = await fetch(`https://api.animapper.net/api/v1/search?title=${encodeURIComponent(rootTitle)}&mediaType=ANIME&limit=25`);
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            const excludeKeywords = ["junior high", "chibi", "parody", "recap", "summary", "character", "drama", "pv", "promo", "picture drama", "wings of freedom", "crimson bow"];
            
            relatedSeasons = (searchData.results || []).filter((item: any) => {
              const titleEn = (item.titles?.en || "").toLowerCase();
              const titleJa = (item.titles?.ja || "").toLowerCase();
              const titleRo = (item.titles?.["ja-ro"] || "").toLowerCase();
              const rootLower = rootTitle.toLowerCase();
              
              const isMatch = titleEn.includes(rootLower) || titleJa.includes(rootLower) || titleRo.includes(rootLower);
              const isTv = item.format === "TV" || item.format === "ONA";
              const isExcluded = excludeKeywords.some(keyword => {
                return titleEn.includes(keyword) || titleJa.includes(keyword) || titleRo.includes(keyword);
              });
              
              return isMatch && isTv && !isExcluded;
            });
            
            // Sort by release year
            relatedSeasons.sort((a, b) => {
              const yearA = a.seasonYear || 0;
              const yearB = b.seasonYear || 0;
              if (yearA !== yearB) return yearA - yearB;
              return a.id - b.id;
            });
          }
        } catch (e) {
          console.error("Failed to query related franchise seasons:", e);
        }

        // Fallback to only the current anime if search did not yield results
        if (relatedSeasons.length === 0) {
          relatedSeasons = [rawAnime];
        }

        // Fetch episodes for all seasons in parallel
        const providers = Object.keys(rawAnime.streamingProviders || {});
        const provider = providers.includes("ANIMEVIETSUB") ? "ANIMEVIETSUB" : providers[0] || "ANIMEVIETSUB";

        const seasons = await Promise.all(relatedSeasons.map(async (seasonItem: any, index: number) => {
          const seasonId = String(seasonItem.id);
          const seasonName = cleanSeasonTitle(seasonItem.titles.en || seasonItem.titles.ja || "Season", rootTitle, index);
          
          let episodesList: any[] = [];
          try {
            const epRes = await fetch(`https://api.animapper.net/api/v1/stream/episodes?id=${seasonId}&provider=${provider}`);
            if (epRes.ok) {
              const epData = await epRes.json();
              episodesList = epData.result || [];
            }
          } catch (e) {
            console.error(`Failed to fetch episodes for season ID ${seasonId}:`, e);
          }

          return {
            id: `${slug}-season-${index + 1}`,
            title: seasonName,
            episodes: episodesList.map((ep: any) => {
              const epNum = ep.episodeNumber;
              const customEpId = `${slug}-ep-${index + 1}-${epNum}__${ep.episodeId}__${ep.server}`;
              return {
                id: customEpId,
                title: `Tập ${epNum}`,
                synopsis: `Tập phim ${epNum} phát nguồn từ ${ep.server}`,
                runtimeMinutes: seasonItem.unitDurationMin || 24,
                posterUrl: seasonItem.images?.bannerUrl || seasonItem.images?.coverLg,
                seasonNumber: index + 1,
                episodeNumber: parseFloat(epNum) || 1
              };
            })
          };
        }));

        const animeObj = normalizeAniMapperMovie(rawAnime, true);
        animeObj.seasons = seasons;
        (animeObj as any)._rawProviders = rawAnime.streamingProviders;

        // Gather all episodes flat list for playback store initialization
        const allFlatEpisodes = seasons.flatMap(s => s.episodes);

        return {
          movie: animeObj,
          episodes: allFlatEpisodes
        };
      }

      const res = await fetch(`https://free1.phim4k.lol/phim/${slug}`);
      if (!res.ok) throw new Error(`Phim4K details failed for: ${slug}`);
      const data = await res.json();
      if (!data || !data.movie) throw new Error("Metadata is empty");

      const movieObj = { ...data.movie, episodes: data.episodes };
      const movie = normalizePhim4kMovie(movieObj, true);
      return {
        movie,
        episodes: data.episodes || []
      };
    }
  },



  async getPlayback(slug: string, episodeId?: string | null): Promise<PlaybackSourceDto & { title?: string; currentEpisodeId?: string; episodesList?: any[] }> {
    if (/^\d+$/.test(slug)) {
      const { movie, episodes } = await this.getMovieDetail(slug);
      
      let realEpisodeId = "";
      let serverName = "";
      
      if (episodeId && episodeId.includes("__")) {
        const parts = episodeId.split("__");
        realEpisodeId = parts[1];
        serverName = parts[2];
      } else {
        const firstEp = movie.seasons?.[0]?.episodes?.[0];
        if (firstEp && firstEp.id.includes("__")) {
          const parts = firstEp.id.split("__");
          realEpisodeId = parts[1];
          serverName = parts[2];
        }
      }
      
      let streamUrl = "";
      let quality = "1080p";
      
      if (realEpisodeId && serverName) {
        try {
          const providers = Object.keys((movie as any)._rawProviders || { "ANIMEVIETSUB": true });
          const provider = providers.includes("ANIMEVIETSUB") ? "ANIMEVIETSUB" : providers[0] || "ANIMEVIETSUB";
          
          const sourceUrl = `https://api.animapper.net/api/v1/stream/source?episodeData=${encodeURIComponent(realEpisodeId)}&provider=${provider}&server=${serverName}`;
          const res = await fetch(sourceUrl);
          const sourceData = await res.json();
          if (sourceData.success && sourceData.result?.sources?.length > 0) {
            streamUrl = sourceData.result.sources[0].url;
            quality = sourceData.result.sources[0].quality || "1080p";
          }
        } catch (e) {
          console.error("Failed to fetch stream source:", e);
        }
      }
      
      const alternateSources: any[] = [];
      if (streamUrl) {
        alternateSources.push({
          name: `AniMapper HLS (ANIMEVIETSUB - ${serverName})`,
          url: streamUrl,
          quality,
          addon: "AniMapper API",
          streamType: "http" as const
        });
      }
      
      const isMobile = typeof navigator !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (!isMobile || !streamUrl) {
        const playId = movie.tmdbId || movie.id;
        const selectedSeason = 1;
        const selectedEpisode = 1;
        alternateSources.push({ name: "Embed.su", url: `https://embed.su/embed/tv/${playId}/${selectedSeason}/${selectedEpisode}`, quality: "1080p", streamType: "embed" as const });
        alternateSources.push({ name: "Vidsrc.cc", url: `https://vidsrc.cc/v2/embed/tv/${playId}/${selectedSeason}/${selectedEpisode}`, quality: "1080p", streamType: "embed" as const });
      }
      
      const finalUrl = streamUrl || alternateSources[0]?.url || "";
      
      return {
        movieId: movie.id,
        title: `${movie.title} - Tập ${episodeId ? (episodeId.split("__")[0].split("-").pop() || "1") : "1"}`,
        hlsUrl: finalUrl,
        dashUrl: "",
        subtitles: [],
        audioTracks: [{ language: "ja", label: "Japanese" }],
        episodesList: episodes,
        alternateSources,
        stremioUrl: "",
        currentEpisodeId: episodeId || movie.seasons?.[0]?.episodes?.[0]?.id
      };
    }

    let movie: any = null;
    let episodes: any[] = [];
    try {
      const detail = await this.getMovieDetail(slug);
      movie = detail.movie;
      episodes = detail.episodes || [];
    } catch {
      movie = {
        id: slug,
        slug,
        title: slug,
        mediaType: "movie",
        posterUrl: "",
        backdropUrl: "",
        tmdbId: slug,
        imdbId: slug.startsWith("tt") ? slug : ""
      };
    }

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
    
    const alternateSources: { name: string; url: string; quality: string; addon?: string; size?: string; seeders?: number; streamType?: "http" | "torrent" | "external" | "embed"; fileIdx?: number; infoHash?: string }[] = [];
    
    // Add embed servers FIRST as fallbacks
    const playId = imdbId || tmdbId;
    const embedSources: typeof alternateSources = [];
    if (mediaType === "movie") {
      embedSources.push({ name: "Embed.su", url: `https://embed.su/embed/movie/${playId}`, quality: "1080p", streamType: "embed" });
      embedSources.push({ name: "Vidsrc.cc", url: `https://vidsrc.cc/v2/embed/movie/${playId}`, quality: "1080p", streamType: "embed" });
      embedSources.push({ name: "SuperEmbed", url: `https://multiembed.mov/?video_id=${playId}${imdbId ? "" : "&tmdb=1"}`, quality: "1080p", streamType: "embed" });
      if (imdbId) {
        embedSources.push({ name: "Vidsrc.to", url: `https://vidsrc.to/embed/movie/${imdbId}`, quality: "1080p", streamType: "embed" });
      }
      embedSources.push({ name: "Vidsrc.pro", url: `https://vidsrc.pro/embed/movie/${playId}`, quality: "720p", streamType: "embed" });
      embedSources.push({ name: "VidLink", url: `https://vidlink.pro/embed/movie/${playId}`, quality: "4K", streamType: "embed" });
      embedSources.push({ name: "Vidsrc.xyz", url: `https://vidsrc.xyz/embed/movie/${playId}`, quality: "720p", streamType: "embed" });
    } else {
      embedSources.push({ name: "Embed.su", url: `https://embed.su/embed/tv/${playId}/${selectedSeason}/${selectedEpisode}`, quality: "1080p", streamType: "embed" });
      embedSources.push({ name: "Vidsrc.cc", url: `https://vidsrc.cc/v2/embed/tv/${playId}/${selectedSeason}/${selectedEpisode}`, quality: "1080p", streamType: "embed" });
      embedSources.push({ name: "SuperEmbed", url: `https://multiembed.mov/?video_id=${playId}${imdbId ? "" : "&tmdb=1"}&s=${selectedSeason}&e=${selectedEpisode}`, quality: "1080p", streamType: "embed" });
      if (imdbId) {
        embedSources.push({ name: "Vidsrc.to", url: `https://vidsrc.to/embed/tv/${imdbId}/${selectedSeason}/${selectedEpisode}`, quality: "1080p", streamType: "embed" });
      }
      embedSources.push({ name: "Vidsrc.pro", url: `https://vidsrc.pro/embed/tv/${playId}/${selectedSeason}/${selectedEpisode}`, quality: "720p", streamType: "embed" });
      embedSources.push({ name: "VidLink", url: `https://vidlink.pro/embed/tv/${playId}/${selectedSeason}/${selectedEpisode}`, quality: "4K", streamType: "embed" });
      embedSources.push({ name: "Vidsrc.xyz", url: `https://vidsrc.xyz/embed/tv/${playId}/${selectedSeason}/${selectedEpisode}`, quality: "720p", streamType: "embed" });
    }

    // Extract Phim4K direct streams inline from pre-fetched detail episodes
    const phim4kStreams: any[] = [];
    const rawEpisodes = episodes || [];
    
    for (const server of rawEpisodes) {
      const serverName = server.server_name || "Vietsub";
      const serverData = server.server_data || [];
      
      let matchedEpisode: any = null;
      if (mediaType === "movie") {
        matchedEpisode = serverData.find((ep: any) => ep.slug === "full" || ep.name?.toLowerCase().includes("full")) || serverData[0];
      } else {
        const targetEpStr = String(selectedEpisode).padStart(2, "0");
        matchedEpisode = serverData.find((ep: any) => {
          const epNameClean = (ep.name || "").replace(/\D/g, "");
          return epNameClean === targetEpStr || epNameClean === String(selectedEpisode) || ep.slug === `tap-${targetEpStr}`;
        });
      }
      
      if (matchedEpisode && matchedEpisode.link) {
        phim4kStreams.push({
          name: `Phim4K Thuyết Minh / Vietsub (${serverName})`,
          url: matchedEpisode.link,
          quality: movie.quality || "FHD",
          addon: "Phim4K API",
          streamType: "http"
        });
      }
    }

    // Final order: Phim4K streams first (direct play) -> Embed fallbacks
    const isMobile = typeof navigator !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const finalSources = (isMobile && phim4kStreams.length > 0) ? phim4kStreams : [...phim4kStreams, ...embedSources];
    finalSources.forEach(s => alternateSources.push(s));

    // Choose first working stream as primary (prefer Direct HLS from Phim4K if available)
    selectedStreamUrl = phim4kStreams[0]?.url || embedSources[0]?.url || alternateSources[0]?.url || "";

    // ── Fetch subtitles from subtitle addons ──
    const subtitlesList: any[] = [];
    try {
      const installedStr = localStorage.getItem("streamforge:addons:installed");
      const installedAddonsList = installedStr ? JSON.parse(installedStr) : addonsData.map(a => a.id);
      const subtitleAddons = (addonsData as any[]).filter(addon => 
        installedAddonsList.includes(addon.id) && addon.category === "Subtitle"
      );

      const queryId = mediaType === "movie" ? imdbId : `${imdbId}:${selectedSeason}:${selectedEpisode}`;
      if (queryId) {
        const subPromises = subtitleAddons.map(async (addon) => {
          const rootUrl = addon.manifestUrl.replace("/manifest.json", "");
          const subEndpoint = `${rootUrl}/subtitles/${mediaType}/${encodeURIComponent(queryId)}.json`;
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(subEndpoint, { signal: controller.signal });
            clearTimeout(timeoutId);
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
        });
        await Promise.allSettled(subPromises);
      }
    } catch {
      // Ignore
    }

    const stremioUrl = imdbId 
      ? `stremio:///detail/${mediaType === "tv" ? "series" : "movie"}/${imdbId}${mediaType === "tv" ? `/${imdbId}:${selectedSeason}:${selectedEpisode}` : `/${imdbId}`}`
      : "";

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
      alternateSources,
      stremioUrl
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
  },

  async getAnimeRows(page = 1): Promise<MovieRowsResponse> {
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

function normalizeCinemetaEpisodes(videos: any[], movieSlug: string, synopsis: string): any[] {
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

function proxyImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&default=${encodeURIComponent(url)}`;
}

function absolutePhim4kImageUrl(url: unknown, imageCdnUrl?: unknown): string {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:")) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const normalizedPath = trimmed.replace(/^\/+/, "");
  const cdnBase = typeof imageCdnUrl === "string" && /^https?:\/\//i.test(imageCdnUrl)
    ? imageCdnUrl.replace(/\/+$/, "")
    : APP_DOMAIN_CDN_IMAGE;

  return `${cdnBase}/${normalizedPath}`;
}

function normalizePhim4kImageUrl(url: unknown, imageCdnUrl?: unknown): string {
  const absoluteUrl = absolutePhim4kImageUrl(url, imageCdnUrl);
  if (!absoluteUrl) return "";
  return proxyImageUrl(absoluteUrl);
}

function normalizeAniMapperMovie(item: any, isDetail = false): NormalizedMovie {
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

function normalizePhim4kList(items: any[], imageCdnUrl?: unknown): NormalizedMovie[] {
  if (!Array.isArray(items)) return [];
  return items.map(item => normalizePhim4kMovie(item, false, imageCdnUrl)).filter(Boolean) as NormalizedMovie[];
}

function normalizePhim4kMovie(item: any, isDetail = false, imageCdnUrl?: unknown): NormalizedMovie {
  if (!item) return null as any;
  const title = item.name || item.origin_name || "Untitled";
  const slug = item.slug || "";
  const posterUrl = normalizePhim4kImageUrl(item.poster_url || item.poster || item.image, imageCdnUrl) || createFallbackImage(title);
  const thumbUrl = normalizePhim4kImageUrl(item.thumb_url || item.backdrop_url || item.backdrop, imageCdnUrl);
  const backdropUrl = isDetail ? thumbUrl || posterUrl : posterUrl;
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
            synopsis: item.content || item.description || "Xem phim online chất lượng cao.",
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
    synopsis: item.content || item.description || "Xem phim online chất lượng cao.",
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
    description: item.content || item.description || "Xem phim online chất lượng cao.",
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

function rowFrom(title: string, result: PromiseSettledResult<NormalizedMovie[]>, ranked = false) {
  return { title, ranked, items: result.status === "fulfilled" ? result.value : [] };
}

function createFallbackImage(title: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#1f1f1f"/><stop offset=".55" stop-color="#111"/><stop offset="1" stop-color="#2a0d10"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><rect width="1280" height="720" fill="#000" opacity=".22"/></svg>`;
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

function getAnimeRootTitle(title: string): string {
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

function cleanSeasonTitle(title: string, rootTitle: string, index: number): string {
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
