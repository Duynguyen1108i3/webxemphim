import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { cacheJson } from "../lib/redis.js";
import { ApiError } from "../middleware/error.middleware.js";

const includeCard = {
  genres: {
    include: {
      genre: true
    }
  }
};

async function row(title: string, orderBy: Record<string, "asc" | "desc">) {
  const items = await prisma.movie.findMany({ where: { publishedAt: { not: null } }, include: includeCard, orderBy, take: 20 });
  return { title, items };
}

async function genreRow(name: string) {
  const items = await prisma.movie.findMany({
    where: { publishedAt: { not: null }, genres: { some: { genre: { name } } } },
    include: includeCard,
    orderBy: { popularityScore: "desc" },
    take: 20
  });
  return { title: `${name} Movies`, items };
}

export async function getMovieRows(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await cacheJson("home:rows", 120, async () => {
      const genres = ["Action", "Horror", "Anime", "Comedy", "Romance", "Sci-Fi", "Documentary"];
      const base = await Promise.all([
        row("Trending Now", { popularityScore: "desc" }),
        row("Popular Today", { publishedAt: "desc" }),
        row("Top Rated", { averageRating: "desc" }),
        ...genres.map((name) => genreRow(name))
      ]);
      return base;
    });
    res.json({ rows });
  } catch (error) {
    next(error);
  }
}

export async function searchMovies(req: Request, res: Response, next: NextFunction) {
  try {
    const query = z.string().min(1).max(80).parse(req.query.q);
    const year = req.query.year ? z.coerce.number().int().parse(req.query.year) : undefined;
    const movies = await prisma.movie.findMany({
      where: {
        publishedAt: { not: null },
        releaseYear: year,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { genres: { some: { genre: { name: { contains: query, mode: "insensitive" } } } } },
          { actors: { some: { actor: { name: { contains: query, mode: "insensitive" } } } } },
          { directors: { some: { director: { name: { contains: query, mode: "insensitive" } } } } }
        ]
      },
      include: includeCard,
      take: 20
    });
    res.json({ results: movies });
  } catch (error) {
    next(error);
  }
}

export async function getMovieBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const movie = await prisma.movie.findUnique({
      where: { slug: String(req.params.slug) },
      include: {
        ...includeCard,
        actors: { include: { actor: true } },
        directors: { include: { director: true } },
        writers: { include: { writer: true } },
        seasons: { include: { episodes: { orderBy: { number: "asc" } } }, orderBy: { number: "asc" } },
        reviews: { orderBy: { createdAt: "desc" }, take: 20 },
        _count: { select: { ratings: true, reviews: true } }
      }
    });
    if (!movie) throw new ApiError(404, "Movie not found", "MOVIE_NOT_FOUND");
    res.json({ movie });
  } catch (error) {
    next(error);
  }
}

export async function getMoviePlayback(req: Request, res: Response, next: NextFunction) {
  try {
    const movie = await prisma.movie.findUnique({ where: { id: String(req.params.id) }, include: { subtitles: true } });
    if (!movie?.hlsUrl) throw new ApiError(404, "Playback source not available", "PLAYBACK_NOT_READY");
    res.json({
      movieId: movie.id,
      hlsUrl: movie.hlsUrl,
      dashUrl: movie.dashUrl,
      subtitles: movie.subtitles,
      audioTracks: [{ language: "en", label: "English" }],
      introStartSeconds: 85,
      introEndSeconds: 132,
      recapEndSeconds: 65
    });
  } catch (error) {
    next(error);
  }
}

// In-memory fallback stores for reviews and ratings in dev mode
const devReviewsStore = new Map<string, Array<{
  id: string;
  movieId: string;
  userId: string;
  body: string;
  createdAt: string;
  user: { id: string; username: string; avatarUrl: string | null };
}>>();

const devRatingsStore = new Map<string, Map<string, number>>();

