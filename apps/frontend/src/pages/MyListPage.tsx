import React, { useState, useRef, useEffect } from "react";
import { usePlaybackStore } from "../store/playbackStore";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { MovieTile, HoverPreview } from "../components/MovieRow";
import type { MovieCardDto } from "@streamforge/shared-types";
import type { NormalizedMovie } from "../lib/movieApi";

export function MyListPage() {
  const myList = usePlaybackStore((state) => state.myList);
  const { openDetailModal } = usePlaybackStore();

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
    openDetailModal(movie as NormalizedMovie, `mylist-${movie.id}`);
  };

  return (
    <main className="min-h-screen bg-[#141414] px-4 pt-28 pb-12 sm:px-8 md:px-14 lg:px-16">
      <h1 className="text-3xl font-bold tracking-tight text-white mb-8">My List</h1>
      
      {myList.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 md:gap-2">
          {myList.map((movie) => (
            <MovieTile
              key={movie.id}
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
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <p className="text-zinc-500 text-base">
            You haven't added any titles to your list yet.
          </p>
          <Link
            to="/"
            className="nf-button inline-flex h-10 items-center justify-center rounded bg-white px-6 text-sm font-bold text-black hover:bg-white/80 transition"
          >
            Browse home page
          </Link>
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
export default MyListPage;
