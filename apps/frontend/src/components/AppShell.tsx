import { Bell, Lock, Menu, Search, X, Sliders, ChevronDown, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { usePlaybackStore } from "../store/playbackStore";
import { CinematicDetailModal } from "./CinematicDetailModal";
import { CinematicPlayerOverlay } from "./CinematicPlayerOverlay";
import { Footer } from "./Footer";
import { movieApi, type NormalizedMovie } from "../lib/movieApi";
import { MovieTile, HoverPreview } from "./MovieRow";
import { Button, Skeleton } from "@streamforge/ui";
import type { MovieCardDto } from "@streamforge/shared-types";

import { useAuthStore } from "../store/auth";

const iosSpringTransition = {
  type: "spring",
  stiffness: 300,
  damping: 28,
  mass: 0.85,
};

export function AppShell() {
  const { activeMovieDetail, activePlayback, activeEpisodeId, watchHistory } = usePlaybackStore();
  const { user, profileId, initialized, setProfileId, logout, initialize } = useAuthStore();
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

  const handleGlassnessChange = (val: number) => {
    setGlassness(val);
    localStorage.setItem("system-glassness", String(val));
    document.documentElement.style.setProperty("--system-glassness", String(val));
  };

  const handleAmbientOpacityChange = (val: number) => {
    setAmbientOpacity(val);
    localStorage.setItem("system-ambient-opacity", String(val));
    document.documentElement.style.setProperty("--ambient-opacity", String(val));
  };

  useEffect(() => {
    document.documentElement.style.setProperty("--system-glassness", String(glassness));
    document.documentElement.style.setProperty("--ambient-opacity", String(ambientOpacity));
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

  // Auth Guard: redirect unauthenticated users to login
  useEffect(() => {
    if (!initialized) return;
    if (!user && location.pathname !== "/login" && location.pathname !== "/register") {
      navigate("/login");
    } else if (user && (location.pathname === "/login" || location.pathname === "/register")) {
      navigate("/");
    }
  }, [initialized, user, location.pathname, navigate]);

  // Restore modal and playback states from URL parameters on mount or query change
  useEffect(() => {
    if (!initialized || !user) return;

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
  }, [initialized, user, location.search]);

  // Sync URL parameters when modal/playback store state changes
  useEffect(() => {
    if (!initialized || !user) return;
    
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
      
      const lastSeen = localStorage.getItem("streamforge:lastSeenMovieSlug");
      const newestSlug = movies[0].slug;
      
      if (lastSeen) {
        if (lastSeen !== newestSlug) {
          setHasNotification(true);
        }
      } else {
        localStorage.setItem("streamforge:lastSeenMovieSlug", newestSlug);
      }
    }).catch((err) => console.error("Notification check failed:", err));

    return () => { active = false; };
  }, []);

  const toggleNotification = () => {
    setNotificationOpen(!notificationOpen);
    if (latestMovies.length > 0) {
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
          <span className="brand-logo text-2xl font-black text-[#e50914] tracking-tighter sm:text-3xl">RytoxGroup</span>
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#e50914]/20 border-t-[#e50914]" />
          <p className="text-xs font-semibold text-white/35 tracking-[0.15em] uppercase animate-pulse">Đang kết nối...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <div className="min-h-screen bg-[#141414]" />;
  }

  if (isRestoringState) {
    return (
      <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center text-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#e50914] border-t-transparent" />
        <p className="mt-4 text-xs font-semibold text-white/50 tracking-wider uppercase animate-pulse">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white">
      {location.pathname === "/profile" ? (
        <header className="fixed inset-x-0 top-0 z-50 flex h-[68px] items-center px-4 sm:px-8 md:px-14 lg:px-16 bg-gradient-to-b from-black/60 to-transparent">
          <span className="brand-logo text-xs font-black tracking-tight text-[#e50914] sm:text-sm md:text-base select-none">RytoxGroup</span>
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
            
            <NavLink to="/" className={`brand-logo text-xs font-black tracking-tight text-[#e50914] sm:text-sm md:text-base ${searchExpanded ? "hidden md:block" : ""}`}>RytoxGroup</NavLink>
            <nav className={`hidden items-center gap-2 text-sm font-semibold bg-white/5 border border-white/10 p-1.5 rounded-full backdrop-blur-md shadow-inner relative whitespace-nowrap ${searchExpanded ? "xl:flex" : "md:flex"}`}>
              {[
                { to: "/", label: "Home" },
                { to: "/tv-shows", label: "Shows" },
                { to: "/movies", label: "Movies" },
                { to: "/anime", label: "Anime" },
                { to: "/new-popular", label: "New & Popular" },
                { to: "/my-list", label: "My List" },
                { to: "/search", label: "Browse by Languages" },
              ].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="relative px-5 py-2.5 rounded-full transition-colors duration-300 z-10 select-none text-white/70 hover:text-white"
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="active-nav-pill"
                          className="absolute inset-0 bg-white/15 border border-white/20 rounded-full shadow-[0_3px_12px_rgba(229,9,20,0.18)] z-[-1]"
                          style={{
                            backdropFilter: "blur(20px) saturate(180%)",
                            WebkitBackdropFilter: "blur(20px) saturate(180%)",
                          }}
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className={isActive ? "text-white font-bold" : ""}>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
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

            {/* Kids Mode Link */}
            <NavLink to="/search" className="glass-capsule hidden lg:flex items-center justify-center px-5">Kids</NavLink>

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
                          className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#e50914]"
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
                          className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#e50914]"
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
                  <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#e50914] animate-pulse" />
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

            {/* Profile Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProfileOpen(!isProfileOpen);
                }}
                className={`glass-capsule pl-2 pr-3 rounded-full flex items-center gap-2 ${isProfileOpen ? "active" : ""}`}
                aria-label="Profile Menu"
              >
                <span className={`grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br ${
                  profileId === "Kids" ? "from-yellow-400 to-orange-500" :
                  profileId === "Guest" ? "from-purple-500 to-pink-500" :
                  profileId === "Private" ? "from-zinc-600 to-zinc-900" :
                  "from-blue-500 to-cyan-300"
                }`}>
                  {profileId === "Private" ? <Lock size={12} className="text-white/80" /> : <span className="text-xs font-black text-white">{profileId ? profileId[0].toUpperCase() : (user?.username ? user.username[0].toUpperCase() : "M")}</span>}
                </span>
                <span className={`border-l-4 border-r-4 border-t-4 border-transparent border-t-white transition duration-300 ${isProfileOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ type: "spring", stiffness: 350, damping: 26, mass: 0.85 }}
                    className="absolute right-0 top-full mt-2 w-52 origin-top-right overflow-hidden rounded-2xl liquid-glass py-2 shadow-2xl z-[120]"
                  >
                    {/* Profile List */}
                    <div className="flex flex-col gap-1 px-2 py-1">
                      {[
                        [user?.username || "Main", "from-blue-500 to-cyan-300"],
                        ["Kids", "from-yellow-400 to-orange-500"],
                        ["Guest", "from-purple-500 to-pink-500"],
                        ["Private", "from-zinc-600 to-zinc-900"]
                      ].filter(([name]) => name !== profileId).map(([name, color]) => (
                        <button
                          key={name}
                          onClick={() => {
                            setIsProfileOpen(false);
                            if (name === "Private") {
                              const pin = prompt("Nhập mã PIN bảo mật cho hồ sơ riêng tư (mặc định: 1234):");
                              if (pin !== "1234") {
                                alert("Mã PIN không chính xác!");
                                return;
                              }
                            }
                            setProfileId(name);
                            navigate("/");
                          }}
                          className="flex items-center gap-2.5 w-full rounded px-2.5 py-1.5 hover:bg-white/10 transition text-left text-xs font-semibold cursor-pointer text-white/80 hover:text-white"
                        >
                          <span className={`grid h-6 w-6 place-items-center rounded bg-gradient-to-br ${color}`}>
                            {name === "Private" ? <Lock size={10} className="text-white/80" /> : <span className="text-[10px] font-black text-white">{name[0]}</span>}
                          </span>
                          <span>{name}</span>
                        </button>
                      ))}
                    </div>

                    <hr className="border-white/10 my-1.5" />

                    <NavLink to="/profile" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-white/10 transition text-xs font-semibold text-white/70 hover:text-white">
                      Quản lý hồ sơ
                    </NavLink>
                    
                    <hr className="border-white/10 my-1.5" />

                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        logout();
                        navigate("/login");
                      }}
                      className="flex items-center gap-2.5 w-full px-4 py-1.5 hover:bg-white/10 transition text-xs font-bold text-[#e50914] text-left cursor-pointer"
                    >
                      Đăng xuất khỏi StreamForge
                    </button>
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
                <div className="flex justify-center mt-4">
                  <Button
                    onClick={handleLoadMoreSearch}
                    disabled={isSearching}
                    className="flex items-center gap-2 px-6 py-2 rounded-full border border-white/20 bg-zinc-900/60 hover:bg-white hover:text-black hover:border-white text-white text-sm font-semibold transition-all duration-300 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <span>Xem thêm</span>
                    <ChevronDown size={16} />
                  </Button>
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
              className="fixed bottom-0 left-0 top-0 z-[101] w-72 bg-[#141414] p-6 shadow-2xl flex flex-col gap-6"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between">
                <span className="brand-logo text-xl font-black text-[#e50914] tracking-tight">RytoxGroup</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="nf-icon rounded-full p-2 hover:bg-white/10 text-white/70 hover:text-white"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex flex-col gap-4 text-lg font-medium text-white/80">
                <NavLink to="/" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-[#e50914] font-bold" : ""}`}>Home</NavLink>
                <NavLink to="/tv-shows" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-[#e50914] font-bold" : ""}`}>Shows</NavLink>
                <NavLink to="/movies" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-[#e50914] font-bold" : ""}`}>Movies</NavLink>
                <NavLink to="/anime" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-[#e50914] font-bold" : ""}`}>Anime</NavLink>
                <NavLink to="/new-popular" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-[#e50914] font-bold" : ""}`}>New & Popular</NavLink>
                <NavLink to="/my-list" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-[#e50914] font-bold" : ""}`}>My List</NavLink>
                <NavLink to="/search" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-[#e50914] font-bold" : ""}`}>Browse by Languages</NavLink>
                
                {/* Profile section for mobile */}
                <hr className="border-white/10 my-1" />
                <p className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-1">Tài khoản & Hồ sơ</p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate("/profile");
                    }}
                    className="flex items-center gap-2.5 text-left text-sm font-semibold text-white/60 hover:text-white"
                  >
                    <span className="grid h-6 w-6 place-items-center rounded bg-gradient-to-br from-blue-500 to-cyan-300 text-[10px] font-black text-white">
                      {profileId ? profileId[0].toUpperCase() : "M"}
                    </span>
                    <span>Chuyển hồ sơ ({profileId || "Main"})</span>
                  </button>

                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      logout();
                      navigate("/login");
                    }}
                    className="flex items-center gap-2.5 text-left text-sm font-bold text-[#e50914]"
                  >
                    <span>Đăng xuất</span>
                  </button>
                </div>
                
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
                              <div className="bg-[#e50914] h-full" style={{ width: `${item.progress}%` }} />
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

      <AnimatePresence>
        {activeMovieDetail && <CinematicDetailModal />}
      </AnimatePresence>
      <AnimatePresence>
        {activePlayback && <CinematicPlayerOverlay />}
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
