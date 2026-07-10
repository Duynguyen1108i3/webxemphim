import { create } from "zustand";
import type { NormalizedMovie } from "../lib/movieApi";
import { useAuthStore } from "./auth";

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
      const email = user?.email || "";
      const mylistKey = email ? `streamforge:${email}:mylist` : "streamforge:mylist";
      const historyKey = email ? `streamforge:${email}:watchhistory` : "streamforge:watchhistory";

      const storedList = localStorage.getItem(mylistKey);
      const storedHistory = localStorage.getItem(historyKey);

      set({
        myList: storedList ? JSON.parse(storedList) : [],
        watchHistory: storedHistory ? JSON.parse(storedHistory) : []
      });
    } catch (e) {
      console.error("Failed to load user-scoped data:", e);
    }
  },

  toggleMyList: (movie) => {
    set((state) => {
      const exists = state.myList.some((item) => item.id === movie.id);
      let updated;
      if (exists) {
        updated = state.myList.filter((item) => item.id !== movie.id);
      } else {
        updated = [...state.myList, movie];
      }
      
      const user = useAuthStore.getState().user;
      const mylistKey = user?.email ? `streamforge:${user.email}:mylist` : "streamforge:mylist";
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
      } catch (e) {
        console.error("Failed to read watch history:", e);
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
