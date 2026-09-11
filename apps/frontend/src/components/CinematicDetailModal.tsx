import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronUp, Play, Plus, ThumbsDown, ThumbsUp, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlaybackStore } from "../store/playbackStore";
import { useAuthStore } from "../store/auth";
import { movieApi } from "../lib/movieApi";
import { Badge, Button } from "@streamforge/ui";
import { formatRuntime, getEpisodes } from "@streamforge/utils";
import { MovieTile, HoverPreview } from "./MovieRow";
import { ParallaxTilt } from "./ParallaxTilt";
import { decodeHtml } from "../lib/htmlUtils";

export function CinematicDetailModal() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeMovieDetail, clickedElementId, closeDetailModal, openPlayback, myList, toggleMyList, activePlayback, openAuthModal } = usePlaybackStore();
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [isInitiallyOpening, setIsInitiallyOpening] = useState(true);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const outerContainerRef = useRef<HTMLDivElement>(null);

  const [hovered, setHovered] = useState<{ movie: any; anchor: HTMLElement; rect: DOMRect } | null>(null);
  const [showAllSimilar, setShowAllSimilar] = useState(false);

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

    const container = modalContainerRef.current;
    if (container) {
      container.addEventListener("scroll", requestPosition, { passive: true });
    }
    window.addEventListener("resize", requestPosition);
    requestPosition();

    return () => {
      if (container) {
        container.removeEventListener("scroll", requestPosition);
      }
      window.removeEventListener("resize", requestPosition);
      if (hoverFrame.current != null) {
        window.cancelAnimationFrame(hoverFrame.current);
        hoverFrame.current = null;
      }
    };
  }, [hovered?.anchor]);

  const movie = activeMovieDetail;

  useEffect(() => {
    if (!movie?.id && !movie?.slug) return;
    setShowTrailer(false);
    setSelectedSeasonId("");
    setHovered(null);
    if (outerContainerRef.current) {
      outerContainerRef.current.scrollTop = 0;
    }
  }, [movie?.id, movie?.slug]);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitiallyOpening(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleLike = () => {
    setLiked(!liked);
    setDisliked(false);
  };

  const handleDislike = () => {
    setDisliked(!disliked);
    setLiked(false);
  };
  
  const { data, isLoading } = useQuery({
    queryKey: ["movie-preview-detail", movie?.slug || ""],
    enabled: Boolean(movie?.slug),
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: () => movieApi.getMovieDetail(movie!.slug)
  });

  const activeGenreSlug = data?.movie?.genres?.[0]?.slug ?? movie?.genres?.[0]?.slug;

  const { data: similarData } = useQuery({
    queryKey: ["similar-modal", activeGenreSlug || ""],
    enabled: Boolean(activeGenreSlug),
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: () => movieApi.getByGenre(activeGenreSlug!, 1)
  });

  const { data: playbackData } = useQuery({
    queryKey: ["movie-playback-servers", movie?.slug || ""],
    enabled: Boolean(movie?.slug),
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: () => movieApi.getPlayback(movie!.slug)
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDetailModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDetailModal]);

  const activeTrailerUrl = data?.movie?.trailerUrl ?? movie?.trailerUrl;
  const activeMovieId = data?.movie?.id ?? movie?.id;

  useEffect(() => {
    if (!activeTrailerUrl) return;
    
    setShowTrailer(false);
    const timer = setTimeout(() => {
      setShowTrailer(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [activeMovieId, activeTrailerUrl]);

  const displayMovieId = data?.movie?.id ?? movie?.id;
  const seasonsList = data?.movie?.seasons ?? movie?.seasons ?? [];

  useEffect(() => {
    if (seasonsList.length) {
      setSelectedSeasonId(seasonsList[0].id);
    } else {
      setSelectedSeasonId("");
    }
    setShowAllSimilar(false);
  }, [displayMovieId, seasonsList.length]);

  const displayMovie = data?.movie ?? movie;

  const cleanSynopsis = useMemo(() => {
    if (!displayMovie) return "";
    const raw = displayMovie.synopsis || displayMovie.description || (displayMovie as any).content || "";
    const text = decodeHtml(raw)
      .replace(/<[^>]*>?/gm, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text || text.toLowerCase().includes("chất lượng cao")) {
      const title = displayMovie.title || (displayMovie as any).name || "";
      const year = displayMovie.releaseYear || (displayMovie as any).year || 2026;
      return `Khám phá câu chuyện lôi cuốn đầy kịch tính trong bộ phim ${title} (${year}) với chất lượng hình ảnh sắc nét chuẩn rạp chiếu.`;
    }
    return text;
  }, [displayMovie]);

  if (!movie || !displayMovie) return null;

  const inMyList = displayMovie ? myList.some((item) => item.id === displayMovie.id) : false;
  const allSimilarTitles = (similarData ?? []).filter((item) => item.id !== displayMovie.id);
  const similarTitles = showAllSimilar ? allSimilarTitles.slice(0, 24) : allSimilarTitles.slice(0, 6);
  
  const activeSeason = displayMovie.seasons?.find((s) => s.id === selectedSeasonId) || displayMovie.seasons?.[0];
  const activeEpisodes = activeSeason?.episodes || [];

  const episodes = activeEpisodes.length > 0 ? activeEpisodes.map((ep: any) => ({
    id: String(ep.id),
    title: String(ep.title),
    synopsis: String(ep.synopsis ?? ep.description ?? displayMovie.synopsis ?? ""),
    runtimeMinutes: Number(ep.runtimeMinutes ?? ep.runtime_minutes ?? Math.min(displayMovie.runtimeMinutes || 45, 48)),
    posterUrl: String(ep.posterUrl ?? ep.thumbnailUrl ?? (displayMovie.backdropUrl || displayMovie.posterUrl))
  })) : [
    {
      id: `${displayMovie.id}-movie-ep`,
      title: displayMovie.title,
      synopsis: displayMovie.synopsis,
      runtimeMinutes: displayMovie.runtimeMinutes,
      posterUrl: displayMovie.backdropUrl || displayMovie.posterUrl
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
        delayChildren: 0.1,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <div
      ref={outerContainerRef}
      className="fixed inset-0 z-[90] flex justify-center items-start overflow-y-auto bg-black/65 p-0 sm:p-4 sm:pt-8 md:pt-12 backdrop-blur-xl saturate-[160%] transition-all duration-300 ease-out"
      onClick={closeDetailModal}
    >
      <motion.div
        ref={modalContainerRef}
        className="relative mb-0 sm:mb-12 w-full max-w-4xl overflow-hidden rounded-none sm:rounded-3xl bg-[#0e0e14]/90 border border-white/15 backdrop-blur-3xl text-white shadow-[0_25px_80px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.18)] focus:outline-none"
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ type: "spring", stiffness: 350, damping: 26, mass: 0.85 }}
        tabIndex={0}
      >
        {/* Backdrop Visual (FLIP Transition Image & Autoplay Video) */}
        <div className="relative aspect-video w-full bg-[#08080a] overflow-hidden">
          {/* Floating Close Button (X) - Liquid Glass styled */}
          <button
            onClick={closeDetailModal}
            style={{ position: "absolute" }}
            className="!absolute top-4 right-4 sm:top-5 sm:right-5 z-50 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-black/50 hover:bg-black/75 border border-white/20 backdrop-blur-xl text-white shadow-xl active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-white/70 cursor-pointer"
            aria-label="Đóng chi tiết"
          >
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
          <AnimatePresence mode="wait">
            {showTrailer && displayMovie.trailerUrl ? (
              <motion.video
                key="trailer"
                className="h-full w-full object-cover"
                src={displayMovie.trailerUrl}
                autoPlay
                muted={isMuted}
                loop
                playsInline
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <motion.img
                key={displayMovie.id || displayMovie.slug}
                layoutId={isInitiallyOpening ? (clickedElementId || undefined) : undefined}
                src={displayMovie.backdropUrl || displayMovie.posterUrl}
                alt={displayMovie.title}
                className="h-full w-full object-cover"
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e14] via-[#0e0e14]/40 via-50% to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e14]/85 via-[#0e0e14]/30 via-55% to-transparent pointer-events-none" />
          
          {/* Backdrop Details Title Overlay */}
          <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-8 right-4 sm:right-8 flex items-end justify-between z-10">
            <div className="space-y-3 sm:space-y-3.5 max-w-xl">
              {/* Brand Tagline matching Hero */}
              <div className="flex items-center gap-2">
                <span className="brand-logo text-sm sm:text-base font-extrabold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.35)]">
                  RYTOXGROUP
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70 bg-white/10 px-2 py-0.5 rounded border border-white/15 backdrop-blur-md">
                  IMDb RADAR
                </span>
              </div>

              <motion.h1 
                layoutId={isInitiallyOpening ? `title-${movie.id}` : undefined}
                className="large-title line-clamp-2 text-2xl sm:text-3xl md:text-5xl font-black text-white text-shadow"
              >
                {displayMovie.title}
              </motion.h1>

              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                {!(displayMovie as any).noPlayback ? (
                  <button
                    onClick={() => openPlayback(displayMovie, clickedElementId || "")}
                    className="nf-button inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-full bg-white px-6 sm:px-8 text-xs sm:text-sm font-bold text-black transition hover:bg-white/90 active:bg-white/80 focus:outline-none shadow-xl active:scale-95 duration-150 cursor-pointer"
                  >
                    <Play size={16} className="sm:w-[18px] sm:h-[18px]" fill="currentColor" /> Xem ngay
                  </button>
                ) : (
                  <>
                    {(displayMovie as any).trailerKey ? (
                      <a
                        href={`https://www.youtube.com/watch?v=${(displayMovie as any).trailerKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="nf-button inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-full bg-white px-5 sm:px-7 text-xs sm:text-sm font-bold text-black transition hover:bg-white/90 focus:outline-none shadow-xl cursor-pointer"
                      >
                        <Play size={16} className="sm:w-[18px] sm:h-[18px]" fill="currentColor" /> Xem Trailer
                      </a>
                    ) : null}
                    {(displayMovie as any).imdbId && (
                      <a
                        href={`https://www.imdb.com/title/${(displayMovie as any).imdbId}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-full bg-[#f5c518] px-4 sm:px-5 text-xs sm:text-sm font-black text-black transition hover:brightness-110 shadow-md"
                      >
                        IMDb
                      </a>
                    )}
                  </>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (!user) {
                      openAuthModal();
                      return;
                    }
                    toggleMyList(displayMovie);
                  }}
                  className="nf-icon glass-button h-11 w-11 rounded-full p-0 border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white active:scale-95"
                  aria-label="Thêm vào danh sách"
                >
                  <motion.div animate={{ rotate: inMyList ? 360 : 0 }}>
                    {inMyList ? <Check size={18} className="text-amber-400 font-bold" /> : <Plus size={18} />}
                  </motion.div>
                </Button>
                {/* Like Button */}
                <Button
                  variant="ghost"
                  onClick={handleLike}
                  className="nf-icon glass-button h-11 w-11 rounded-full p-0 border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white active:scale-95"
                  aria-label="Thích phim này"
                >
                  <ThumbsUp size={16} className={liked ? "fill-amber-400 text-amber-400" : ""} />
                </Button>
                {/* Dislike Button */}
                <Button
                  variant="ghost"
                  onClick={handleDislike}
                  className="nf-icon glass-button h-11 w-11 rounded-full p-0 border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white active:scale-95"
                  aria-label="Không thích"
                >
                  <ThumbsDown size={16} className={disliked ? "fill-white/80 text-white/80" : ""} />
                </Button>
              </div>
            </div>
            {displayMovie.trailerUrl && (
              <Button
                variant="ghost"
                onClick={() => setIsMuted(!isMuted)}
                className="nf-icon glass-button h-10 w-10 sm:h-11 sm:w-11 rounded-full p-0 border border-white/20 bg-black/40 hover:bg-black/60 backdrop-blur-xl text-white active:scale-95"
                aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </Button>
            )}
          </div>
        </div>

        {/* Staggered Content Reveal */}
        <motion.div
          key={displayMovie.id || displayMovie.slug}
          className="grid gap-8 p-6 md:p-8 md:grid-cols-[1.4fr_.8fr]"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Left Column (Meta & Synopsis) */}
          <div className="space-y-4">
            <motion.div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs sm:text-sm font-semibold text-white/90" variants={itemVariants}>
              <span className="text-amber-400 font-bold">
                ★ {displayMovie.averageRating ? displayMovie.averageRating.toFixed(1) : (displayMovie as any).match ? `${(displayMovie as any).match}%` : "8.5"} IMDb
              </span>
              <span className="text-white/30">•</span>
              <span>{displayMovie.releaseYear || (displayMovie as any).year || "2026"}</span>
              <span className="text-white/30">•</span>
              <span className="rounded border border-white/35 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold tracking-wider">
                4K Ultra HD
              </span>
              <span className="text-white/30">•</span>
              <span>{displayMovie.runtimeMinutes ? `${displayMovie.runtimeMinutes}m` : "HD"}</span>
              <span className="text-white/30">•</span>
              <span className="rounded bg-white/15 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold tracking-wider border border-white/10">
                {(displayMovie as any).episode_current || (displayMovie.mediaType === "tv" ? "TV Series" : "Movie")}
              </span>
              <span className="text-white/30">•</span>
              <Badge className="border-white/25 bg-white/10 text-white/90 text-[10px] px-1.5 py-0.5">
                {displayMovie.maturityRating?.replace("_", "-") || "PG-13"}
              </Badge>
            </motion.div>
            
            {/* Top 10 Popularity rating indicator - Pure Liquid Glass */}
            {displayMovie.averageRating > 7.5 && (
              <motion.div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white" variants={itemVariants}>
                <span className="bg-white/15 text-white border border-white/20 text-[10px] uppercase px-2 py-0.5 rounded-full font-black tracking-wider shadow-sm backdrop-blur-md">
                  TOP 10
                </span>
                <span className="text-white/90">#4 Phim Thịnh Hành Hôm Nay</span>
              </motion.div>
            )}
            
            <motion.p className="synopsis text-sm leading-relaxed text-white/85 md:text-base" variants={itemVariants}>
              {cleanSynopsis}
            </motion.p>
          </div>

          {/* Right Column (Cast & Metadata) */}
          <motion.div className="space-y-3 text-sm text-white/60" variants={itemVariants}>
            <div>
              <span className="text-white/40 font-medium">Diễn viên: </span>
              <span className="text-white/85 transition hover:text-white cursor-pointer">
                {displayMovie.cast?.slice(0, 5).join(", ") || "Đang cập nhật"}
              </span>
            </div>
            <div>
              <span className="text-white/40 font-medium">Đạo diễn: </span>
              <span className="text-white/85 transition hover:text-white cursor-pointer">
                {displayMovie.director || "Đang cập nhật"}
              </span>
            </div>
            <div>
              <span className="text-white/40 font-medium">Thể loại: </span>
              <span className="text-white/85 transition hover:text-white cursor-pointer">
                {displayMovie.genres?.map((g) => g.name).join(", ") || "Đang cập nhật"}
              </span>
            </div>
            <div>
              <span className="text-white/40 font-medium">Đặc sắc: </span>
              <span className="text-white/85">Điện ảnh, Cuốn hút, Kịch tính</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Episodes Section */}
        {!(displayMovie as any).noPlayback && (
        <section className="px-6 pb-8 md:px-8 border-t border-white/10 pt-6">
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <h4 className="text-xl font-black md:text-2xl text-white">Danh sách tập</h4>
              {displayMovie.seasons && displayMovie.seasons.length > 0 && (
                <p className="text-xs text-white/60">
                  {displayMovie.seasons.find((s: any) => s.id === selectedSeasonId)?.title || "Mùa 1"}: 
                  <span className="ml-2 px-2 py-0.5 border border-white/20 rounded-full bg-white/10 text-white/90 font-bold">{displayMovie.maturityRating || "T13"}</span>
                  <span className="ml-2">{episodes.length} Tập</span>
                </p>
              )}
            </div>
            {displayMovie.seasons && displayMovie.seasons.length > 1 && (
              <div className="relative shrink-0">
                <select
                  value={selectedSeasonId}
                  onChange={(e) => setSelectedSeasonId(e.target.value)}
                  className="appearance-none bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-full px-4 py-2 pr-10 text-sm font-semibold outline-none backdrop-blur-xl focus:border-white/40 transition duration-200 cursor-pointer min-w-[150px]"
                >
                  {displayMovie.seasons.map((season: any) => (
                    <option key={season.id} value={season.id} className="bg-[#141418] text-white">
                      {season.title}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-white/60">
                  <ChevronDown size={16} />
                </div>
              </div>
            )}
          </div>
          <div className="divide-y divide-white/10 overflow-hidden rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-lg">
            {episodes.length ? (
              episodes.map((episode, index) => (
                <article
                  key={episode.id}
                  onClick={() => openPlayback(displayMovie, `episode-${episode.id}`)}
                  className="group grid grid-cols-[auto_1fr] gap-4 p-4 transition duration-200 hover:bg-white/[0.07] cursor-pointer items-center md:grid-cols-[2.5rem_7.5rem_1fr_auto]"
                >
                  <span className="hidden md:grid place-items-center text-xl font-bold text-white/40 group-hover:text-amber-400 transition duration-200">
                    {index + 1}
                  </span>
                  <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-950 md:w-full border border-white/10">
                    <img
                      src={episode.posterUrl || displayMovie.backdropUrl || displayMovie.posterUrl}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition duration-200 group-hover:opacity-100 backdrop-blur-[2px]">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white">
                        <Play size={16} fill="currentColor" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-white group-hover:text-amber-400 transition duration-200 text-sm md:text-base">
                      {episode.title}
                    </h5>
                    <p className="line-clamp-2 text-xs text-white/60 md:text-sm leading-relaxed">
                      {decodeHtml(episode.synopsis).replace(/<[^>]*>?/gm, "").trim()}
                    </p>
                  </div>
                  <span className="hidden md:block whitespace-nowrap text-xs font-semibold text-white/50">
                    {formatRuntime(episode.runtimeMinutes)}
                  </span>
                </article>
              ))
            ) : (
              <div className="p-6 text-sm text-white/55 text-center">
                {isLoading ? "Đang tải danh sách tập..." : "Chưa có danh sách tập cho phim này."}
              </div>
            )}
          </div>
        </section>
        )}

        {/* Similar Titles Section */}
        {similarTitles.length > 0 && (
          <section className="px-6 pb-8 md:px-8 border-t border-white/10 pt-6">
            <h4 className="mb-4 text-xl font-black md:text-2xl text-white">Nội dung tương tự</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3">
              {similarTitles.map((item) => (
                <ParallaxTilt key={item.id} maxTilt={6}>
                  <MovieTile
                    movie={item as any}
                    className="group relative w-full cursor-pointer rounded-xl transition overflow-hidden border border-white/10 hover:border-white/25"
                    onOpen={() => {
                      setHovered(null);
                      if (outerContainerRef.current) {
                        outerContainerRef.current.scrollTop = 0;
                      }
                      usePlaybackStore.getState().openDetailModal(item as any, `card-${item.id}`);
                    }}
                    onHover={(anchor) => {
                      if (typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0)) {
                        return;
                      }
                      clearCloseTimer();
                      clearOpenTimer();
                      openHoverTimer.current = window.setTimeout(() => {
                        setHovered({ movie: item as any, anchor, rect: anchor.getBoundingClientRect() });
                      }, 180);
                    }}
                    onHoverEnd={scheduleHoverClose}
                  />
                </ParallaxTilt>
              ))}
            </div>
            {allSimilarTitles.length > 6 && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setShowAllSimilar(!showAllSimilar)}
                  className="group relative inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm tracking-wide transition-all duration-300 border border-white/20 shadow-lg hover:border-white/40 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-xl"
                >
                  {showAllSimilar ? (
                    <>
                      <span>Thu gọn</span>
                      <ChevronUp size={18} className="transition-transform duration-300 group-hover:-translate-y-1 text-white/80" />
                    </>
                  ) : (
                    <>
                      <span>Xem thêm</span>
                      <ChevronDown size={18} className="transition-transform duration-300 group-hover:translate-y-1 text-white/80" />
                    </>
                  )}
                </button>
              </div>
            )}
          </section>
        )}

        {/* About Section */}
        <section className="px-6 pb-12 md:px-8 border-t border-white/10 pt-6 space-y-4">
          <h4 className="text-xl font-black md:text-2xl text-white">Thông tin về <span className="text-white/90">{displayMovie.title}</span></h4>
          <div className="grid gap-6 md:grid-cols-2 text-sm text-white/70">
            <div className="space-y-2.5">
              <div>
                <span className="text-white/40 font-medium">Đạo diễn: </span>
                <span className="text-white/90 hover:underline cursor-pointer">{displayMovie.director || "Đang cập nhật"}</span>
              </div>
              <div>
                <span className="text-white/40 font-medium">Diễn viên: </span>
                <span className="text-white/90 hover:underline cursor-pointer">{displayMovie.cast?.slice(0, 8).join(", ") || "Đang cập nhật"}</span>
              </div>
              <div>
                <span className="text-white/40 font-medium">Độ tuổi phù hợp: </span>
                <Badge className="border-white/25 bg-white/10 text-xs ml-1 mr-1 text-white/90">{displayMovie.maturityRating?.replace("_", "-") || "T13"}</Badge>
                <span className="text-xs text-white/50">Phù hợp cho khán giả từ 13 tuổi trở lên</span>
              </div>
            </div>
            <div className="space-y-2.5">
              <div>
                <span className="text-white/40 font-medium">Thể loại: </span>
                <span className="text-white/90">{displayMovie.genres?.map((g) => g.name).join(", ") || "Đang cập nhật"}</span>
              </div>
              <div>
                <span className="text-white/40 font-medium">Đặc sắc: </span>
                <span className="text-white/90">Điện ảnh, Cuốn hút, Kịch tính</span>
              </div>
            </div>
          </div>
        </section>
      </motion.div>

      <AnimatePresence>
        {hovered && !activePlayback && (
          <HoverPreview
            key={hovered.movie.id}
            movie={hovered.movie}
            rect={hovered.rect}
            onOpen={() => {
              setHovered(null);
              if (outerContainerRef.current) {
                outerContainerRef.current.scrollTop = 0;
              }
              usePlaybackStore.getState().openDetailModal(hovered.movie, `card-${hovered.movie.id}`);
            }}
            onMouseEnter={() => {
              clearOpenTimer();
              clearCloseTimer();
            }}
            onMouseLeave={scheduleHoverClose}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
