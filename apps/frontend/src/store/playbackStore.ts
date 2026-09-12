import { create } from "zustand";
import type { NormalizedMovie } from "../lib/movieApi";
import { authApi, useAuthStore } from "./auth";

interface SyncAction {
  movieId: string;
  action: "ADD" | "REMOVE";
  movie?: NormalizedMovie;
}

const getSyncQueueKey = (profileId: string) => `rytoxgroup:${profileId}:mylist_sync_queue`;

const queueSyncAction = (profileId: string, action: SyncAction) => {
  try {
    const key = getSyncQueueKey(profileId);
    const fallbackKey = `streamforge:${profileId}:mylist_sync_queue`;
    const queue = JSON.parse(localStorage.getItem(key) || localStorage.getItem(fallbackKey) || "[]");
    queue.push(action);
    localStorage.setItem(key, JSON.stringify(queue));
    localStorage.setItem(fallbackKey, JSON.stringify(queue));
  } catch (e) {
    console.error("Failed to queue sync action:", e);
  }
};

const flushSyncQueue = async (profileId: string): Promise<void> => {
  const key = getSyncQueueKey(profileId);
  const fallbackKey = `streamforge:${profileId}:mylist_sync_queue`;
  let queue: SyncAction[] = [];
  try {
    queue = JSON.parse(localStorage.getItem(key) || localStorage.getItem(fallbackKey) || "[]");
  } catch {
    return;
  }
  if (queue.length === 0) return;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    try {
      if (item.action === "ADD" && item.movie) {
        await authApi.request(`/users/profiles/${profileId}/my-list`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(item.movie)
        });
      } else if (item.action === "REMOVE") {
        await authApi.request(`/users/profiles/${profileId}/my-list/${item.movieId}`, {
          method: "DELETE"
        });
      }
    } catch (e) {
      // Keep remaining items in the queue and stop flushing
      const remaining = queue.slice(i);
      localStorage.setItem(key, JSON.stringify(remaining));
      localStorage.setItem(fallbackKey, JSON.stringify(remaining));
      return;
    }
  }
  localStorage.removeItem(key);
  localStorage.removeItem(fallbackKey);
};

export interface WatchHistoryItem {
  id: string;
  slug: string;
  title: string;
  backdropUrl: string;
  posterUrl: string;
  currentTime: number;
  duration: number;
  progress: number; // percentage 0-100
  movieData: NormalizedMovie;
  episodeId?: string;
  episodeTitle?: string;
}

export interface PlaybackState {
  activeMovieDetail: NormalizedMovie | null;
  activePlayback: NormalizedMovie | null;
  activeEpisodeId: string | null;
  clickedElementId: string | null;
  activeCustomUrl: string | null;
  scrollPosition: number;
  openDetailModal: (movie: NormalizedMovie, elementId: string) => void;
  closeDetailModal: () => void;
  openPlayback: (movie: NormalizedMovie, elementId: string, customUrl?: string) => void;
  closePlayback: () => void;
  myList: NormalizedMovie[];
  isMyListLoading: boolean;
  toggleMyList: (movie: NormalizedMovie) => void;
  authModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  watchHistory: WatchHistoryItem[];
  updateWatchHistory: (movie: NormalizedMovie, currentTime: number, duration: number, episodeId?: string, episodeTitle?: string) => void;
  removeFromWatchHistory: (movieId: string) => void;
  loadUserData: () => void;
}

const getWatchHistoryStorageKeys = () => {
  const user = useAuthStore.getState().user;
  const email = user?.email || "";
  const key = email ? `rytoxgroup:${email}:watchhistory` : "rytoxgroup:guest:watchhistory";
  const fallbackKey = email ? `streamforge:${email}:watchhistory` : "streamforge:guest:watchhistory";
  return { key, fallbackKey };
};

const getMyListStorageKeys = () => {
  const user = useAuthStore.getState().user;
  const email = user?.email || "";
  const key = email ? `rytoxgroup:${email}:mylist` : "rytoxgroup:guest:mylist";
  const fallbackKey = email ? `streamforge:${email}:mylist` : "streamforge:guest:mylist";
  return { key, fallbackKey };
};

