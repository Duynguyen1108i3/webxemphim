import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, ChevronDown, Info, Play, Plus, Volume2, VolumeX } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Skeleton } from "@streamforge/ui";
import { MovieRow } from "../components/MovieRow";
import type { MovieCardDto } from "@streamforge/shared-types";
import { movieApi, type MovieRowsResponse, type NormalizedMovie } from "../lib/movieApi";
import { usePlaybackStore } from "../store/playbackStore";
import { useAuthStore } from "../store/auth";
import { decodeHtml } from "../lib/htmlUtils";

export function HomePage({ type }: { type?: "tv-shows" | "movies" | "anime" | "new-popular" }) {
  const { openDetailModal, openPlayback } = usePlaybackStore();
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
  const hero = rows[0]?.items[0];
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
      <div className="px-4 sm:px-8 md:px-14 lg:px-16 pt-[76px] pb-3">
        <section className="relative min-h-[84vh] h-[85vh] overflow-hidden rounded-2xl bg-[#141414] shadow-[0_20px_60px_rgba(0,0,0,0.85)] border border-white/10">
          {hero?.trailerUrl ? (
            <motion.video layoutId="hero" className="absolute inset-0 h-full w-full object-cover opacity-90 brightness-105" autoPlay muted={isHeroMuted} loop playsInline poster={hero.backdropUrl} src={hero.trailerUrl} />
          ) : (
            hero && <motion.img layoutId="hero" src={hero.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-95 brightness-105 contrast-105" />
          )}
          
          {/* Elegant text readability gradients - crisp clear visual on right side */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/65 via-45% to-transparent z-[2]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/30 z-[2]" />
          
          <motion.div
            className="relative z-10 flex h-full max-w-2xl sm:max-w-3xl md:max-w-[70%] lg:max-w-[75%] flex-col justify-end pt-20 pb-12 pl-6 pr-4 sm:pl-12 md:pl-16"
            initial="hidden"
            animate="visible"
            transition={{ staggerChildren: 0.08, delayChildren: 0.12 }}
          >
            {/* RytoxGroup Original Pill Badge */}
            <motion.div variants={heroCopy} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} className="mb-2 flex items-center gap-2">
              <span className="brand-logo text-base sm:text-lg font-extrabold tracking-tight text-[#e50914]">RYTOXGROUP</span>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60 bg-white/10 px-2 py-0.5 rounded border border-white/10">ORIGINAL</span>
            </motion.div>

            {isLoading ? (
              <Skeleton className="h-14 w-80 rounded-lg" />
            ) : (
              <motion.h1 
                variants={heroCopy} 
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} 
                className="hero-title text-2xl font-black leading-tight sm:text-4xl md:text-5xl lg:text-6xl text-white text-shadow line-clamp-2 max-w-3xl"
              >
                {hero?.title ?? "RytoxGroup"}
              </motion.h1>
            )}
            
            <motion.div variants={heroCopy} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="mt-4 flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-semibold text-white/90">
              <span className="text-[#46d369] font-bold">{hero && "98% Match"}</span>
              <span className="text-white/30">•</span>
              <span>{hero?.releaseYear}</span>
              <span className="text-white/30">•</span>
              <span className="rounded border border-white/35 px-2 py-0.5 text-[11px] font-bold tracking-wider">{hero?.maturityRating?.replace("_", "-")}</span>
              <span className="text-white/30">•</span>
              <span>{hero?.runtimeMinutes}m</span>
              <span className="text-white/30">•</span>
              <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider">HD</span>
            </motion.div>
            
            <motion.p variants={heroCopy} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="synopsis mt-3.5 line-clamp-2 sm:line-clamp-3 text-sm leading-relaxed text-white/80 md:text-base max-w-2xl">
              {decodeHtml(hero?.synopsis ?? "")}
            </motion.p>
            
            <motion.div variants={heroCopy} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="mt-6 flex flex-wrap items-center gap-3">
              {hero && (hero as any).animeUrl && (
                <a
                  href="https://animevietsub.id/"
                  target="_blank"
                  rel="noreferrer"
                  className="nf-button inline-flex h-12 items-center justify-center rounded-full glass-button px-5 text-xs font-bold text-white transition focus:outline-none"
                >
                  Nguồn AnimeVietsub
                </a>
              )}
              {hero && (
                <button
                  onClick={() => openPlayback(hero as NormalizedMovie, "hero")}
                  className="nf-button inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-black transition hover:bg-white/90 focus:outline-none shadow-xl active:scale-95 duration-300 cursor-pointer"
                >
                  <Play size={18} fill="currentColor" /> Play
                </button>
              )}
              {hero && (
                <button
                  onClick={() => openDetailModal(hero as NormalizedMovie, "hero")}
                  className="nf-button inline-flex h-12 items-center justify-center gap-2 rounded-full glass-button px-7 text-sm font-bold text-white transition focus:outline-none active:scale-95 duration-300 cursor-pointer"
                >
                  <Info size={18} /> More Info
                </button>
              )}
              {hero && (
                <Button
                  variant="ghost"
                  onClick={() => toggleMyList(hero as NormalizedMovie)}
                  className="nf-button h-12 rounded-full px-7 glass-button text-white flex items-center justify-center gap-2 text-sm font-bold active:scale-95 duration-300 cursor-pointer"
                >
                  {inMyList ? <Check size={18} className="text-[#46d369]" /> : <Plus size={18} />}
                  {inMyList ? "In My List" : "My List"}
                </Button>
              )}
            </motion.div>
          </motion.div>
          
          {hero && (
            <div className="absolute bottom-10 right-0 z-20 flex items-center gap-3.5 select-none pr-4 sm:pr-8 md:pr-12">
              <button
                onClick={() => setIsHeroMuted(!isHeroMuted)}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/60 bg-black/35 text-white hover:bg-white/10 transition hover:border-white focus:outline-none cursor-pointer"
                aria-label={isHeroMuted ? "Unmute preview" : "Mute preview"}
              >
                {isHeroMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <div className="border-l-4 border-white/70 bg-black/45 px-5 py-1 text-xs font-semibold text-white">
                {hero.maturityRating?.replace("_", "-")}
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
                <ChevronDown size={18} className="transition-transform duration-300 group-hover:translate-y-1 text-[#e50914]" />
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
