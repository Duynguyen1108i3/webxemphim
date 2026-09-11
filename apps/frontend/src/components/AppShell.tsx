import { Bell, Lock, Menu, Search, X, Sliders, ChevronDown, Globe, User, LogIn, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { usePlaybackStore } from "../store/playbackStore";
import { CinematicDetailModal } from "./CinematicDetailModal";
import { CinematicPlayerOverlay } from "./CinematicPlayerOverlay";
import { Footer } from "./Footer";
import { AuthPromptModal } from "./AuthPromptModal";
import { movieApi, type NormalizedMovie } from "../lib/movieApi";
import { MovieTile, HoverPreview } from "./MovieRow";
import { Button, Skeleton } from "@streamforge/ui";
import type { MovieCardDto } from "@streamforge/shared-types";

import { useAuthStore } from "../store/auth";
import { InteractiveNavScrubber } from "./InteractiveNavScrubber";

const iosSpringTransition = {
  type: "spring",
  stiffness: 300,
  damping: 28,
  mass: 0.85,
};

export function AppShell() {
  const { activeMovieDetail, activePlayback, activeEpisodeId, watchHistory, authModalOpen } = usePlaybackStore();
  const { user, profileId, avatarUrl, initialized, setProfileId, logout, initialize } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRestoringState, setIsRestoringState] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);

  const [glassness, setGlassness] = useState(() => {
    const val = localStorage.getItem("system-glassness");
    return val ? parseFloat(val) : 0.85;
  });
  const [ambientOpacity, setAmbientOpacity] = useState(() => {
    const val = localStorage.getItem("system-ambient-opacity");
    return val ? parseFloat(val) : 0.25;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const toggleSettings = () => setSettingsOpen(!settingsOpen);

  const applyGlassProperties = (val: number, ambient: number) => {
    const root = document.documentElement;
    root.style.setProperty("--system-glassness", String(val));
    root.style.setProperty("--glass-blur", `${Math.round(val * 32 + 6)}px`);
    root.style.setProperty("--glass-bg-opacity", `${(0.92 - val * 0.70).toFixed(3)}`);
    root.style.setProperty("--glass-border-opacity", `${(0.08 + val * 0.22).toFixed(3)}`);
    root.style.setProperty("--glass-specular-opacity", `${(0.04 + val * 0.20).toFixed(3)}`);
    root.style.setProperty("--ambient-opacity", String(ambient));
  };

  const handleGlassnessChange = (val: number) => {
    setGlassness(val);
    localStorage.setItem("system-glassness", String(val));
    applyGlassProperties(val, ambientOpacity);
  };

  const handleAmbientOpacityChange = (val: number) => {
    setAmbientOpacity(val);
    localStorage.setItem("system-ambient-opacity", String(val));
    applyGlassProperties(glassness, val);
  };

  useEffect(() => {
    applyGlassProperties(glassness, ambientOpacity);
  }, [glassness, ambientOpacity]);

  // Click outside to close settings
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Auth Guard: redirect unauthenticated users to login only for protected routes
  useEffect(() => {
    if (!initialized) return;
    if (!user && location.pathname === "/profile") {
      navigate("/login");
    } else if (user && (location.pathname === "/login" || location.pathname === "/register" || location.pathname === "/forgot-password")) {
      navigate("/");
    }
  }, [initialized, user, location.pathname, navigate]);

  // Restore modal and playback states from URL parameters on mount or query change
  useEffect(() => {
    if (!initialized) return;

    const searchParams = new URLSearchParams(location.search);
    const movieDetailSlug = searchParams.get("m");
    const watchSlug = searchParams.get("v");
    const watchEpisodeId = searchParams.get("ep");

    if (!movieDetailSlug && !watchSlug) {
      const currentDetail = usePlaybackStore.getState().activeMovieDetail;
      const currentPlayback = usePlaybackStore.getState().activePlayback;
      if (currentDetail) usePlaybackStore.getState().closeDetailModal();
      if (currentPlayback) usePlaybackStore.getState().closePlayback();
      setIsRestoringState(false);
      return;
    }

    const currentDetail = usePlaybackStore.getState().activeMovieDetail;
    const currentPlayback = usePlaybackStore.getState().activePlayback;
    const currentEpId = usePlaybackStore.getState().activeEpisodeId;

    const needsDetailFetch = movieDetailSlug && (!currentDetail || currentDetail.slug !== movieDetailSlug);
    const needsPlaybackFetch = watchSlug && (!currentPlayback || currentPlayback.slug !== watchSlug || currentEpId !== watchEpisodeId);

    if (!needsDetailFetch && !needsPlaybackFetch) {
      if (!movieDetailSlug && currentDetail) usePlaybackStore.getState().closeDetailModal();
      if (!watchSlug && currentPlayback) usePlaybackStore.getState().closePlayback();
      setIsRestoringState(false);
      return;
    }

    setIsRestoringState(true);
    let p1: Promise<any> = Promise.resolve();
    let p2: Promise<any> = Promise.resolve();

    if (needsDetailFetch && movieDetailSlug) {
      p1 = movieApi.getMovieDetail(movieDetailSlug)
        .then((detail) => {
          if (detail?.movie) {
            usePlaybackStore.getState().openDetailModal(detail.movie, "url-restore");
          }
        })
        .catch((err) => console.error("Error restoring detail modal:", err));
    }

    if (needsPlaybackFetch && watchSlug) {
      p2 = movieApi.getMovieDetail(watchSlug)
        .then((detail) => {
          if (detail?.movie) {
            usePlaybackStore.getState().openPlayback(detail.movie, "url-restore", watchEpisodeId || undefined);
          }
        })
        .catch((err) => console.error("Error restoring playback overlay:", err));
    }

    Promise.allSettled([p1, p2]).finally(() => {
      setIsRestoringState(false);
    });
  }, [initialized, location.search]);

  // Sync URL parameters when modal/playback store state changes
  useEffect(() => {
    if (!initialized) return;
    
    const searchParams = new URLSearchParams(location.search);
    let changed = false;

    if (activeMovieDetail) {
      if (searchParams.get("m") !== activeMovieDetail.slug) {
        searchParams.set("m", activeMovieDetail.slug);
        changed = true;
      }
    } else {
      if (searchParams.has("m")) {
        searchParams.delete("m");
        changed = true;
      }
    }

    if (activePlayback) {
      if (searchParams.get("v") !== activePlayback.slug) {
        searchParams.set("v", activePlayback.slug);
        changed = true;
      }
      if (activeEpisodeId) {
        if (searchParams.get("ep") !== activeEpisodeId) {
          searchParams.set("ep", activeEpisodeId);
          changed = true;
        }
      } else {
        if (searchParams.has("ep")) {
          searchParams.delete("ep");
          changed = true;
        }
      }
    } else {
      if (searchParams.has("v")) {
        searchParams.delete("v");
        changed = true;
      }
      if (searchParams.has("ep")) {
        searchParams.delete("ep");
        changed = true;
      }
    }

    if (changed) {
      navigate({ search: searchParams.toString() }, { replace: true });
    }
  }, [initialized, user, activeMovieDetail, activePlayback, activeEpisodeId, navigate, location.search]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Sync expanded state with search param q
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("q");
    if (q) {
      setSearchExpanded(true);
    }
  }, [location.search]);

  const q = new URLSearchParams(location.search).get("q") ?? "";
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Click outside detection to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
        setNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const [localQ, setLocalQ] = useState(q);
  const [hasNotification, setHasNotification] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [latestMovies, setLatestMovies] = useState<NormalizedMovie[]>([]);

  // Sync local query with URL changes
  useEffect(() => {
    setLocalQ(q);
  }, [q]);

  // Debounce search input to prevent Vietnamese Telex IME character doubling
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(location.search);
      const currentQ = params.get("q") ?? "";
      if (localQ !== currentQ) {
        if (localQ) {
          params.set("q", localQ);
        } else {
          params.delete("q");
        }
        navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localQ, navigate, location.pathname, location.search]);

  // Check for movie updates on mount to trigger live notifications
  useEffect(() => {
    let active = true;
    movieApi.getNewMovies(1).then((movies) => {
      if (!active || !movies || movies.length === 0) return;
      setLatestMovies(movies.slice(0, 5));
      
      const lastSeen = localStorage.getItem("rytoxgroup:lastSeenMovieSlug") || localStorage.getItem("streamforge:lastSeenMovieSlug");
      const newestSlug = movies[0].slug;
      
      if (lastSeen) {
        if (lastSeen !== newestSlug) {
          setHasNotification(true);
        }
      } else {
        localStorage.setItem("rytoxgroup:lastSeenMovieSlug", newestSlug);
        localStorage.setItem("streamforge:lastSeenMovieSlug", newestSlug);
      }
    }).catch((err) => console.error("Notification check failed:", err));

    return () => { active = false; };
  }, []);

  const toggleNotification = () => {
    setNotificationOpen(!notificationOpen);
    if (latestMovies.length > 0) {
      localStorage.setItem("rytoxgroup:lastSeenMovieSlug", latestMovies[0].slug);
      localStorage.setItem("streamforge:lastSeenMovieSlug", latestMovies[0].slug);
      setHasNotification(false);
    }
  };

  const [searchResults, setSearchResults] = useState<NormalizedMovie[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [hasMoreSearch, setHasMoreSearch] = useState(false);

  useEffect(() => {
    setHovered(null);
    clearOpenTimer();
    clearCloseTimer();
    if (q.length > 1) {
      setIsSearching(true);
      setSearchPage(1);
      movieApi.searchMovies(q, 1)
        .then((results) => {
          setSearchResults(results);
          setHasMoreSearch(results.length >= 20);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    } else {
      setSearchResults([]);
      setHasMoreSearch(false);
    }
  }, [q]);

  const handleLoadMoreSearch = () => {
    setHovered(null);
    clearOpenTimer();
    clearCloseTimer();
    const nextPage = searchPage + 1;
    setIsSearching(true);
    movieApi.searchMovies(q, nextPage)
      .then((results) => {
        if (results.length > 0) {
          setSearchResults((prev) => [...prev, ...results]);
          setSearchPage(nextPage);
          setHasMoreSearch(results.length >= 20);
        } else {
          setHasMoreSearch(false);
        }
      })
      .catch(() => undefined)
      .finally(() => setIsSearching(false));
  };

  const [hovered, setHovered] = useState<{ movie: MovieCardDto; anchor: HTMLElement; rect: DOMRect } | null>(null);

  const openHoverTimer = useRef<number | null>(null);
  const closeHoverTimer = useRef<number | null>(null);
  const hoverFrame = useRef<number | null>(null);

  const clearOpenTimer = () => { if (openHoverTimer.current != null) { window.clearTimeout(openHoverTimer.current); openHoverTimer.current = null; } };
  const clearCloseTimer = () => { if (closeHoverTimer.current != null) { window.clearTimeout(closeHoverTimer.current); closeHoverTimer.current = null; } };

  function scheduleHoverClose() {
    clearCloseTimer();
    clearOpenTimer();
    closeHoverTimer.current = window.setTimeout(() => setHovered(null), 180);
  }

  useEffect(() => {
    if (activeMovieDetail || activePlayback) {
      setHovered(null);
      clearOpenTimer();
      clearCloseTimer();
    }
  }, [activeMovieDetail, activePlayback]);

  useEffect(() => {
    if (!hovered) return;
    const updatePosition = () => {
      hoverFrame.current = null;
      const rect = hovered.anchor.getBoundingClientRect();
      const isOutOfView = rect.bottom < 72 || rect.top > window.innerHeight - 24 || rect.right < 0 || rect.left > window.innerWidth;
      if (isOutOfView) {
        setHovered(null);
        return;
      }
      setHovered((current) => {
        if (!current || current.anchor !== hovered.anchor) return current;
        if (
          Math.abs(current.rect.top - rect.top) < 0.5 &&
          Math.abs(current.rect.left - rect.left) < 0.5 &&
          Math.abs(current.rect.width - rect.width) < 0.5
        ) {
          return current;
        }
        return { ...current, rect };
      });
    };
    const requestPosition = () => {
      if (hoverFrame.current != null) return;
      hoverFrame.current = window.requestAnimationFrame(updatePosition);
    };
    window.addEventListener("scroll", requestPosition, { passive: true });
    window.addEventListener("resize", requestPosition);
    requestPosition();
    return () => {
      window.removeEventListener("scroll", requestPosition);
      window.removeEventListener("resize", requestPosition);
      if (hoverFrame.current != null) {
        window.cancelAnimationFrame(hoverFrame.current);
        hoverFrame.current = null;
      }
    };
  }, [hovered?.anchor]);

  const handleOpen = (movie: MovieCardDto) => {
    setHovered(null);
    clearOpenTimer();
    clearCloseTimer();
    usePlaybackStore.getState().openDetailModal(movie as NormalizedMovie, `search-${movie.id}`);
  };

  const handleGenreClick = (slug: string) => {
    setIsMobileMenuOpen(false);
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const element = document.getElementById(`row-${slug}`);
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
    } else {
      const element = document.getElementById(`row-${slug}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Reset scroll to top on page change or search/genre query changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [
    location.pathname,
    new URLSearchParams(location.search).get("q"),
    new URLSearchParams(location.search).get("genre")
  ]);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-6"
        >
          <span className="brand-logo text-2xl font-black text-white drop-shadow-[0_2px_14px_rgba(255,255,255,0.35)] tracking-tighter sm:text-3xl">RytoxGroup</span>
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />
          <p className="text-xs font-semibold text-white/35 tracking-[0.15em] uppercase animate-pulse">Đang kết nối...</p>
        </motion.div>
      </div>
    );
  }

  if (isRestoringState) {
    return (
      <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center text-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        <p className="mt-4 text-xs font-semibold text-white/50 tracking-wider uppercase animate-pulse">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white">
      {location.pathname === "/profile" ? (
        <header className="fixed inset-x-0 top-0 z-50 flex h-[68px] items-center px-4 sm:px-8 md:px-14 lg:px-16 bg-gradient-to-b from-black/60 to-transparent">
          <span className="brand-logo text-xs font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)] sm:text-sm md:text-base select-none">RytoxGroup</span>
        </header>
      ) : (
        <header 
          className={`fixed inset-x-0 top-0 z-50 flex h-[68px] items-center justify-between px-4 sm:px-8 md:px-14 lg:px-16 liquid-glass-header ${scrolled ? "scrolled" : ""}`}
        >
          <div className="flex items-center gap-2 sm:gap-7">
            {/* Hamburger menu button for mobile / collapsed navigation */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`nf-icon rounded-full hover:bg-white/10 ${searchExpanded ? "xl:hidden" : "md:hidden"}`}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
            
            <NavLink to="/" className={`brand-logo text-xs font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)] sm:text-sm md:text-base ${searchExpanded ? "hidden md:block" : ""}`}>RytoxGroup</NavLink>
            <InteractiveNavScrubber variant="header" searchExpanded={searchExpanded} />
          </div>
          <nav className="flex items-center gap-2.5 text-sm font-semibold text-white">
            {/* Inline Expanding Search Bar */}
            <div className="search-container">
              <motion.div
                initial={false}
                animate={{
                  width: searchExpanded ? (window.innerWidth < 768 ? 160 : 270) : "100%",
                  borderColor: searchExpanded ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.12)",
                  paddingLeft: searchExpanded ? 12 : 0,
                  paddingRight: searchExpanded ? 12 : 0,
                }}
                whileHover={{
                  scale: searchExpanded ? 1 : 1.04,
                  y: searchExpanded ? 0 : -2,
                }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                onMouseEnter={() => {
                  setSearchExpanded(true);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                onMouseLeave={() => {
                  if (document.activeElement !== searchInputRef.current && !localQ) {
                    setSearchExpanded(false);
                  }
                }}
                className={`absolute right-0 top-0 z-20 flex h-full items-center overflow-hidden rounded-full border select-none cursor-pointer glass-search ${searchExpanded ? "px-3.5 gap-1.5" : "justify-center gap-0"}`}
              >
                <Search
                  size={22}
                  className="text-white/80 shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                  onClick={() => {
                    setSearchExpanded(!searchExpanded);
                    if (!searchExpanded) {
                      setTimeout(() => searchInputRef.current?.focus(), 50);
                    } else {
                      const params = new URLSearchParams(location.search);
                      params.delete("q");
                      setLocalQ("");
                      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
                    }
                  }}
                />
                <motion.input
                  ref={searchInputRef}
                  type="text"
                  value={localQ}
                  onChange={(e) => setLocalQ(e.target.value)}
                  onBlur={() => {
                    if (!localQ) {
                      setSearchExpanded(false);
                    }
                  }}
                  animate={{
                    width: searchExpanded ? "100%" : "0%",
                    opacity: searchExpanded ? 1 : 0
                  }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  placeholder="Titles, people, genres..."
                  className="bg-transparent text-sm text-white focus:outline-none placeholder-white/50 w-full"
                  aria-label="Search movies"
                />
                {searchExpanded && localQ && (
                  <button
                    onClick={() => {
                      setLocalQ("");
                      const params = new URLSearchParams(location.search);
                      params.delete("q");
                      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
                    }}
                    className="text-white/60 hover:text-white p-0.5 shrink-0"
                    aria-label="Clear search text"
                  >
                    <X size={14} />
                  </button>
                )}
              </motion.div>
            </div>


            {/* Liquid Glass Settings Slider Button */}
            <div ref={settingsRef} className="relative hidden md:block">
              <button
                onClick={toggleSettings}
                className={`glass-capsule glass-capsule--icon ${settingsOpen ? "active" : ""}`}
                aria-label="Liquid Glass Settings"
              >
                <Sliders size={22} />
              </button>
              
              <AnimatePresence>
                {settingsOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ type: "spring", stiffness: 350, damping: 26, mass: 0.85 }}
                    className="absolute right-0 top-full mt-2 w-64 rounded-2xl liquid-glass p-4 shadow-2xl z-50"
                  >
                    <h4 className="text-sm font-bold text-white mb-3">Liquid Glass Controls</h4>
                    <div className="space-y-4">
                      {/* Glass Transparency Slider */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-white/60">
                          <span>Glass Transparency</span>
                          <span className="font-bold text-white">{Math.round(glassness * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.05"
                          value={glassness}
                          onChange={(e) => handleGlassnessChange(parseFloat(e.target.value))}
                          className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                      </div>
                      
                      {/* Background Ambient Reflection Glow Opacity Slider */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-white/60">
                          <span>Ambient Background</span>
                          <span className="font-bold text-white">{Math.round(ambientOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={ambientOpacity}
                          onChange={(e) => handleAmbientOpacityChange(parseFloat(e.target.value))}
                          className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Live Updates Notification Bell Icon */}
            <div ref={notificationRef} className="relative hidden md:block">
              <button
                onClick={toggleNotification}
                className={`glass-capsule glass-capsule--icon ${notificationOpen ? "active" : ""}`}
                aria-label="Notifications"
              >
                <Bell size={22} />
                {hasNotification && (
                  <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] animate-pulse" />
                )}
              </button>
              
              <AnimatePresence>
                {notificationOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ type: "spring", stiffness: 350, damping: 26, mass: 0.85 }}
                    className="absolute right-0 top-full mt-2 w-80 rounded-2xl liquid-glass py-2 shadow-2xl z-50"
                  >
                    <div className="px-4 py-2 border-b border-white/10 text-xs font-bold text-white/50 uppercase tracking-wider">
                      Phim Mới Cập Nhật
                    </div>
                    {latestMovies.length > 0 ? (
                      <div className="max-h-80 overflow-y-auto font-sans">
                        {latestMovies.map((movie) => (
                          <button
                            key={movie.slug}
                            onClick={() => {
                              setNotificationOpen(false);
                              usePlaybackStore.getState().openDetailModal(movie, `notif-${movie.id}`);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-white/5 transition text-left cursor-pointer focus:outline-none"
                          >
                            <img
                              src={movie.posterUrl || movie.backdropUrl}
                              className="h-12 aspect-[2/3] object-cover rounded border border-white/10 shadow-md shrink-0"
                              alt=""
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-white truncate">{movie.title}</p>
                              <p className="text-xs text-white/40 mt-0.5 truncate">{movie.description || "Danh mục phim mới cập nhật."}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-6 text-center text-xs text-white/40">
                        Không có thông báo mới.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Account / Profile Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProfileOpen(!isProfileOpen);
                }}
                className={`glass-capsule pl-2 pr-3 rounded-full flex items-center gap-2 ${isProfileOpen ? "active" : ""}`}
                aria-label="Account Menu"
              >
                {user ? (
                  avatarUrl && (avatarUrl.startsWith("http") || avatarUrl.includes("/")) ? (
                    <img src={avatarUrl} className="h-8 w-8 rounded-full object-cover border border-white/40 shadow-lg ring-2 ring-white/10 hover:scale-105 transition duration-300" alt="Avatar" />
                  ) : (
                    <span className={`grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br ${avatarUrl || "from-blue-500 to-cyan-300"} border border-white/40 shadow-lg ring-2 ring-white/10 hover:scale-105 transition duration-300`}>
                      <span className="text-xs font-black text-white">
                        {user?.username ? user.username[0].toUpperCase() : "M"}
                      </span>
                    </span>
                  )
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 border border-white/20 text-white/80 shadow-lg ring-2 ring-white/10 hover:scale-105 transition duration-300">
                    <User size={16} />
                  </span>
                )}
                <span className={`border-l-4 border-r-4 border-t-4 border-transparent border-t-white transition duration-300 ${isProfileOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ type: "spring", stiffness: 350, damping: 26, mass: 0.85 }}
                    className="absolute right-0 top-full mt-2 w-56 origin-top-right overflow-hidden rounded-2xl liquid-glass p-3 shadow-2xl z-[120]"
                  >
                    {user ? (
                      <>
                        <div className="px-2 py-1.5 mb-1 text-xs font-bold text-white/50 border-b border-white/10 uppercase tracking-wider">
                          Hồ sơ của tôi
                        </div>

                        <NavLink to="/profile" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 transition text-xs font-semibold text-white/70 hover:text-white mt-1">
                          Cài đặt hồ sơ
                        </NavLink>
                        
                        <hr className="border-white/10 my-1.5" />

                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            logout();
                            navigate("/login");
                          }}
                          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-white/10 transition text-xs font-bold text-white/80 hover:text-white text-left cursor-pointer"
                        >
                          Đăng xuất khỏi RytoxGroup
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="px-2 py-1.5 mb-2 text-xs font-bold text-white/50 border-b border-white/10 uppercase tracking-wider">
                          Tài khoản
                        </div>

                        <NavLink
                          to="/login"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold text-white transition border border-white/30 shadow-[0_4px_16px_rgba(0,0,0,0.3)] backdrop-blur-md mb-2 active:scale-95"
                        >
                          <LogIn size={14} />
                          Đăng nhập
                        </NavLink>

                        <NavLink
                          to="/register"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/12 text-xs font-semibold text-white/80 hover:text-white transition border border-white/10 backdrop-blur-md active:scale-95"
                        >
                          <UserPlus size={14} />
                          Đăng ký tài khoản
                        </NavLink>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>
        </header>
      )}
      {q.length > 1 ? (
        <main className="bg-transparent min-h-screen pt-28 pb-16 px-4 sm:px-8 md:px-14 lg:px-16">
          <h1 className="text-2xl font-bold mb-6 text-white/50">Search results for "{q}"</h1>
          {isSearching ? (
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-72 shrink-0 bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            <div className="flex flex-col gap-8">
              <div className="mt-5 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 md:gap-2">
                {searchResults.map((movie: NormalizedMovie) => (
                  <motion.div
                    key={movie.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <MovieTile
                      movie={movie as any}
                      className="group relative w-full cursor-pointer rounded-md transition"
                      onOpen={() => handleOpen(movie as any)}
                      onHover={(anchor) => {
                        clearCloseTimer();
                        clearOpenTimer();
                        openHoverTimer.current = window.setTimeout(() => {
                          setHovered({ movie: movie as any, anchor, rect: anchor.getBoundingClientRect() });
                        }, 180);
                      }}
                      onHoverEnd={scheduleHoverClose}
                    />
                  </motion.div>
                ))}
                {isSearching && Array.from({ length: 6 }).map((_, i) => (
                  <div 
                    key={`shimmer-${i}`} 
                    className="aspect-video w-full overflow-hidden rounded bg-zinc-800/40 animate-pulse border border-white/5 relative before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent"
                  />
                ))}
              </div>
              {!isSearching && hasMoreSearch && (
                <div className="flex justify-center mt-6 mb-4">
                  <button
                    onClick={handleLoadMoreSearch}
                    disabled={isSearching}
                    className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm tracking-wide transition-all duration-300 border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:border-white/40 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md disabled:opacity-50"
                  >
                    <span>Xem thêm</span>
                    <ChevronDown size={18} className="transition-transform duration-300 group-hover:translate-y-1 text-white/70" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500">
              No search results found for "{q}". Try searching for another title.
            </div>
          )}
        </main>
      ) : (
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={iosSpringTransition}
        >
          <Outlet />
        </motion.div>
      )}
      
      {/* Mobile Floating Bottom Dock with Drag & Scrub gesture */}
      {!activePlayback && location.pathname !== "/profile" && (
        <InteractiveNavScrubber variant="mobile-dock" />
      )}

      {/* Footer component */}
      {location.pathname !== "/profile" && <Footer />}

      {/* Mobile Sidebar Navigation Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Dark blur background overlay */}
            <motion.div
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Left slide-in drawer */}
            <motion.nav
              className="fixed bottom-0 left-0 top-0 z-[101] w-72 bg-[#141414] p-6 pb-16 shadow-2xl flex flex-col gap-6 overflow-y-auto max-h-[100dvh] overscroll-contain touch-pan-y"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between">
                <span className="brand-logo text-xl font-black text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)] tracking-tight">RytoxGroup</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="nf-icon rounded-full p-2 hover:bg-white/10 text-white/70 hover:text-white"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex flex-col gap-4 text-lg font-medium text-white/80">
                <NavLink to="/" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-white font-bold underline underline-offset-4" : ""}`}>Home</NavLink>
                <NavLink to="/anime" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-white font-bold underline underline-offset-4" : ""}`}>Anime</NavLink>
                <NavLink to="/new-popular" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-white font-bold underline underline-offset-4" : ""}`}>New & Popular</NavLink>
                <NavLink to="/my-list" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-white font-bold underline underline-offset-4" : ""}`}>My List</NavLink>
                <NavLink to="/search" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-white font-bold underline underline-offset-4" : ""}`}>Browse by Languages</NavLink>
                
                {/* Profile section for mobile */}
                <hr className="border-white/10 my-1" />
                {user ? (
                  <>
                    <p className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-1">Tài khoản & Hồ sơ</p>
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          navigate("/profile");
                        }}
                        className="flex items-center gap-2.5 text-left text-sm font-semibold text-white/60 hover:text-white"
                      >
                        {avatarUrl && (avatarUrl.startsWith("http") || avatarUrl.includes("/")) ? (
                          <img src={avatarUrl} className="h-6 w-6 rounded object-cover border border-white/20" alt="Avatar" />
                        ) : (
                          <span className={`grid h-6 w-6 place-items-center rounded bg-gradient-to-br ${avatarUrl || "from-blue-500 to-cyan-300"}`}>
                            <span className="text-[10px] font-black text-white">
                              {user?.username ? user.username[0].toUpperCase() : "M"}
                            </span>
                          </span>
                        )}
                        <span>Cài đặt hồ sơ</span>
                      </button>

                      <button 
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          logout();
                          navigate("/login");
                        }}
                        className="flex items-center gap-2.5 text-left text-sm font-bold text-white/80 hover:text-white"
                      >
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-1">Tài khoản</p>
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 mb-0.5">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 border border-white/20 text-white/70">
                          <User size={16} />
                        </span>
                        <div className="text-xs">
                          <p className="font-bold text-white">Khách</p>
                          <p className="text-white/40">Đăng nhập để lưu phim</p>
                        </div>
                      </div>
                      <NavLink
                        to="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-bold text-white transition border border-white/25 shadow-md backdrop-blur-md active:scale-95"
                      >
                        <LogIn size={16} />
                        Đăng nhập
                      </NavLink>
                      <NavLink
                        to="/register"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/12 text-sm font-semibold text-white/80 hover:text-white transition border border-white/10 backdrop-blur-md active:scale-95"
                      >
                        <UserPlus size={16} />
                        Đăng ký tài khoản
                      </NavLink>
                    </div>
                  </>
                )}
                
                {/* Separator line */}
                <hr className="border-white/10 my-1" />
                
                {/* Featured Genres List */}
                <p className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-1">Featured Genres</p>
                <div className="grid grid-cols-2 gap-2 text-sm font-semibold text-white/60">
                  <button onClick={() => handleGenreClick("phim-moi-cap-nhat")} className="text-left hover:text-white hover:bg-white/5 py-1.5 px-2.5 rounded transition cursor-pointer">Phim Mới</button>
                  <button onClick={() => handleGenreClick("phim-le")} className="text-left hover:text-white hover:bg-white/5 py-1.5 px-2.5 rounded transition cursor-pointer">Phim Lẻ</button>
                  <button onClick={() => handleGenreClick("phim-bo")} className="text-left hover:text-white hover:bg-white/5 py-1.5 px-2.5 rounded transition cursor-pointer">Phim Bộ</button>
                  <button onClick={() => handleGenreClick("hanh-dong")} className="text-left hover:text-white hover:bg-white/5 py-1.5 px-2.5 rounded transition cursor-pointer">Hành Động</button>
                  <button onClick={() => handleGenreClick("hoat-hinh")} className="text-left hover:text-white hover:bg-white/5 py-1.5 px-2.5 rounded transition cursor-pointer">Hoạt Hình</button>
                  <button onClick={() => handleGenreClick("han-quoc")} className="text-left hover:text-white hover:bg-white/5 py-1.5 px-2.5 rounded transition cursor-pointer">Hàn Quốc</button>
                </div>
                
                {/* Watch History List */}
                {watchHistory && watchHistory.length > 0 && (
                  <>
                    <hr className="border-white/10 my-1" />
                    <p className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-1">Lịch sử xem</p>
                    <div className="flex flex-col gap-2.5 text-sm font-semibold text-white/60">
                      {watchHistory.slice(0, 3).map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            usePlaybackStore.getState().openPlayback(item.movieData, `card-${item.id}`);
                          }}
                          className="flex items-center gap-2 hover:text-white hover:bg-white/5 py-1 px-1.5 rounded transition cursor-pointer text-left w-full focus:outline-none"
                        >
                          <img src={item.posterUrl || item.backdropUrl} className="w-8 aspect-[2/3] object-cover rounded shadow-md border border-white/10 shrink-0" alt="" />
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-xs text-white/80">{item.title}</p>
                            <div className="w-full bg-zinc-700 h-1 rounded overflow-hidden mt-1 max-w-[120px]">
                              <div className="bg-white/80 h-full" style={{ width: `${item.progress}%` }} />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeMovieDetail && <CinematicDetailModal key={activeMovieDetail.id || activeMovieDetail.slug} />}
      </AnimatePresence>
      <AnimatePresence>
        {activePlayback && <CinematicPlayerOverlay />}
      </AnimatePresence>
      <AnimatePresence>
        {authModalOpen && <AuthPromptModal />}
      </AnimatePresence>
      <AnimatePresence>
        {hovered && (
          <HoverPreview
            key={hovered.movie.id}
            movie={hovered.movie}
            rect={hovered.rect}
            onOpen={() => handleOpen(hovered.movie)}
            onMouseEnter={() => {
              clearOpenTimer();
              clearCloseTimer();
            }}
            onMouseLeave={scheduleHoverClose}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