const getInitialMyList = (): NormalizedMovie[] => {
  try {
    const user = useAuthStore.getState().user;
    const email = user?.email || "";
    const key = email ? `rytoxgroup:${email}:mylist` : "rytoxgroup:guest:mylist";
    const fallbackKey = email ? `streamforge:${email}:mylist` : "streamforge:guest:mylist";
    const stored = localStorage.getItem(key) || localStorage.getItem(fallbackKey);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const usePlaybackStore = create<PlaybackState>((set) => ({
  activeMovieDetail: null,
  activePlayback: null,
  clickedElementId: null,
  activeCustomUrl: null,
  scrollPosition: 0,
  myList: getInitialMyList(),
  isMyListLoading: false,
  authModalOpen: false,
  openAuthModal: () => set({ authModalOpen: true }),
  closeAuthModal: () => set({ authModalOpen: false }),
  watchHistory: [],

  loadUserData: () => {
    try {
      const { key: historyKey, fallbackKey: fallbackHistoryKey } = getWatchHistoryStorageKeys();
      const storedHistory = localStorage.getItem(historyKey) || localStorage.getItem(fallbackHistoryKey) || localStorage.getItem("streamforge:watchhistory");
      const parsedHistory = storedHistory ? JSON.parse(storedHistory) : [];

      // Rehydrate active playback session on F5 refresh if stored in sessionStorage
      let activePlaybackFromSession: NormalizedMovie | null = null;
      let activeEpisodeIdFromSession: string | null = null;
      let clickedElementIdFromSession: string | null = null;
      let activeCustomUrlFromSession: string | null = null;

      try {
        const activeSessionStr = sessionStorage.getItem("streamforge:activePlayback");
        if (activeSessionStr) {
          const activeData = JSON.parse(activeSessionStr);
          if (activeData?.movie) {
            activePlaybackFromSession = activeData.movie;
            activeEpisodeIdFromSession = activeData.episodeId || null;
            clickedElementIdFromSession = activeData.elementId || null;
            activeCustomUrlFromSession = activeData.customUrl || null;
          }
        }
      } catch {}

      const user = useAuthStore.getState().user;
      if (!user) {
        set({
          myList: [],
          isMyListLoading: false,
          watchHistory: parsedHistory,
          activePlayback: activePlaybackFromSession,
          activeEpisodeId: activeEpisodeIdFromSession,
          clickedElementId: clickedElementIdFromSession,
          activeCustomUrl: activeCustomUrlFromSession
        });
        return;
      }

      const profileName = useAuthStore.getState().profileId || user.username;
      const dbProfileId = user.profiles?.find((profile) => profile.name === profileName || profile.id === profileName)?.id ?? user.profiles?.[0]?.id;

      const { key: mylistKey, fallbackKey: fallbackMylistKey } = getMyListStorageKeys();
      const storedList = localStorage.getItem(mylistKey) || localStorage.getItem(fallbackMylistKey);
      const parsedCached = storedList ? JSON.parse(storedList) : [];

      const mapFavorites = (favorites: NormalizedMovie[]) => {
        return favorites.map((m) => {
          if (m.id === "ten-cau-la-gi" || m.title?.includes("Tên Cậu Là Gì")) {
            return { ...m, runtimeMinutes: 106 };
          }
          return m;
        });
      };

      const cachedFavorites = mapFavorites(parsedCached);

      if (!dbProfileId) {
        set({
          myList: cachedFavorites,
          isMyListLoading: false,
          watchHistory: parsedHistory,
          activePlayback: activePlaybackFromSession,
          activeEpisodeId: activeEpisodeIdFromSession,
          clickedElementId: clickedElementIdFromSession,
          activeCustomUrl: activeCustomUrlFromSession
        });
        return;
      }

      // Immediately set cached myList so the screen is never blank while fetching
      set((state) => ({
        myList: cachedFavorites.length > 0 ? cachedFavorites : state.myList,
        isMyListLoading: true,
        watchHistory: parsedHistory,
        activePlayback: activePlaybackFromSession,
        activeEpisodeId: activeEpisodeIdFromSession,
        clickedElementId: clickedElementIdFromSession,
        activeCustomUrl: activeCustomUrlFromSession
      }));

      // Flush sync queue first before querying the latest list
      flushSyncQueue(dbProfileId)
        .then(() => {
          return authApi.request<{ favorites: NormalizedMovie[] }>(`/users/profiles/${dbProfileId}/my-list`);
        })
        .then((data) => {
          if (data?.favorites) {
            const mapped = mapFavorites(data.favorites);
            set({
              myList: mapped,
              isMyListLoading: false
            });
            localStorage.setItem(mylistKey, JSON.stringify(mapped)); // Sync cache
            localStorage.setItem(fallbackMylistKey, JSON.stringify(mapped));
          } else {
            set({ isMyListLoading: false });
          }
        })
        .catch(() => {
          const fallbackStoredList = localStorage.getItem(mylistKey) || localStorage.getItem(fallbackMylistKey);
          const parsed = fallbackStoredList ? JSON.parse(fallbackStoredList) : [];
          set({
            myList: mapFavorites(parsed),
            isMyListLoading: false
          });
        });
    } catch {
      set({ isMyListLoading: false });
    }
  },

  toggleMyList: (movie) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ authModalOpen: true });
      return;
    }

    const profileName = useAuthStore.getState().profileId || user.username;
    const dbProfileId = user.profiles?.find((profile) => profile.name === profileName || profile.id === profileName)?.id ?? user.profiles?.[0]?.id;
    if (!dbProfileId) return;

    const email = user.email || "";
    const mylistKey = `rytoxgroup:${email}:mylist`;
    const fallbackMylistKey = `streamforge:${email}:mylist`;

    set((state) => {
      const exists = state.myList.some((item) => item.id === movie.id);
      let updated;
      if (exists) {
        updated = state.myList.filter((item) => item.id !== movie.id);

        // Try to delete from PostgreSQL DB, queue on failure
        authApi.request(`/users/profiles/${dbProfileId}/my-list/${movie.id}`, { method: "DELETE" })
          .catch(() => {
            queueSyncAction(dbProfileId, { movieId: movie.id, action: "REMOVE" });
          });
      } else {
        const movieToSave: NormalizedMovie = {
          ...movie,
          id: movie.id,
          slug: movie.slug || movie.id,
          title: movie.title,
          posterUrl: movie.posterUrl || movie.backdropUrl || "",
          backdropUrl: movie.backdropUrl || movie.posterUrl || "",
          releaseYear: movie.releaseYear || 2026,
          runtimeMinutes: movie.runtimeMinutes || 120,
          averageRating: movie.averageRating || 0,
        };
        updated = [movieToSave, ...state.myList.filter((item) => item.id !== movie.id)];

        // Try to add to PostgreSQL DB, queue on failure
        authApi.request(`/users/profiles/${dbProfileId}/my-list`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(movieToSave)
        }).catch(() => {
          queueSyncAction(dbProfileId, { movieId: movie.id, action: "ADD", movie: movieToSave });
        });
      }
      
      localStorage.setItem(mylistKey, JSON.stringify(updated));
      localStorage.setItem(fallbackMylistKey, JSON.stringify(updated));
      return { myList: updated };
    });
  },


  openDetailModal: (movie, elementId) => {
    const scrollY = window.scrollY;
    // Set body overflow hidden to prevent background scrolling
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
    
    set({
      activeMovieDetail: movie,
      clickedElementId: elementId,
      scrollPosition: scrollY,
    });
  },

  closeDetailModal: () => {
    set((state) => {
      // Restore body scrolling
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, state.scrollPosition);

      return {
        activeMovieDetail: null,
        clickedElementId: null,
      };
    });
  },

  activeEpisodeId: null,

  openPlayback: (movie, elementId, customUrl) => {
    const scrollY = window.scrollY;
    // Set body overflow hidden
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";

    // Resolve episode ID: check elementId prefix or fallback to localStorage history
    let episodeId: string | null = null;
    if (elementId.startsWith("episode-")) {
      episodeId = elementId.replace("episode-", "");
    } else {
      try {
        const { key: historyKey, fallbackKey: fallbackHistoryKey } = getWatchHistoryStorageKeys();
        const stored = localStorage.getItem(historyKey) || localStorage.getItem(fallbackHistoryKey) || localStorage.getItem("streamforge:watchhistory");
        const history: any[] = stored ? JSON.parse(stored) : [];
        const item = history.find((x) => x.id === movie.id);
        if (item && item.episodeId) {
          episodeId = item.episodeId;
        }
      } catch {
      }
    }

    try {
      sessionStorage.setItem("streamforge:activePlayback", JSON.stringify({
        movie,
        episodeId,
        elementId,
        customUrl: customUrl || null
      }));
    } catch {}

    // Set active playback state
    set((state) => {
      const { key: historyKey, fallbackKey: fallbackHistoryKey } = getWatchHistoryStorageKeys();
      const existing = state.watchHistory.find((item) => item.id === movie.id);
      
      let updatedHistory = state.watchHistory;
      // If user is reopening a previously watched movie, bump it to the top of Continue Watching
      if (existing) {
        const filtered = state.watchHistory.filter((item) => item.id !== movie.id);
        updatedHistory = [existing, ...filtered];
        localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
        localStorage.setItem(fallbackHistoryKey, JSON.stringify(updatedHistory));
      }

      return {
        activePlayback: movie,
        activeEpisodeId: episodeId,
        clickedElementId: elementId,
        scrollPosition: scrollY,
        activeCustomUrl: customUrl || null,
        watchHistory: updatedHistory,
      };
    });
  },

  closePlayback: () => {
    try {
      sessionStorage.removeItem("streamforge:activePlayback");
    } catch {}

    set((state) => {
      // Restore body scrolling
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, state.scrollPosition);

      return {
        activePlayback: null,
        activeEpisodeId: null,
        clickedElementId: null,
        activeCustomUrl: null
      };
    });
  },

  updateWatchHistory: (movie, currentTime, duration, episodeId, episodeTitle) => {
    set((state) => {
      if (!movie) return {};
      
      // Ignore invalid or 0-duration updates
      if (!currentTime || currentTime < 1 || !duration || duration <= 0) {
        return {};
      }

      // Calculate EXACT real progress percentage
      const progress = Math.min(100, Math.max(1, (currentTime / duration) * 100));
      const { key: historyKey, fallbackKey: fallbackHistoryKey } = getWatchHistoryStorageKeys();

      // Filter out existing item
      const filtered = state.watchHistory.filter((item) => item.id !== movie.id);

      // If completed (> 95% or within 15s of end when duration > 30s), remove from continue watching
      if (duration > 30 && currentTime > duration - 15) {
        localStorage.setItem(historyKey, JSON.stringify(filtered));
        localStorage.setItem(fallbackHistoryKey, JSON.stringify(filtered));
        return { watchHistory: filtered };
      }

      // Construct item with REAL currentTime & REAL duration & REAL progress
      const newItem: WatchHistoryItem = {
        id: movie.id,
        slug: movie.slug,
        title: movie.title,
        backdropUrl: movie.backdropUrl,
        posterUrl: movie.posterUrl,
        currentTime: Math.floor(currentTime),
        duration: Math.floor(duration),
        progress: Math.round(progress),
        movieData: movie,
        episodeId,
        episodeTitle,
      };

      // Put at the beginning
      const updated = [newItem, ...filtered].slice(0, 12);
      localStorage.setItem(historyKey, JSON.stringify(updated));
      localStorage.setItem(fallbackHistoryKey, JSON.stringify(updated));
      return { watchHistory: updated };
    });
  },

  removeFromWatchHistory: (movieId) => {
    set((state) => {
      const { key: historyKey, fallbackKey: fallbackHistoryKey } = getWatchHistoryStorageKeys();
      const updated = state.watchHistory.filter((item) => item.id !== movieId);
      localStorage.setItem(historyKey, JSON.stringify(updated));
      localStorage.setItem(fallbackHistoryKey, JSON.stringify(updated));
      return { watchHistory: updated };
    });
  },
}));

// Load initial user watch history & list on module load
usePlaybackStore.getState().loadUserData();
