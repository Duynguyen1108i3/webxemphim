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
import { LiquidGlassButton } from "./liquid-glass";

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

export const MovieRow = React.memo(function MovieRow({ title, items, ranked = false, compact = false }: { title: string; items: MovieCardDto[]; ranked?: boolean; compact?: boolean }) {
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
  const lastScrollTimeRef = useRef<number>(0);

  const clearOpenTimer = () => { if (openHoverTimer.current != null) { window.clearTimeout(openHoverTimer.current); openHoverTimer.current = null; } };
  const clearCloseTimer = () => { if (closeHoverTimer.current != null) { window.clearTimeout(closeHoverTimer.current); closeHoverTimer.current = null; } };

  function scheduleHoverClose() {
    if (Date.now() - lastScrollTimeRef.current < 220) {
      return;
    }
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

  // While scrolling, cancel pending hover-open timers if no popup is open yet.
  useEffect(() => {
    const handleScroll = () => {
      lastScrollTimeRef.current = Date.now();
      clearOpenTimer();
    };
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", handleScroll, { capture: true });
  }, []);

  return (
    <>
      <section
        id={title ? `row-${slugify(title)}` : undefined}
        className={`movie-row-section relative z-20 space-y-2 ${compact ? "px-0" : "px-4 sm:px-8 md:px-14 lg:px-16"}`}
      >
        <h2 className="text-lg font-bold text-white md:text-xl">{title}</h2>
        
        {/* Row Container with hover group for arrows */}
        <div className="group/row relative">
          {/* Scroll Left Button */}
          {canScrollLeft && (
            <LiquidGlassButton
              shape="circle"
              disableWebGL={true}
              onClick={() => scroll("left")}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-30 hidden md:grid w-10 h-10 place-items-center text-white shadow-2xl opacity-0 group-hover/row:opacity-100 transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none cursor-pointer p-0"
              aria-label="Scroll left"
            >
              <ChevronLeft size={24} />
            </LiquidGlassButton>
          )}

          {/* Scrollable Items Wrapper */}
          <div
            ref={rowRef}
            onScroll={updateScrollState}
            className="scrollbar-none flex gap-1.5 overflow-x-auto pb-4 pt-1 md:gap-2 scroll-smooth overscroll-x-contain touch-pan-x"
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
            <LiquidGlassButton
              shape="circle"
              disableWebGL={true}
              onClick={() => scroll("right")}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 hidden md:grid w-10 h-10 place-items-center text-white shadow-2xl opacity-0 group-hover/row:opacity-100 transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none cursor-pointer p-0"
              aria-label="Scroll right"
            >
              <ChevronRight size={24} />
            </LiquidGlassButton>
          )}
        </div>
      </section>
      <AnimatePresence>
        {hovered && !activeMovieDetail && !activePlayback && (
          <HoverPreview
            key={hovered.movie.id}
            movie={hovered.movie}
            rect={hovered.rect}
            anchor={hovered.anchor}
            isContinueWatching={isContinueWatching}
            onOpen={() => {
              if (isContinueWatching) {
                openPlayback(hovered.movie as NormalizedMovie, `card-${hovered.movie.id}`);
              } else {
                openDetailModal(hovered.movie as NormalizedMovie, `card-${hovered.movie.id}`);
              }
            }}
            onClose={() => {
              clearOpenTimer();
              clearCloseTimer();
              setHovered(null);
            }}
            onMouseEnter={() => {
              clearOpenTimer();
              clearCloseTimer();
            }}
            onMouseLeave={() => {
              clearCloseTimer();
              clearOpenTimer();
              closeHoverTimer.current = window.setTimeout(() => setHovered(null), 180);
            }}
          />
        )}
      </AnimatePresence>
      {/* Detail modal now handled globally in AppShell */}
    </>
  );
});

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

  const isTouchOnly = () =>
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  return (
    <article
      className={
        className ||
        "group relative z-10 w-[148px] shrink-0 rounded-[16px] transition-transform duration-200 ease-out hover:-translate-y-1.5 hover:scale-[1.025] active:scale-[0.96] sm:w-[180px] md:w-[214px] lg:w-[238px]"
      }
      onMouseEnter={(event) => {
        if (isTouchOnly()) return;
        onHover(event.currentTarget);
      }}
      onMouseLeave={onHoverEnd}
      onFocus={(event) => {
        if (isTouchOnly()) return;
        onHover(event.currentTarget);
      }}
      onBlur={onHoverEnd}
    >
      <button onClick={onOpen} className="movie-card relative block w-full overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-white/70 bg-gradient-to-br from-[#1d1f2c] to-[#0c0e15]" aria-label={`Open ${movie.title}`}>
        <img
          src={movie.backdropUrl || movie.posterUrl}
          alt={movie.title}
          loading={index < 3 ? "eager" : "lazy"}
          decoding="async"
          onError={(event) => handleImageError(event, movie.title)}
          className="aspect-video w-full object-cover transition-opacity duration-300 group-hover:brightness-90"
        />
        {(movie as any).progress !== undefined && (movie as any).progress > 0 ? (
          <div className="absolute bottom-1.5 left-2.5 right-2.5 h-1 rounded-full bg-zinc-700/50 z-10 overflow-hidden">
            <div className="h-full bg-[#e50914] rounded-full shadow-[0_0_6px_#e50914]" style={{ width: `${(movie as any).progress}%` }} />
          </div>
        ) : null}
        {Boolean(rank) ? (
          <span className="absolute -left-1 bottom-0 text-[3.25rem] sm:text-[4rem] font-black leading-none text-black/70 [-webkit-text-stroke:1.5px_rgba(255,255,255,.72)] md:text-[5.5rem]">
            {rank}
          </span>
        ) : null}
        
        {/* Absolutely NO button, NO box, NO border - ONLY glowing star and score */}
        {!isContinueWatching && Number((movie as any).averageRating) > 0 ? (
          <div className="absolute top-2 right-2 sm:right-2.5 z-10 flex items-center gap-1 text-[11px] sm:text-xs md:text-sm font-black pointer-events-none select-none">
            <span className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.95)]">★</span>
            <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.85)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] tracking-tight font-black">
              {Number((movie as any).averageRating).toFixed(1)}
            </span>
          </div>
        ) : null}

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
    </article>
  );
});

