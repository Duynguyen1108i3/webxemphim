import Hls from "hls.js";
import { Maximize, Pause, PictureInPicture2, Play, RotateCcw, RotateCw, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@streamforge/ui";
import type { PlaybackSourceDto } from "@streamforge/shared-types";
import { useAuthStore } from "../store/auth";

function isEmbedUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes("embed") ||
    lower.includes("share") ||
    lower.includes("youtube.com") ||
    lower.includes("youtu.be") ||
    !/\.(m3u8|mp4|webm|ogg)($|\?)/i.test(url)
  );
}

export function VideoPlayer({
  source,
  onProgress,
  onPlayStarted,
  onNextEpisode,
  hasNextEpisode = false
}: {
  source?: PlaybackSourceDto & { title?: string; currentEpisodeId?: string; episodesList?: any[] } | null;
  onProgress?: (seconds: number, duration: number, episodeId?: string, episodeTitle?: string) => void;
  onPlayStarted?: () => void;
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
}) {
  const [activeUrl, setActiveUrl] = useState(source?.hlsUrl || "");
  const isEmbed = activeUrl ? isEmbedUrl(activeUrl) : false;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (source?.hlsUrl) {
      setActiveUrl(source.hlsUrl);
    }
  }, [source?.hlsUrl]);

  const handleFullscreenForContainer = () => {
    const container = containerRef.current;
    if (!container) return;
    try {
      if (container.requestFullscreen) {
        void container.requestFullscreen();
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if ((container as any).msRequestFullscreen) {
        (container as any).msRequestFullscreen();
      }
    } catch (e) {
      console.error("Fullscreen container error:", e);
    }
  };

  useEffect(() => {
    if (isEmbed) {
      const timer = setTimeout(() => {
        onPlayStarted?.();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isEmbed, onPlayStarted]);

  // early return for iframe embeds moved below all hooks to satisfy react rules

  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [bufferedProgress, setBufferedProgress] = useState(0);

  // Resume playback position from watch history on mount
  // Watch history resume position is now deferred and managed safely inside the media ready handlers below to prevent resets

  // Record final playback position on unmount
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video && onProgress && video.duration && source) {
        onProgress(Math.floor(video.currentTime), Math.floor(video.duration), source.currentEpisodeId, source.title);
      }
    };
  }, [onProgress, source]);

  // Listen to video ended event to automatically play next episode
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleEnded = () => {
      if (onNextEpisode) {
        onNextEpisode();
      }
    };
    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, [onNextEpisode]);

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (video.requestFullscreen) {
        void video.requestFullscreen();
      } else if ((video as any).webkitEnterFullscreen) {
        (video as any).webkitEnterFullscreen();
      } else if ((video as any).webkitRequestFullscreen) {
        (video as any).webkitRequestFullscreen();
      } else if ((video as any).msRequestFullscreen) {
        (video as any).msRequestFullscreen();
      }
    } catch (e) {
      console.error("Fullscreen error:", e);
    }
  };

  // Unlock the video element synchronously on mount inside the user's click tick
  useLayoutEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          video.pause();
        })
        .catch((err) => {
          console.log("Sync video element unlock attempt:", err);
        });
    }
  }, []);

  useEffect(() => {
    if (!source) return;
    const video = videoRef.current;
    if (!video) return;
    const isHls = source.hlsUrl.includes(".m3u8");
    
    let hls: Hls | null = null;

    const startPlayback = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setPlaying(true);
            onPlayStarted?.();
          })
          .catch((err) => {
            console.log("Autoplay blocked:", err);
            setPlaying(false);
          });
      }
    };

    const restorePosition = () => {
      try {
        const user = useAuthStore.getState().user;
        const historyKey = user?.email ? `streamforge:${user.email}:watchhistory` : "streamforge:watchhistory";
        const stored = localStorage.getItem(historyKey);
        const history = stored ? JSON.parse(stored) : [];
        const item = history.find((x: any) => x.id === source.movieId);
        if (item && item.currentTime > 5 && item.currentTime < item.duration - 10) {
          video.currentTime = item.currentTime;
        }
      } catch (e) {
        console.error("Deferred playback position restore error:", e);
      }
    };

    if (isHls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(source.hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        restorePosition();
        startPlayback();
      });
    } else {
      video.src = source.hlsUrl;
      const handleCanPlay = () => {
        restorePosition();
        startPlayback();
        video.removeEventListener("canplay", handleCanPlay);
      };
      video.addEventListener("canplay", handleCanPlay);
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [source?.hlsUrl, onPlayStarted]);

  useEffect(() => {
    if (!source) return;
    const video = videoRef.current;
    if (!video) return;
    const handler = () => onProgress?.(Math.floor(video.currentTime), Math.floor(video.duration || 0), source.currentEpisodeId, source.title);
    const interval = window.setInterval(handler, 10_000);
    return () => window.clearInterval(interval);
  }, [onProgress, source]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      if (event.key === " ") void toggle();
      if (event.key === "ArrowRight") video.currentTime += 10;
      if (event.key === "ArrowLeft") video.currentTime -= 10;
      if (event.key.toLowerCase() === "f") void video.requestFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const update = () => {
      setProgress(video.duration ? (video.currentTime / video.duration) * 100 : 0);
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);

      if (video.buffered.length > 0) {
        let bufferedEnd = 0;
        for (let i = 0; i < video.buffered.length; i++) {
          if (video.buffered.start(i) <= video.currentTime && video.buffered.end(i) >= video.currentTime) {
            bufferedEnd = video.buffered.end(i);
            break;
          }
        }
        setBufferedProgress(video.duration ? (bufferedEnd / video.duration) * 100 : 0);
      }

      if (video.currentTime > 0.1) {
        onPlayStarted?.();
      }
    };

    const onMetadata = () => {
      setDuration(video.duration || 0);
    };

    const onPlay = () => {
      setPlaying(true);
      onPlayStarted?.();
    };
    
    const onPlaying = () => {
      setPlaying(true);
      onPlayStarted?.();
    };

    const onVolume = () => {
      setVolume(video.muted ? 0 : video.volume);
      setMuted(video.muted);
    };

    const onPause = () => setPlaying(false);

    video.addEventListener("timeupdate", update);
    video.addEventListener("loadedmetadata", onMetadata);
    video.addEventListener("play", onPlay);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolume);

    // Initial load sync
    setVolume(video.muted ? 0 : video.volume);
    setMuted(video.muted);

    return () => {
      video.removeEventListener("timeupdate", update);
      video.removeEventListener("loadedmetadata", onMetadata);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolume);
    };
  }, [onPlayStarted]);

  async function toggle() {
    const video = videoRef.current!;
    if (video.paused) {
      await video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  function changeSpeed(value: number) {
    setSpeed(value);
    if (videoRef.current) videoRef.current.playbackRate = value;
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  const progressBarRef = useRef<HTMLDivElement>(null);
  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !progressBarRef.current || !video.duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    
    let clientX = 0;
    if ("touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
    } else if ("clientX" in e) {
      clientX = e.clientX;
    } else if ((e.nativeEvent as any).touches && (e.nativeEvent as any).touches.length > 0) {
      clientX = (e.nativeEvent as any).touches[0].clientX;
    } else if ((e.nativeEvent as any).changedTouches && (e.nativeEvent as any).changedTouches.length > 0) {
      clientX = (e.nativeEvent as any).changedTouches[0].clientX;
    } else {
      return;
    }

    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const seekTime = (clickX / rect.width) * video.duration;
    video.currentTime = seekTime;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = Number(e.target.value);
    video.volume = newVolume;
    video.muted = newVolume === 0;
    setVolume(newVolume);
    setMuted(newVolume === 0);
  };

  function formatTime(seconds: number) {
    if (isNaN(seconds) || seconds === Infinity) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  // ─── Auto-Fallback Embed Player ───
  // Tracks which server index we're on, whether auto-probing is active,
  // and renders a status overlay while trying servers.
  const [serverIndex, setServerIndex] = useState(0);
  const [probing, setProbing] = useState(true);
  const [probeFailed, setProbeFailed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const probeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset probe state when activeUrl or source changes externally
  useEffect(() => {
    if (!isEmbed) return;
    setProbing(true);
    setProbeFailed(false);
    // Give the iframe up to 8 seconds to show content; if it stays blank/blocked, skip.
    if (probeTimerRef.current) clearTimeout(probeTimerRef.current);
    probeTimerRef.current = setTimeout(() => {
      // If still probing after 8s, this server likely failed → auto-advance
      handleServerFailed();
    }, 8000);
    return () => {
      if (probeTimerRef.current) clearTimeout(probeTimerRef.current);
    };
  }, [activeUrl, isEmbed]);

  const alternateSources: any[] = isEmbed ? ((source as any)?.alternateSources || []) : [];

  const handleIframeLoaded = () => {
    // iframe loaded event fires even for blocked pages. We mark probe complete
    // and cancel the fail timer. If the page is actually blocked (about:blank or 
    // error page), the user will see a blank → they can click "Skip" or wait for
    // the 8s auto-fallback.
    // For cross-origin iframes we can't check content, so we rely on the timer.
    // A successful load within 8s is considered "working".
    if (probeTimerRef.current) clearTimeout(probeTimerRef.current);
    setProbing(false);
    onPlayStarted?.();
  };

  const handleServerFailed = () => {
    if (probeTimerRef.current) clearTimeout(probeTimerRef.current);
    const nextIndex = serverIndex + 1;
    if (nextIndex < alternateSources.length) {
      setServerIndex(nextIndex);
      setActiveUrl(alternateSources[nextIndex].url);
      setProbing(true);
      setProbeFailed(false);
    } else {
      // All servers exhausted
      setProbing(false);
      setProbeFailed(true);
    }
  };

  const handleManualServerSwitch = (idx: number) => {
    if (probeTimerRef.current) clearTimeout(probeTimerRef.current);
    setServerIndex(idx);
    setActiveUrl(alternateSources[idx].url);
    setProbing(true);
    setProbeFailed(false);
  };

  if (source && isEmbed) {
    let embedSrc = activeUrl;
    if (embedSrc.includes("youtube.com") || embedSrc.includes("youtu.be")) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = embedSrc.match(regExp);
      const videoId = (match && match[2].length === 11) ? match[2] : null;
      if (videoId) {
        embedSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&rel=0`;
      }
    }

    const currentServer = alternateSources[serverIndex] || { name: "Unknown", quality: "HD" };

    return (
      <div ref={containerRef} className="relative h-full w-full bg-black flex flex-col items-center justify-center">
        
        {/* ── Top Bar: Server Info + Quality Badge + Manual Selector ── */}
        <div className="absolute top-0 left-0 right-0 z-[130] flex items-center justify-between px-4 py-2.5 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto select-none">
          {/* Current server info */}
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded uppercase ${
              currentServer.quality === "4K" ? "bg-purple-600 text-white" :
              currentServer.quality === "1080p" ? "bg-blue-600 text-white" :
              currentServer.quality === "Source" ? "bg-green-600 text-white" :
              "bg-zinc-600 text-white"
            }`}>
              {currentServer.quality}
            </span>
            <span className="text-xs font-bold text-white/80">{currentServer.name}</span>
            {probing && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold animate-pulse">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                Đang kết nối...
              </span>
            )}
            {!probing && !probeFailed && (
              <span className="flex items-center gap-1 text-[10px] text-green-400 font-semibold">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                Đang phát
              </span>
            )}
          </div>

          {/* Server selector dropdown */}
          {alternateSources.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-white/40 font-semibold hidden sm:inline">Server:</span>
              <select
                value={serverIndex}
                onChange={(e) => handleManualServerSwitch(Number(e.target.value))}
                className="bg-black/60 border border-white/10 text-xs font-bold text-white rounded px-2 py-1 outline-none cursor-pointer backdrop-blur-md"
              >
                {alternateSources.map((src: any, idx: number) => (
                  <option key={src.url} value={idx} className="bg-[#141414] text-white">
                    {src.name} ({src.quality})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── Probing / Loading Overlay ── */}
        {probing && (
          <div className="absolute inset-0 z-[125] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-14 w-14 rounded-full border-2 border-white/10 border-t-[#e50914] animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white/90">Đang tìm nguồn phát nét nhất...</p>
                <p className="text-xs text-white/50 mt-1">
                  Server {serverIndex + 1}/{alternateSources.length}: <span className="text-white/80">{currentServer.name}</span>
                  <span className={`ml-2 text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded uppercase ${
                    currentServer.quality === "4K" ? "bg-purple-600/30 text-purple-300" :
                    currentServer.quality === "1080p" ? "bg-blue-600/30 text-blue-300" :
                    "bg-zinc-600/30 text-zinc-300"
                  }`}>{currentServer.quality}</span>
                </p>
              </div>
              {/* Progress dots for servers */}
              <div className="flex items-center gap-1.5 mt-2">
                {alternateSources.map((_: any, idx: number) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx < serverIndex ? "w-1.5 bg-red-500/50" :
                      idx === serverIndex ? "w-6 bg-[#e50914]" :
                      "w-1.5 bg-white/15"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={handleServerFailed}
                className="mt-3 text-[11px] font-semibold text-white/40 hover:text-white/80 transition cursor-pointer underline underline-offset-4"
              >
                Bỏ qua → thử server tiếp
              </button>
            </div>
          </div>
        )}

        {/* ── All Servers Failed Overlay ── */}
        {probeFailed && (
          <div className="absolute inset-0 z-[125] flex flex-col items-center justify-center bg-[#141414] pointer-events-auto">
            <div className="text-center max-w-md px-6">
              <div className="text-5xl mb-4">😞</div>
              <h3 className="text-xl font-black text-white mb-2">Không tìm thấy nguồn phát</h3>
              <p className="text-sm text-white/50 mb-6 leading-relaxed">
                Tất cả {alternateSources.length} server đã được thử nhưng đều bị chặn hoặc không khả dụng. 
                Hãy thử tắt Adblocker hoặc đổi trình duyệt.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => handleManualServerSwitch(0)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#e50914] text-white text-sm font-bold hover:bg-[#b20710] transition cursor-pointer"
                >
                  <RotateCcw size={14} /> Thử lại từ đầu
                </button>
                {alternateSources.map((src: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleManualServerSwitch(idx)}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  >
                    {src.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Iframe Player ── */}
        <iframe
          ref={iframeRef}
          src={embedSrc}
          className="w-full h-full border-none max-h-screen aspect-video"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={source.title || "Movie Player"}
          onLoad={handleIframeLoaded}
        />
        
        {/* Floating Fullscreen Button for Embed/Iframe on Mobile */}
        <button
          onClick={handleFullscreenForContainer}
          className="absolute top-4 right-4 z-40 md:hidden flex items-center justify-center h-10 w-10 rounded-full bg-black/60 text-white border border-white/20 backdrop-blur-sm hover:scale-105 active:scale-95 transition cursor-pointer"
          aria-label="Fullscreen"
        >
          <Maximize size={18} />
        </button>
        
        {/* Watch on YouTube fallback button */}
        {(activeUrl.includes("youtube.com") || activeUrl.includes("youtu.be")) && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5 bg-black/80 px-4 py-3 rounded-lg border border-white/10 text-center max-w-[90vw] backdrop-blur-sm shadow-xl">
            <p className="text-xs text-white/60">YouTube may restrict playing certain trailers inside other apps (Error 153).</p>
            <a
              href={activeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded bg-[#e50914] px-4 text-xs font-bold text-white transition hover:bg-[#b20710] focus:outline-none cursor-pointer"
            >
              Watch Trailer on YouTube
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="group relative grid min-h-screen place-items-center overflow-hidden bg-black select-none">
      <video ref={videoRef} className="h-full max-h-screen w-full object-contain" autoPlay playsInline poster="" crossOrigin="anonymous">
        {source?.subtitles?.map((sub) => <track key={sub.url} kind="subtitles" srcLang={sub.language} label={sub.label} src={sub.url} />)}
      </video>
      <button onClick={toggle} className="absolute inset-0" aria-label={playing ? "Pause video" : "Play video"} />

      {/* Play Button Overlay (For Autoplay Block Bypass on mobile) */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
            className="grid h-20 w-20 place-items-center rounded-full bg-black/60 text-white border border-white/20 backdrop-blur-sm pointer-events-auto hover:scale-110 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
            aria-label="Play video"
          >
            <Play size={36} fill="currentColor" className="ml-1 text-white" />
          </button>
        </div>
      )}


      
      {/* Controls Container Overlay */}
      <div className="absolute inset-x-0 bottom-16 md:bottom-0 space-y-4 bg-gradient-to-t from-black via-black/80 to-transparent p-4 opacity-100 transition md:p-8 md:opacity-0 md:group-hover:opacity-100">
        
        {/* Clickable Seekbar Wrapper */}
        <div 
          ref={progressBarRef}
          onClick={handleSeek}
          onTouchStart={handleSeek}
          className="relative h-1.5 w-full bg-white/20 cursor-pointer group/progress transition-all hover:h-2"
        >
          {/* Buffered progress */}
          <div 
            className="absolute h-full bg-white/30" 
            style={{ width: `${bufferedProgress}%` }} 
          />
          {/* Playback progress */}
          <div 
            className="absolute h-full bg-[#e50914]" 
            style={{ width: `${progress}%` }} 
          />
          {/* Playhead thumb (Netflix dot) */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-[#e50914] opacity-0 group-hover/progress:opacity-100 transition-opacity" 
            style={{ left: `calc(${progress}% - 7px)` }} 
          />
        </div>

        {/* Control Button bar */}
        <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-2 w-full">
          <div className="flex flex-wrap items-center gap-1.5 md:gap-3">
            {/* Play/Pause */}
            <Button onClick={toggle} className="h-10 w-10 md:h-12 md:w-12 rounded-full p-0 shrink-0" aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
            </Button>
            
            {/* Rewind 10s */}
            <Button variant="ghost" onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10); }} className="h-10 w-10 md:h-11 md:w-11 rounded-full p-0 shrink-0" aria-label="Rewind 10 seconds">
              <RotateCcw size={16} />
            </Button>

            {/* Forward 10s */}
            <Button variant="ghost" onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10); }} className="h-10 w-10 md:h-11 md:w-11 rounded-full p-0 shrink-0" aria-label="Forward 10 seconds">
              <RotateCw size={16} />
            </Button>

            {/* Next Episode */}
            {hasNextEpisode && onNextEpisode && (
              <Button variant="ghost" onClick={onNextEpisode} className="h-10 w-10 md:h-11 md:w-11 rounded-full p-0 text-white hover:text-[#46d369] shrink-0" aria-label="Next Episode">
                <SkipForward size={18} fill="currentColor" />
              </Button>
            )}

            {/* Skip Intro */}
            {source && typeof source.introEndSeconds === "number" && source.introEndSeconds > 0 && (
              <Button variant="ghost" className="h-9 px-3 text-xs shrink-0" onClick={() => { if (videoRef.current) videoRef.current.currentTime = source.introEndSeconds!; }}>
                <SkipForward size={14} /> Skip Intro
              </Button>
            )}

            {/* Volume bar */}
            <div className="flex items-center gap-1.5 md:gap-2 ml-1">
              <Button variant="ghost" onClick={toggleMute} className="h-10 w-10 md:h-11 md:w-11 rounded-full p-0 shrink-0" aria-label={muted ? "Unmute" : "Mute"}>
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </Button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="h-1 w-12 sm:w-16 cursor-pointer rounded-lg bg-zinc-600 accent-[#e50914] appearance-none"
                aria-label="Volume level"
              />
            </div>

            {/* Time display */}
            <div className="text-[11px] md:text-sm font-semibold tracking-wider text-zinc-300 ml-1 whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
            {/* Speed selection */}
            <select value={speed} onChange={(e) => changeSpeed(Number(e.target.value))} className="rounded bg-white/10 border border-white/10 px-1 py-1 sm:px-2 sm:py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-white">
              {[0.5, 1, 1.25, 1.5, 2].map((value) => <option key={value} value={value} className="bg-zinc-900">{value}x</option>)}
            </select>
            
            {/* Picture-in-Picture */}
            <Button variant="ghost" onClick={() => videoRef.current?.requestPictureInPicture()} className="h-10 w-10 md:h-11 md:w-11 rounded-full p-0 flex items-center justify-center" aria-label="Picture in picture">
              <PictureInPicture2 size={16} />
            </Button>
            
            {/* Fullscreen */}
            <Button variant="ghost" onClick={handleFullscreen} className="h-10 w-10 md:h-11 md:w-11 rounded-full p-0 text-white hover:text-[#e50914]" aria-label="Fullscreen">
              <Maximize size={20} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
