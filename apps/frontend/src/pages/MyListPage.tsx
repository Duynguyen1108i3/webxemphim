import React, { useState, useRef, useEffect } from "react";
import { usePlaybackStore } from "../store/playbackStore";
import { useAuthStore } from "../store/auth";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { MovieTile, HoverPreview } from "../components/MovieRow";
import type { MovieCardDto } from "@streamforge/shared-types";
import type { NormalizedMovie } from "../lib/movieApi";

export function MyListPage() {
  const user = useAuthStore((state) => state.user);
  const myList = usePlaybackStore((state) => state.myList);
  const isMyListLoading = usePlaybackStore((state) => state.isMyListLoading);
  const loadUserData = usePlaybackStore((state) => state.loadUserData);
  const { openDetailModal } = usePlaybackStore();
  const activePlayback = usePlaybackStore((state) => state.activePlayback);
  const activeMovieDetail = usePlaybackStore((state) => state.activeMovieDetail);

  useEffect(() => {
    if (activeMovieDetail || activePlayback) {
      setHovered(null);
      clearOpenTimer();
      clearCloseTimer();
    }
  }, [activeMovieDetail, activePlayback]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData, user?.id]);

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
    const handleScroll = () => {
      clearOpenTimer();
    };
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, []);

  const handleOpen = (movie: MovieCardDto) => {
    openDetailModal(movie as NormalizedMovie, `mylist-${movie.id}`);
  };

  return (
    <main className="min-h-screen bg-transparent px-4 pt-28 pb-12 sm:px-8 md:px-14 lg:px-16">
      <h1 className="text-3xl font-bold tracking-tight text-white mb-8">My List</h1>
      
      {!user ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 max-w-md mx-auto">
          <p className="text-white text-xl font-bold">
            Vui lòng đăng nhập để xem danh sách yêu thích
          </p>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Bạn cần đăng nhập hoặc tạo tài khoản để thêm các bộ phim yêu thích và quản lý danh sách xem của riêng bạn.
          </p>
          <div className="flex items-center gap-3 pt-3">
            <Link
              to="/login"
              className="inline-flex h-11 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 border border-white/25 px-6 text-sm font-bold text-white transition shadow-lg backdrop-blur-md"
            >
              Đăng nhập ngay
            </Link>
            <Link
              to="/register"
              className="inline-flex h-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/20 px-6 text-sm font-bold text-white transition"
            >
              Tạo tài khoản mới
            </Link>
          </div>
        </div>
      ) : myList.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 md:gap-2">
          {myList.map((movie, index) => (
            <MovieTile
              key={movie.id}
              movie={movie as any}
              index={index}
              className="group relative w-full cursor-pointer rounded-[16px] transition"
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
      ) : isMyListLoading ? (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 md:gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-video w-full rounded-[16px] bg-white/5 animate-pulse border border-white/10" />
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
        {hovered && !activePlayback && !activeMovieDetail && (
          <HoverPreview
            key={hovered.movie.id}
            movie={hovered.movie}
            anchor={hovered.anchor}
            rect={hovered.rect}
            onOpen={() => handleOpen(hovered.movie)}
            onClose={() => {
              clearOpenTimer();
              clearCloseTimer();
              setHovered(null);
            }}
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
