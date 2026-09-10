import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Play, Plus, ThumbsUp, X } from "lucide-react";
import type { MovieCardDto } from "@streamforge/shared-types";
import { Badge, Button } from "@streamforge/ui";
import { formatRuntime } from "@streamforge/utils";
import type { NormalizedMovie } from "../lib/movieApi";
import { usePlaybackStore } from "../store/playbackStore";
import { useAuthStore } from "../store/auth";
import { useNavigate } from "react-router-dom";
import { ParallaxTilt } from "./ParallaxTilt";

function createFallbackImage(title: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#1f1f1f"/><stop offset=".55" stop-color="#111"/><stop offset="1" stop-color="#2a0d10"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><rect width="1280" height="720" fill="#000" opacity=".22"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function fallbackImageSource(src: string, title: string) {
  if (!src || src.startsWith("data:")) return createFallbackImage(title);

  try {
    const url = new URL(src);
    if (url.hostname === "wsrv.nl") {
      const original = url.searchParams.get("url");
      if (original && original !== src) return original;
    }
  } catch {
    // Fall through to generated fallback.
  }

  if (/^https?:\/\//i.test(src)) {
    return `https://wsrv.nl/?url=${encodeURIComponent(src)}&default=${encodeURIComponent(createFallbackImage(title))}`;
  }

  return createFallbackImage(title);
}