export const HoverPreview = React.memo(function HoverPreview({
  movie,
  rect,
  anchor,
  isContinueWatching = false,
  onOpen,
  onClose,
  onMouseEnter,
  onMouseLeave
}: {
  movie: MovieCardDto;
  rect: DOMRect;
  anchor?: HTMLElement | null;
  isContinueWatching?: boolean;
  onOpen: () => void;
  onClose?: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const portalRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const onMouseLeaveRef = useRef(onMouseLeave);
  onMouseLeaveRef.current = onMouseLeave;
  const onCloseRef = useRef(onClose || onMouseLeave);
  onCloseRef.current = onClose || onMouseLeave;

  const { user } = useAuthStore();
  const { myList, toggleMyList, removeFromWatchHistory, openAuthModal, activePlayback, activeMovieDetail } = usePlaybackStore();
  const inMyList = myList.some((item) => item.id === movie.id);

  const isInsideModal = Boolean(activeMovieDetail) || (typeof document !== "undefined" && document.body.style.position === "fixed");
  const initialRect = anchor && anchor.isConnected ? anchor.getBoundingClientRect() : rect;
  const offsetYRef = useRef(isInsideModal ? -48 : Math.max(-48, 72 - initialRect.top));

  const computeCoords = (r: DOMRect, useDocumentCoords: boolean) => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
    const sideMargin = vw < 640 ? 12 : 16;
    const maxW = Math.min(430, vw - sideMargin * 2);
    const w = Math.min(maxW, Math.max(r.width + (vw < 640 ? 110 : 180), r.width * 1.82));
    const vpLeft = Math.min(vw - w - sideMargin, Math.max(sideMargin, r.left + r.width / 2 - w / 2));
    const vpTop = Math.max(72, r.top + offsetYRef.current);
    if (useDocumentCoords) {
      return {
        width: w,
        left: vpLeft + window.scrollX,
        top: r.top + window.scrollY + offsetYRef.current
      };
    }
    return { width: w, left: vpLeft, top: vpTop };
  };

  const { width, left, top } = computeCoords(initialRect, !isInsideModal);

  useEffect(() => {
    if (!anchor) return;

    const syncPosition = () => {
      rafRef.current = null;
      if (!anchor.isConnected || !portalRef.current) {
        onCloseRef.current();
        return;
      }
      const r = anchor.getBoundingClientRect();
      const useFixed = Boolean(usePlaybackStore.getState().activeMovieDetail) || document.body.style.position === "fixed";
      const coords = computeCoords(r, !useFixed);
      portalRef.current.style.position = useFixed ? "fixed" : "absolute";
      portalRef.current.style.width = `${coords.width}px`;
      portalRef.current.style.transform = `translate3d(${coords.left}px, ${coords.top}px, 0)`;

      const bottomCut = window.innerWidth < 768 && !useFixed ? 72 : 16;
      const isOutOfView =
        r.top < 56 ||
        r.bottom < 96 ||
        r.top > window.innerHeight - bottomCut ||
        r.right < 0 ||
        r.left > window.innerWidth;

      if (isOutOfView) {
        onCloseRef.current();
      }
    };

    const handleScrollOrResize = () => {
      lastScrollTimeRef.current = Date.now();
      if (rafRef.current == null) {
        rafRef.current = window.requestAnimationFrame(syncPosition);
      }
    };

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (Date.now() - lastScrollTimeRef.current < 180) return;
      const portalEl = portalRef.current;
      if (!portalEl || !anchor.isConnected) return;

      const pRect = portalEl.getBoundingClientRect();
      const aRect = anchor.getBoundingClientRect();
      const pad = 12;

      const inPortal =
        e.clientX >= pRect.left - pad &&
        e.clientX <= pRect.right + pad &&
        e.clientY >= pRect.top - pad &&
        e.clientY <= pRect.bottom + pad;
      const inAnchor =
        e.clientX >= aRect.left - pad &&
        e.clientX <= aRect.right + pad &&
        e.clientY >= aRect.top - pad &&
        e.clientY <= aRect.bottom + pad;

      if (!inPortal && !inAnchor) {
        onMouseLeaveRef.current();
      }
    };

    const handleWindowTouchStart = (e: TouchEvent) => {
      const portalEl = portalRef.current;
      const target = e.target as Node | null;
      if (!portalEl || !target) return;
      if (!portalEl.contains(target) && (!anchor.isConnected || !anchor.contains(target))) {
        onCloseRef.current();
      }
    };

    syncPosition();
    window.addEventListener("scroll", handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });
    window.addEventListener("mousemove", handleWindowMouseMove, { passive: true });
    window.addEventListener("touchstart", handleWindowTouchStart, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, { capture: true });
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("touchstart", handleWindowTouchStart);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [anchor]);

  if (activePlayback) {
    return null;
  }

  const portalTarget =
    (typeof document !== "undefined" && document.getElementById("app-shell-root")) ||
    document.body;

  return createPortal(
    <div
      ref={portalRef}
      className={`${isInsideModal ? "fixed z-[95]" : "absolute z-40"} left-0 top-0 will-change-transform`}
      style={{ width, transform: `translate3d(${left}px, ${top}px, 0)` }}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={() => {
        if (Date.now() - lastScrollTimeRef.current < 220) {
          return;
        }
        onMouseLeave();
      }}
    >
      <ParallaxTilt maxTilt={8}>
        <motion.article
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 6, transition: { duration: 0.14, ease: "easeOut" } }}
          transition={{ type: "spring", stiffness: 260, damping: 24, mass: 0.7 }}
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
                    onMouseLeave();
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
              <LiquidGlassButton
                shape="circle"
                disableWebGL={true}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!user) {
                    openAuthModal();
                    return;
                  }
                  toggleMyList(movie as NormalizedMovie);
                }}
                className="nf-icon grid h-10 w-10 place-items-center rounded-full p-0 cursor-pointer shadow-lg"
                aria-label="Add to list"
              >
                {inMyList ? <Check size={18} className="text-[#46d369]" /> : <Plus size={18} />}
              </LiquidGlassButton>
              <LiquidGlassButton
                shape="circle"
                disableWebGL={true}
                className="nf-icon h-10 w-10 rounded-full p-0 cursor-pointer shadow-lg"
                aria-label="Like"
              >
                <ThumbsUp size={17} />
              </LiquidGlassButton>
              <LiquidGlassButton
                shape="circle"
                disableWebGL={true}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen();
                }}
                className="nf-icon ml-auto grid h-10 w-10 place-items-center rounded-full text-white cursor-pointer p-0 shadow-lg"
                aria-label="Episodes and info"
              >
                <ChevronDown size={20} />
              </LiquidGlassButton>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-white/75">
              <span className="font-bold text-[#46d369]">★ {Number(movie.averageRating) > 0 ? Number(movie.averageRating).toFixed(1) : "8.0"} IMDb</span>
              <Badge className="px-1.5 py-0.5 text-xs bg-white/5 border-white/10">{movie.maturityRating.replace("_", "-")}</Badge>
              <span>{formatRuntime(movie.runtimeMinutes)}</span>
              <span className="rounded border border-white/20 px-1 text-[11px] bg-white/5">HD</span>
            </div>
            <p className="line-clamp-1 text-sm text-white/85">{movie.genres.slice(0, 3).map((g) => g.name).join(" - ")}</p>
          </div>
        </motion.article>
      </ParallaxTilt>
    </div>,
    portalTarget
  );
});

// TitlePreview is replaced by the global detail modal overlay
