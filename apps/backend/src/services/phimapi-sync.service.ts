import { prisma } from "../lib/prisma.js";

function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "").trim();
}

export interface SyncResult {
  success: boolean;
  totalSynced: number;
  movies: Array<{ id: string; title: string; slug: string; episodesCount: number }>;
  message: string;
}

export async function syncMoviesFromPhimApi(page = 1, limitCount = 24): Promise<SyncResult> {
  console.log(`[PhimApiSync] Fetching updated movies list from page ${page}...`);
  const listRes = await fetch(`https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=${page}`);
  if (!listRes.ok) {
    throw new Error(`PhimAPI returned HTTP error ${listRes.status}`);
  }

  const listData = (await listRes.json()) as { items?: any[] };
  const items = listData.items || [];
  const toProcess = items.slice(0, limitCount);
  const syncedMovies: Array<{ id: string; title: string; slug: string; episodesCount: number }> = [];

  for (const item of toProcess) {
    if (!item.slug) continue;
    try {
      console.log(`[PhimApiSync] Fetching details for ${item.slug}...`);
      const detailRes = await fetch(`https://phimapi.com/phim/${item.slug}`);
      if (!detailRes.ok) continue;

      const detailData = (await detailRes.json()) as { movie?: any; episodes?: any[] };
      const m = detailData.movie;
      if (!m) continue;

      const cleanDesc = stripHtml(m.content || item.name) || "Phim chất lượng cao Rytox Cinema";
      const parsedRuntime = m.time ? parseInt(m.time.match(/\d+/)?.[0] || "45", 10) : 45;
      const releaseYear = m.year || item.year || new Date().getFullYear();

      // Extract first .m3u8 if available
      let firstM3u8: string | null = null;
      const servers = detailData.episodes || [];
      if (servers.length > 0 && servers[0].server_data?.length > 0) {
        firstM3u8 = servers[0].server_data[0].link_m3u8 || null;
      }

      // Check if movie already exists to preserve actual user averageRating and reviews
      const existing = await prisma.movie.findUnique({
        where: { slug: m.slug },
        select: { id: true, averageRating: true }
      });

      const movieRecord = await prisma.movie.upsert({
        where: { slug: m.slug },
        create: {
          id: m.slug,
          slug: m.slug,
          title: m.name || item.name,
          synopsis: cleanDesc.slice(0, 1000),
          description: cleanDesc,
          posterUrl: m.poster_url || item.poster_url || "",
          backdropUrl: m.thumb_url || item.thumb_url || m.poster_url || "",
          trailerUrl: m.trailer_url || null,
          hlsUrl: firstM3u8,
          releaseYear,
          runtimeMinutes: parsedRuntime,
          maturityRating: "PG_13",
          averageRating: 0, // Fresh movies start at 0 until real users rate
          popularityScore: m.view || 100,
          publishedAt: new Date()
        },
        update: {
          title: m.name || item.name,
          synopsis: cleanDesc.slice(0, 1000),
          description: cleanDesc,
          posterUrl: m.poster_url || item.poster_url || undefined,
          backdropUrl: m.thumb_url || item.thumb_url || m.poster_url || undefined,
          trailerUrl: m.trailer_url || undefined,
          hlsUrl: firstM3u8 || undefined,
          releaseYear,
          runtimeMinutes: parsedRuntime,
          popularityScore: m.view || undefined
        }
      });

      // Upsert Genres
      if (Array.isArray(m.category)) {
        for (const cat of m.category) {
          if (!cat.slug || !cat.name) continue;
          try {
            const genre = await prisma.genre.upsert({
              where: { slug: cat.slug },
              create: { name: cat.name, slug: cat.slug },
              update: { name: cat.name }
            });
            await prisma.movieGenre.upsert({
              where: { movieId_genreId: { movieId: movieRecord.id, genreId: genre.id } },
              create: { movieId: movieRecord.id, genreId: genre.id },
              update: {}
            });
          } catch {
            // Ignore potential constraint races
          }
        }
      }

      // Upsert Season 1 & Episodes
      let totalEpisodes = 0;
      if (servers.length > 0) {
        const season = await prisma.season.upsert({
          where: { movieId_number: { movieId: movieRecord.id, number: 1 } },
          create: { movieId: movieRecord.id, number: 1, title: "Mùa 1" },
          update: {}
        });

        const epList = servers[0].server_data || [];
        totalEpisodes = epList.length;

        for (let idx = 0; idx < epList.length; idx++) {
          const ep = epList[idx];
          await prisma.episode.upsert({
            where: { seasonId_number: { seasonId: season.id, number: idx + 1 } },
            create: {
              seasonId: season.id,
              number: idx + 1,
              title: ep.name || `Tập ${idx + 1}`,
              synopsis: `${movieRecord.title} - ${ep.name || `Tập ${idx + 1}`}`,
              runtimeMinutes: parsedRuntime,
              posterUrl: movieRecord.backdropUrl,
              hlsUrl: ep.link_m3u8 || null
            },
            update: {
              title: ep.name || `Tập ${idx + 1}`,
              hlsUrl: ep.link_m3u8 || undefined
            }
          });
        }
      }

      syncedMovies.push({
        id: movieRecord.id,
        title: movieRecord.title,
        slug: movieRecord.slug,
        episodesCount: totalEpisodes
      });
    } catch (err) {
      console.error(`[PhimApiSync] Failed to sync ${item.slug}:`, err);
    }
  }

  return {
    success: true,
    totalSynced: syncedMovies.length,
    movies: syncedMovies,
    message: `Đã đồng bộ thành công ${syncedMovies.length} bộ phim thật từ PhimAPI!`
  };
}
