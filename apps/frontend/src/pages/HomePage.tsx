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
import { decodeHtml } from "../lib/htmlUtils";

export function HomePage({ type }: { type?: "tv-shows" | "movies" | "anime" | "new-popular" }) {
  const { openDetailModal, openPlayback } = usePlaybackStore();
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
    <main className="bg-transparent pb-16">
      <div className="px-4 sm:px-8 md:px-14 lg:px-16 pt-20 pb-8">
        <section className="relative h-[78vh] overflow-hidden rounded-2xl bg-zinc-950 shadow-2xl">
          {hero?.trailerUrl ? (
            <motion.video layoutId="hero" className="absolute inset-0 h-full w-full object-cover opacity-60" autoPlay muted={isHeroMuted} loop playsInline poster={hero.backdropUrl} src={hero.trailerUrl} />
          ) : (
            hero && <motion.img layoutId="hero" src={hero.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
          )}
          
          {/* Netflix style left and bottom gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent z-[2]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414]/90 via-transparent to-transparent z-[2]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent z-[1]" />
          
          <motion.div
            className="relative z-10 flex h-full max-w-xl md:max-w-[55%] lg:max-w-[60%] flex-col justify-end pt-24 pb-14 pl-6 pr-4 sm:pl-12 md:pl-16"
            initial="hidden"
            animate="visible"
            transition={{ staggerChildren: 0.08, delayChildren: 0.12 }}
          >
            {isLoading ? (
              <Skeleton className="h-12 w-80" />
            ) : (
              <motion.h1 
                variants={heroCopy} 
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} 
                className="max-w-3xl text-2xl font-black leading-tight sm:text-4xl md:text-5xl lg:text-5xl text-shadow text-white line-clamp-3"
              >
                {hero?.title ?? "StreamForge"}
              </motion.h1>
            )}
            
            <motion.div variants={heroCopy} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="mt-3.5 flex items-center gap-2 text-xs font-semibold text-white/85">
              <span className="text-[#46d369]">{hero && "98% Match"}</span>
              <span className="text-white/30">•</span>
              <span>{hero?.releaseYear}</span>
              <span className="text-white/30">•</span>
              <span className="rounded border border-white/30 px-1.5 py-0.2 text-[10px] font-bold">{hero?.maturityRating?.replace("_", "-")}</span>
              <span className="text-white/30">•</span>
              <span>{hero?.runtimeMinutes}m</span>
              <span className="text-white/30">•</span>
              <span className="rounded bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">HD</span>
            </motion.div>
            
            <motion.p variants={heroCopy} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="synopsis mt-4 line-clamp-3 text-sm leading-relaxed text-white/80 md:text-base">
              {decodeHtml(hero?.synopsis ?? "")}
            </motion.p>
            
            <motion.div variants={heroCopy} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="mt-6 flex flex-wrap gap-2.5">
              {hero && (hero as any).animeUrl && (
                <a
                  href="https://animevietsub.id/"
                  target="_blank"
                  rel="noreferrer"
                  className="nf-button inline-flex h-11 items-center justify-center rounded-full glass-button px-5 text-xs font-bold text-white transition focus:outline-none"
                >
                  Nguồn AnimeVietsub
                </a>
              )}
              {hero && (
                <button
                  onClick={() => openPlayback(hero as NormalizedMovie, "hero")}
                  className="nf-button inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black transition hover:bg-white/90 focus:outline-none shadow-lg active:scale-95 duration-300"
                >
                  <Play size={18} fill="currentColor" /> Play
                </button>
              )}
              {hero && (
                <button
                  onClick={() => openDetailModal(hero as NormalizedMovie, "hero")}
                  className="nf-button inline-flex h-11 items-center justify-center gap-2 rounded-full glass-button px-6 text-sm font-bold text-white transition focus:outline-none active:scale-95 duration-300"
                >
                  <Info size={18} /> More Info
                </button>
              )}
              {hero && (
                <Button
                  variant="ghost"
                  onClick={() => toggleMyList(hero as NormalizedMovie)}
                  className="nf-button h-11 rounded-full px-6 glass-button text-white flex items-center justify-center gap-1.5 text-sm font-bold active:scale-95 duration-300"
                >
                  {inMyList ? <Check size={16} className="text-[#46d369]" /> : <Plus size={16} />}
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