function handleImageError(event: React.SyntheticEvent<HTMLImageElement>, title: string) {
  const img = event.currentTarget;
  const nextSrc = fallbackImageSource(img.currentSrc || img.src || img.getAttribute("src") || "", title);
  if (img.dataset.fallbackSrc === nextSrc) return;
  img.dataset.fallbackSrc = nextSrc;
  img.src = nextSrc;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function MovieRow({ title, items, ranked = false, compact = false }: { title: string; items: MovieCardDto[]; ranked?: boolean; compact?: boolean }) {
  const { openDetailModal, openPlayback, activeMovieDetail, activePlayback } = usePlaybackStore();
  const isContinueWatching = title.startsWith("Continue Watching") || title.startsWith("Tiếp tục xem");
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

  // Clear hover popup when detail modal or player opens
  useEffect(() => {
    if (activeMovieDetail || activePlayback) {
      setHovered(null);
      clearOpenTimer();
      clearCloseTimer();
    }
  }, [activeMovieDetail, activePlayback]);

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
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Dynamic ambient background reflection of the row's movie posters */}
        <div 
          className="absolute inset-0 -z-10 pointer-events-none overflow-hidden blur-[90px] saturate-[160%] select-none scale-[1.05] transition-all duration-700"
          style={{ opacity: "var(--ambient-opacity, 0.25)" }}
        >
          <div className="flex gap-4">
            {items.slice(0, 10).map((movie) => (
              <img
                key={`bg-${movie.id}`}
                src={movie.posterUrl || movie.backdropUrl}
                alt=""
                className="w-40 aspect-[2/3] object-cover rounded-md shrink-0"
              />
            ))}
          </div>
        </div>
        <h2 className="text-lg font-bold text-white md:text-xl">{title}</h2>
        
        {/* Row Container with hover group for arrows */}
        <div className="group/row relative">
          {/* Scroll Left Button */}
          {canScrollLeft && (
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-0 bottom-4 z-30 hidden md:grid w-12 place-items-center text-white opacity-0 group-hover/row:opacity-100 transition duration-300 focus:outline-none cursor-pointer"
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
                index={index}
                rank={ranked ? index + 1 : undefined}
                isContinueWatching={isContinueWatching}
                onOpen={() => {
                  setHovered(null);
                  clearOpenTimer();
                  clearCloseTimer();
                  if (isContinueWatching) {
                    openPlayback(movie as NormalizedMovie, `card-${movie.id}`);
                  } else {
                    openDetailModal(movie as NormalizedMovie, `card-${movie.id}`);
                  }
                }}
                onHover={(anchor) => {
                  if (typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0)) {
                    return;
                  }
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
              className="absolute right-0 top-0 bottom-4 z-30 hidden md:grid w-12 place-items-center text-white opacity-0 group-hover/row:opacity-100 transition duration-300 focus:outline-none cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight size={32} className="transition-transform hover:scale-125" />
            </button>
          )}
        </div>
      </motion.section>
      <AnimatePresence>
        {hovered && !activeMovieDetail && !activePlayback && (
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
  onHoverEnd,
  className,
  index = 0
}: {
  movie: MovieCardDto;
  rank?: number;
  isContinueWatching?: boolean;
  onOpen: () => void;
  onHover: (anchor: HTMLElement) => void;
  onHoverEnd: () => void;
  className?: string;
  index?: number;
}) {
  const removeFromWatchHistory = usePlaybackStore((state) => state.removeFromWatchHistory);

  return (
    <motion.article
      whileHover={{ y: -6, scale: 1.025 }}
      whileTap={{ scale: 0.96 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 24,
        mass: 0.8
      }}
      className={className || "group relative z-10 w-[148px] shrink-0 rounded-[16px] transition sm:w-[180px] md:w-[214px] lg:w-[238px]"}
      onMouseEnter={(event) => onHover(event.currentTarget)}
      onPointerEnter={(event) => onHover(event.currentTarget)}
      onMouseLeave={onHoverEnd}
      onPointerLeave={onHoverEnd}
      onFocus={(event) => onHover(event.currentTarget)}
      onBlur={onHoverEnd}
    >
      <button onClick={onOpen} className="movie-card relative block w-full overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-white/70" aria-label={`Open ${movie.title}`}>
        <img src={movie.backdropUrl || movie.posterUrl} alt={movie.title} loading="lazy" onError={(event) => handleImageError(event, movie.title)} className="aspect-video w-full object-cover transition duration-500 group-hover:brightness-90" />
        {(movie as any).progress !== undefined && (movie as any).progress > 0 && (
          <div className="absolute bottom-1.5 left-2.5 right-2.5 h-1 rounded-full bg-zinc-700/50 z-10 overflow-hidden">
            <div className="h-full bg-[#e50914] rounded-full shadow-[0_0_6px_#e50914]" style={{ width: `${(movie as any).progress}%` }} />
          </div>
        )}
        {rank && <span className="absolute -left-1 bottom-0 text-[4rem] font-black leading-none text-black/70 [-webkit-text-stroke:1.5px_rgba(255,255,255,.72)] md:text-[5.5rem]">{rank}</span>}
        
        {/* Luminous Glass Transparency Star and Score badge */}
        {!isContinueWatching && ((movie as any).averageRating && Number((movie as any).averageRating) > 0) && (
          <div className="glass-imdb-badge absolute top-2 right-2 z-10">
            <span className="star-glow">★</span>
            <span className="score-glow">{Number((movie as any).averageRating).toFixed(1)}</span>
          </div>
        )}

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
          onMouseEnter={(e) => {
            e.stopPropagation();
            onHoverEnd();
          }}
          onPointerEnter={(e) => e.stopPropagation()}
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

export const HoverPreview = React.memo(function HoverPreview({
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
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { myList, toggleMyList, openDetailModal, removeFromWatchHistory, openAuthModal } = usePlaybackStore();
  const inMyList = myList.some((item) => item.id === movie.id);

  return createPortal(
    <div
      className="fixed left-0 top-0 z-[100] will-change-transform"
      style={{ width, transform: `translate3d(${left}px, ${top}px, 0)` }}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <ParallaxTilt maxTilt={8}>
        <motion.article
          initial={{ opacity: 0, scale: 0.9, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: "spring", stiffness: 120, damping: 14, mass: 0.8 }}
          className="liquid-glass overflow-hidden rounded-2xl text-white shadow-[0_22px_64px_rgba(0,0,0,.78)] will-change-transform"
          style={{ transformOrigin: "center top", transformStyle: "preserve-3d" }}
        >
          <div className="relative w-full overflow-hidden bg-zinc-950 text-left">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
              className="block w-full text-left relative"
              aria-label={`Open ${movie.title} preview`}
            >
              <img src={movie.backdropUrl || movie.posterUrl} alt={movie.title} onError={(event) => handleImageError(event, movie.title)} className="aspect-video w-full object-cover" />
              {(movie as any).progress !== undefined && (movie as any).progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-700 z-10">
                  <div className="h-full bg-[#e50914]" style={{ width: `${(movie as any).progress}%` }} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#181818]/80 via-transparent to-transparent" />
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
              {!(movie as any).noPlayback ? (
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
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen();
                  }}
                  className="nf-icon grid h-10 w-10 place-items-center rounded-full bg-white text-black transition hover:bg-white/80 focus:outline-none"
                  title="Xem chi tiết"
                  aria-label="Details"
                >
                  <Play size={18} fill="currentColor" />
                </button>
              )}
              <Button
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!user) {
                    openAuthModal();
                    return;
                  }
                  toggleMyList(movie as NormalizedMovie);
                }}
                className="nf-icon glass-button grid h-10 w-10 place-items-center rounded-full p-0"
                aria-label="Add to list"
              >
                {inMyList ? <Check size={18} className="text-[#46d369]" /> : <Plus size={18} />}
              </Button>
              <Button variant="ghost" className="nf-icon glass-button h-10 w-10 rounded-full p-0" aria-label="Like"><ThumbsUp size={17} /></Button>
              <button onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }} className="nf-icon glass-button ml-auto grid h-10 w-10 place-items-center rounded-full text-white" aria-label="Episodes and info"><ChevronDown size={20} /></button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-white/75">
              <span className="font-bold text-[#46d369]">★ {movie.averageRating ? movie.averageRating.toFixed(1) : "8.0"} IMDb</span>
              <Badge className="px-1.5 py-0.5 text-xs bg-white/5 border-white/10">{movie.maturityRating.replace("_", "-")}</Badge>
              <span>{formatRuntime(movie.runtimeMinutes)}</span>
              <span className="rounded border border-white/20 px-1 text-[11px] bg-white/5">HD</span>
            </div>
            <p className="line-clamp-1 text-sm text-white/85">{movie.genres.slice(0, 3).map((g) => g.name).join(" - ")}</p>
          </div>
        </motion.article>
      </ParallaxTilt>
    </div>,
    document.body
  );
});

// TitlePreview is replaced by the global detail modal overlay
