import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { MovieTile } from "../MovieRow";
import { Skeleton } from "@streamforge/ui";
import type { MovieCardDto } from "@streamforge/shared-types";
import type { NormalizedMovie } from "../../lib/movieApi";

interface ShellSearchOverlayProps {
  q: string;
  isSearching: boolean;
  searchResults: NormalizedMovie[];
  hasMoreSearch: boolean;
  onLoadMore: () => void;
  onOpenMovie: (movie: MovieCardDto) => void;
  onHover: (movie: MovieCardDto, anchor: HTMLElement) => void;
  onHoverEnd: () => void;
}

export function ShellSearchOverlay({
  q,
  isSearching,
  searchResults,
  hasMoreSearch,
  onLoadMore,
  onOpenMovie,
  onHover,
  onHoverEnd
}: ShellSearchOverlayProps) {
  return (
    <main className="bg-transparent min-h-screen pt-28 pb-16 px-4 sm:px-8 md:px-14 lg:px-16">
      <h1 className="text-2xl font-bold mb-6 text-white/50">Search results for "{q}"</h1>
      {isSearching && searchResults.length === 0 ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-72 shrink-0 bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : searchResults.length > 0 ? (
        <div className="flex flex-col gap-8">
          <div className="mt-5 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 md:gap-2">
            {searchResults.map((movie: NormalizedMovie) => (
              <motion.div
                key={movie.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <MovieTile
                  movie={movie as any}
                  className="group relative w-full cursor-pointer rounded-md transition"
                  onOpen={() => onOpenMovie(movie as any)}
                  onHover={(anchor) => onHover(movie as any, anchor)}
                  onHoverEnd={onHoverEnd}
                />
              </motion.div>
            ))}
            {isSearching && Array.from({ length: 6 }).map((_, i) => (
              <div 
                key={`shimmer-${i}`} 
                className="aspect-video w-full overflow-hidden rounded bg-zinc-800/40 animate-pulse border border-white/5 relative before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent"
              />
            ))}
          </div>
          {!isSearching && hasMoreSearch && (
            <div className="flex justify-center mt-6 mb-4">
              <button
                onClick={onLoadMore}
                disabled={isSearching}
                className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm tracking-wide transition-all duration-300 border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:border-white/40 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md disabled:opacity-50"
              >
                <span>Xem thêm</span>
                <ChevronDown size={18} className="transition-transform duration-300 group-hover:translate-y-1 text-white/70" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500">
          No search results found for "{q}". Try searching for another title.
        </div>
      )}
    </main>
  );
}
