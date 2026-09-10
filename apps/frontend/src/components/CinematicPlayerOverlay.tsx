import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { usePlaybackStore } from "../store/playbackStore";
import { movieApi } from "../lib/movieApi";
import { VideoPlayer } from "./VideoPlayer";

export function CinematicPlayerOverlay() {
  const { activePlayback, activeEpisodeId, clickedElementId, closePlayback, updateWatchHistory, activeCustomUrl } = usePlaybackStore();
  const [openingFinished, setOpeningFinished] = useState(false);
  const [playbackStarted, setPlaybackStarted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Fetch playback details
  const { data: source, isLoading: apiLoading, error } = useQuery({
    queryKey: ["playback-overlay", activePlayback?.id, activeEpisodeId],
    enabled: Boolean(activePlayback?.id) && openingFinished,
    queryFn: () => movieApi.getPlayback(activePlayback!.slug, activeEpisodeId),
    retry: false,
    staleTime: 5 * 60 * 1000
  });

  // Handle Esc key to exit player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Trigger opening animation completion
  useEffect(() => {
    if (!activePlayback) return;
    setOpeningFinished(false);
    setPlaybackStarted(false);
    setIsClosing(false);

    const timer = setTimeout(() => {
      setOpeningFinished(true);
    }, 450); // Give enough time for dark overlay and FLIP poster transition to complete

    return () => clearTimeout(timer);
  }, [activePlayback?.id]);

  if (!activePlayback) return null;

  const handleClose = () => {
    setIsClosing(true);
    // Smooth exit delay to allow exit transitions to render
    setTimeout(() => {
      closePlayback();
    }, 300);
  };

  const showLoading = apiLoading || !playbackStarted;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col justify-center bg-black overflow-hidden select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Back Button */}
      <div className="absolute left-6 top-6 z-[120]">
        <button
          onClick={handleClose}
          className="glass-capsule gap-2 px-5 h-11 text-sm font-bold text-white transition hover:scale-105 active:scale-95 shadow-[0_8px_32px_rgba(0,0,0,0.5)] cursor-pointer"
        >
          <ArrowLeft size={18} /> Exit
        </button>
      </div>

      {/* Title Overlay while loading/buffering */}
      {showLoading && (
        <div className="absolute left-6 top-20 z-[120] text-shadow hidden md:block">
          <p className="text-xs uppercase tracking-[0.25em] text-white/55">Now Playing</p>
          <h1 className="mt-1 text-2xl font-black text-white">{activePlayback.title}</h1>
        </div>
      )}

      {/* FLIP Poster & Video Container */}
      <div className="relative h-full w-full bg-black">
        {/* FLIP Poster Transition (visible until playback starts) */}
        {!playbackStarted && (
          <motion.div
            className="absolute inset-0 z-[105] flex items-center justify-center bg-black"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.img
              layoutId={clickedElementId || undefined}
              src={activePlayback.backdropUrl || activePlayback.posterUrl}
              alt=""
              className="h-full w-full object-cover"
              style={{ transformOrigin: "center" }}
            />
            {/* Dark overlay fade-in inside player */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Subtle loading spinner or shimmer */}
            {openingFinished && showLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/30 backdrop-blur-sm z-[110]">
                <Loader2 size={48} className="animate-spin text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]" />
                <p className="text-sm font-semibold tracking-wide text-white/70 animate-pulse">
                  Buffering Stream...
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute inset-0 z-[115] flex flex-col items-center justify-center gap-4 bg-[#141414] text-center p-6">
            <p className="text-lg font-bold text-white/80">Playback is currently not available for this title.</p>
            <button
              onClick={handleClose}
              className="nf-button rounded bg-white text-black px-6 py-2 text-sm font-bold hover:bg-white/85"
            >
              Go Back
            </button>
          </div>
        )}

        {/* Actual Video Player container (scales & fades in) */}
        {openingFinished && (() => {
          const currentIndex = source?.episodesList?.findIndex((ep: any) => ep.id === source.currentEpisodeId) ?? -1;
          const nextEpisode = currentIndex !== -1 && source?.episodesList ? source.episodesList[currentIndex + 1] : null;
          
          const handleNextEpisode = (nextEpisodeId: string) => {
            setPlaybackStarted(false);
            usePlaybackStore.setState({ activeEpisodeId: nextEpisodeId });
          };

          const finalSource = source && activeCustomUrl ? { ...source, hlsUrl: activeCustomUrl } : source;

          return (
            <motion.div
              className="relative h-full w-full bg-black z-20"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <VideoPlayer
                source={finalSource}
                onProgress={(currentTime, duration) => {
                  if (finalSource) {
                    updateWatchHistory(activePlayback, currentTime, duration, finalSource.currentEpisodeId, finalSource.title);
                  }
                }}
                onPlayStarted={() => {
                  setPlaybackStarted(true);
                }}
                onNextEpisode={nextEpisode ? () => handleNextEpisode(nextEpisode.id) : undefined}
                hasNextEpisode={Boolean(nextEpisode)}
              />
            </motion.div>
          );
        })()}
      </div>
    </motion.div>
  );
}
