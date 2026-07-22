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
  toggleMyList: (movie: NormalizedMovie) => void;
  watchHistory: WatchHistoryItem[];
  updateWatchHistory: (movie: NormalizedMovie, currentTime: number, duration: number, episodeId?: string, episodeTitle?: string) => void;
  removeFromWatchHistory: (movieId: string) => void;
  loadUserData: () => void;
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  activeMovieDetail: null,
  activePlayback: null,
  clickedElementId: null,
  activeCustomUrl: null,
  scrollPosition: 0,
  myList: [],
  watchHistory: [],

  loadUserData: () => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        set({ myList: [], watchHistory: [] });
        return;
      }

      const profileName = useAuthStore.getState().profileId || user.username;
      const dbProfileId = user.profiles.find((profile) => profile.name === profileName)?.id ?? user.profiles[0]?.id;

      if (!dbProfileId) return;

      const email = user.email || "";
      const mylistKey = `rytoxgroup:${email}:mylist`;
      const fallbackMylistKey = `streamforge:${email}:mylist`;

      // 1. Fetch My List from PostgreSQL DB via Express backend
      const mapFavorites = (favorites: NormalizedMovie[]) => {
        return favorites.map((m) => {
          if (m.id === "ten-cau-la-gi" || m.title?.includes("Tên Cậu Là Gì")) {
            return { ...m, runtimeMinutes: 106 };
          }
          return m;
        });
      };

      // Flush sync queue first before querying the latest list
      flushSyncQueue(dbProfileId)
        .then(() => {
          return authApi.request<{ favorites: NormalizedMovie[] }>(`/users/profiles/${dbProfileId}/my-list`);
        })
        .then((data) => {
          if (data?.favorites) {
            const mapped = mapFavorites(data.favorites);
            set({ myList: mapped });
            localStorage.setItem(mylistKey, JSON.stringify(mapped)); // Sync cache
            localStorage.setItem(fallbackMylistKey, JSON.stringify(mapped));
          }
        })
        .catch(() => {
          const storedList = localStorage.getItem(mylistKey) || localStorage.getItem(fallbackMylistKey);
          const parsed = storedList ? JSON.parse(storedList) : [];
          set({ myList: mapFavorites(parsed) });
        });

      // 2. Fetch watch history (standard local storage fallback)
      const historyKey = `rytoxgroup:${email}:watchhistory`;
      const fallbackHistoryKey = `streamforge:${email}:watchhistory`;
      const storedHistory = localStorage.getItem(historyKey) || localStorage.getItem(fallbackHistoryKey);
      set({ watchHistory: storedHistory ? JSON.parse(storedHistory) : [] });
    } catch {
    }
  },

  toggleMyList: (movie) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const profileName = useAuthStore.getState().profileId || user.username;
    const dbProfileId = user.profiles.find((profile) => profile.name === profileName)?.id ?? user.profiles[0]?.id;
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
        updated = [...state.myList, movie];

        // Try to add to PostgreSQL DB, queue on failure
        authApi.request(`/users/profiles/${dbProfileId}/my-list`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(movie)
        }).catch(() => {
          queueSyncAction(dbProfileId, { movieId: movie.id, action: "ADD", movie });
        });
      }
      
      localStorage.setItem(mylistKey, JSON.stringify(updated));
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
        const user = useAuthStore.getState().user;
        const historyKey = user?.email ? `streamforge:${user.email}:watchhistory` : "streamforge:watchhistory";
        const stored = localStorage.getItem(historyKey);
        const history: any[] = stored ? JSON.parse(stored) : [];
        const item = history.find((x) => x.id === movie.id);
        if (item && item.episodeId) {
          episodeId = item.episodeId;
        }
      } catch {
      }
    }

    set({
      activePlayback: movie,
      activeEpisodeId: episodeId,
      clickedElementId: elementId,
      scrollPosition: scrollY,
      activeCustomUrl: customUrl || null
    });
  },

  closePlayback: () => {
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
      // Calculate progress percentage
      const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
      
      const user = useAuthStore.getState().user;
      const historyKey = user?.email ? `streamforge:${user.email}:watchhistory` : "streamforge:watchhistory";

      // Don't record very short views or completed videos (e.g. within 10 seconds of end)
      if (currentTime < 5 || (duration > 0 && currentTime > duration - 10)) {
        // Just remove from history if finished!
        const updated = state.watchHistory.filter((item) => item.id !== movie.id);
        localStorage.setItem(historyKey, JSON.stringify(updated));
        return { watchHistory: updated };
      }

      // Filter out existing item
      const filtered = state.watchHistory.filter((item) => item.id !== movie.id);
      
      // Construct item
      const newItem: WatchHistoryItem = {
        id: movie.id,
        slug: movie.slug,
        title: movie.title,
        backdropUrl: movie.backdropUrl,
        posterUrl: movie.posterUrl,
        currentTime,
        duration,
        progress,
        movieData: movie,
        episodeId,
        episodeTitle,
      };

      // Put at the beginning
      const updated = [newItem, ...filtered].slice(0, 12);
      localStorage.setItem(historyKey, JSON.stringify(updated));
      return { watchHistory: updated };
    });
  },

  removeFromWatchHistory: (movieId) => {
    set((state) => {
      const user = useAuthStore.getState().user;
      const historyKey = user?.email ? `streamforge:${user.email}:watchhistory` : "streamforge:watchhistory";
      const updated = state.watchHistory.filter((item) => item.id !== movieId);
      localStorage.setItem(historyKey, JSON.stringify(updated));
      return { watchHistory: updated };
    });
  },
}));
