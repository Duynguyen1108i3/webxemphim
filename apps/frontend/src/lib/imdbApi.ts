import type { NormalizedMovie } from "./movieApi";

export interface ImdbItem {
  id: string;
  imdb_id: string;
  name: string;
  type: "movie" | "series";
  year?: string;
  imdbRating?: string;
  genres: string[];
  poster?: string;
  background?: string;
  description?: string;
  cast?: string[];
  director?: string[];
  writer?: string[];
  runtime?: string;
  trailers?: Array<{ source: string; type: string }>;
  popularity?: number;
}

export const IMDB_GENRES = [
  "All",
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "Biography",
  "History",
  "Sport",
  "War"
];

export const GENRE_LABELS_VI: Record<string, string> = {
  All: "Tất cả",
  Action: "Hành động",
  Adventure: "Phiêu lưu",
  Animation: "Hoạt hình",
  Comedy: "Hài hước",
  Crime: "Hình sự",
  Documentary: "Tài liệu",
  Drama: "Chính kịch",
  Family: "Gia đình",
  Fantasy: "Kỳ ảo",
  Horror: "Kinh dị",
  Mystery: "Bí ẩn",
  Romance: "Lãng mạn",
  "Sci-Fi": "Viễn tưởng",
  Thriller: "Giật gân",
  Biography: "Tiểu sử",
  History: "Lịch sử",
  Sport: "Thể thao",
  War: "Chiến tranh"
};

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return item.data as T;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

function normalizeRawMeta(raw: any, defaultType: "movie" | "series" = "movie"): ImdbItem {
  const id = raw.imdb_id || raw.id || "";
  let genres: string[] = [];
  if (Array.isArray(raw.genre)) {
    genres = raw.genre;
  } else if (Array.isArray(raw.genres)) {
    genres = raw.genres;
  } else if (typeof raw.genre === "string") {
    genres = [raw.genre];
  }

  // Sanitize poster and background images
  let poster = raw.poster;
  if (!poster && id) {
    poster = `https://images.metahub.space/poster/medium/${id}/img`;
  }
  let background = raw.background;
  if (!background && id) {
    background = `https://images.metahub.space/background/medium/${id}/img`;
  }

  let ratingStr = "";
  if (raw.imdbRating !== undefined && raw.imdbRating !== null && raw.imdbRating !== "") {
    const parsed = parseFloat(String(raw.imdbRating));
    if (!isNaN(parsed) && parsed > 0) {
      ratingStr = parsed.toFixed(1);
    }
  }

  return {
    id,
    imdb_id: id,
    name: raw.name || "Untitled",
    type: (raw.type === "series" || raw.type === "tv") ? "series" : defaultType,
    year: raw.year ? String(raw.year) : (raw.releaseInfo ? String(raw.releaseInfo).substring(0, 4) : undefined),
    imdbRating: ratingStr,
    genres,
    poster,
    background,
    description: raw.description || "",
    cast: Array.isArray(raw.cast) ? raw.cast : [],
    director: Array.isArray(raw.director) ? raw.director : (raw.director ? [raw.director] : []),
    writer: Array.isArray(raw.writer) ? raw.writer : (raw.writer ? [raw.writer] : []),
    runtime: raw.runtime ? String(raw.runtime) : undefined,
    trailers: Array.isArray(raw.trailers) ? raw.trailers : [],
    popularity: typeof raw.popularity === "number" ? raw.popularity : undefined
  };
}

export function imdbToNormalizedMovie(item: ImdbItem): NormalizedMovie {
  const year = item.year ? parseInt(item.year, 10) : new Date().getFullYear();
  let rating = 0;
  if (item.imdbRating) {
    const p = parseFloat(item.imdbRating);
    if (!isNaN(p) && p > 0) rating = p;
  }
  const genresDto = (item.genres || []).map((g) => ({
    id: g.toLowerCase().replace(/\s+/g, "-"),
    name: GENRE_LABELS_VI[g] || g,
    slug: g.toLowerCase().replace(/\s+/g, "-")
  }));

  const trailerKey = item.trailers?.[0]?.source || "";
  const trailerUrl = trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : null;
  const posterUrl = item.poster || `https://images.metahub.space/poster/medium/${item.id}/img`;
  const backdropUrl = item.background || item.poster || `https://images.metahub.space/background/medium/${item.id}/img`;

  return {
    id: item.id,
    slug: item.id,
    title: item.name,
    name: item.name,
    origin_name: item.name,
    synopsis: item.description || "",
    description: item.description || "",
    posterUrl,
    backdropUrl,
    poster: posterUrl,
    thumb: backdropUrl,
    trailerUrl,
    releaseYear: year,
    year,
    runtimeMinutes: item.runtime ? parseInt(String(item.runtime).match(/\d+/)?.[0] || "45", 10) : 45,
    maturityRating: "PG_13",
    averageRating: rating,
    genres: genresDto,
    tags: item.genres || [],
    quality: "4K Ultra HD",
    lang: "en",
    episode_current: item.type === "series" ? "TV Series" : "Movie",
    category: [],
    country: [{ id: "us", name: "United States", slug: "us" }],
    cast: item.cast || [],
    director: item.director?.join(", ") || "",
    match: Math.round(rating * 10),
    reviews: [],
    seasons: [],
    imdbId: item.imdb_id,
    mediaType: item.type === "series" ? "tv" : "movie",
    noPlayback: true,
    trailerKey
  } as NormalizedMovie & { noPlayback: boolean; trailerKey?: string };
}

