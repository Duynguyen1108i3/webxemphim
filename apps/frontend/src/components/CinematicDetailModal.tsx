import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { Check, ChevronDown, Copy, Download, ExternalLink, Play, Plus, ThumbsDown, ThumbsUp, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePlaybackStore } from "../store/playbackStore";
import { movieApi } from "../lib/movieApi";
import { Badge, Button } from "@streamforge/ui";
import { formatRuntime, getEpisodes } from "@streamforge/utils";

export function CinematicDetailModal() {
  const { activeMovieDetail, clickedElementId, closeDetailModal, openPlayback, myList, toggleMyList } = usePlaybackStore();
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [isInitiallyOpening, setIsInitiallyOpening] = useState(true);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const modalContainerRef = useRef<HTMLDivElement>(null);

  const movie = activeMovieDetail;

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

  // Safe genre resolver for hooks
  const activeGenreSlug = data?.movie?.genres?.[0]?.slug ?? movie?.genres?.[0]?.slug;

  const { data: similarData } = useQuery({
    queryKey: ["similar-modal", activeGenreSlug || ""],
    enabled: Boolean(activeGenreSlug),
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: () => movieApi.getByGenre(activeGenreSlug!, 1)
  });

  const { data: playbackData, isLoading: playbackLoading } = useQuery({
    queryKey: ["movie-playback-servers", movie?.slug || ""],
    enabled: Boolean(movie?.slug),
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: () => movieApi.getPlayback(movie!.slug)
  });

  // Keyboard shortcut Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDetailModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDetailModal]);

  // Autoplay trailer after 500ms
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
  }, [displayMovieId, seasonsList.length]);

  // Early return if no movie is selected
  if (!movie) return null;

  // Non-hook declarations - guaranteed non-null because movie is non-null
  const displayMovie = data?.movie ?? movie;
  const inMyList = displayMovie ? myList.some((item) => item.id === displayMovie.id) : false;
  const similarTitles = (similarData ?? [])
    .filter((item) => item.id !== displayMovie.id)
    .slice(0, 6);
  
  const activeSeason = displayMovie.seasons?.find((s) => s.id === selectedSeasonId) || displayMovie.seasons?.[0];
  const activeEpisodes = activeSeason?.episodes || [];

  const episodes = activeEpisodes.length > 0 ? activeEpisodes.map((ep: any) => ({
    id: String(ep.id),
    title: String(ep.title),
    synopsis: String(ep.synopsis ?? ep.description ?? displayMovie.synopsis),
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

  const handleDragEnd = (_event: any, info: any) => {
    // If swiped down past 120px, close the modal
    if (info.offset.y > 120) {
      closeDetailModal();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex justify-center items-start overflow-y-auto bg-black/80 p-0 sm:p-4 sm:pt-10 backdrop-blur-[10px]"
      onClick={closeDetailModal}
    >
      <motion.div
        ref={modalContainerRef}
        className="relative mb-0 sm:mb-10 w-full max-w-4xl overflow-hidden rounded-none sm:rounded-lg bg-[#181818] text-white shadow-[0_28px_90px_rgba(0,0,0,.75)] focus:outline-none"
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        tabIndex={0}
      >
        {/* Sticky Header Top Navigation inside Modal */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-gradient-to-b from-[#181818] to-[#181818]/0 px-6 backdrop-blur-sm pointer-events-none">
          <span className="text-sm font-bold tracking-wider text-white/50 uppercase pointer-events-auto">
            {displayMovie.title}
          </span>
          <button
            onClick={closeDetailModal}
            className="nf-icon grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white transition hover:bg-white/20 pointer-events-auto focus:ring-2 focus:ring-white/70 focus:outline-none"
            aria-label="Close details"
          >
            <X size={20} className="transition-transform duration-200 hover:rotate-90" />
          </button>
        </header>

        {/* Backdrop Visual (FLIP Transition Image & Autoplay Video) */}
        <div className="relative -mt-14 aspect-video bg-zinc-950">
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
                key="poster"
                layoutId={isInitiallyOpening ? (clickedElementId || undefined) : undefined}
                src={displayMovie.backdropUrl || displayMovie.posterUrl}
                alt={displayMovie.title}
                className="h-full w-full object-cover"
                initial={{ filter: "brightness(0.9)" }}
                animate={{ filter: "brightness(1)" }}
                exit={{ filter: "brightness(0.9)" }}
              />
            )}
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/20 to-transparent" />
          
          {/* Backdrop Details Title Overlay */}
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
            <div className="space-y-4 max-w-lg">
              <motion.h1 
                layoutId={isInitiallyOpening ? `title-${movie.id}` : undefined}
                className="large-title line-clamp-2 text-3xl font-black md:text-5xl text-shadow"
              >
                {displayMovie.title}
              </motion.h1>
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() => openPlayback(displayMovie, clickedElementId || "")}
                  className="nf-button inline-flex h-11 items-center justify-center gap-2 rounded bg-white px-7 text-sm font-black text-black transition hover:bg-white/85 focus:outline-none focus:ring-2 focus:ring-white/70"
                >
                  <Play size={18} fill="currentColor" className="transition-transform duration-200 group-hover:scale-110" /> Play
                </button>
                <Button
                  variant="ghost"
                  onClick={() => toggleMyList(displayMovie)}
                  className="nf-icon h-11 w-11 rounded-full border border-white/20 bg-black/40 p-0 hover:border-white hover:bg-white/10"
                  aria-label="Add to list"
                >
                  <motion.div animate={{ rotate: inMyList ? 360 : 0 }}>
                    {inMyList ? <Check size={18} className="text-[#46d369]" /> : <Plus size={18} />}
                  </motion.div>
                </Button>
                {/* Like Button */}
                <Button
                  variant="ghost"
                  onClick={handleLike}
                  className="nf-icon h-11 w-11 rounded-full border border-white/20 bg-black/40 p-0 hover:border-white hover:bg-white/10"
                  aria-label="Like this"
                >
                  <ThumbsUp size={16} className={liked ? "fill-white text-[#46d369]" : ""} />
                </Button>
                {/* Dislike Button */}
                <Button
                  variant="ghost"
                  onClick={handleDislike}
                  className="nf-icon h-11 w-11 rounded-full border border-white/20 bg-black/40 p-0 hover:border-white hover:bg-white/10"
                  aria-label="Dislike this"
                >
                  <ThumbsDown size={16} className={disliked ? "fill-white text-[#e50914]" : ""} />
                </Button>
              </div>
            </div>
            {displayMovie.trailerUrl && (
              <Button
                variant="ghost"
                onClick={() => setIsMuted(!isMuted)}
                className="nf-icon h-10 w-10 rounded-full border border-white/25 bg-black/40 p-0 hover:border-white"
                aria-label={isMuted ? "Unmute preview" : "Mute preview"}
              >
                {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
              </Button>
            )}
          </div>
        </div>

        {/* Staggered Content Reveal */}
        <motion.div
          className="grid gap-8 p-6 md:p-8 md:grid-cols-[1.4fr_.8fr]"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Left Column (Meta & Synopsis) */}
          <div className="space-y-5">
            <motion.div className="flex flex-wrap items-center gap-2.5 text-sm font-semibold text-white/80" variants={itemVariants}>
              <span className="text-[#46d369]">{displayMovie.match}% Match</span>
              <span>{displayMovie.releaseYear}</span>
              <Badge className="border-white/30 text-white/90">{displayMovie.maturityRating.replace("_", "-")}</Badge>
              <span>{formatRuntime(displayMovie.runtimeMinutes)}</span>
              <span className="rounded border border-white/35 px-1 text-[11px] font-bold tracking-wider">HD</span>
            </motion.div>
            
            {/* Top 10 Popularity rating indicator */}
            {displayMovie.averageRating > 7.5 && (
              <motion.div className="flex items-center gap-2 text-sm font-bold text-white" variants={itemVariants}>
                <span className="bg-[#e50914] text-[10px] uppercase px-1.5 py-0.5 rounded font-black tracking-wider">Top 10</span>
                <span>#4 in Movies Today</span>
              </motion.div>
            )}
            
            <motion.p className="synopsis text-sm leading-6 text-white/85 md:text-base" variants={itemVariants}>
              {displayMovie.synopsis}
            </motion.p>
          </div>

          {/* Right Column (Cast & Metadata) */}
          <motion.div className="space-y-3.5 text-sm text-white/60" variants={itemVariants}>
            <div>
              <span className="text-white/40 font-medium">Cast: </span>
              <span className="text-white/80 transition hover:text-white cursor-pointer">
                {displayMovie.cast?.slice(0, 5).join(", ") || "Updating"}
              </span>
            </div>
            <div>
              <span className="text-white/40 font-medium">Director: </span>
              <span className="text-white/80 transition hover:text-white cursor-pointer">
                {displayMovie.director || "Updating"}
              </span>
            </div>
            <div>
              <span className="text-white/40 font-medium">Genres: </span>
              <span className="text-white/80 transition hover:text-white cursor-pointer">
                {displayMovie.genres.map((g) => g.name).join(", ") || "Updating"}
              </span>
            </div>
            <div>
              <span className="text-white/40 font-medium">This title is: </span>
              <span className="text-white/80">Cinematic, Immersive, Captivating</span>
            </div>
          </motion.div>
        </motion.div>



        {/* Episodes Section */}
        <section className="px-6 pb-6 md:px-8 border-t border-white/5 pt-6">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <h4 className="text-xl font-black md:text-2xl">Episodes</h4>
              {displayMovie.seasons && displayMovie.seasons.length > 0 && (
                <p className="text-xs text-white/60">
                  {displayMovie.seasons.find((s: any) => s.id === selectedSeasonId)?.title || "Mùa 1"}: 
                  <span className="ml-1.5 px-1 py-0.5 border border-white/20 rounded bg-white/5 text-white/80 font-bold">{displayMovie.maturityRating || "T13"}</span>
                  <span className="ml-1.5">{episodes.length} Episodes</span>
                </p>
              )}
            </div>
            {displayMovie.seasons && displayMovie.seasons.length > 1 && (
              <div className="relative shrink-0">
                <select
                  value={selectedSeasonId}
                  onChange={(e) => setSelectedSeasonId(e.target.value)}
                  className="appearance-none bg-[#242424] text-white border border-white/10 rounded px-4 py-2 pr-10 text-sm font-semibold outline-none focus:border-white/40 focus:bg-[#2c2c2c] transition duration-200 cursor-pointer min-w-[140px]"
                >
                  {displayMovie.seasons.map((season: any) => (
                    <option key={season.id} value={season.id}>
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
          <div className="divide-y divide-white/5 overflow-hidden rounded-md bg-[#202020] border border-white/5">
            {episodes.length ? (
              episodes.map((episode, index) => (
                <article
                  key={episode.id}
                  onClick={() => openPlayback(displayMovie, `episode-${episode.id}`)}
                  className="group grid grid-cols-[auto_1fr] gap-4 p-4 transition duration-200 hover:bg-white/5 cursor-pointer items-center md:grid-cols-[2.5rem_7.5rem_1fr_auto]"
                >
                  <span className="hidden md:grid place-items-center text-xl font-bold text-white/40 group-hover:text-white transition duration-200">
                    {index + 1}
                  </span>
                  <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded bg-zinc-950 md:w-full">
                    <img
                      src={episode.posterUrl || displayMovie.backdropUrl || displayMovie.posterUrl}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition duration-200 group-hover:opacity-100">
                      <Play size={20} fill="currentColor" className="text-white" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-white group-hover:text-[#46d369] transition duration-200 text-sm md:text-base">
                      {episode.title}
                    </h5>
                    <p className="line-clamp-2 text-xs text-white/60 md:text-sm leading-relaxed">
                      {episode.synopsis}
                    </p>
                  </div>
                  <span className="hidden md:block whitespace-nowrap text-xs font-semibold text-white/50">
                    {formatRuntime(episode.runtimeMinutes)}
                  </span>
                </article>
              ))
            ) : (
              <div className="p-5 text-sm text-white/55 text-center">
                {isLoading ? "Loading episodes..." : "No episodes available for this title."}
              </div>
            )}
          </div>
        </section>

        {/* Similar Titles Section */}
        {similarTitles.length > 0 && (
          <section className="px-6 pb-8 md:px-8 border-t border-white/5 pt-6">
            <h4 className="mb-4 text-xl font-black md:text-2xl">More Like This</h4>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {similarTitles.map((item) => (
                <article
                  key={item.id}
                  onClick={() => {
                    // Instantly scroll back to top of modal when loading a new title
                    if (modalContainerRef.current) {
                      modalContainerRef.current.scrollTop = 0;
                    }
                    usePlaybackStore.getState().openDetailModal(item, `card-${item.id}`);
                  }}
                  className="group flex flex-col overflow-hidden rounded bg-[#2a2a2a] cursor-pointer transition hover:bg-[#333] border border-white/5 shadow-md"
                >
                  <div className="relative aspect-video bg-zinc-900">
                    <img
                      src={item.backdropUrl || item.posterUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold">
                      {item.maturityRating.replace("_", "-")}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-3.5 space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#46d369]">
                        <span>{item.match}% Match</span>
                        <span className="text-white/60">{item.releaseYear}</span>
                      </div>
                      <h5 className="line-clamp-1 font-bold text-white group-hover:text-[#46d369] transition duration-200 text-sm">
                        {item.title}
                      </h5>
                    </div>
                    <p className="line-clamp-3 text-xs leading-relaxed text-white/60">
                      {item.synopsis}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

         {/* About Section (Netflix style metadata summary at the very bottom) */}
         <section className="px-6 pb-12 md:px-8 border-t border-white/5 pt-6 space-y-4">
           <h4 className="text-xl font-black md:text-2xl">About <span className="text-[#e50914]">{displayMovie.title}</span></h4>
           <div className="grid gap-6 md:grid-cols-2 text-sm text-white/70">
             <div className="space-y-2">
               <div>
                 <span className="text-white/40">Director: </span>
                 <span className="hover:underline cursor-pointer">{displayMovie.director || "Updating"}</span>
               </div>
               <div>
                 <span className="text-white/40">Cast: </span>
                 <span className="hover:underline cursor-pointer">{displayMovie.cast?.slice(0, 8).join(", ") || "Updating"}</span>
               </div>
               <div>
                 <span className="text-white/40">Maturity Rating: </span>
                 <Badge className="border-white/30 text-xs ml-1 mr-1">{displayMovie.maturityRating.replace("_", "-")}</Badge>
                 <span className="text-xs text-white/55">Recommended for ages 14 and up</span>
               </div>
             </div>
             <div className="space-y-2">
               <div>
                 <span className="text-white/40">Genres: </span>
                 <span>{displayMovie.genres.map((g) => g.name).join(", ") || "Updating"}</span>
               </div>
               <div>
                 <span className="text-white/40">This title is: </span>
                 <span>Cinematic, Immersive, Captivating</span>
               </div>
             </div>
           </div>
         </section>
       </motion.div>
    </div>
  );
}

// Helper getEpisodes is now imported from @streamforge/utils
