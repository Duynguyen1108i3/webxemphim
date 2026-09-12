import { prisma } from "../lib/prisma.js";

export interface ActiveViewerSession {
  sessionId: string;
  userId?: string;
  profileId?: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  isGuest: boolean;
  movieId: string;
  movieTitle: string;
  movieSlug?: string;
  posterUrl?: string;
  backdropUrl?: string;
  episodeId?: string;
  episodeTitle?: string;
  currentTime: number;
  duration: number;
  progressPercent: number;
  isPaused: boolean;
  device?: string;
  ipAddress?: string;
  startedAt: Date;
  lastHeartbeatAt: Date;
}

class TelemetryService {
  private activeSessions = new Map<string, ActiveViewerSession>();
  private lastDbSyncMap = new Map<string, number>();

  public recordHeartbeat(data: {
    sessionId: string;
    userId?: string;
    profileId?: string;
    username?: string;
    email?: string;
    avatarUrl?: string;
    role?: string;
    movieId: string;
    movieTitle: string;
    movieSlug?: string;
    posterUrl?: string;
    backdropUrl?: string;
    episodeId?: string;
    episodeTitle?: string;
    currentTime: number;
    duration: number;
    isPaused?: boolean;
    stopped?: boolean;
    device?: string;
    ipAddress?: string;
  }) {
    const { sessionId, stopped } = data;

    // If client signaled playback stopped, immediately remove session
    if (stopped) {
      this.activeSessions.delete(sessionId);
      this.lastDbSyncMap.delete(sessionId);
      return;
    }

    const duration = Math.max(1, Math.floor(data.duration || 1));
    const currentTime = Math.max(0, Math.floor(data.currentTime || 0));
    const progressPercent = Math.min(100, Math.round((currentTime / duration) * 100));

    const existing = this.activeSessions.get(sessionId);
    const now = new Date();

    const session: ActiveViewerSession = {
      sessionId,
      userId: data.userId || existing?.userId,
      profileId: data.profileId || existing?.profileId,
      username: data.username || existing?.username || "Khách (Guest)",
      email: data.email || existing?.email,
      avatarUrl: data.avatarUrl || existing?.avatarUrl,
      role: data.role || existing?.role,
      isGuest: !data.userId && !existing?.userId,
      movieId: data.movieId || existing?.movieId || "",
      movieTitle: data.movieTitle || existing?.movieTitle || "Đang xem phim",
      movieSlug: data.movieSlug || existing?.movieSlug,
      posterUrl: data.posterUrl || existing?.posterUrl,
      backdropUrl: data.backdropUrl || existing?.backdropUrl,
      episodeId: data.episodeId || existing?.episodeId,
      episodeTitle: data.episodeTitle || existing?.episodeTitle,
      currentTime,
      duration,
      progressPercent,
      isPaused: Boolean(data.isPaused),
      device: data.device || existing?.device || "Web Browser",
      ipAddress: data.ipAddress || existing?.ipAddress,
      startedAt: existing?.startedAt || now,
      lastHeartbeatAt: now
    };

    this.activeSessions.set(sessionId, session);

    // Sync to PostgreSQL DB (prisma.watchHistory) periodically if user has profileId
    const lastSync = this.lastDbSyncMap.get(sessionId) || 0;
    if (data.profileId && data.movieId && currentTime > 5 && Date.now() - lastSync > 25_000) {
      this.lastDbSyncMap.set(sessionId, Date.now());
      this.syncWatchHistoryToDb(data.profileId, data.movieId, currentTime, duration, data.episodeId);
    }
  }

  private async syncWatchHistoryToDb(
    profileId: string,
    movieId: string,
    currentTime: number,
    duration: number,
    episodeId?: string
  ) {
    try {
      await prisma.watchHistory.upsert({
        where: {
          profileId_movieId_episodeId: {
            profileId,
            movieId,
            episodeId: episodeId ?? ""
          }
        },
        update: {
          progressSeconds: currentTime,
          durationSeconds: duration,
          completed: currentTime / duration > 0.9,
          lastWatchedAt: new Date()
        },
        create: {
          profileId,
          movieId,
          episodeId: episodeId ?? "",
          progressSeconds: currentTime,
          durationSeconds: duration,
          completed: currentTime / duration > 0.9
        }
      });
    } catch (e) {
      // Ignore sync error if profile/movie not yet in Postgres
    }
  }

  public async getActiveTelemetry() {
    const now = Date.now();
    const TIMEOUT_MS = 20_000; // Sessions without heartbeat in 20s are deemed offline

    // Clean up stale sessions
    for (const [id, s] of this.activeSessions.entries()) {
      if (now - s.lastHeartbeatAt.getTime() > TIMEOUT_MS) {
        this.activeSessions.delete(id);
        this.lastDbSyncMap.delete(id);
      }
    }

    const allSessions = Array.from(this.activeSessions.values());
    // Alive sessions: any session reporting heartbeat within 20s (both playing and paused)
    const aliveSessions = allSessions
      .filter((s) => now - s.lastHeartbeatAt.getTime() <= TIMEOUT_MS)
      .sort((a, b) => b.lastHeartbeatAt.getTime() - a.lastHeartbeatAt.getTime());

    // Top movies being watched right now
    const movieCountMap = new Map<string, { movieId: string; title: string; posterUrl?: string; count: number }>();
    for (const v of aliveSessions) {
      const existing = movieCountMap.get(v.movieId) || {
        movieId: v.movieId,
        title: v.movieTitle,
        posterUrl: v.posterUrl,
        count: 0
      };
      existing.count += 1;
      movieCountMap.set(v.movieId, existing);
    }
    const topWatchingMovies = Array.from(movieCountMap.values()).sort((a, b) => b.count - a.count);

    // Get real recent watch history from PostgreSQL
    let recentHistory: any[] = [];
    try {
      const dbHistory = await prisma.watchHistory.findMany({
        take: 10,
        orderBy: { lastWatchedAt: "desc" },
        include: {
          movie: {
            select: { id: true, title: true, slug: true, posterUrl: true, backdropUrl: true, releaseYear: true }
          },
          profile: {
            include: {
              user: {
                select: { id: true, username: true, email: true, avatarUrl: true, role: true }
              }
            }
          }
        }
      });

      recentHistory = dbHistory.map((h) => ({
        id: h.id,
        movieTitle: h.movie?.title || "Phim",
        posterUrl: h.movie?.posterUrl,
        username: h.profile?.user?.username || h.profile?.name || "Người xem",
        email: h.profile?.user?.email,
        avatarUrl: h.profile?.avatarUrl || h.profile?.user?.avatarUrl,
        progressSeconds: h.progressSeconds,
        durationSeconds: h.durationSeconds,
        progressPercent: h.durationSeconds > 0 ? Math.round((h.progressSeconds / h.durationSeconds) * 100) : 0,
        completed: h.completed,
        lastWatchedAt: h.lastWatchedAt
      }));
    } catch {
      recentHistory = [];
    }

    return {
      totalActive: aliveSessions.length,
      totalTabsOpen: aliveSessions.length,
      activeViewers: aliveSessions,
      topWatchingMovies,
      recentHistory,
      timestamp: new Date().toISOString()
    };
  }
}

export const telemetryService = new TelemetryService();
