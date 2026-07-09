import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function formatRuntime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest}m` : `${rest}m`;
}

export function recommendationScore(input: {
  genreAffinity: number;
  completionRate: number;
  ratingAffinity: number;
  freshnessBoost: number;
  popularityBoost: number;
}) {
  return Number(
    (
      input.genreAffinity * 0.35 +
      input.completionRate * 0.25 +
      input.ratingAffinity * 0.2 +
      input.freshnessBoost * 0.1 +
      input.popularityBoost * 0.1
    ).toFixed(4)
  );
}
export function getEpisodes(movie: {
  id: string;
  synopsis: string;
  runtimeMinutes: number;
  backdropUrl: string;
  posterUrl: string;
  seasons?: Array<{ episodes?: Array<any> }>;
}) {
  const seasons = movie.seasons ?? [];
  return seasons
    .flatMap((season) => season.episodes ?? [])
    .map((episode, index) => ({
      id: String(episode.id ?? `${movie.id}-episode-${index}`),
      title: String(episode.title ?? `Episode ${index + 1}`),
      synopsis: String(episode.synopsis ?? episode.description ?? movie.synopsis),
      runtimeMinutes: Number(episode.runtimeMinutes ?? episode.runtime_minutes ?? Math.min(movie.runtimeMinutes || 45, 48)),
      posterUrl: String(episode.posterUrl ?? episode.thumbnailUrl ?? movie.backdropUrl ?? movie.posterUrl)
    }));
}

