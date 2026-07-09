import { recommendationScore } from "@streamforge/utils";
import { prisma } from "../lib/prisma.js";

export async function recommendForProfile(profileId: string) {
  const history = await prisma.watchHistory.findMany({
    where: { profileId },
    include: { movie: { include: { genres: { include: { genre: true } } } } },
    orderBy: { lastWatchedAt: "desc" },
    take: 100
  });
  const watchedIds = new Set(history.map((h) => h.movieId));
  const genreWeights = new Map<string, number>();
  for (const item of history) {
    const completion = item.durationSeconds ? item.progressSeconds / item.durationSeconds : 0;
    for (const link of item.movie.genres) {
      genreWeights.set(link.genreId, (genreWeights.get(link.genreId) ?? 0) + Math.min(1, completion));
    }
  }
  const candidates = await prisma.movie.findMany({
    where: { publishedAt: { not: null }, id: { notIn: [...watchedIds] } },
    include: { genres: { include: { genre: true } } },
    orderBy: [{ popularityScore: "desc" }, { publishedAt: "desc" }],
    take: 80
  });
  return candidates
    .map((movie) => {
      const genreAffinity = movie.genres.reduce((sum, g) => sum + (genreWeights.get(g.genreId) ?? 0), 0) / Math.max(1, history.length);
      const freshnessBoost = movie.publishedAt ? Math.max(0, 1 - (Date.now() - movie.publishedAt.getTime()) / (1000 * 60 * 60 * 24 * 365)) : 0;
      const score = recommendationScore({
        genreAffinity: Math.min(1, genreAffinity),
        completionRate: averageCompletion(history),
        ratingAffinity: movie.averageRating / 5,
        freshnessBoost,
        popularityBoost: Math.min(1, movie.popularityScore / 100)
      });
      return {
        ...movie,
        recommendationScore: score,
        reasons: movie.genres.slice(0, 2).map((g) => `Because you watch ${g.genre.name}`)
      };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, 30);
}

function averageCompletion(history: Array<{ progressSeconds: number; durationSeconds: number }>) {
  if (!history.length) return 0.5;
  return history.reduce((sum, h) => sum + (h.durationSeconds ? h.progressSeconds / h.durationSeconds : 0), 0) / history.length;
}
