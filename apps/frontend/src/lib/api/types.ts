import type { MovieCardDto } from "@streamforge/shared-types";

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

export type FetchOptions = { timeoutMs?: number; cacheTtlMs?: number };

export function rowFrom(title: string, result: PromiseSettledResult<NormalizedMovie[]>, ranked = false) {
  return { title, ranked, items: result.status === "fulfilled" ? result.value : [] };
}
