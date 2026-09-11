import { Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Info, Play, Plus, Volume2, VolumeX } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Skeleton } from "@streamforge/ui";
import { MovieRow } from "../components/MovieRow";
import type { MovieCardDto } from "@streamforge/shared-types";
import { movieApi, type MovieRowsResponse, type NormalizedMovie } from "../lib/movieApi";
import { usePlaybackStore } from "../store/playbackStore";
import { useAuthStore } from "../store/auth";
import { decodeHtml } from "../lib/htmlUtils";

export function HomePage({ type }: { type?: "tv-shows" | "movies" | "anime" | "new-popular" }) {
  const navigate = useNavigate();
  const { openDetailModal, openPlayback, openAuthModal } = usePlaybackStore();
  const { user, profileId } = useAuthStore();
  const currentProfileName = profileId || user?.username || "bạn";
  const { data, isLoading } = useQuery<MovieRowsResponse>({
    queryKey: ["home-rows", type || "all"],
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      if (type === "anime") {
        return movieApi.getAnimeRows();
      }

      const fullData = await movieApi.getHomeRows();
      if (!type) return fullData;
      
      if (type === "tv-shows") {
        return {
          rows: fullData.rows.filter((row) => {
            const t = row.title.toLowerCase();
            return t.includes("bộ") || t.includes("tv") || t.includes("show") || t.includes("anime") || t.includes("hoạt hình") || t.includes("animation");
          })
        };
      }
      if (type === "movies") {
        return {
          rows: fullData.rows.filter((row) => {
            const t = row.title.toLowerCase();
            return t.includes("lẻ") || t.includes("movie") || t.includes("film") || t.includes("hành động") || t.includes("action") || t.includes("hàn quốc") || t.includes("korean");
          })
        };
      }
      if (type === "new-popular") {
        return {
          rows: fullData.rows.filter((row) => {
            const t = row.title.toLowerCase();
            return t.includes("mới") || t.includes("trending") || t.includes("popular") || t.includes("thịnh hành");
          })
        };
      }
      return fullData;
    }
  });
  const rows = data?.rows ?? [];
  const [visibleCount, setVisibleCount] = useState(6);

  // Extract diverse top featured movies across rows for the Hero Carousel
  const heroMovies = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    const candidates: NormalizedMovie[] = [];
    const seenIds = new Set<string>();

    // 1. Pick top candidate from each row to ensure diverse genres
    for (const row of rows) {
      for (const item of row.items || []) {
        if (item && item.id && !seenIds.has(item.id) && (item.backdropUrl || item.posterUrl)) {
          seenIds.add(item.id);
          candidates.push(item as NormalizedMovie);
          break;
        }
      }
      if (candidates.length >= 6) break;
    }

    // 2. If fewer than 5, pull more from the first row
    if (candidates.length < 5 && rows[0]?.items) {
      for (const item of rows[0].items) {
        if (item && item.id && !seenIds.has(item.id) && (item.backdropUrl || item.posterUrl)) {
          seenIds.add(item.id);
          candidates.push(item as NormalizedMovie);
        }
        if (candidates.length >= 6) break;
      }
    }

    return candidates;
  }, [rows]);

  const [heroIndex, setHeroIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Auto-scroll every 6.5s unless hovered
  useEffect(() => {
    if (heroMovies.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroMovies.length);
    }, 6500);

    return () => clearInterval(timer);
  }, [heroMovies.length, isPaused]);

  // Touch swipe gesture support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || heroMovies.length <= 1) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 45) {
      setHeroIndex((prev) => (prev + 1) % heroMovies.length);
    } else if (diff < -45) {
      setHeroIndex((prev) => (prev - 1 + heroMovies.length) % heroMovies.length);
    }
    setTouchStartX(null);
  };

  const currentHeroIndex = heroMovies.length > 0 ? (heroIndex % heroMovies.length) : 0;
  const hero = heroMovies[currentHeroIndex] || rows[0]?.items[0];

  const { myList, toggleMyList, watchHistory } = usePlaybackStore();
  const inMyList = hero ? myList.some((item) => item.id === hero.id) : false;
  const [isHeroMuted, setIsHeroMuted] = useState(true);

  const visibleRows = rows.slice(0, visibleCount);
  const hasMoreRows = visibleCount < rows.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 4, rows.length));
  };

  // Map watch history to cards with progress bars
  const continueWatchingItems = watchHistory.map((item) => ({
    ...item.movieData,
    progress: item.progress,
  }));
  const heroCopy = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <main className="bg-transparent pb-16">
      <div className="px-3 sm:px-8 md:px-14 lg:px-16 pt-[72px] sm:pt-[76px] pb-3">
        <section 
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="group/hero relative min-h-[68vh] sm:min-h-[84vh] h-[72vh] sm:h-[85vh] overflow-hidden rounded-2xl bg-[#141414] shadow-[0_20px_60px_rgba(0,0,0,0.85)] border border-white/10 select-none touch-pan-y"
        >
          {/* Animated Crossfading Hero Media */}
          <AnimatePresence mode="wait">
            {hero?.trailerUrl ? (
              <motion.video 
                key={`vid-${hero.id}`}
                className="absolute inset-0 h-full w-full object-cover opacity-90 brightness-105" 
                autoPlay 
                muted={isHeroMuted} 
                loop 
                playsInline 
                poster={hero.backdropUrl} 
                src={hero.trailerUrl} 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.9 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
              />
            ) : (
              hero && (
                <motion.img 
                  key={`img-${hero.id}`}
                  src={hero.backdropUrl || hero.posterUrl} 
                  alt="" 
                  className="absolute inset-0 h-full w-full object-cover opacity-95 brightness-105 contrast-105" 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.95 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: "easeInOut" }}
                />
              )
            )}
          </AnimatePresence>
          
          {/* Elegant text readability gradients - crisp clear visual on right side */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/70 via-45% to-transparent z-[2] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/30 z-[2] pointer-events-none" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={`info-${hero?.id}`}
              className="relative z-10 flex h-full max-w-2xl sm:max-w-3xl md:max-w-[70%] lg:max-w-[75%] flex-col justify-end pt-16 pb-12 pl-4 pr-4 sm:pt-20 sm:pb-16 sm:pl-12 md:pl-16"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* RytoxGroup Original Pill Badge */}
              <div className="mb-2 flex items-center gap-2">
                <span className="brand-logo text-base sm:text-lg font-extrabold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.35)]">RYTOXGROUP</span>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60 bg-white/10 px-2 py-0.5 rounded border border-white/10">ORIGINAL</span>
              </div>

              {isLoading ? (
                <Skeleton className="h-14 w-80 rounded-lg" />
              ) : (
                <h1 className="hero-title text-2xl font-black leading-tight sm:text-4xl md:text-5xl lg:text-6xl text-white text-shadow line-clamp-2 max-w-3xl">
                  {hero?.title ?? "RytoxGroup"}
                </h1>
              )}
              
              <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs sm:text-sm font-semibold text-white/90">
                <span className="text-[#46d369] font-bold">{hero && "98% Match"}</span>
                <span className="text-white/30">•</span>
                <span>{hero?.releaseYear || "2025"}</span>
                <span className="text-white/30">•</span>
                <span className="rounded border border-white/35 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold tracking-wider">{hero?.maturityRating?.replace("_", "-") || "16+"}</span>
                <span className="text-white/30">•</span>
                <span>{hero?.runtimeMinutes ? `${hero.runtimeMinutes}m` : "HD"}</span>
                <span className="text-white/30">•</span>
                <span className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold tracking-wider">HD</span>
              </div>
              
              <p className="synopsis mt-2.5 sm:mt-3.5 line-clamp-2 sm:line-clamp-3 text-xs sm:text-sm leading-relaxed text-white/80 md:text-base max-w-2xl">
                {decodeHtml(hero?.synopsis ?? "")}
              </p>
              
              <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-2.5 sm:gap-3">
                {hero && (hero as any).animeUrl && (
                  <a
                    href="https://animevietsub.id/"
                    target="_blank"
                    rel="noreferrer"
                    className="nf-button inline-flex h-11 sm:h-12 items-center justify-center rounded-full glass-button px-4 sm:px-5 text-xs font-bold text-white transition focus:outline-none"
                  >
                    Nguồn AnimeVietsub
                  </a>
                )}
                {hero && (
                  <button
                    onClick={() => openPlayback(hero as NormalizedMovie, "hero")}
                    className="nf-button inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-full bg-white px-5 sm:px-7 text-xs sm:text-sm font-bold text-black transition hover:bg-white/90 active:bg-white/80 focus:outline-none shadow-xl active:scale-95 duration-150 cursor-pointer"
                  >
                    <Play size={18} fill="currentColor" /> Play
                  </button>
                )}
                {hero && (
                  <button
                    onClick={() => openDetailModal(hero as NormalizedMovie, "hero")}
                    className="nf-button inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-full glass-button px-5 sm:px-7 text-xs sm:text-sm font-bold text-white transition focus:outline-none active:scale-95 duration-300 cursor-pointer"
                  >
                    <Info size={18} /> More Info
                  </button>
                )}
                {hero && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        openAuthModal();
                        return;
                      }
                      toggleMyList(hero as NormalizedMovie);
                    }}
                    className="nf-button inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-full glass-button px-5 sm:px-7 text-xs sm:text-sm font-bold text-white transition focus:outline-none active:scale-95 duration-300 cursor-pointer"
                  >
                    {inMyList ? <Check size={18} className="text-[#46d369]" /> : <Plus size={18} />}
                    {inMyList ? "In My List" : "My List"}
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Previous / Next Arrow Controls on Hover */}
          {heroMovies.length > 1 && (
            <>
              <button
                onClick={() => setHeroIndex((prev) => (prev - 1 + heroMovies.length) % heroMovies.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full glass-button opacity-0 group-hover/hero:opacity-100 transition-all duration-300 active:scale-95 cursor-pointer text-white shadow-lg hidden md:inline-flex items-center justify-center"
                aria-label="Previous movie"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                onClick={() => setHeroIndex((prev) => (prev + 1) % heroMovies.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full glass-button opacity-0 group-hover/hero:opacity-100 transition-all duration-300 active:scale-95 cursor-pointer text-white shadow-lg hidden md:inline-flex items-center justify-center"
                aria-label="Next movie"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}

          {/* Carousel Indicator Bars matching User's screenshot: — ━ — */}
          {heroMovies.length > 1 && (
            <div className="absolute bottom-3.5 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 sm:gap-2.5 p-1 sm:p-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl select-none">
              {heroMovies.map((m, idx) => (
                <button
                  key={m.id || idx}
                  onClick={() => setHeroIndex(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  className={`h-1 sm:h-1.5 rounded-full transition-all duration-400 cursor-pointer ${
                    currentHeroIndex === idx
                      ? "w-7 sm:w-9 bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]"
                      : "w-3.5 sm:w-5 bg-white/30 hover:bg-white/60 hover:w-7"
                  }`}
                />
              ))}
            </div>
          )}
          
          {hero && (
            <div className="absolute bottom-4 sm:bottom-10 right-0 z-20 hidden sm:flex items-center gap-3.5 select-none pr-4 sm:pr-8 md:pr-12">
              <button
                onClick={() => setIsHeroMuted(!isHeroMuted)}
                className="nf-icon glass-button grid h-9 w-9 place-items-center rounded-full text-white cursor-pointer"
                aria-label={isHeroMuted ? "Unmute preview" : "Mute preview"}
              >
                {isHeroMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <div className="border-l-4 border-white/70 bg-black/45 px-5 py-1 text-xs font-semibold text-white">
                {hero.maturityRating?.replace("_", "-") || "16+"}
              </div>
            </div>
          )}
        </section>
      </div>

      <Suspense fallback={<RowSkeleton />}>
        <div className="space-y-8 px-4 sm:px-8 md:px-14 lg:px-16">
          {continueWatchingItems.length > 0 && (
            <MovieRow title={`Continue Watching for ${currentProfileName}`} items={continueWatchingItems as any[]} />
          )}
          {isLoading ? (
            <RowSkeleton />
          ) : (
            visibleRows.map((row) => (
              <MovieRow key={row.title} title={row.title} items={row.items as MovieCardDto[]} ranked={row.ranked} />
            ))
          )}

          {!isLoading && hasMoreRows && (
            <div className="flex justify-center pt-6 pb-2">
              <button
                onClick={handleLoadMore}
                className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm tracking-wide transition-all duration-300 border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:border-white/40 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
              >
                <span>Xem thêm phim & thể loại</span>
                <ChevronDown size={18} className="transition-transform duration-300 group-hover:translate-y-1 text-white/70" />
              </button>
            </div>
          )}
        </div>
      </Suspense>
    </main>
  );
}

function RowSkeleton() {
  return <div className="flex gap-3 px-5 md:px-10">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 w-48 shrink-0" />)}</div>;
}
