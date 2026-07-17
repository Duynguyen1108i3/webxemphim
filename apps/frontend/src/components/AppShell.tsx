import { Bell, Lock, Menu, Search, UserCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { usePlaybackStore } from "../store/playbackStore";
import { CinematicDetailModal } from "./CinematicDetailModal";
import { CinematicPlayerOverlay } from "./CinematicPlayerOverlay";
import { Footer } from "./Footer";
import { useQuery } from "@tanstack/react-query";
import { movieApi, type NormalizedMovie } from "../lib/movieApi";
import { MovieRow } from "./MovieRow";
import { Skeleton } from "@streamforge/ui";
import type { MovieCardDto } from "@streamforge/shared-types";

import { useAuthStore } from "../store/auth";

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

  const { data: searchResultsData, isLoading: isSearching } = useQuery({
    queryKey: ["search", q],
    enabled: q.length > 1,
    staleTime: 60_000,
    retry: false,
    queryFn: () => movieApi.searchMovies(q)
  });
  const searchResults = searchResultsData ?? [];

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

  if (!initialized) {
    return (
      <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-6"
        >
          <span className="brand-logo text-3xl font-black text-[#e50914] tracking-tighter sm:text-4xl">STREAMFORGE</span>
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#e50914]/20 border-t-[#e50914]" />
          <p className="text-xs font-semibold text-white/35 tracking-[0.15em] uppercase animate-pulse">Đang kết nối...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    // Not authenticated — render nothing; the useEffect redirect to /login will fire
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
    <div className="min-h-screen bg-[#141414] text-white">
      {location.pathname === "/profile" ? (
        <header className="fixed inset-x-0 top-0 z-50 flex h-[68px] items-center px-4 sm:px-8 md:px-14 lg:px-16 bg-gradient-to-b from-black/60 to-transparent">
          <span className="brand-logo text-base font-black tracking-tight text-[#e50914] sm:text-xl md:text-2xl select-none">STREAMFORGE</span>
        </header>
      ) : (
        <header className={`fixed inset-x-0 top-0 z-50 flex h-[68px] items-center justify-between px-4 transition-colors duration-500 ease-out sm:px-8 md:px-14 lg:px-16 ${scrolled ? "bg-[#141414] shadow-lg shadow-black/30" : "bg-gradient-to-b from-black/90 via-black/40 to-transparent"}`}>
          <div className="flex items-center gap-2 sm:gap-7">
            {/* Hamburger menu button for mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="nf-icon md:hidden rounded-full p-1.5 hover:bg-white/10"
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
            
            <NavLink to="/" className={`brand-logo text-base font-black tracking-tight text-[#e50914] sm:text-xl md:text-2xl ${searchExpanded ? "hidden md:block" : ""}`}>STREAMFORGE</NavLink>
            <nav className="hidden items-center gap-5 text-sm font-medium text-white/75 md:flex">
              <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? "text-white after:scale-x-100" : "hover:text-white"}`}>Home</NavLink>
              <NavLink to="/tv-shows" className={({ isActive }) => `nav-link ${isActive ? "text-white after:scale-x-100" : "hover:text-white"}`}>Shows</NavLink>
              <NavLink to="/movies" className={({ isActive }) => `nav-link ${isActive ? "text-white after:scale-x-100" : "hover:text-white"}`}>Movies</NavLink>
              <NavLink to="/anime" className={({ isActive }) => `nav-link ${isActive ? "text-white after:scale-x-100" : "hover:text-white"}`}>Anime</NavLink>
              <NavLink to="/new-popular" className={({ isActive }) => `nav-link ${isActive ? "text-white after:scale-x-100" : "hover:text-white"}`}>New & Popular</NavLink>
              <NavLink to="/my-list" className={({ isActive }) => `nav-link ${isActive ? "text-white after:scale-x-100" : "hover:text-white"}`}>My List</NavLink>
              <NavLink to="/search" className={({ isActive }) => `nav-link ${isActive ? "text-white after:scale-x-100" : "hover:text-white"}`}>Browse by Languages</NavLink>
            </nav>
          </div>
          <nav className={`flex items-center gap-1.5 text-sm font-medium text-white md:gap-5 ${searchExpanded ? "flex-1 justify-end" : ""}`}>
            {/* Inline Expanding Search Bar */}
            {searchExpanded ? (
              <div className="flex flex-1 md:flex-initial items-center gap-1.5 border border-white/40 bg-black/75 px-2 py-1 rounded transition-all duration-300 max-w-[180px] sm:max-w-none">
                <Search
                  size={18}
                  className="text-white/80 shrink-0 cursor-pointer"
                  onClick={() => {
                    setSearchExpanded(false);
                    const params = new URLSearchParams(location.search);
                    params.delete("q");
                    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
                  }}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={localQ}
                  onChange={(e) => setLocalQ(e.target.value)}
                  placeholder="Titles, people, genres..."
                  className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-white/50"
                  aria-label="Search movies"
                />
                {localQ && (
                  <button onClick={() => setLocalQ("")} className="text-white/60 hover:text-white p-0.5" aria-label="Clear search text">
                    <X size={14} />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  setSearchExpanded(true);
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }}
                className="nf-icon rounded-full p-1.5 hover:bg-white/10"
                aria-label="Search"
              >
                <Search size={22} />
              </button>
            )}

            {/* Kids Mode Link */}
            <NavLink to="/search" className="hidden lg:block text-sm font-semibold hover:underline">Kids</NavLink>

            {/* Live Updates Notification Bell Icon */}
            <div ref={notificationRef} className="relative">
              <button
                onClick={toggleNotification}
                className="nf-icon relative rounded-full p-1.5 hover:bg-white/10"
                aria-label="Notifications"
              >
                <Bell size={22} />
                {hasNotification && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#e50914] animate-pulse" />
                )}
              </button>
              
              <AnimatePresence>
                {notificationOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 mt-3 w-80 rounded border border-white/10 bg-black/95 py-2 shadow-2xl z-50 backdrop-blur-md"
                  >
                    <div className="px-4 py-2 border-b border-white/10 text-xs font-bold text-white/50 uppercase tracking-wider">
                      Phim Mới Cập Nhật
                    </div>
                    {latestMovies.length > 0 ? (
                      <div className="max-h-80 overflow-y-auto">
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
            <div ref={profileRef} className="relative py-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProfileOpen(!isProfileOpen);
                }}
                className="flex items-center gap-1.5 focus:outline-none cursor-pointer"
                aria-label="Profile Menu"
              >
                <span className={`grid h-8 w-8 place-items-center rounded bg-gradient-to-br ${
                  profileId === "Kids" ? "from-yellow-400 to-orange-500" :
                  profileId === "Guest" ? "from-purple-500 to-pink-500" :
                  profileId === "Private" ? "from-zinc-600 to-zinc-900" :
                  "from-blue-500 to-cyan-300"
                }`}>
                  {profileId === "Private" ? <Lock size={14} className="text-white/80" /> : <span className="text-sm font-black text-white">{profileId ? profileId[0].toUpperCase() : (user?.username ? user.username[0].toUpperCase() : "M")}</span>}
                </span>
                <span className={`border-l-4 border-r-4 border-t-4 border-transparent border-t-white transition duration-300 ${isProfileOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-1 w-52 origin-top-right rounded border border-white/10 bg-black/95 py-2 shadow-2xl backdrop-blur-md z-[120]"
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
        <main className="bg-[#141414] min-h-screen pt-28 pb-16 px-4 sm:px-8 md:px-14 lg:px-16">
          <h1 className="text-2xl font-bold mb-6 text-white/50">Search results for "{q}"</h1>
          {isSearching ? (
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-72 shrink-0 bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            <MovieRow title="" items={searchResults as MovieCardDto[]} compact />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500">
              No search results found for "{q}". Try searching for another title.
            </div>
          )}
        </main>
      ) : (
        <Outlet />
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
                <span className="brand-logo text-xl font-black text-[#e50914] tracking-tight">STREAMFORGE</span>
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
    </div>
  );
}
