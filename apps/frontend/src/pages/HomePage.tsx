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

export function HomePage({ type }: { type?: "tv-shows" | "movies" | "new-popular" }) {
  const { openDetailModal, openPlayback } = usePlaybackStore();
  const { data, isLoading } = useQuery<MovieRowsResponse>({
    queryKey: ["home-rows", type || "all"],
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      const fullData = await movieApi.getHomeRows();
      if (!type) return fullData;
      
      if (type === "tv-shows") {
        return {
          rows: fullData.rows.filter(
            (row) => row.title === "Phim bộ" || row.title === "TV Shows" || row.title === "Hoạt hình"
          )
        };
      }
      if (type === "movies") {
        return {
          rows: fullData.rows.filter(
            (row) => row.title === "Phim lẻ" || row.title === "Hành động" || row.title === "Hàn Quốc"
          )
        };
      }
      if (type === "new-popular") {
        return {
          rows: fullData.rows.filter(
            (row) => row.title === "Phim mới cập nhật"
          )
        };
      }
      return fullData;
    }
  });
  const rows = data?.rows ?? [];
  const hero = rows[0]?.items[0];
  const { myList, toggleMyList, watchHistory } = usePlaybackStore();
  const inMyList = hero ? myList.some((item) => item.id === hero.id) : false;
  const [isHeroMuted, setIsHeroMuted] = useState(true);

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
    <main className="bg-[#141414]">
      <section className="relative min-h-[86vh] overflow-hidden">
        {hero?.trailerUrl ? (
          <motion.video layoutId="hero" className="hero-ken-burns absolute inset-0 h-full w-full object-cover opacity-55" autoPlay muted={isHeroMuted} loop playsInline poster={hero.backdropUrl} src={hero.trailerUrl} />
        ) : (
          hero && <motion.img layoutId="hero" src={hero.backdropUrl} alt="" className="hero-ken-burns absolute inset-0 h-full w-full object-cover opacity-70" />
        )}
        <div className="cinema-mask absolute inset-0" />
        <motion.div
          className="relative z-10 flex min-h-[86vh] max-w-4xl flex-col justify-center px-4 pb-24 pt-28 sm:px-8 md:px-14 lg:px-16"
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.08, delayChildren: 0.12 }}
        >
          {isLoading ? <Skeleton className="h-16 w-80" /> : <motion.h1 variants={heroCopy} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="max-w-3xl text-5xl font-black leading-none md:text-7xl lg:text-8xl">{hero?.title ?? "StreamForge"}</motion.h1>}
          <motion.div variants={heroCopy} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="mt-5 flex items-center gap-3 text-sm font-semibold text-white/90">
            <span className="text-[#46d369]">{hero && "98% Match"}</span>
            <span>{hero?.releaseYear}</span>
            <span className="rounded border border-white/40 px-1.5 text-xs">{hero?.maturityRating?.replace("_", "-")}</span>
            <span>{hero?.runtimeMinutes}m</span>
            <span className="rounded bg-white/20 px-2 py-0.5 text-xs">HD</span>
          </motion.div>
  <motion.p variants={heroCopy} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="synopsis mt-5 line-clamp-3 max-w-2xl text-base leading-7 text-white/90 md:text-xl">{hero?.synopsis}</motion.p>
          <motion.div variants={heroCopy} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="mt-7 flex flex-wrap gap-3">
            {hero && (
              <button
                onClick={() => openPlayback(hero as NormalizedMovie, "hero")}
                className="nf-button inline-flex h-12 items-center justify-center gap-2 rounded bg-white px-7 text-lg font-bold text-black transition hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-white/70"
              >
                <Play size={24} fill="currentColor" /> Play
              </button>
            )}
            {hero && (
              <button
                onClick={() => openDetailModal(hero as NormalizedMovie, "hero")}
                className="nf-button inline-flex h-12 items-center justify-center gap-2 rounded bg-[#6d6d6eb3] px-7 text-lg font-bold text-white transition hover:bg-[#6d6d6e66] focus:outline-none focus:ring-2 focus:ring-white/70"
              >
                <Info size={24} /> More Info
              </button>
            )}
            {hero && (
              <Button
                variant="ghost"
                onClick={() => toggleMyList(hero as NormalizedMovie)}
                className="nf-button h-12 rounded-full px-5 border border-white/25 bg-black/40 hover:bg-white/10 text-white flex items-center gap-2"
              >
                {inMyList ? <Check size={22} className="text-[#46d369]" /> : <Plus size={22} />}
                {inMyList ? "In My List" : "My List"}
              </Button>
            )}
          </motion.div>
        </motion.div>
        
        {/* Maturity Rating & Volume controls moved directly to section parent for correct viewport alignment */}
        {hero && (
          <div className="absolute bottom-40 sm:bottom-28 right-0 z-20 flex items-center gap-4 select-none pr-4 sm:pr-8 md:pr-14 lg:pr-16">
            <button
              onClick={() => setIsHeroMuted(!isHeroMuted)}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/60 bg-black/35 text-white hover:bg-white/10 transition hover:border-white focus:outline-none cursor-pointer"
              aria-label={isHeroMuted ? "Unmute preview" : "Mute preview"}
            >
              {isHeroMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <div className="border-l-4 border-white/70 bg-black/45 px-6 py-1.5 text-sm font-semibold">
              {hero.maturityRating?.replace("_", "-")}
            </div>
          </div>
        )}
      </section>
      <Suspense fallback={<RowSkeleton />}>
        <div className="-mt-24 space-y-7 pb-16">
          {continueWatchingItems.length > 0 && (
            <MovieRow title="Continue Watching for Celine" items={continueWatchingItems as any[]} />
          )}
          {isLoading ? <RowSkeleton /> : rows.map((row) => <MovieRow key={row.title} title={row.title} items={row.items as MovieCardDto[]} ranked={row.ranked} />)}
        </div>
      </Suspense>
    </main>
  );
}

function RowSkeleton() {
  return <div className="flex gap-3 px-5 md:px-10">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 w-48 shrink-0" />)}</div>;
}