export interface CatalogParams {
  type?: "movie" | "series" | "all";
  sort?: "top" | "imdbRating";
  genre?: string;
  skip?: number;
}

export const imdbApi = {
  async fetchCatalog({
    type = "all",
    sort = "top",
    genre,
    skip = 0
  }: CatalogParams): Promise<ImdbItem[]> {
    const genreParam = genre && genre !== "All" ? `genre=${encodeURIComponent(genre)}` : "";
    const cacheKey = `imdb:catalog:${type}:${sort}:${genreParam}:${skip}`;
    const cached = getCached<ImdbItem[]>(cacheKey);
    if (cached) return cached;

    const fetchSingleType = async (itemType: "movie" | "series"): Promise<ImdbItem[]> => {
      let pathParts: string[] = ["catalog", itemType, sort];
      if (genreParam) {
        pathParts.push(genreParam);
      }
      let url = `https://v3-cinemeta.strem.io/${pathParts.join("/")}.json`;
      if (skip > 0) {
        const separator = genreParam ? "&" : "";
        url = `https://v3-cinemeta.strem.io/catalog/${itemType}/${sort}${genreParam ? `/${genreParam}` : ""}${separator ? `&skip=${skip}` : `/skip=${skip}`}.json`;
      }

      try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        const metas = Array.isArray(data?.metas) ? data.metas : [];
        return metas.map((m: any) => normalizeRawMeta(m, itemType));
      } catch (e) {
        console.error(`Failed to fetch Cinemeta catalog for ${itemType}:`, e);
        return [];
      }
    };

    let items: ImdbItem[] = [];
    if (type === "all") {
      const [movies, series] = await Promise.all([
        fetchSingleType("movie"),
        fetchSingleType("series")
      ]);

      if (sort === "imdbRating") {
        items = [...movies, ...series].sort((a, b) => {
          const rA = parseFloat(a.imdbRating || "0");
          const rB = parseFloat(b.imdbRating || "0");
          return rB - rA;
        });
      } else {
        const maxLen = Math.max(movies.length, series.length);
        for (let i = 0; i < maxLen; i++) {
          if (movies[i]) items.push(movies[i]);
          if (series[i]) items.push(series[i]);
        }
      }
    } else {
      items = await fetchSingleType(type);
      if (sort === "imdbRating") {
        items = items.sort((a, b) => {
          const rA = parseFloat(a.imdbRating || "0");
          const rB = parseFloat(b.imdbRating || "0");
          return rB - rA;
        });
      }
    }

    const filtered = items.filter((item) => item.name && item.name !== "Untitled" && item.id);
    setCache(cacheKey, filtered);
    return filtered;
  },

  async fetchDetail(imdbId: string, type: "movie" | "series" = "movie"): Promise<ImdbItem | null> {
    const cacheKey = `imdb:detail:${type}:${imdbId}`;
    const cached = getCached<ImdbItem>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`https://v3-cinemeta.strem.io/meta/${type}/${imdbId}.json`);
      if (!res.ok) {
        const altType = type === "movie" ? "series" : "movie";
        const altRes = await fetch(`https://v3-cinemeta.strem.io/meta/${altType}/${imdbId}.json`);
        if (!altRes.ok) return null;
        const altData = await altRes.json();
        if (altData?.meta) {
          const normalized = normalizeRawMeta(altData.meta, altType);
          setCache(cacheKey, normalized);
          return normalized;
        }
        return null;
      }
      const data = await res.json();
      if (!data?.meta) return null;
      const normalized = normalizeRawMeta(data.meta, type);
      setCache(cacheKey, normalized);
      return normalized;
    } catch (e) {
      console.error(`Failed to fetch Cinemeta detail for ${imdbId}:`, e);
      return null;
    }
  },

  async getNewAndPopularRows(selectedGenre: string = "All"): Promise<{ rows: Array<{ title: string; items: NormalizedMovie[]; ranked?: boolean }> }> {
    const cacheKey = `imdb:rows:${selectedGenre}`;
    const cached = getCached<{ rows: Array<{ title: string; items: NormalizedMovie[]; ranked?: boolean }> }>(cacheKey);
    if (cached) return cached;

    const filterRated = (list: ImdbItem[]) =>
      list.filter((m) => {
        const r = parseFloat(m.imdbRating || "0");
        return !isNaN(r) && r > 0;
      });

    if (selectedGenre === "All") {
      const [topTrendingMovies, topRatedMovies, topSeries, actionMovies, animationMovies, sciFiMovies] = await Promise.all([
        this.fetchCatalog({ type: "movie", sort: "top" }),
        this.fetchCatalog({ type: "movie", sort: "imdbRating" }),
        this.fetchCatalog({ type: "series", sort: "imdbRating" }),
        this.fetchCatalog({ type: "movie", sort: "top", genre: "Action" }),
        this.fetchCatalog({ type: "movie", sort: "top", genre: "Animation" }),
        this.fetchCatalog({ type: "movie", sort: "top", genre: "Sci-Fi" })
      ]);

      const ratedTrending = filterRated(topTrendingMovies);
      const sortedTopRated = filterRated(topRatedMovies)
        .sort((a, b) => parseFloat(b.imdbRating || "0") - parseFloat(a.imdbRating || "0"));
      const sortedTopSeries = filterRated(topSeries)
        .sort((a, b) => parseFloat(b.imdbRating || "0") - parseFloat(a.imdbRating || "0"));
      const ratedAction = filterRated(actionMovies);
      const ratedAnimation = filterRated(animationMovies);
      const ratedSciFi = filterRated(sciFiMovies);

      const res = {
        rows: [
          {
            title: "Top 10 Phim Thịnh Hành Trên IMDb Hôm Nay",
            items: (ratedTrending.length >= 8 ? ratedTrending : topTrendingMovies).slice(0, 10).map(imdbToNormalizedMovie),
            ranked: true
          },
          {
            title: "Phim Chiếu Rạp Điểm IMDb Cao Nhất Mọi Thời Đại",
            items: sortedTopRated.slice(0, 15).map(imdbToNormalizedMovie),
            ranked: true
          },
          {
            title: "Top TV Series / Phim Bộ IMDb Được Đánh Giá Cao Nhất",
            items: sortedTopSeries.slice(0, 15).map(imdbToNormalizedMovie)
          },
          {
            title: "Phim Hành Động Kịch Tính Nổi Bật Trên IMDb",
            items: (ratedAction.length > 0 ? ratedAction : actionMovies).slice(0, 15).map(imdbToNormalizedMovie)
          },
          {
            title: "Phim Hoạt Hình & Anime Đỉnh Cao",
            items: (ratedAnimation.length > 0 ? ratedAnimation : animationMovies).slice(0, 15).map(imdbToNormalizedMovie)
          },
          {
            title: "Phim Khoa Học Viễn Tưởng Tuyển Chọn",
            items: (ratedSciFi.length > 0 ? ratedSciFi : sciFiMovies).slice(0, 15).map(imdbToNormalizedMovie)
          }
        ].filter((r) => r.items.length > 0)
      };

      setCache(cacheKey, res);
      return res;
    } else {
      const viName = GENRE_LABELS_VI[selectedGenre] || selectedGenre;
      const [genreTrending, genreTopRated, genreSeries] = await Promise.all([
        this.fetchCatalog({ type: "movie", sort: "top", genre: selectedGenre }),
        this.fetchCatalog({ type: "movie", sort: "imdbRating", genre: selectedGenre }),
        this.fetchCatalog({ type: "series", sort: "imdbRating", genre: selectedGenre })
      ]);

      const ratedGenreTrending = filterRated(genreTrending);
      const sortedGenreTopRated = filterRated(genreTopRated)
        .sort((a, b) => parseFloat(b.imdbRating || "0") - parseFloat(a.imdbRating || "0"));
      const ratedGenreSeries = filterRated(genreSeries);

      const res = {
        rows: [
          {
            title: `Top 10 Phim ${viName} Thịnh Hành Trên IMDb`,
            items: (ratedGenreTrending.length >= 6 ? ratedGenreTrending : genreTrending).slice(0, 10).map(imdbToNormalizedMovie),
            ranked: true
          },
          {
            title: `Phim ${viName} Có Điểm IMDb Cao Nhất`,
            items: sortedGenreTopRated.slice(0, 15).map(imdbToNormalizedMovie)
          },
          {
            title: `TV Series & Phim Bộ ${viName} Được Yêu Thích`,
            items: (ratedGenreSeries.length > 0 ? ratedGenreSeries : genreSeries).slice(0, 15).map(imdbToNormalizedMovie)
          }
        ].filter((r) => r.items.length > 0)
      };

      setCache(cacheKey, res);
      return res;
    }
  }
};
