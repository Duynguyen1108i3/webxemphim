import { create } from "zustand";
import type { NormalizedMovie } from "../lib/movieApi";

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
  scrollPosition: number;
  openDetailModal: (movie: NormalizedMovie, elementId: string) => void;
  closeDetailModal: () => void;
  openPlayback: (movie: NormalizedMovie, elementId: string) => void;
  closePlayback: () => void;
  myList: NormalizedMovie[];
  toggleMyList: (movie: NormalizedMovie) => void;
  watchHistory: WatchHistoryItem[];
  updateWatchHistory: (movie: NormalizedMovie, currentTime: number, duration: number, episodeId?: string, episodeTitle?: string) => void;
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  activeMovieDetail: null,
  activePlayback: null,
  clickedElementId: null,
  scrollPosition: 0,
  myList: (() => {
    try {
      const stored = localStorage.getItem("streamforge:mylist");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })(),

  toggleMyList: (movie) => {
    set((state) => {
      const exists = state.myList.some((item) => item.id === movie.id);
      let updated;
      if (exists) {
        updated = state.myList.filter((item) => item.id !== movie.id);
      } else {
        updated = [...state.myList, movie];
      }
      localStorage.setItem("streamforge:mylist", JSON.stringify(updated));
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

  openPlayback: (movie, elementId) => {
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
        const stored = localStorage.getItem("streamforge:watchhistory");
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
      };
    });
  },

  watchHistory: (() => {
    try {
      const stored = localStorage.getItem("streamforge:watchhistory");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })(),

  updateWatchHistory: (movie, currentTime, duration, episodeId, episodeTitle) => {
    set((state) => {
      if (!movie) return {};
      // Calculate progress percentage
      const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
      
      // Don't record very short views or completed videos (e.g. within 10 seconds of end)
      if (currentTime < 5 || (duration > 0 && currentTime > duration - 10)) {
        // Just remove from history if finished!
        const updated = state.watchHistory.filter((item) => item.id !== movie.id);
        localStorage.setItem("streamforge:watchhistory", JSON.stringify(updated));
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
      localStorage.setItem("streamforge:watchhistory", JSON.stringify(updated));
      return { watchHistory: updated };
    });
  },
}));
