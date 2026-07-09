import { Bell, Menu, Search, UserCircle, X } from "lucide-react";
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
  const { activeMovieDetail, activePlayback, watchHistory } = usePlaybackStore();
  const { user, initialize } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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
    if (!user && location.pathname !== "/login" && location.pathname !== "/register") {
      navigate("/login");
    } else if (user && (location.pathname === "/login" || location.pathname === "/register")) {
      navigate("/");
    }
  }, [user, location.pathname, navigate]);



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

  if (!user) {
    return <div className="min-h-screen bg-[#141414]" />;
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      {location.pathname === "/profile" ? (
        <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center px-4 sm:px-8 md:px-14 lg:px-16 bg-gradient-to-b from-black/60 to-transparent">
          <span className="brand-logo text-lg font-black tracking-tight text-[#e50914] sm:text-2xl md:text-3xl select-none">STREAMFORGE</span>
        </header>
      ) : (
        <header className={`fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between px-4 transition-all duration-300 sm:px-8 md:px-14 lg:px-16 ${scrolled ? "bg-[#141414]/95 shadow-lg shadow-black/20 backdrop-blur-md" : "bg-gradient-to-b from-black/80 via-black/35 to-transparent"}`}>
          <div className="flex items-center gap-2 sm:gap-7">
            {/* Hamburger menu button for mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="nf-icon md:hidden rounded-full p-1.5 hover:bg-white/10"
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
            
            <NavLink to="/" className={`brand-logo text-lg font-black tracking-tight text-[#e50914] sm:text-2xl md:text-3xl ${searchExpanded ? "hidden md:block" : ""}`}>STREAMFORGE</NavLink>
            <nav className="hidden items-center gap-5 text-sm font-medium text-white/75 md:flex">
              <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? "text-white after:scale-x-100" : "hover:text-white"}`}>Home</NavLink>
              <NavLink to="/tv-shows" className={({ isActive }) => `nav-link ${isActive ? "text-white after:scale-x-100" : "hover:text-white"}`}>TV Shows</NavLink>
              <NavLink to="/movies" className={({ isActive }) => `nav-link ${isActive ? "text-white after:scale-x-100" : "hover:text-white"}`}>Movies</NavLink>
              <NavLink to="/new-popular" className={({ isActive }) => `nav-link ${isActive ? "text-white after:scale-x-100" : "hover:text-white"}`}>New & Popular</NavLink>
              <NavLink to="/my-list" className={({ isActive }) => `nav-link ${isActive ? "text-white after:scale-x-100" : "hover:text-white"}`}>My List</NavLink>
              <NavLink to="/search" className="nav-link hover:text-white">Browse by Languages</NavLink>
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
            <div className="relative">
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
              
              {notificationOpen && (
                <div className="absolute right-0 mt-3 w-80 rounded border border-white/10 bg-black/95 py-2 shadow-2xl z-50 backdrop-blur-md">
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
                </div>
              )}
            </div>

            <NavLink to="/profile" aria-label="Profile" className="nf-icon flex items-center gap-1 rounded p-1 hover:bg-white/10">
              <span className="grid h-8 w-8 place-items-center rounded bg-gradient-to-br from-blue-500 to-cyan-300"><UserCircle size={22} /></span>
            </NavLink>
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
                <NavLink to="/tv-shows" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-[#e50914] font-bold" : ""}`}>TV Shows</NavLink>
                <NavLink to="/movies" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-[#e50914] font-bold" : ""}`}>Movies</NavLink>
                <NavLink to="/new-popular" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-[#e50914] font-bold" : ""}`}>New & Popular</NavLink>
                <NavLink to="/my-list" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-[#e50914] font-bold" : ""}`}>My List</NavLink>
                
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
