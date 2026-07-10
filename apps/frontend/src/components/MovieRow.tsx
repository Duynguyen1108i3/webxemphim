import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Play, Plus, ThumbsUp, X } from "lucide-react";
import type { MovieCardDto } from "@streamforge/shared-types";
import { Badge, Button } from "@streamforge/ui";
import { formatRuntime } from "@streamforge/utils";
import type { NormalizedMovie } from "../lib/movieApi";
import { usePlaybackStore } from "../store/playbackStore";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function MovieRow({ title, items, ranked = false, compact = false }: { title: string; items: MovieCardDto[]; ranked?: boolean; compact?: boolean }) {
  const { openDetailModal, openPlayback } = usePlaybackStore();
  const isContinueWatching = title === "Continue Watching for Celine";
  const [hovered, setHovered] = useState<{ movie: MovieCardDto; anchor: HTMLElement; rect: DOMRect } | null>(null);
  
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { clientWidth, scrollLeft } = rowRef.current;
      const offset = direction === "left" ? -clientWidth * 0.75 : clientWidth * 0.75;
      rowRef.current.scrollTo({ left: scrollLeft + offset, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const el = rowRef.current;
    if (el) {
      el.addEventListener("scroll", updateScrollState, { passive: true });
      updateScrollState();
      // Recalculate on window resize
      const handleResize = () => updateScrollState();
      window.addEventListener("resize", handleResize);
      return () => {
        el.removeEventListener("scroll", updateScrollState);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, []);

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

  return (
    <>
      <motion.section
        id={title ? `row-${slugify(title)}` : undefined}
        className={`relative z-20 space-y-2 ${compact ? "px-0" : "px-4 sm:px-8 md:px-14 lg:px-16"}`}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-8% 0px" }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2 className="text-lg font-bold text-white md:text-xl">{title}</h2>
        
        {/* Row Container with hover group for arrows */}
        <div className="group/row relative">
          {/* Scroll Left Button */}
          {canScrollLeft && (
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-0 bottom-4 z-30 hidden md:grid w-12 place-items-center bg-black/50 text-white opacity-0 group-hover/row:opacity-100 transition duration-300 hover:bg-black/75 focus:outline-none"
              aria-label="Scroll left"
            >
              <ChevronLeft size={32} className="transition-transform hover:scale-125" />
            </button>
          )}

          {/* Scrollable Items Wrapper */}
          <div
            ref={rowRef}
            onScroll={updateScrollState}
            className="scrollbar-none flex gap-1.5 overflow-x-auto pb-4 pt-1 md:gap-2 scroll-smooth"
          >
            {items.map((movie, index) => (
              <MovieTile
                key={movie.id}
                movie={movie}
                rank={ranked ? index + 1 : undefined}
                isContinueWatching={isContinueWatching}
                onOpen={() => {
                  if (isContinueWatching) {
                    openPlayback(movie as NormalizedMovie, `card-${movie.id}`);
                  } else {
                    openDetailModal(movie as NormalizedMovie, `card-${movie.id}`);
                  }
                }}
                onHover={(anchor) => {
                  clearCloseTimer();
                  clearOpenTimer();
                  openHoverTimer.current = window.setTimeout(() => setHovered({ movie, anchor, rect: anchor.getBoundingClientRect() }), 180);
                }}
                onHoverEnd={scheduleHoverClose}
              />
            ))}
          </div>

          {/* Scroll Right Button */}
          {canScrollRight && (
            <button
              onClick={() => scroll("right")}
              className="absolute right-0 top-0 bottom-4 z-30 hidden md:grid w-12 place-items-center bg-black/50 text-white opacity-0 group-hover/row:opacity-100 transition duration-300 hover:bg-black/75 focus:outline-none"
              aria-label="Scroll right"
            >
              <ChevronRight size={32} className="transition-transform hover:scale-125" />
            </button>
          )}
        </div>
      </motion.section>
      <AnimatePresence>
        {hovered && (
          <HoverPreview
            key={hovered.movie.id}
            movie={hovered.movie}
            rect={hovered.rect}
            isContinueWatching={isContinueWatching}
            onOpen={() => {
              if (isContinueWatching) {
                openPlayback(hovered.movie as NormalizedMovie, `card-${hovered.movie.id}`);
              } else {
                openDetailModal(hovered.movie as NormalizedMovie, `card-${hovered.movie.id}`);
              }
            }}
            onMouseEnter={() => {
              clearOpenTimer();
              clearCloseTimer();
            }}
            onMouseLeave={scheduleHoverClose}
          />
        )}
      </AnimatePresence>
      {/* Detail modal now handled globally in AppShell */}
    </>
  );
}

export const MovieTile = React.memo(function MovieTile({
  movie,
  rank,
  isContinueWatching = false,
  onOpen,
  onHover,
  onHoverEnd
}: {
  movie: MovieCardDto;
  rank?: number;
  isContinueWatching?: boolean;
  onOpen: () => void;
  onHover: (anchor: HTMLElement) => void;
  onHoverEnd: () => void;
}) {
  const removeFromWatchHistory = usePlaybackStore((state) => state.removeFromWatchHistory);

  return (
    <motion.article
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 280, damping: 30, mass: 0.7 }}
      className="group relative z-10 w-[148px] shrink-0 rounded-md transition sm:w-[180px] md:w-[214px] lg:w-[238px]"
      onMouseEnter={(event) => onHover(event.currentTarget)}
      onPointerEnter={(event) => onHover(event.currentTarget)}
      onMouseLeave={onHoverEnd}
      onPointerLeave={onHoverEnd}
      onFocus={(event) => onHover(event.currentTarget)}
      onBlur={onHoverEnd}
    >
      <button onClick={onOpen} className="relative block w-full overflow-hidden rounded-md bg-zinc-900 text-left focus:outline-none focus:ring-2 focus:ring-white/70" aria-label={`Open ${movie.title}`}>
        <motion.img layoutId={`card-${movie.id}`} src={movie.backdropUrl || movie.posterUrl} alt={movie.title} loading="lazy" className="aspect-video w-full object-cover transition duration-500 group-hover:brightness-90" />
        {(movie as any).progress !== undefined && (movie as any).progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700 z-10">
            <div className="h-full bg-[#e50914]" style={{ width: `${(movie as any).progress}%` }} />
          </div>
        )}
        {rank && <span className="absolute -left-1 bottom-0 text-[4rem] font-black leading-none text-black/70 [-webkit-text-stroke:1.5px_rgba(255,255,255,.72)] md:text-[5.5rem]">{rank}</span>}
        <span className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/85 to-transparent" />
        <span className="absolute bottom-2 left-2 line-clamp-1 pr-2 text-xs font-bold text-white md:text-sm">{movie.title}</span>
      </button>
      
      {isContinueWatching && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            removeFromWatchHistory(movie.id);
          }}
          className="absolute top-2 right-2 z-20 grid h-8 w-8 md:h-6 md:w-6 place-items-center rounded-full bg-black/60 text-white/70 border border-white/10 hover:text-white hover:bg-black/90 hover:scale-105 active:scale-95 transition cursor-pointer md:opacity-0 md:group-hover:opacity-100 shadow-lg"
          title="Xóa khỏi danh sách xem tiếp"
          aria-label="Remove from Continue Watching"
        >
          <X className="h-4 w-4 md:h-3 md:w-3" />
        </button>
      )}
    </motion.article>
  );
});

