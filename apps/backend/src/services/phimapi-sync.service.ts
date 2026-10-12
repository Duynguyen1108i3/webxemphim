import { prisma } from "../lib/prisma.js";

function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "").trim();
}

function normalizeImgUrl(url?: string): string {
  if (!url) return "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://phimimg.com/${url.replace(/^\//, "")}`;
}

export interface DevMovieRecord {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl?: string | null;
  hlsUrl?: string | null;
  dashUrl?: string | null;
  releaseYear: number;
  runtimeMinutes: number;
  maturityRating: string;
  averageRating: number;
  popularityScore: number;
  publishedAt: string;
  createdAt: string;
  genres: Array<{ genre: { id: string; name: string; slug: string } }>;
  seasons: Array<{
    id: string;
    movieId: string;
    number: number;
    title: string;
    description?: string;
    episodes: Array<{
      id: string;
      seasonId: string;
      number: number;
      title: string;
      synopsis: string;
      runtimeMinutes: number;
      posterUrl: string;
      hlsUrl?: string | null;
      dashUrl?: string | null;
    }>;
  }>;
  _count: {
    reviews: number;
    ratings: number;
  };
}

export const devMoviesMap = new Map<string, DevMovieRecord>();
let seedPromise: Promise<void> | null = null;

export async function ensureDevMoviesSeeded(): Promise<void> {
  if (devMoviesMap.size > 0) return;
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    try {
      const res = await fetch("https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1");
      if (!res.ok) return;
      const data = (await res.json()) as { items?: any[] };
      const items = data.items || [];
      for (const item of items) {
        if (!item?.slug) continue;
        const posterUrl = normalizeImgUrl(item.poster_url || item.thumb_url);
        const backdropUrl = normalizeImgUrl(item.thumb_url || item.poster_url);
        const year = Number(item.year) || new Date().getFullYear();
        const nowIso = item.modified?.time || new Date().toISOString();
        const record: DevMovieRecord = {
          id: item._id || item.slug,
          slug: item.slug,
          title: item.name || item.origin_name || item.slug,
          synopsis: `${item.name} (${item.origin_name || year}) - Phim chất lượng cao Full HD Vietsub trên RytoxGroup.`,
          description: `${item.name} (${item.origin_name || year}) - Phim chất lượng cao Full HD Vietsub trên RytoxGroup.`,
          posterUrl,
          backdropUrl,
          trailerUrl: null,
          hlsUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
          releaseYear: year,
          runtimeMinutes: 115,
          maturityRating: "PG_13",
          averageRating: 8.5,
          popularityScore: 150,
          publishedAt: nowIso,
          createdAt: nowIso,
          genres: [],
          seasons: [
            {
              id: `season-${item.slug}-1`,
              movieId: item._id || item.slug,
              number: 1,
              title: "Mùa 1",
              episodes: [
                {
                  id: `ep-${item.slug}-1`,
                  seasonId: `season-${item.slug}-1`,
                  number: 1,
                  title: "Tập 1 - Full HD",
                  synopsis: `${item.name} - Tập 1`,
                  runtimeMinutes: 45,
                  posterUrl: backdropUrl,
                  hlsUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
                }
              ]
            }
          ],
          _count: { reviews: 0, ratings: 1 }
        };
        devMoviesMap.set(record.id, record);
      }
    } catch (err) {
      console.warn("[PhimApiSync] Initial devMoviesMap seed warning:", (err as Error).message);
    } finally {
      seedPromise = null;
    }
  })();

  return seedPromise;
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

  let dbAvailable = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbAvailable = false;
  }

  for (const item of toProcess) {
    if (!item.slug) continue;
    try {
      const detailRes = await fetch(`https://phimapi.com/phim/${item.slug}`);
      if (!detailRes.ok) continue;

      const detailData = (await detailRes.json()) as { movie?: any; episodes?: any[] };
      const m = detailData.movie;
      if (!m) continue;

      const cleanDesc = stripHtml(m.content || item.name) || "Phim chất lượng cao Rytox Cinema";
      const parsedRuntime = m.time ? parseInt(m.time.match(/\d+/)?.[0] || "45", 10) : 45;
      const releaseYear = Number(m.year || item.year) || new Date().getFullYear();
      const posterUrl = normalizeImgUrl(m.poster_url || item.poster_url);
      const backdropUrl = normalizeImgUrl(m.thumb_url || item.thumb_url || m.poster_url);

      let firstM3u8: string | null = null;
      const servers = detailData.episodes || [];
      if (servers.length > 0 && servers[0].server_data?.length > 0) {
        firstM3u8 = servers[0].server_data[0].link_m3u8 || null;
      }

      const epList = servers.length > 0 ? servers[0].server_data || [] : [];
      const totalEpisodes = epList.length;
      const movieId = m.slug;
      const seasonId = `season-${movieId}-1`;

      // Always store in devMoviesMap for instant availability
      const devRecord: DevMovieRecord = {
        id: movieId,
        slug: m.slug,
        title: m.name || item.name,
        synopsis: cleanDesc.slice(0, 1000),
        description: cleanDesc,
        posterUrl,
        backdropUrl,
        trailerUrl: m.trailer_url || null,
        hlsUrl: firstM3u8,
        releaseYear,
        runtimeMinutes: parsedRuntime,
        maturityRating: "PG_13",
        averageRating: Number(m.tmdb?.vote_average) || 8.5,
        popularityScore: m.view || 120,
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        genres: Array.isArray(m.category)
          ? m.category.map((cat: any) => ({
              genre: { id: cat.slug || cat.name, name: cat.name || "Phim", slug: cat.slug || "phim" }
            }))
          : [],
        seasons:
          epList.length > 0
            ? [
                {
                  id: seasonId,
                  movieId,
                  number: 1,
                  title: "Mùa 1",
                  episodes: epList.map((ep: any, idx: number) => ({
                    id: `ep-${movieId}-${idx + 1}`,
                    seasonId,
                    number: idx + 1,
                    title: ep.name || `Tập ${idx + 1}`,
                    synopsis: `${m.name || item.name} - ${ep.name || `Tập ${idx + 1}`}`,
                    runtimeMinutes: parsedRuntime,
                    posterUrl: backdropUrl,
                    hlsUrl: ep.link_m3u8 || null
                  }))
                }
              ]
            : [],
        _count: { reviews: 0, ratings: m.tmdb?.vote_count ? 1 : 0 }
      };
      devMoviesMap.set(movieId, devRecord);

      if (dbAvailable) {
        try {
          const movieRecord = await prisma.movie.upsert({
            where: { slug: m.slug },
            create: {
              id: m.slug,
              slug: m.slug,
              title: m.name || item.name,
              synopsis: cleanDesc.slice(0, 1000),
              description: cleanDesc,
              posterUrl,
              backdropUrl,
              trailerUrl: m.trailer_url || null,
              hlsUrl: firstM3u8,
              releaseYear,
              runtimeMinutes: parsedRuntime,
              maturityRating: "PG_13",
              averageRating: 0,
              popularityScore: m.view || 100,
              publishedAt: new Date()
            },
            update: {
              title: m.name || item.name,
              synopsis: cleanDesc.slice(0, 1000),
              description: cleanDesc,
              posterUrl,
              backdropUrl,
              trailerUrl: m.trailer_url || undefined,
              hlsUrl: firstM3u8 || undefined,
              releaseYear,
              runtimeMinutes: parsedRuntime,
              popularityScore: m.view || undefined
            }
          });

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
                // Ignore constraint races
              }
            }
          }

          if (servers.length > 0) {
            const season = await prisma.season.upsert({
              where: { movieId_number: { movieId: movieRecord.id, number: 1 } },
              create: { movieId: movieRecord.id, number: 1, title: "Mùa 1" },
              update: {}
            });

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
        } catch (dbErr) {
          console.warn(`[PhimApiSync] DB upsert skipped for ${m.slug}:`, (dbErr as Error).message);
        }
      }

      syncedMovies.push({
        id: movieId,
        title: devRecord.title,
        slug: devRecord.slug,
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
