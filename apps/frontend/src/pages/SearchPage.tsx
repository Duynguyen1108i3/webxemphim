import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Globe } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { movieApi, type NormalizedMovie } from "../lib/movieApi";
import { usePlaybackStore } from "../store/playbackStore";
import { MovieTile, HoverPreview } from "../components/MovieRow";
import type { MovieCardDto } from "@streamforge/shared-types";

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const lang = searchParams.get("lang") ?? "";
  const { openDetailModal, openPlayback, activeMovieDetail, activePlayback } = usePlaybackStore();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const [hovered, setHovered] = useState<{ movie: MovieCardDto; anchor: HTMLElement; rect: DOMRect } | null>(null);

  useEffect(() => {
    if (activeMovieDetail || activePlayback) {
      setHovered(null);
      clearOpenTimer();
      clearCloseTimer();
    }
  }, [activeMovieDetail, activePlayback]);

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
  
  const hasTmdb = Boolean(
    localStorage.getItem("rytoxgroup:settings:tmdb_key") || 
    localStorage.getItem("streamforge:settings:tmdb_key") || 
    (import.meta.env && import.meta.env.VITE_TMDB_API_KEY)
  );

  const languagesList = [
    { name: "Tiếng Anh (Âu Mỹ)", slug: "au-my" },
    { name: "Tiếng Hàn (Hàn Quốc)", slug: "han-quoc" },
    { name: "Tiếng Trung (Trung Quốc)", slug: "trung-quoc" },
    { name: "Tiếng Nhật (Nhật Bản)", slug: "nhat-ban" },
    { name: "Tiếng Việt (Việt Nam)", slug: "viet-nam" },
    { name: "Tiếng Thái (Thái Lan)", slug: "thai-lan" },
    { name: "Vietsub", slug: "vietsub" },
    { name: "Thuyết Minh", slug: "thuyet-minh" },
    { name: "Anime (Hoạt Hình)", slug: "anime" }
  ];

  const [results, setResults] = useState<NormalizedMovie[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    
    const fetchFirstPage = async () => {
      try {
        let data: NormalizedMovie[] = [];
        if (q.length >= 2) {
          data = await movieApi.searchMovies(q, 1);
        } else if (lang) {
          if (lang === "anime") {
            data = await movieApi.getByList("hoat-hinh", 1);
          } else {
            const countrySlugs = ["au-my", "han-quoc", "trung-quoc", "nhat-ban", "viet-nam", "thai-lan"];
            if (countrySlugs.includes(lang)) {
              data = await movieApi.getByCountry(lang, 1);
            } else {
              data = await movieApi.searchMovies(lang, 1);
            }
          }
        } else {
          data = await movieApi.getNewMovies(1);
        }
        setResults(data);
        setHasMore(data.length >= 20);
      } catch (err) {
        console.error(err);
        setResults([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };

    fetchFirstPage();
  }, [q, lang]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setLoading(true);
    try {
      let data: NormalizedMovie[] = [];
      if (q.length >= 2) {
        data = await movieApi.searchMovies(q, nextPage);
      } else if (lang) {
        if (lang === "anime") {
          data = await movieApi.getByList("hoat-hinh", nextPage);
        } else {
          const countrySlugs = ["au-my", "han-quoc", "trung-quoc", "nhat-ban", "viet-nam", "thai-lan"];
          if (countrySlugs.includes(lang)) {
            data = await movieApi.getByCountry(lang, nextPage);
          } else {
            data = await movieApi.searchMovies(lang, nextPage);
          }
        }
      } else {
        data = await movieApi.getNewMovies(nextPage);
      }
      
      if (data.length > 0) {
        setResults((prev) => [...prev, ...data]);
        setPage(nextPage);
        setHasMore(data.length >= 20);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error(err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const activeLanguageName = languagesList.find((l) => l.slug === lang)?.name;

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
    openDetailModal(movie as NormalizedMovie, `search-${movie.id}`);
  };

  return (
    <main className="min-h-screen bg-transparent px-4 pt-28 pb-16 sm:px-8 md:px-14 lg:px-16">
      <label className="flex max-w-md items-center gap-2 rounded-full liquid-glass px-4 py-2 hover:brightness-110 focus-within:brightness-110 shadow-lg cursor-text">
        <Search className="shrink-0 text-white/60" size={18} />
        <input 
          value={q} 
          onChange={(e) => setSearchParams(e.target.value ? { q: e.target.value } : {})} 
          autoFocus 
          placeholder="Titles, people, languages" 
          className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-white/35 md:text-base" 
        />
      </label>

      {/* Language / Region Custom Dropdown */}
      <div className="mt-6 flex flex-col gap-1.5" ref={dropdownRef}>
        <span className="text-xs uppercase tracking-wider text-white/40 font-bold">Browse by Language / Region</span>
        <div className="flex flex-wrap items-center gap-2 w-full">
          <motion.button
            onClick={() => setIsOpen(!isOpen)}
            animate={{
              width: isOpen ? 200 : 40,
              paddingLeft: isOpen ? 14 : 0,
              paddingRight: isOpen ? 14 : 0,
            }}
            transition={{ type: "spring", stiffness: 350, damping: 26, mass: 0.85 }}
            className="flex h-10 items-center justify-center rounded-full glass-button text-sm font-semibold text-white focus:outline-none cursor-pointer overflow-hidden border border-white/10 shrink-0"
          >
            <div className="flex items-center justify-center gap-2 shrink-0">
              <Globe size={18} className="shrink-0" />
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="whitespace-nowrap font-bold text-white text-xs"
                >
                  {activeLanguageName ? activeLanguageName : "Tất cả ngôn ngữ / vùng"}
                </motion.span>
              )}
            </div>
          </motion.button>

          <motion.div
            initial={false}
            animate={{
              height: isOpen ? "auto" : 0,
              opacity: isOpen ? 1 : 0,
              pointerEvents: isOpen ? "auto" : "none",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="overflow-hidden w-full"
          >
            <div className="flex flex-wrap items-center gap-1.5 py-1 pr-4">
              <button
                onClick={() => {
                  setSearchParams({});
                  setIsOpen(false);
                }}
                className={`px-4 py-2 h-9 rounded-full text-xs font-semibold border transition shrink-0 cursor-pointer ${
                  !lang
                    ? "bg-white/25 border-white/40 text-white shadow-[0_2px_12px_rgba(255,255,255,0.15)] backdrop-blur-md"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                Tất cả ngôn ngữ / vùng
              </button>
              {languagesList.map((l) => {
                const isSelected = lang === l.slug;
                return (
                  <button
                    key={l.slug}
                    onClick={() => {
                      setSearchParams({ lang: l.slug });
                      setIsOpen(false);
                    }}
                    className={`px-4 py-2 h-9 rounded-full text-xs font-semibold border transition shrink-0 cursor-pointer ${
                      isSelected
                        ? "bg-white/25 border-white/40 text-white shadow-[0_2px_12px_rgba(255,255,255,0.15)] backdrop-blur-md"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {l.name}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>

      <h1 className="mt-10 text-2xl font-bold">
        {q.length > 1 
          ? `Search results for "${q}"` 
          : lang 
            ? `Language / Region: ${activeLanguageName}` 
            : "Explore titles"
        }
      </h1>

      {loading && results.length === 0 ? (
        <div className="mt-10 text-center text-white/50">Loading titles...</div>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="mt-5 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 md:gap-2">
            {results.map((movie: NormalizedMovie) => (
              <motion.div
                key={movie.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <MovieTile
                  movie={movie as any}
                  className="group relative w-full cursor-pointer rounded-[16px] transition"
                  onOpen={() => handleOpen(movie as any)}
                  onHover={(anchor) => {
                    if (activeMovieDetail || activePlayback) return;
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
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <div 
                key={`shimmer-${i}`} 
                className="aspect-video w-full overflow-hidden rounded bg-zinc-800/40 animate-pulse border border-white/5 relative before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent"
              />
            ))}
          </div>
          {!loading && hasMore && (
            <div className="flex justify-center mt-6 mb-4">
              <button
                onClick={handleLoadMore}
                className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm tracking-wide transition-all duration-300 border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:border-white/40 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
              >
                <span>Xem thêm</span>
                <ChevronDown size={18} className="transition-transform duration-300 group-hover:translate-y-1 text-white/70" />
              </button>
            </div>
          )}
        </div>
      )}

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
    </main>
  );
}
export default SearchPage;