const HoverPreview = React.memo(function HoverPreview({
  movie,
  rect,
  isContinueWatching = false,
  onOpen,
  onMouseEnter,
  onMouseLeave
}: {
  movie: MovieCardDto;
  rect: DOMRect;
  isContinueWatching?: boolean;
  onOpen: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const width = Math.min(430, Math.max(rect.width + 180, rect.width * 1.82));
  const left = Math.min(window.innerWidth - width - 16, Math.max(16, rect.left + rect.width / 2 - width / 2));
  const top = Math.max(72, rect.top - 48);
  const { myList, toggleMyList, openDetailModal, removeFromWatchHistory } = usePlaybackStore();
  const inMyList = myList.some((item) => item.id === movie.id);

  return (
    <div
      className="fixed left-0 top-0 z-[80] will-change-transform"
      style={{ width, transform: `translate3d(${left}px, ${top}px, 0)` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <motion.article
        initial={{ opacity: 0, scale: 0.9, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: "spring", stiffness: 300, damping: 34, mass: 0.72 }}
        className="overflow-hidden rounded-md bg-[#181818] text-white shadow-[0_22px_64px_rgba(0,0,0,.78)] will-change-transform"
        style={{ transformOrigin: "center top" }}
      >
        <div className="relative w-full overflow-hidden bg-zinc-950 text-left">
          <button onClick={onOpen} className="block w-full text-left relative" aria-label={`Open ${movie.title} preview`}>
            <motion.img layoutId={`card-${movie.id}`} src={movie.backdropUrl || movie.posterUrl} alt={movie.title} className="aspect-video w-full object-cover" />
            {(movie as any).progress !== undefined && (movie as any).progress > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-700 z-10">
                <div className="h-full bg-[#e50914]" style={{ width: `${(movie as any).progress}%` }} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent" />
            <h3 className="absolute bottom-3 left-3 right-3 line-clamp-1 text-xl font-black text-white">{movie.title}</h3>
          </button>
          {isContinueWatching && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                removeFromWatchHistory(movie.id);
              }}
              className="absolute top-3 right-3 z-[90] grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white/70 border border-white/10 hover:text-white hover:bg-black/90 hover:scale-105 active:scale-95 transition cursor-pointer"
              title="Xóa khỏi danh sách xem tiếp"
              aria-label="Remove from Continue Watching"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="space-y-3 p-3">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                usePlaybackStore.getState().openPlayback(movie as NormalizedMovie, `card-${movie.id}`);
              }}
              className="nf-icon grid h-10 w-10 place-items-center rounded-full bg-white text-black transition hover:bg-white/80 focus:outline-none"
              aria-label="Play"
            >
              <Play size={18} fill="currentColor" />
            </button>
            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                toggleMyList(movie as NormalizedMovie);
              }}
              className="nf-icon grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-[#2a2a2a] p-0 hover:border-white hover:bg-[#333]"
              aria-label="Add to list"
            >
              {inMyList ? <Check size={18} className="text-[#46d369]" /> : <Plus size={18} />}
            </Button>
            <Button variant="ghost" className="nf-icon h-10 w-10 rounded-full border border-white/25 bg-[#2a2a2a] p-0 hover:border-white hover:bg-[#333]" aria-label="Like"><ThumbsUp size={17} /></Button>
            <button onClick={(e) => {
              e.stopPropagation();
              openDetailModal(movie as NormalizedMovie, `card-${movie.id}`);
            }} className="nf-icon ml-auto grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-[#2a2a2a] text-white transition hover:border-white hover:bg-[#333]" aria-label="Episodes and info"><ChevronDown size={20} /></button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/75">
            <span className="font-bold text-[#46d369]">{Math.min(99, Math.round(movie.averageRating * 10 + 10))}% Match</span>
            <Badge className="px-1.5 py-0.5 text-xs">{movie.maturityRating.replace("_", "-")}</Badge>
            <span>{formatRuntime(movie.runtimeMinutes)}</span>
            <span className="rounded border border-white/30 px-1 text-[11px]">HD</span>
          </div>
          <p className="line-clamp-1 text-sm text-white/85">{movie.genres.slice(0, 3).map((g) => g.name).join(" - ")}</p>
        </div>
      </motion.article>
    </div>
  );
});

// TitlePreview is replaced by the global detail modal overlay
