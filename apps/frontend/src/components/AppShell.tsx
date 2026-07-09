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

export function AppShell() {
  const { activeMovieDetail, activePlayback } = usePlaybackStore();
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);

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

  const { data: searchResultsData, isLoading: isSearching } = useQuery({
    queryKey: ["search", q],
    enabled: q.length > 1,
    staleTime: 60_000,
    retry: false,
    queryFn: () => movieApi.searchMovies(q)
  });
  const searchResults = searchResultsData ?? [];

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

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <header className={`fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between px-4 transition-all duration-300 sm:px-8 md:px-14 lg:px-16 ${scrolled ? "bg-[#141414]/95 shadow-lg shadow-black/20 backdrop-blur-md" : "bg-gradient-to-b from-black/80 via-black/35 to-transparent"}`}>
        <div className="flex items-center gap-4 sm:gap-7">
          {/* Hamburger menu button for mobile */}
          {!searchExpanded && (
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="nf-icon md:hidden rounded-full p-1.5 hover:bg-white/10"
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
          )}
          
          <NavLink to="/" className={`brand-logo text-2xl font-black tracking-tight text-[#e50914] md:text-3xl ${searchExpanded ? "hidden md:block" : ""}`}>STREAMFORGE</NavLink>
          <nav className="hidden items-center gap-5 text-sm font-medium text-white/75 md:flex">
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? "text-white after:scale-x-100" : "hover:text-white"}`}>Home</NavLink>
            <NavLink to="/tv-shows" className={({ isActive }) => `nav-link ${isActive ? "text-white after:scale-x-100" : "hover:text-white"}`}>TV Shows</NavLink>
            <NavLink to="/movies" className={({ isActive }) => `nav-link ${isActive ? "text-white after:scale-x-100" : "hover:text-white"}`}>Movies</NavLink>
            <NavLink to="/new-popular" className={({ isActive }) => `nav-link ${isActive ? "text-white after:scale-x-100" : "hover:text-white"}`}>New & Popular</NavLink>
            <NavLink to="/my-list" className={({ isActive }) => `nav-link ${isActive ? "text-white after:scale-x-100" : "hover:text-white"}`}>My List</NavLink>
            <NavLink to="/search" className="nav-link hover:text-white">Browse by Languages</NavLink>
          </nav>
        </div>
        <nav className={`flex items-center gap-3 text-sm font-medium text-white md:gap-5 ${searchExpanded ? "flex-1 justify-end" : ""}`}>
          {/* Inline Expanding Search Bar */}
          {searchExpanded ? (
            <div className="flex flex-1 md:flex-initial items-center gap-1.5 border border-white/40 bg-black/75 px-2 py-1 rounded transition-all duration-300 max-w-full">
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
                placeholder="Titles, people, genres..."
                value={new URLSearchParams(location.search).get("q") ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const params = new URLSearchParams(location.search);
                  if (val) {
                    params.set("q", val);
                  } else {
                    params.delete("q");
                  }
                  navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
                }}
                onBlur={() => {
                  const params = new URLSearchParams(location.search);
                  if (!params.get("q")) {
                    setSearchExpanded(false);
                  }
                }}
                className="w-full md:w-44 bg-transparent text-xs text-white focus:outline-none"
                autoFocus
              />
              {(new URLSearchParams(location.search).get("q") ?? "") && (
                <button 
                  onClick={() => {
                    const params = new URLSearchParams(location.search);
                    params.delete("q");
                    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
                    searchInputRef.current?.focus();
                  }} 
                  className="text-white/60 hover:text-white"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ) : (
            <button 
              onClick={() => {
                setSearchExpanded(true);
              }} 
              aria-label="Search" 
              className="nf-icon rounded-full p-2 hover:bg-white/10"
            >
              <Search size={21} />
            </button>
          )}

          <span className={`hidden text-sm md:inline ${searchExpanded ? "hidden" : ""}`}>Kids</span>
          <button aria-label="Notifications" className={`nf-icon rounded-full p-2 hover:bg-white/10 ${searchExpanded ? "hidden md:block" : ""}`}><Bell size={19} /></button>
          <NavLink to="/profile" aria-label="Profile" className={`nf-icon flex items-center gap-1 rounded p-1 hover:bg-white/10 ${searchExpanded ? "hidden md:block" : ""}`}>
            <span className="grid h-8 w-8 place-items-center rounded bg-gradient-to-br from-blue-500 to-cyan-300"><UserCircle size={22} /></span>
          </NavLink>
        </nav>
      </header>
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
      <Footer />

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
                <NavLink to="/search" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white transition">Browse by Languages</NavLink>
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
