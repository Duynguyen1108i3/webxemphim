import { PrismaClient } from "@prisma/client";
import { slugify } from "@streamforge/utils";

const prisma = new PrismaClient();
const genres = ["Action", "Horror", "Anime", "Comedy", "Romance", "Sci-Fi", "Documentary"];

async function main() {
  await prisma.genre.createMany({ data: genres.map((name) => ({ name, slug: slugify(name) })), skipDuplicates: true });
  const allGenres = await prisma.genre.findMany();
  for (let i = 1; i <= 28; i++) {
    const title = `Signal Horizon ${i}`;
    const movie = await prisma.movie.upsert({
      where: { slug: slugify(title) },
      update: {},
      create: {
        slug: slugify(title),
        title,
        synopsis: "A cinematic original with sweeping visuals, layered characters and an urgent mystery unfolding across impossible distances.",
        description: "A premium catalog title engineered for adaptive streaming, personalized discovery and editorial programming across global audiences.",
        posterUrl: `https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&auto=format&fit=crop&q=80&sig=${i}`,
        backdropUrl: `https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1800&auto=format&fit=crop&q=80&sig=${i}`,
        trailerUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        hlsUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        dashUrl: "https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd",
        releaseYear: 2026 - (i % 8),
        runtimeMinutes: 92 + i,
        maturityRating: i % 3 === 0 ? "TV_MA" : "PG_13",
        averageRating: 3.7 + (i % 13) / 10,
        popularityScore: 100 - i,
        publishedAt: new Date(Date.now() - i * 86_400_000),
        genres: { create: [{ genreId: allGenres[i % allGenres.length].id }, { genreId: allGenres[(i + 2) % allGenres.length].id }] }
      }
    });
    await prisma.subtitle.createMany({ data: [{ movieId: movie.id, language: "en", label: "English", url: "https://bitdash-a.akamaihd.net/content/sintel/subtitles/subtitles_en.vtt" }], skipDuplicates: true });
  }
}

main().finally(() => prisma.$disconnect());
