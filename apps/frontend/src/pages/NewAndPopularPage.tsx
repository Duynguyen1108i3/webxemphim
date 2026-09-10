import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Info, Plus } from "lucide-react";
import { MovieRow } from "../components/MovieRow";
import { imdbApi, IMDB_GENRES, GENRE_LABELS_VI } from "../lib/imdbApi";
import type { NormalizedMovie } from "../lib/movieApi";
import { usePlaybackStore } from "../store/playbackStore";
import { useAuthStore } from "../store/auth";

export function NewAndPopularPage() {
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  const { openDetailModal, myList, toggleMyList, openAuthModal } = usePlaybackStore();
  const { user } = useAuthStore();

  // Fetch IMDb rows from Cinemeta
  const { data, isLoading } = useQuery({
    queryKey: ["imdb-new-popular-rows", selectedGenre],
    queryFn: () => imdbApi.getNewAndPopularRows(selectedGenre),
    staleTime: 5 * 60 * 1000,
  });

  const rows = data?.rows ?? [];

  // Extract candidate movies for Hero Carousel from rows
  const heroMovies = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    const candidates: NormalizedMovie[] = [];
    const seenIds = new Set<string>();

    for (const row of rows) {
      for (const item of row.items || []) {
        if (item && item.id && !seenIds.has(item.id) && (item.backdropUrl || item.posterUrl)) {
          seenIds.add(item.id);
          candidates.push(item);
          break;
        }
      }
      if (candidates.length >= 6) break;
    }

    if (candidates.length < 5 && rows[0]?.items) {
      for (const item of rows[0].items) {
        if (item && item.id && !seenIds.has(item.id) && (item.backdropUrl || item.posterUrl)) {
          seenIds.add(item.id);
          candidates.push(item);
        }
        if (candidates.length >= 6) break;
      }
    }

    return candidates;
  }, [rows]);

  const [heroIndex, setHeroIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-advance hero carousel every 6.5s unless hovered
  useEffect(() => {
    if (heroMovies.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroMovies.length);
    }, 6500);

    return () => clearInterval(timer);
  }, [heroMovies.length, isPaused]);

  const currentHeroIndex = heroMovies.length > 0 ? heroIndex % heroMovies.length : 0;
  const hero = heroMovies[currentHeroIndex] || rows[0]?.items[0];
  const inMyList = hero ? myList.some((item) => item.id === hero.id) : false;

  const handleToggleMyList = () => {
    if (!hero) return;
    if (!user) {
      openAuthModal();
      return;
    }
    toggleMyList(hero);
  };

  return (
    <main className="bg-transparent pb-16">
      {/* Top Cinematic Hero Section (Identical layout to HomePage) */}
      <div className="px-4 sm:px-8 md:px-14 lg:px-16 pt-[76px] pb-3">
        <section
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="group/hero relative min-h-[84vh] h-[85vh] overflow-hidden rounded-2xl bg-[#141414] shadow-[0_20px_60px_rgba(0,0,0,0.85)] border border-white/10 select-none"
        >
          {/* Animated Crossfading Hero Media */}
          <AnimatePresence mode="wait">
            {hero && (
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
            )}
          </AnimatePresence>

          {/* Elegant readability gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/70 via-45% to-transparent z-[2] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/30 z-[2] pointer-events-none" />

          {/* Hero Content */}
          <AnimatePresence mode="wait">
            {hero && (
              <motion.div
                key={`info-${hero.id}`}
                className="relative z-10 flex h-full max-w-2xl sm:max-w-3xl md:max-w-[70%] lg:max-w-[75%] flex-col justify-end pt-20 pb-16 pl-6 pr-4 sm:pl-12 md:pl-16"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                {/* Brand / Tagline */}
                <div className="mb-2 flex items-center gap-2">
                  <span className="brand-logo text-base sm:text-lg font-extrabold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.35)]">
                    RYTOXGROUP
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60 bg-white/10 px-2 py-0.5 rounded border border-white/10">
                    IMDb RADAR
                  </span>
                </div>

                {/* Hero Title */}
                <h1 className="hero-title text-2xl font-black leading-tight sm:text-4xl md:text-5xl lg:text-6xl text-white text-shadow line-clamp-2 max-w-3xl">
                  {hero.title || hero.name}
                </h1>

                {/* Metadata Row (Clean typography & small tags matching HomePage) */}
                <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-semibold text-white/90">
                  <span className="text-amber-400 font-bold">
                    ★ {hero.averageRating ? hero.averageRating.toFixed(1) : "8.5"} IMDb
                  </span>
                  <span className="text-white/30">•</span>
                  <span>{hero.releaseYear || hero.year}</span>
                  <span className="text-white/30">•</span>
                  <span className="rounded border border-white/35 px-2 py-0.5 text-[11px] font-bold tracking-wider">
                    4K Ultra HD
                  </span>
                  <span className="text-white/30">•</span>
                  <span>{hero.runtimeMinutes ? `${hero.runtimeMinutes}m` : "HD"}</span>
                  <span className="text-white/30">•</span>
                  <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider">
                    {hero.episode_current || (hero.mediaType === "tv" ? "TV Series" : "Movie")}
                  </span>
                  {hero.genres && hero.genres.length > 0 && (
                    <>
                      <span className="text-white/30">•</span>
                      <span className="text-white/70">
                        {hero.genres.map((g) => g.name).slice(0, 3).join(", ")}
                      </span>
                    </>
                  )}
                </div>

                {/* Synopsis */}
                <p className="synopsis mt-3.5 line-clamp-2 sm:line-clamp-3 text-sm leading-relaxed text-white/80 md:text-base max-w-2xl">
                  {hero.synopsis || hero.description || "Khám phá tác phẩm điện ảnh xuất sắc trên bảng xếp hạng IMDb quốc tế."}
                </p>

                {/* Synchronized Action Buttons */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openDetailModal(hero, "hero")}
                    className="nf-button inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-black transition hover:bg-white/90 focus:outline-none shadow-xl active:scale-95 duration-300 cursor-pointer"
                  >
                    <Info size={18} /> Chi tiết IMDb
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleMyList}
                    className="nf-button inline-flex h-12 items-center justify-center gap-2 rounded-full glass-button px-7 text-sm font-bold text-white transition focus:outline-none active:scale-95 duration-300 cursor-pointer"
                  >
                    {inMyList ? <Check size={18} className="text-[#46d369]" /> : <Plus size={18} />}
                    {inMyList ? "Đã lưu" : "Danh sách của tôi"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Previous / Next Navigation Controls */}
          {heroMovies.length > 1 && (
            <div className="absolute inset-y-0 left-0 right-0 z-20 flex items-center justify-between px-3 pointer-events-none opacity-0 group-hover/hero:opacity-100 transition-opacity duration-300">
              <button
                type="button"
                onClick={() =>
                  setHeroIndex((prev) => (prev - 1 + heroMovies.length) % heroMovies.length)
                }
                className="pointer-events-auto p-2.5 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white backdrop-blur-md transition hover:scale-110 active:scale-95 cursor-pointer shadow-xl"
                aria-label="Previous movie"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={() => setHeroIndex((prev) => (prev + 1) % heroMovies.length)}
                className="pointer-events-auto p-2.5 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white backdrop-blur-md transition hover:scale-110 active:scale-95 cursor-pointer shadow-xl"
                aria-label="Next movie"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          )}

          {/* Horizontal Rounded Indicator Pill Bars (— ━ —) */}
          {heroMovies.length > 1 && (
            <div className="absolute bottom-5 right-6 sm:right-12 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-full shadow-lg">
              {heroMovies.map((m, idx) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setHeroIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-400 cursor-pointer ${
                    currentHeroIndex === idx
                      ? "w-9 bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]"
                      : "w-5 bg-white/30 hover:bg-white/60 hover:w-7"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Genre Filter Bar (Native Netflix-style Category Filter) */}
      <div className="px-4 sm:px-8 md:px-14 lg:px-16 pt-4 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Mới & Phổ biến trên IMDb
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Bảng xếp hạng Top Trending & Phim điểm cao nhất toàn cầu
            </p>
          </div>

          {/* Genre Capsule Filter Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none max-w-full sm:max-w-2xl">
            {IMDB_GENRES.map((g) => {
              const isSelected = selectedGenre === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSelectedGenre(g)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 select-none cursor-pointer ${
                    isSelected
                      ? "bg-white text-black font-black shadow-[0_2px_12px_rgba(255,255,255,0.3)] border border-white"
                      : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/15 hover:text-white"
                  }`}
                >
                  {GENRE_LABELS_VI[g] || g}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Netflix Movie Rows Section */}
      <div className="space-y-6 pt-4">
        {isLoading ? (
          <div className="px-4 sm:px-8 md:px-14 lg:px-16 space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-6 w-48 bg-white/10 rounded-md animate-pulse" />
                <div className="flex gap-2 overflow-hidden">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div
                      key={j}
                      className="aspect-video w-[214px] shrink-0 rounded-[16px] bg-white/5 animate-pulse"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          rows.map((row) => (
            <MovieRow
              key={row.title}
              title={row.title}
              items={row.items}
              ranked={row.ranked}
            />
          ))
        )}
      </div>
    </main>
  );
}
