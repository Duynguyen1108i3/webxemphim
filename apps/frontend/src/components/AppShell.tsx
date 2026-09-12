import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { usePlaybackStore } from "../store/playbackStore";
import { useAuthStore } from "../store/authStore";
import { CinematicDetailModal } from "./CinematicDetailModal";
import { CinematicPlayerOverlay } from "./CinematicPlayerOverlay";
import { Footer } from "./Footer";
import { AuthPromptModal } from "./AuthPromptModal";
import { HoverPreview } from "./MovieRow";
import { InteractiveNavScrubber } from "./InteractiveNavScrubber";
import { movieApi, type NormalizedMovie } from "../lib/movieApi";
import { ShellNavbar, ShellMobileDrawer, ShellSearchOverlay } from "./shell";
import type { MovieCardDto } from "@streamforge/shared-types";

const iosSpringTransition = {
  type: "spring",
  stiffness: 300,
  damping: 28,
  mass: 0.85,
};

export function AppShell() {
  const { activeMovieDetail, activePlayback, activeEpisodeId, watchHistory, authModalOpen } = usePlaybackStore();
  const { user, avatarUrl, initialized, logout, initialize } = useAuthStore();
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
    const onScroll = () => {
      const isScrolled = window.scrollY > 16;
      setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(location.search).get("q");
    if (query) {
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

    const handleScroll = () => {
      clearOpenTimer();
      clearCloseTimer();
      setHovered(null);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [hovered]);

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
        <ShellNavbar
          scrolled={scrolled}
          searchExpanded={searchExpanded}
          setSearchExpanded={setSearchExpanded}
          searchInputRef={searchInputRef}
          localQ={localQ}
          setLocalQ={setLocalQ}
          onClearSearch={() => {
            setLocalQ("");
            const params = new URLSearchParams(location.search);
            params.delete("q");
            navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
          }}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          settingsOpen={settingsOpen}
          toggleSettings={toggleSettings}
          settingsRef={settingsRef}
          glassness={glassness}
          onGlassnessChange={handleGlassnessChange}
          ambientOpacity={ambientOpacity}
          onAmbientOpacityChange={handleAmbientOpacityChange}
          notificationRef={notificationRef}
          notificationOpen={notificationOpen}
          toggleNotification={toggleNotification}
          hasNotification={hasNotification}
          latestMovies={latestMovies}
          profileRef={profileRef}
          isProfileOpen={isProfileOpen}
          setIsProfileOpen={setIsProfileOpen}
          user={user}
          avatarUrl={avatarUrl}
          logout={logout}
        />
      )}

      {q.length > 1 ? (
        <ShellSearchOverlay
          q={q}
          isSearching={isSearching}
          searchResults={searchResults}
          hasMoreSearch={hasMoreSearch}
          onLoadMore={handleLoadMoreSearch}
          onOpenMovie={handleOpen}
          onHover={(movie, anchor) => {
            clearCloseTimer();
            clearOpenTimer();
            openHoverTimer.current = window.setTimeout(() => {
              setHovered({ movie, anchor, rect: anchor.getBoundingClientRect() });
            }, 180);
          }}
          onHoverEnd={scheduleHoverClose}
        />
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

      {/* Mobile Navigation Drawer */}
      <ShellMobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        user={user}
        avatarUrl={avatarUrl}
        logout={logout}
        watchHistory={watchHistory}
        onGenreClick={handleGenreClick}
      />

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
