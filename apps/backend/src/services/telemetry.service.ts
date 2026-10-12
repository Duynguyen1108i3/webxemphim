import { prisma, isDbCircuitOpen, markDbOffline } from "../lib/prisma.js";

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

export interface UserPresenceRecord {
  userId: string;
  email?: string;
  username?: string;
  currentPath?: string;
  lastSeenAt: Date;
}

class TelemetryService {
  private activeSessions = new Map<string, ActiveViewerSession>();
  private userPresenceMap = new Map<string, UserPresenceRecord>();
  private lastDbSyncMap = new Map<string, number>();
  private cachedRecentHistory: any[] = [];
  private lastHistoryFetchAt = 0;

  public recordUserPresence(data: {
    userId: string;
    email?: string;
    username?: string;
    currentPath?: string;
    offline?: boolean;
  }) {
    if (!data.userId && !data.email) return;
    if (data.offline) {
      this.removeUserPresence(data.userId, data.email);
      return;
    }
    const now = new Date();
    const record: UserPresenceRecord = {
      userId: data.userId,
      email: data.email?.toLowerCase(),
      username: data.username,
      currentPath: data.currentPath,
      lastSeenAt: now
    };
    if (data.userId) {
      this.userPresenceMap.set(data.userId, record);
    }
    if (data.email) {
      this.userPresenceMap.set(data.email.toLowerCase(), record);
    }
  }

  public removeUserPresence(userId?: string, email?: string) {
    if (userId) this.userPresenceMap.delete(userId);
    if (email) this.userPresenceMap.delete(email.toLowerCase());
    for (const [sid, session] of this.activeSessions.entries()) {
      if (
        (userId && session.userId === userId) ||
        (email && session.email?.toLowerCase() === email.toLowerCase())
      ) {
        this.activeSessions.delete(sid);
        this.lastDbSyncMap.delete(sid);
      }
    }
  }

  public getUserRealtimeStatus(userId: string, email?: string) {
    const now = Date.now();
    const PRESENCE_TIMEOUT_MS = 45_000;
    const PLAYBACK_TIMEOUT_MS = 35_000;
    const normalizedEmail = email?.toLowerCase();

    // Check if user is actively watching a movie right now
    for (const session of this.activeSessions.values()) {
      if (now - session.lastHeartbeatAt.getTime() <= PLAYBACK_TIMEOUT_MS) {
        if (
          (userId && session.userId === userId) ||
          (normalizedEmail && session.email?.toLowerCase() === normalizedEmail)
        ) {
          return {
            isOnline: true,
            isWatching: true,
            watchingMovieTitle: session.movieTitle || "Đang xem phim",
            lastSeenAt: session.lastHeartbeatAt.toISOString()
          };
        }
      }
    }

    const presence =
      (userId ? this.userPresenceMap.get(userId) : undefined) ||
      (normalizedEmail ? this.userPresenceMap.get(normalizedEmail) : undefined);

    if (presence) {
      const isOnline = now - presence.lastSeenAt.getTime() <= PRESENCE_TIMEOUT_MS;
      return {
        isOnline,
        isWatching: false,
        watchingMovieTitle: null,
        lastSeenAt: presence.lastSeenAt.toISOString()
      };
    }

    return {
      isOnline: false,
      isWatching: false,
      watchingMovieTitle: null,
      lastSeenAt: null
    };
  }

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

    if (data.userId || data.email) {
      this.recordUserPresence({
        userId: data.userId || "",
        email: data.email,
        username: data.username
      });
    }

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
    if (!isDbCircuitOpen() && data.profileId && data.movieId && currentTime > 5 && Date.now() - lastSync > 25_000) {
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
    if (isDbCircuitOpen()) return;
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
    } catch {
      markDbOffline();
    }
  }

  public async getActiveTelemetry() {
    const now = Date.now();
    const TIMEOUT_MS = 35_000; // Sessions without heartbeat in 35s are deemed offline

    // Clean up stale sessions
    for (const [id, s] of this.activeSessions.entries()) {
      if (now - s.lastHeartbeatAt.getTime() > TIMEOUT_MS) {
        this.activeSessions.delete(id);
        this.lastDbSyncMap.delete(id);
      }
    }

    const allSessions = Array.from(this.activeSessions.values());
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

    // Get real recent watch history from PostgreSQL (cached for 15s & skipped when DB circuit is open)
    if (!isDbCircuitOpen() && now - this.lastHistoryFetchAt > 15_000) {
      this.lastHistoryFetchAt = now;
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

        this.cachedRecentHistory = dbHistory.map((h) => ({
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
        markDbOffline();
      }
    }

    return {
      totalActive: aliveSessions.length,
      totalTabsOpen: aliveSessions.length,
      activeViewers: aliveSessions,
      topWatchingMovies,
      recentHistory: this.cachedRecentHistory,
      timestamp: new Date().toISOString()
    };
  }
}

export const telemetryService = new TelemetryService();