export async function getMovieReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const movieId = String(req.params.id);
    try {
      // Find movie by id or slug
      const movie = await prisma.movie.findFirst({
        where: { OR: [{ id: movieId }, { slug: movieId }] },
        select: { id: true }
      });
      const targetId = movie?.id || movieId;
      const reviews = await prisma.review.findMany({
        where: { movieId: targetId },
        include: {
          user: {
            select: { id: true, username: true, avatarUrl: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 50
      });
      return res.json({ reviews });
    } catch {
      // Dev store fallback
      const reviews = devReviewsStore.get(movieId) || [];
      return res.json({ reviews });
    }
  } catch (error) {
    next(error);
  }
}

const reviewSchema = z.object({
  body: z.string().trim().min(2, "Bình luận phải có ít nhất 2 ký tự").max(1000, "Bình luận tối đa 1000 ký tự")
});

export async function createMovieReview(req: Request, res: Response, next: NextFunction) {
  try {
    const movieId = String(req.params.id);
    const { body } = reviewSchema.parse(req.body);
    const userId = req.user!.id;

    try {
      const movie = await prisma.movie.findFirst({
        where: { OR: [{ id: movieId }, { slug: movieId }] },
        select: { id: true }
      });
      const targetId = movie?.id || movieId;

      const review = await prisma.review.create({
        data: {
          movieId: targetId,
          userId,
          body
        },
        include: {
          user: {
            select: { id: true, username: true, avatarUrl: true }
          }
        }
      });
      return res.status(201).json({ review });
    } catch {
      // Dev store fallback
      const newReview = {
        id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        movieId,
        userId,
        body,
        createdAt: new Date().toISOString(),
        user: {
          id: userId,
          username: req.user!.email?.split("@")[0] || "User",
          avatarUrl: "/avatars/cat-1.jpg"
        }
      };
      const list = devReviewsStore.get(movieId) || [];
      list.unshift(newReview);
      devReviewsStore.set(movieId, list);
      return res.status(201).json({ review: newReview });
    }
  } catch (error) {
    next(error);
  }
}

export async function deleteMovieReview(req: Request, res: Response, next: NextFunction) {
  try {
    const reviewId = String(req.params.reviewId);
    const userId = req.user!.id;
    const role = req.user!.role;

    try {
      const review = await prisma.review.findUnique({ where: { id: reviewId } });
      if (!review) throw new ApiError(404, "Bình luận không tồn tại", "REVIEW_NOT_FOUND");
      if (review.userId !== userId && role !== "ADMIN" && role !== "SUPER_ADMIN") {
        throw new ApiError(403, "Bạn không có quyền xóa bình luận này", "FORBIDDEN");
      }
      await prisma.review.delete({ where: { id: reviewId } });
      return res.json({ success: true, message: "Đã xóa bình luận" });
    } catch (err) {
      if (err instanceof ApiError) throw err;
      // Fallback
      for (const [mId, list] of devReviewsStore.entries()) {
        const idx = list.findIndex((r) => r.id === reviewId);
        if (idx !== -1) {
          if (list[idx].userId !== userId && role !== "ADMIN" && role !== "SUPER_ADMIN") {
            throw new ApiError(403, "Bạn không có quyền xóa bình luận này", "FORBIDDEN");
          }
          list.splice(idx, 1);
          devReviewsStore.set(mId, list);
          return res.json({ success: true, message: "Đã xóa bình luận" });
        }
      }
      return res.json({ success: true, message: "Đã xóa bình luận" });
    }
  } catch (error) {
    next(error);
  }
}

const ratingSchema = z.object({
  value: z.number().int().min(1, "Điểm tối thiểu là 1").max(10, "Điểm tối đa là 10")
});

export async function rateMovie(req: Request, res: Response, next: NextFunction) {
  try {
    const movieId = String(req.params.id);
    const { value } = ratingSchema.parse(req.body);
    const userId = req.user!.id;

    try {
      let movie = await prisma.movie.findFirst({
        where: { OR: [{ id: movieId }, { slug: movieId }] },
        select: { id: true }
      });

      if (!movie) {
        try {
          const detailRes = await fetch(`https://phimapi.com/phim/${movieId}`);
          if (detailRes.ok) {
            const detailData = (await detailRes.json()) as { movie?: any };
            const m = detailData?.movie;
            if (m) {
              const cleanDesc = (m.content || m.name || "").replace(/<[^>]*>?/gm, "").trim();
              const created = await prisma.movie.create({
                data: {
                  id: m.slug || movieId,
                  slug: m.slug || movieId,
                  title: m.name || movieId,
                  synopsis: cleanDesc.slice(0, 1000),
                  description: cleanDesc,
                  posterUrl: m.poster_url || "",
                  backdropUrl: m.thumb_url || m.poster_url || "",
                  releaseYear: m.year || new Date().getFullYear(),
                  runtimeMinutes: 45,
                  maturityRating: "PG_13",
                  averageRating: 0,
                  popularityScore: 100,
                  publishedAt: new Date()
                }
              });
              movie = { id: created.id };
            }
          }
        } catch {
          // ignore external error
        }
      }

      const targetId = movie?.id || movieId;

      // Upsert rating
      const rating = await prisma.rating.upsert({
        where: { userId_movieId: { userId, movieId: targetId } },
        create: { userId, movieId: targetId, value },
        update: { value }
      });

      // Recalculate averageRating
      const stats = await prisma.rating.aggregate({
        where: { movieId: targetId },
        _avg: { value: true },
        _count: true
      });

      const newAverage = stats._avg.value ? Math.round(stats._avg.value * 10) / 10 : value;
      await prisma.movie.update({
        where: { id: targetId },
        data: { averageRating: newAverage }
      });

      return res.json({
        success: true,
        rating: rating.value,
        averageRating: newAverage,
        totalRatings: stats._count
      });
    } catch {
      // Dev store fallback
      if (!devRatingsStore.has(movieId)) {
        devRatingsStore.set(movieId, new Map());
      }
      const movieRatings = devRatingsStore.get(movieId)!;
      movieRatings.set(userId, value);

      const allValues = Array.from(movieRatings.values());
      const avg = Math.round((allValues.reduce((a, b) => a + b, 0) / allValues.length) * 10) / 10;

      return res.json({
        success: true,
        rating: value,
        averageRating: avg,
        totalRatings: allValues.length
      });
    }
  } catch (error) {
    next(error);
  }
}

export async function getUserMovieRating(req: Request, res: Response, next: NextFunction) {
  try {
    const movieId = String(req.params.id);
    const userId = req.user!.id;

    try {
      const movie = await prisma.movie.findFirst({
        where: { OR: [{ id: movieId }, { slug: movieId }] },
        select: { id: true }
      });
      const targetId = movie?.id || movieId;

      const rating = await prisma.rating.findUnique({
        where: { userId_movieId: { userId, movieId: targetId } }
      });

      return res.json({ rating: rating?.value ?? null });
    } catch {
      const movieRatings = devRatingsStore.get(movieId);
      return res.json({ rating: movieRatings?.get(userId) ?? null });
    }
  } catch (error) {
    next(error);
  }
}

