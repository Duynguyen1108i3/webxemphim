import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { cacheJson } from "../lib/redis.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/error.js";

const router = Router();

router.get("/rows", async (_req, res, next) => {
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
});

router.get("/search", async (req, res, next) => {
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
});

router.get("/:slug", async (req, res, next) => {
  try {
    const movie = await prisma.movie.findUnique({
      where: { slug: req.params.slug },
      include: {
        ...includeCard,
        actors: { include: { actor: true } },
        directors: { include: { director: true } },
        writers: { include: { writer: true } },
        seasons: { include: { episodes: { orderBy: { number: "asc" } } }, orderBy: { number: "asc" } },
        reviews: { orderBy: { createdAt: "desc" }, take: 20 }
      }
    });
    if (!movie) throw new ApiError(404, "Movie not found", "MOVIE_NOT_FOUND");
    res.json({ movie });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/playback", requireAuth, async (req, res, next) => {
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
});

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
  return { title: name === "Sci-Fi" ? "Sci-Fi" : `${name} Movies`, items };
}

const includeCard = { genres: { include: { genre: true } } } as const;

export default router;
