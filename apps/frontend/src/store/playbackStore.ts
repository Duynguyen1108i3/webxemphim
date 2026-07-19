import { create } from "zustand";
import type { NormalizedMovie } from "../lib/movieApi";
import { authApi, useAuthStore } from "./auth";

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

interface PlaybackState {
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

      // 1. Fetch My List from PostgreSQL DB via Express backend
      const mapFavorites = (favorites: NormalizedMovie[]) => {
        return favorites.map((m) => {
          if (m.id === "ten-cau-la-gi" || m.title?.includes("Tên Cậu Là Gì")) {
            return { ...m, runtimeMinutes: 106 };
          }
          return m;
        });
      };

      authApi.request<{ favorites: NormalizedMovie[] }>(`/users/profiles/${dbProfileId}/my-list`)
        .then((data) => {
          if (data?.favorites) {
            set({ myList: mapFavorites(data.favorites) });
          }
        })
        .catch(() => {
          const email = user.email || "";
          const mylistKey = `streamforge:${email}:mylist`;
          const storedList = localStorage.getItem(mylistKey);
          const parsed = storedList ? JSON.parse(storedList) : [];
          set({ myList: mapFavorites(parsed) });
        });

      // 2. Fetch watch history (standard local storage fallback)
      const email = user.email || "";
      const historyKey = `streamforge:${email}:watchhistory`;
      const storedHistory = localStorage.getItem(historyKey);
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

    set((state) => {
      const exists = state.myList.some((item) => item.id === movie.id);
      let updated;
      if (exists) {
        updated = state.myList.filter((item) => item.id !== movie.id);

        // Async delete from PostgreSQL DB
        void authApi.request(`/users/profiles/${dbProfileId}/my-list/${movie.id}`, { method: "DELETE" }).catch(() => undefined);
      } else {
        updated = [...state.myList, movie];

        // Async add to PostgreSQL DB
        void authApi.request(`/users/profiles/${dbProfileId}/my-list`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(movie)
        }).catch(() => undefined);
      }
      
      const email = user.email || "";
      const mylistKey = `streamforge:${email}:mylist`;
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
