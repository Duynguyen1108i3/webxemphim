export type Role = "USER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";
export type MaturityRating = "G" | "PG" | "PG_13" | "R" | "NC_17" | "TV_Y" | "TV_G" | "TV_PG" | "TV_14" | "TV_MA";
export type BillingInterval = "MONTHLY" | "YEARLY";
export type SubscriptionTier = "BASIC" | "STANDARD" | "PREMIUM";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: Role;
  emailVerified: boolean;
}

export interface GenreDto {
  id: string;
  name: string;
  slug: string;
}

export interface MovieCardDto {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl?: string | null;
  releaseYear: number;
  runtimeMinutes: number;
  maturityRating: MaturityRating;
  averageRating: number;
  genres: GenreDto[];
}

export interface PlaybackSourceDto {
  movieId: string;
  hlsUrl: string;
  dashUrl: string;
  subtitles: Array<{ language: string; label: string; url: string }>;
  audioTracks: Array<{ language: string; label: string }>;
  introStartSeconds?: number;
  introEndSeconds?: number;
  recapEndSeconds?: number;
  alternateSources?: Array<{ name: string; url: string; quality: string; addon?: string; size?: string; seeders?: number }>;
}

export interface RecommendationDto extends MovieCardDto {
  recommendationScore: number;
  reasons: string[];
}
