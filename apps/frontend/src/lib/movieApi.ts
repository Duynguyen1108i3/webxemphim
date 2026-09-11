import type { PlaybackSourceDto } from "@streamforge/shared-types";
import addonsData from "../data/addons.json";
import {
  NormalizedMovie,
  MovieRowsResponse,
  MovieDetailResponse,
  rowFrom,
  getTmdbApiKey,
  fetchTmdb,
  normalizeList,
  normalizeMovie,
  normalizePhim4kList,
  normalizePhim4kMovie,
  normalizeAniMapperMovie,
  getAnimeRootTitle,
  cleanSeasonTitle,
  getAnimeRows
} from "./api";

export type { NormalizedMovie, MovieRowsResponse, MovieDetailResponse };

export const movieApi = {
  async getNewMovies(page = 1) {
    if (getTmdbApiKey()) {
      const data = await fetchTmdb<any>(`/trending/all/day?page=${page}`);
      return normalizeList(data?.results || []);
    } else {
      const res = await fetch(`https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=${page}`);
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
      const res = await fetch(`https://phimapi.com/v1/api/the-loai/${category}?page=${page}`);
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
      const res = await fetch(`https://phimapi.com/v1/api/quoc-gia/${region}?page=${page}`);
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
      try {
        const res = await fetch(`https://phimapi.com/v1/api/nam/${year}?page=${page}&limit=24`);
        if (res.ok) {
          const data = await res.json();
          const items = data?.data?.items || [];
          if (items.length > 0) {
            return normalizePhim4kList(items, data?.data?.APP_DOMAIN_CDN_IMAGE || "https://phimimg.com");
          }
        }
      } catch (e) {
        console.warn("phimapi.com getByYear failed, falling back to phim4k:", e);
      }
      const res = await fetch(`https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=${page}`);
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
      try {
        const listName = type === "tv-shows" ? "phim-bo" : type;
        const res = await fetch(`https://phimapi.com/v1/api/danh-sach/${listName}?page=${page}&limit=24&sort_field=modified.time&sort_type=desc`);
        if (res.ok) {
          const data = await res.json();
          const items = data?.data?.items || [];
          if (items.length > 0) {
            return normalizePhim4kList(items, data?.data?.APP_DOMAIN_CDN_IMAGE || "https://phimimg.com");
          }
        }
      } catch (e) {
        console.warn("phimapi.com getByList failed, falling back to phim4k:", e);
      }
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
        const res = await fetch(`https://phimapi.com/v1/api/danh-sach/${listName}?page=${page}`);
        if (!res.ok) return [];
        const data = await res.json();
        return normalizePhim4kList(data?.data?.items || [], data?.data?.APP_DOMAIN_CDN_IMAGE);
      } else {
        const res = await fetch(`https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=${page}`);
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
      try {
        const res = await fetch(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`);
        if (res.ok) {
          const data = await res.json();
          const items = data?.data?.items || [];
          if (items.length > 0) {
            return normalizePhim4kList(items, data?.data?.APP_DOMAIN_CDN_IMAGE || "https://phimimg.com");
          }
        }
      } catch (e) {
        console.warn("phimapi.com searchMovies failed, falling back to phim4k:", e);
      }
      const res = await fetch(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`);
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

        if (relatedSeasons.length === 0) {
          relatedSeasons = [rawAnime];
        }

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

        const allFlatEpisodes = seasons.flatMap(s => s.episodes);

        return {
          movie: animeObj,
          episodes: allFlatEpisodes
        };
      }

      try {
        const res = await fetch(`https://phimapi.com/phim/${slug}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.movie) {
            const movieObj = { ...data.movie, episodes: data.episodes };
            const movie = normalizePhim4kMovie(movieObj, true, "https://phimimg.com");
            return {
              movie,
              episodes: data.episodes || []
            };
          }
        }
      } catch (e) {
        console.warn("phimapi.com getMovieDetail failed, falling back to phim4k:", e);
      }

      const res = await fetch(`https://phimapi.com/phim/${slug}`);
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
    
    const playId = imdbId || tmdbId;
    const embedSources: typeof alternateSources = [];
    if (mediaType === "movie") {
      embedSources.push({ name: "Vidsrc.cc", url: `https://vidsrc.cc/v2/embed/movie/${playId}`, quality: "1080p", streamType: "embed" });
      embedSources.push({ name: "SuperEmbed", url: `https://multiembed.mov/?video_id=${playId}${imdbId ? "" : "&tmdb=1"}`, quality: "1080p", streamType: "embed" });
      if (imdbId) {
        embedSources.push({ name: "Vidsrc.to", url: `https://vidsrc.to/embed/movie/${imdbId}`, quality: "1080p", streamType: "embed" });
      }
      embedSources.push({ name: "Vidsrc.pro", url: `https://vidsrc.pro/embed/movie/${playId}`, quality: "720p", streamType: "embed" });
      embedSources.push({ name: "VidLink", url: `https://vidlink.pro/embed/movie/${playId}`, quality: "4K", streamType: "embed" });
    } else {
      embedSources.push({ name: "Vidsrc.cc", url: `https://vidsrc.cc/v2/embed/tv/${playId}/${selectedSeason}/${selectedEpisode}`, quality: "1080p", streamType: "embed" });
      embedSources.push({ name: "SuperEmbed", url: `https://multiembed.mov/?video_id=${playId}${imdbId ? "" : "&tmdb=1"}&s=${selectedSeason}&e=${selectedEpisode}`, quality: "1080p", streamType: "embed" });
      if (imdbId) {
        embedSources.push({ name: "Vidsrc.to", url: `https://vidsrc.to/embed/tv/${imdbId}/${selectedSeason}/${selectedEpisode}`, quality: "1080p", streamType: "embed" });
      }
      embedSources.push({ name: "Vidsrc.pro", url: `https://vidsrc.pro/embed/tv/${playId}/${selectedSeason}/${selectedEpisode}`, quality: "720p", streamType: "embed" });
      embedSources.push({ name: "VidLink", url: `https://vidlink.pro/embed/tv/${playId}/${selectedSeason}/${selectedEpisode}`, quality: "4K", streamType: "embed" });
    }

    const vietsubStreams: typeof alternateSources = [];
    const rawEpisodes = episodes || [];
    
    for (const server of rawEpisodes) {
      const serverName = server.server_name || "Vietsub";
      const serverData: any[] = server.server_data || [];
      
      let matchedEpisode: any = null;
      if (episodeId) {
        matchedEpisode = serverData.find((ep: any) => ep.slug === episodeId || ep.name === episodeId || ep.slug === `tap-${episodeId}`);
      }
      if (!matchedEpisode && mediaType === "movie") {
        matchedEpisode = serverData.find((ep: any) => ep.slug === "full" || ep.name?.toLowerCase().includes("full")) || serverData[0];
      }
      if (!matchedEpisode) {
        const targetEpStr = String(selectedEpisode).padStart(2, "0");
        matchedEpisode = serverData.find((ep: any) => {
          const epNameClean = (ep.name || "").replace(/\D/g, "");
          return epNameClean === targetEpStr || epNameClean === String(selectedEpisode) || ep.slug === `tap-${targetEpStr}` || ep.slug === `tap-${selectedEpisode}`;
        }) || serverData[0];
      }
      
      if (matchedEpisode) {
        const m3u8Url = matchedEpisode.link_m3u8 || (/\.m3u8($|\?)/i.test(matchedEpisode.link) ? matchedEpisode.link : "");
        const embedUrl = matchedEpisode.link_embed || (!m3u8Url ? matchedEpisode.link : "");

        if (m3u8Url) {
          vietsubStreams.push({
            name: `${serverName} - Trực Tiếp HLS (Vietsub / Thuyết Minh)`,
            url: m3u8Url,
            quality: movie.quality || "FHD",
            addon: "PhimAPI Vietsub",
            streamType: "http"
          });
        }
        
        if (embedUrl) {
          vietsubStreams.push({
            name: `${serverName} - Player Embed (Vietsub / Thuyết Minh)`,
            url: embedUrl,
            quality: movie.quality || "FHD",
            addon: "PhimAPI Player",
            streamType: "embed"
          });
        }
      }
    }

    const finalSources = [...vietsubStreams, ...embedSources];
    finalSources.forEach(s => alternateSources.push(s));

    selectedStreamUrl = vietsubStreams[0]?.url || embedSources[0]?.url || alternateSources[0]?.url || "";

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
    return getAnimeRows(page);
  }
};
