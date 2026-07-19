import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";
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
  const { openDetailModal, openPlayback } = usePlaybackStore();

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
    <main className="min-h-screen bg-[#141414] px-4 pt-28 pb-16 sm:px-8 md:px-14 lg:px-16">
      <label className="flex max-w-md items-center gap-2 rounded-full border border-white/20 bg-black/60 px-4 py-1.5 transition focus-within:border-white/50 focus-within:bg-black/85">
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
        <div className="relative inline-block w-full sm:w-64">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex w-full items-center justify-between rounded border border-white/20 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:border-white focus:outline-none cursor-pointer"
          >
            <span>{activeLanguageName ? activeLanguageName : "Tất cả ngôn ngữ / vùng"}</span>
            <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.ul
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded border border-white/10 bg-zinc-950 py-1.5 shadow-2xl backdrop-blur-md"
              >
                <li
                  onClick={() => {
                    setSearchParams({});
                    setIsOpen(false);
                  }}
                  className={`px-4 py-2 text-sm font-medium transition cursor-pointer hover:bg-white/15 hover:text-white ${!lang ? "text-[#e50914] font-bold" : "text-white/80"}`}
                >
                  Tất cả ngôn ngữ / vùng
                </li>
                {languagesList.map((l) => {
                  const isSelected = lang === l.slug;
                  return (
                    <li
                      key={l.slug}
                      onClick={() => {
                        setSearchParams({ lang: l.slug });
                        setIsOpen(false);
                      }}
                      className={`px-4 py-2 text-sm font-medium transition cursor-pointer hover:bg-white/15 hover:text-white ${isSelected ? "text-[#e50914] font-bold" : "text-white/80"}`}
                    >
                      {l.name}
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
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
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <div 
                key={`shimmer-${i}`} 
                className="aspect-video w-full overflow-hidden rounded bg-zinc-800/40 animate-pulse border border-white/5 relative before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent"
              />
            ))}
          </div>
          {!loading && hasMore && (
            <div className="flex justify-center mt-4">
              <button
                onClick={handleLoadMore}
                className="flex items-center gap-2 px-6 py-2 rounded-full border border-white/20 bg-zinc-900/60 hover:bg-white hover:text-black hover:border-white text-white text-sm font-semibold transition-all duration-300 shadow-md cursor-pointer"
              >
                <span>Xem thêm</span>
                <ChevronDown size={16} />
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
