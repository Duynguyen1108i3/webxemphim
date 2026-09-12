import Hls from "hls.js";
import { Check, ChevronUp, Download, Gauge, Maximize, Pause, PictureInPicture2, Play, RotateCcw, RotateCw, SkipForward, Subtitles, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PlaybackSourceDto } from "@streamforge/shared-types";
import { useAuthStore } from "../store/auth";
import { usePlaybackStore } from "../store/playbackStore";

function isEmbedUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.includes(".m3u8") || lower.includes("kkphim") || lower.includes("dramahay.xyz") || lower.includes("phim4k.dpdns.org") || lower.includes("/stream/hls")) {
    return false;
  }
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
        onProgress?.(30, 120, source?.currentEpisodeId, source?.title);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isEmbed, onPlayStarted, onProgress, source]);



  // early return for iframe embeds moved below all hooks to satisfy react rules

  const videoRef = useRef<HTMLVideoElement>(null);
  // Parent callbacks are recreated as overlay state changes. Keep the media
  // lifecycle independent from those renders: changing a callback must never
  // destroy and recreate the active stream.
  const latestSourceRef = useRef(source);
  const onPlayStartedRef = useRef(onPlayStarted);
  const onProgressRef = useRef(onProgress);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    latestSourceRef.current = source;
    onPlayStartedRef.current = onPlayStarted;
    onProgressRef.current = onProgress;
  }, [source, onPlayStarted, onProgress]);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  // Real-time Concurrent Viewer Telemetry
  const playbackSessionId = useRef<string>(
    "vw_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36)
  );
  const activePlayback = usePlaybackStore((state) => state.activePlayback);

  const sendHeartbeat = useCallback((stopped = false) => {
    const video = videoRef.current;
    const currentSource = latestSourceRef.current;
    const movie = activePlayback;

    const movieId = movie?.id || currentSource?.movieId || (currentSource as any)?.id || "movie";
    const movieTitle = movie?.title || currentSource?.title || "Phim";
    const movieSlug = movie?.slug || movie?.id;
    const posterUrl = movie?.posterUrl || movie?.backdropUrl;
    const backdropUrl = movie?.backdropUrl || movie?.posterUrl;
    const episodeId = currentSource?.currentEpisodeId;
    const episodeTitle = currentSource?.title !== movieTitle ? currentSource?.title : undefined;

    const curTime = video ? Math.floor(video.currentTime || 0) : 0;
    const dur = video && video.duration && !isNaN(video.duration) ? Math.floor(video.duration) : 100;
    const isPaused = video ? video.paused : !playing;

    const payload = JSON.stringify({
      sessionId: playbackSessionId.current,
      movieId,
      movieTitle,
      movieSlug,
      posterUrl,
      backdropUrl,
      episodeId,
      episodeTitle,
      currentTime: curTime,
      duration: dur,
      isPaused: stopped ? true : isPaused,
      stopped
    });

    if (stopped) {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/playback/heartbeat", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/playback/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: payload,
          keepalive: true
        }).catch(() => {});
      }
      return;
    }

    fetch("/api/playback/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: payload
    }).catch(() => {});
  }, [activePlayback, playing]);

  // Periodic heartbeat timer while player is mounted
  useEffect(() => {
    sendHeartbeat(false);

    const interval = setInterval(() => {
      sendHeartbeat(false);
    }, 5000);

    const handleBeforeUnload = () => {
      sendHeartbeat(true);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      sendHeartbeat(true);
    };
  }, [sendHeartbeat]);

  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [bufferedProgress, setBufferedProgress] = useState(0);

  // Close speed menu when clicking outside
  useEffect(() => {
    if (!showSpeedMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setShowSpeedMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSpeedMenu]);

  // Subtitle / Closed Captions state
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>("off");
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const subtitleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSubtitleMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (subtitleMenuRef.current && !subtitleMenuRef.current.contains(e.target as Node)) {
        setShowSubtitleMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSubtitleMenu]);

  const handleSubtitleChange = (lang: string) => {
    setSelectedSubtitle(lang);
    setShowSubtitleMenu(false);
    const video = videoRef.current;
    if (!video || !video.textTracks) return;

    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if (lang === "off") {
        track.mode = "disabled";
      } else if (track.language === lang || track.label === lang) {
        track.mode = "showing";
      } else {
        track.mode = "disabled";
      }
    }
  };

  // Auto-next Episode Countdown state
  const [showNextCountdown, setShowNextCountdown] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [dismissedCountdown, setDismissedCountdown] = useState(false);

  useEffect(() => {
    if (!hasNextEpisode || !onNextEpisode || dismissedCountdown) {
      setShowNextCountdown(false);
      return;
    }

    if (duration > 20 && currentTime >= duration - 15) {
      if (!showNextCountdown) {
        setShowNextCountdown(true);
        setCountdown(10);
      }
    } else {
      if (showNextCountdown && currentTime < duration - 18) {
        setShowNextCountdown(false);
      }
    }
  }, [currentTime, duration, hasNextEpisode, onNextEpisode, dismissedCountdown, showNextCountdown]);

  useEffect(() => {
    if (!showNextCountdown) return;

    if (countdown <= 0) {
      setShowNextCountdown(false);
      onNextEpisode?.();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [showNextCountdown, countdown, onNextEpisode]);


  // Scrubbing & Hover States for Smooth Dragging Progress Bar
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState<number>(0);

  const calculateScrubPosition = useCallback((clientX: number) => {
    const bar = progressBarRef.current;
    const video = videoRef.current;
    if (!bar || !video || !video.duration) return { pct: 0, time: 0 };
    const rect = bar.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const pct = (offsetX / rect.width) * 100;
    const time = (offsetX / rect.width) * video.duration;
    return { pct, time };
  }, []);

  const handleScrubMove = useCallback((clientX: number) => {
    const { pct, time } = calculateScrubPosition(clientX);
    setProgress(pct);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, [calculateScrubPosition]);

  // Mouse drag handlers
  const handleSeekMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsScrubbing(true);
    handleScrubMove(e.clientX);
  };

  useEffect(() => {
    if (!isScrubbing) return;
    const onMouseMove = (e: MouseEvent) => {
      handleScrubMove(e.clientX);
    };
    const onMouseUp = () => {
      setIsScrubbing(false);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isScrubbing, handleScrubMove]);

  // Touch drag handlers
  const handleSeekTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      setIsScrubbing(true);
      handleScrubMove(e.touches[0].clientX);
    }
  };

  const handleSeekTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      handleScrubMove(e.touches[0].clientX);
    }
  };

  const handleSeekTouchEnd = () => {
    setIsScrubbing(false);
  };

  // Hover handlers for seekbar tooltip
  const handleSeekMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { pct, time } = calculateScrubPosition(e.clientX);
    setHoverPercent(pct);
    setHoverTime(time);
  };

  const handleSeekMouseLeave = () => {
    setHoverTime(null);
  };

  // Resume playback position from watch history on mount
  // Watch history resume position is now deferred and managed safely inside the media ready handlers below to prevent resets

  // Record final playback position on unmount
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      const currentSource = latestSourceRef.current;
      if (video && onProgressRef.current && video.duration && currentSource) {
        onProgressRef.current(Math.floor(video.currentTime), Math.floor(video.duration), currentSource.currentEpisodeId, currentSource.title);
      }
    };
  // This is intentionally unmount-only. Depending on the callback here makes
  // each watch-history update run this cleanup again, causing a React update
  // loop in the overlay.
  }, []);

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
    if (!latestSourceRef.current || !activeUrl) return;
    const video = videoRef.current;
    if (!video) return;
    const isHls = activeUrl.includes(".m3u8") || activeUrl.includes("/stream/hls") || activeUrl.includes("dramahay.xyz") || activeUrl.includes("phim4k.dpdns.org");
    
    let hls: Hls | null = null;
    let networkRetryCount = 0;
    let fallbackTriggered = false;

    const handleFallback = () => {
      if (fallbackTriggered) return;
      const currentSource = latestSourceRef.current;
      if (!currentSource?.alternateSources || currentSource.alternateSources.length <= 1) return;
      const currentIndex = currentSource.alternateSources.findIndex((s: any) => s.url === activeUrl);
      if (currentIndex !== -1 && currentIndex < currentSource.alternateSources.length - 1) {
        fallbackTriggered = true;
        const nextSource = currentSource.alternateSources[currentIndex + 1];
        console.warn(`Switching to fallback source: ${nextSource.name} (${nextSource.url})`);
        setActiveUrl(nextSource.url);
      }
    };

    const startPlayback = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setPlaying(true);
            onPlayStartedRef.current?.();
          })
          .catch((err) => {
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
        const email = user?.email || "";
        const historyKey = email ? `rytoxgroup:${email}:watchhistory` : "rytoxgroup:guest:watchhistory";
        const fallbackHistoryKey = email ? `streamforge:${email}:watchhistory` : "streamforge:guest:watchhistory";
        const stored = localStorage.getItem(historyKey) || localStorage.getItem(fallbackHistoryKey) || localStorage.getItem("streamforge:watchhistory");
        const history = stored ? JSON.parse(stored) : [];
        const item = history.find((x: any) => x.id === latestSourceRef.current?.movieId);
        if (item && item.currentTime > 5 && item.currentTime < item.duration - 10) {
          video.currentTime = item.currentTime;
        }
      } catch (e) {
        console.error("Deferred playback position restore error:", e);
      }
    };

    const handleVideoError = (e: Event) => {
      console.error("Native video element error:", e);
      handleFallback();
    };
    video.addEventListener("error", handleVideoError);

    if (isHls && Hls.isSupported()) {
      hls = new Hls({ 
        enableWorker: true, 
        // Movie streams are VOD, not live broadcasts. Low-latency mode can
        // aggressively evict/replace media buffers and presents as a brief
        // black frame on Chromium while seeking or recovering a segment.
        lowLatencyMode: false,
        backBufferLength: 600,
        maxBufferLength: 600,
        maxMaxBufferLength: 1200,
        maxBufferHole: 0.1,
        highBufferWatchdogPeriod: 1,
        nudgeMaxRetry: 10,
        stretchShortVideoTrack: true,
        maxAudioFramesDrift: 1,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6
      });
      hlsRef.current = hls;
      hls.loadSource(activeUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        restorePosition();
        startPlayback();
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR || data.details === Hls.ErrorDetails.BUFFER_NUDGE_ON_STALL) {
          console.warn("HLS buffer stalled error detected. Restarting load and resuming playback...");
          hls?.startLoad();
          void video.play().catch(() => {});
          return;
        }
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkRetryCount++;
              if (networkRetryCount > 2) {
                console.warn("Fatal network error limit reached in player. Switching to fallback...");
                handleFallback();
              } else {
                console.warn(`Fatal network error in player, attempting recovery (retry ${networkRetryCount})...`);
                hls?.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn("Fatal media error in player, recovering media...");
              hls?.recoverMediaError();
              break;
            default:
              console.error("Fatal unrecoverable player error. Switching to fallback...");
              handleFallback();
              break;
          }
        }
      });
    } else {
      video.src = activeUrl;
      video.load();
      const handleCanPlay = () => {
        restorePosition();
        startPlayback();
        video.removeEventListener("canplay", handleCanPlay);
        video.removeEventListener("loadedmetadata", handleCanPlay);
      };
      video.addEventListener("canplay", handleCanPlay);
      video.addEventListener("loadedmetadata", handleCanPlay);
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      video.removeEventListener("error", handleVideoError);
      try {
        video.pause();
        video.removeAttribute("src");
        video.load();
      } catch (err) {
        console.error("Video player unmount cleanup error:", err);
      }
    };
  }, [activeUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handler = () => {
      const currentSource = latestSourceRef.current;
      if (currentSource && video.currentTime > 1 && video.duration > 0) {
        onProgressRef.current?.(Math.floor(video.currentTime), Math.floor(video.duration), currentSource.currentEpisodeId, currentSource.title);
      }
    };
    const interval = window.setInterval(handler, 3_000);
    return () => window.clearInterval(interval);
  }, []);

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
        onPlayStartedRef.current?.();
      }
    };

    const onMetadata = () => {
      setDuration(video.duration || 0);
    };

    const onPlay = () => {
      setPlaying(true);
      onPlayStartedRef.current?.();
    };

    const onPlaying = () => {
      setPlaying(true);
      onPlayStartedRef.current?.();
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
  }, []);

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

  const currentAlternative = source?.alternateSources?.find((s: any) => s.url === activeUrl);
  const infoHash = currentAlternative?.infoHash;
  const fileIdx = currentAlternative?.fileIdx ?? 0;

  let parsedInfoHash = infoHash;
  if (!parsedInfoHash && activeUrl?.startsWith("magnet:")) {
    const match = activeUrl.match(/urn:btih:([a-fA-F0-9]{40})/);
    if (match) {
      parsedInfoHash = match[1].toLowerCase();
    }
  }

  const [isStremioOnline, setIsStremioOnline] = useState<boolean | null>(null);

  useEffect(() => {
    if (!activeUrl || !activeUrl.startsWith("magnet:")) {
      setIsStremioOnline(null);
      return;
    }
    
    const checkStremio = async () => {
      try {
        const res = await fetch("http://127.0.0.1:11470/status", { mode: "cors" });
        if (res.ok) {
          setIsStremioOnline(true);
        } else {
          setIsStremioOnline(false);
        }
      } catch {
        setIsStremioOnline(false);
      }
    };
    
    checkStremio();
  }, [activeUrl]);

  // ─── Instant Embed Player (no probing delay) ───
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [serverIndex, setServerIndex] = useState(0);
  
  // Filter to only embed sources for the player (torrent/magnet links can't be iframed)
  const allSources: any[] = isEmbed ? ((source as any)?.alternateSources || []) : [];
  const embedSources = allSources.filter((s: any) => !s.url?.startsWith("magnet:") && s.streamType !== "torrent");

  useEffect(() => {
    if (isEmbed && onPlayStarted) {
      onPlayStarted();
    }
  }, [isEmbed, onPlayStarted]);

  const handleServerSwitch = (idx: number) => {
    setServerIndex(idx);
    if (embedSources[idx]) {
      setActiveUrl(embedSources[idx].url);
    }
  };

  const handleNextServer = () => {
    const next = (serverIndex + 1) % embedSources.length;
    handleServerSwitch(next);
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

    // Resolve current server metadata dynamically from all sources to show the correct name (e.g., Torrentio, Embed.su)
    const currentServer = allSources.find((s: any) => s.url === activeUrl) || { 
      name: activeUrl.startsWith("magnet:") ? "Torrentio" : (activeUrl.split("/")[2] || "Player"), 
      quality: "1080p" 
    };

    return (
      <div ref={containerRef} className="relative h-full w-full bg-black flex flex-col items-center justify-center">
        
        {/* ── Compact Top Bar: auto-hides after 4s, shows on hover ── */}
        <div className="absolute top-0 left-0 right-0 z-[130] flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-auto select-none opacity-100 hover:opacity-100 transition-opacity duration-300">
          {/* Server info */}
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded uppercase ${
              currentServer.quality?.includes("4K") ? "bg-purple-600 text-white" :
              currentServer.quality?.includes("1080p") ? "bg-blue-600 text-white" :
              "bg-zinc-600 text-white"
            }`}>
              {currentServer.quality || "HD"}
            </span>
            <span className="text-[11px] font-bold text-white/70 truncate max-w-[120px] sm:max-w-none">{currentServer.name}</span>
          </div>

          {/* Clean Top Right */}
          <div className="flex items-center gap-2" />
        </div>

        {/* ── Direct Video Embed Player ── */}
        <iframe
          ref={iframeRef}
          src={embedSrc}
          className="w-full h-full border-none max-h-screen aspect-video"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          title={source.title || "Movie Player"}
          onLoad={() => onPlayStarted?.()}
        />
        
        {/* Floating Fullscreen Button (Mobile) */}
        <button
          onClick={handleFullscreenForContainer}
          className="absolute top-2 right-2 z-40 md:hidden flex items-center justify-center h-9 w-9 rounded-full bg-black/50 text-white border border-white/15 backdrop-blur-sm hover:scale-105 active:scale-95 transition cursor-pointer"
          aria-label="Fullscreen"
        >
          <Maximize size={16} />
        </button>
        {/* YouTube fallback */}
        {(activeUrl.includes("youtube.com") || activeUrl.includes("youtu.be")) && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5 bg-black/80 px-4 py-3 rounded-lg border border-white/10 text-center max-w-[90vw] backdrop-blur-sm shadow-xl">
            <p className="text-xs text-white/60">YouTube may restrict playing certain trailers inside other apps (Error 153).</p>
            <a
              href={activeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full glass-capsule px-5 text-xs font-bold text-white transition hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
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
      <video ref={videoRef} className="h-full max-h-screen w-full object-contain" autoPlay playsInline preload="auto" poster="" crossOrigin="anonymous">
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
            className="glass-player-center-play pointer-events-auto focus:outline-none cursor-pointer"
            aria-label="Play video"
          >
            <Play size={36} fill="currentColor" className="ml-1 text-white" />
          </button>
        </div>
      )}

      {/* Controls Container Overlay */}
      <div className="absolute inset-x-0 bottom-0 z-30 space-y-3 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-4 sm:p-6 opacity-100 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100">
        <div className="max-w-7xl mx-auto w-full space-y-3">
          
          {/* Clickable & Draggable Seekbar Wrapper */}
          <div 
            ref={progressBarRef}
            onMouseDown={handleSeekMouseDown}
            onTouchStart={handleSeekTouchStart}
            onTouchMove={handleSeekTouchMove}
            onTouchEnd={handleSeekTouchEnd}
            onMouseMove={handleSeekMouseMove}
            onMouseLeave={handleSeekMouseLeave}
            className="relative h-6 w-full cursor-pointer group/progress py-2 flex items-center select-none"
          >
            {/* Base Glass Bar */}
            <div className="h-1.5 w-full rounded-full bg-white/20 backdrop-blur-md border border-white/10 overflow-hidden transition-all group-hover/progress:h-2.5">
              {/* Buffered progress */}
              <div className="h-full bg-white/30 transition-all duration-150" style={{ width: `${bufferedProgress}%` }} />
            </div>

            {/* Liquid Glass Playback Progress Bar */}
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-white/70 via-white/90 to-white shadow-[0_0_12px_rgba(255,255,255,0.8)] transition-all group-hover/progress:h-2.5 pointer-events-none" 
              style={{ width: `${progress}%` }} 
            />

            {/* Hover preview indicator line */}
            {hoverTime !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3.5 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] pointer-events-none z-10"
                style={{ left: `${hoverPercent}%` }}
              />
            )}

            {/* Liquid Glass Scrubber Bead Handle */}
            <div 
              className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white border-2 border-white/90 shadow-[0_0_14px_rgba(255,255,255,0.95)] backdrop-blur-md transition-transform duration-100 pointer-events-none z-20 ${
                isScrubbing ? "scale-125 opacity-100" : "scale-0 opacity-0 group-hover/progress:scale-100 group-hover/progress:opacity-100"
              }`} 
              style={{ left: `calc(${progress}% - 8px)` }} 
            />

            {/* Hover Time Tooltip Box */}
            {hoverTime !== null && (
              <div
                className="absolute -top-9 -translate-x-1/2 rounded-xl liquid-glass px-3 py-1 text-[11px] font-bold text-white shadow-xl border border-white/20 pointer-events-none select-none z-30"
                style={{ left: `${hoverPercent}%` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          {/* Control Button bar - Floating Liquid Glass Island */}
          <div className="p-2 sm:p-2.5 rounded-3xl liquid-glass shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex flex-wrap items-center justify-between gap-y-3 gap-x-2 w-full select-none border border-white/15">
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2.5">
              {/* Play/Pause */}
              <button 
                onClick={toggle} 
                className="glass-player-btn glass-player-btn--hero cursor-pointer" 
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
              </button>
              
              {/* Rewind 10s */}
              <button 
                onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10); }} 
                className="glass-player-btn cursor-pointer" aria-label="Rewind 10 seconds"
              >
                <RotateCcw size={16} />
              </button>

              {/* Forward 10s */}
              <button 
                onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10); }} 
                className="glass-player-btn cursor-pointer" aria-label="Forward 10 seconds"
              >
                <RotateCw size={16} />
              </button>

              {/* Next Episode */}
              {hasNextEpisode && onNextEpisode && (
                <button 
                  onClick={onNextEpisode} 
                  className="glass-player-btn cursor-pointer" aria-label="Next Episode"
                >
                  <SkipForward size={18} fill="currentColor" />
                </button>
              )}

              {/* Skip Intro */}
              {source && typeof source.introEndSeconds === "number" && source.introEndSeconds > 0 && (
                <button 
                  className="h-9 px-3.5 rounded-full glass-capsule text-xs font-bold text-white/90 hover:text-white flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer" 
                  onClick={() => { if (videoRef.current) videoRef.current.currentTime = source.introEndSeconds!; }}
                >
                  <SkipForward size={13} /> Skip Intro
                </button>
              )}

              {/* Volume bar */}
              <div className="flex items-center gap-1.5 md:gap-2 px-2.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md ml-1">
                <button 
                  onClick={toggleMute} 
                  className="h-7 w-7 rounded-full flex items-center justify-center text-white/90 hover:text-white active:scale-90 transition cursor-pointer" 
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="h-1.5 w-14 sm:w-20 cursor-pointer rounded-lg bg-white/25 accent-white appearance-none"
                  aria-label="Volume level"
                />
              </div>

              {/* Time display */}
              <div className="px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs font-mono font-semibold text-white/90 whitespace-nowrap shadow-sm ml-1">
                {formatTime(currentTime)} <span className="text-white/40">/</span> {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 relative">
              {/* Subtitles CC Button & Popover */}
              <div ref={subtitleMenuRef} className="relative z-50">
                <button
                  type="button"
                  onClick={() => setShowSubtitleMenu(!showSubtitleMenu)}
                  className={`flex items-center gap-1.5 h-10 px-3.5 rounded-full glass-capsule text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer shadow-md ${
                    selectedSubtitle !== "off" ? "text-white bg-white/30 border border-white/40" : "text-white"
                  }`}
                  aria-label="Subtitles and captions"
                >
                  <Subtitles size={16} className="text-white/90" />
                  <span className="hidden sm:inline">CC</span>
                  <ChevronUp size={13} className={`text-white/70 transition-transform duration-200 ${showSubtitleMenu ? "rotate-180" : ""}`} />
                </button>

                {showSubtitleMenu && (
                  <div className="absolute bottom-12 right-0 z-[150] flex flex-col w-44 rounded-2xl liquid-glass border border-white/20 backdrop-blur-2xl p-1.5 shadow-[0_12px_48px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-bottom-2 duration-150 select-none">
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white/50 border-b border-white/10 mb-1">
                      Phụ đề / Lồng tiếng
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSubtitleChange("off")}
                      className={`flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                        selectedSubtitle === "off" ? "bg-white/25 text-white border border-white/30 shadow-[0_0_12px_rgba(255,255,255,0.2)]" : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>Tắt phụ đề (Off)</span>
                      {selectedSubtitle === "off" && <Check size={13} />}
                    </button>
                    {(source?.subtitles && source.subtitles.length > 0 ? source.subtitles : [
                      { language: "vi", label: "Tiếng Việt (Vietsub)", url: "" },
                      { language: "en", label: "English (Engsub)", url: "" }
                    ]).map((sub) => (
                      <button
                        key={sub.language}
                        type="button"
                        onClick={() => handleSubtitleChange(sub.language)}
                        className={`flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                          selectedSubtitle === sub.language ? "bg-white/25 text-white border border-white/30 shadow-[0_0_12px_rgba(255,255,255,0.2)]" : "text-white/80 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span className="truncate">{sub.label}</span>
                        {selectedSubtitle === sub.language && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Speed selection - Custom Liquid Glass Popover */}
              <div ref={speedMenuRef} className="relative z-50">
                <button
                  type="button"
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="flex items-center gap-1.5 h-10 px-3.5 rounded-full glass-capsule text-xs sm:text-sm font-bold text-white transition active:scale-95 cursor-pointer shadow-md"
                  aria-label="Playback speed"
                >
                  <Gauge size={15} className="text-white/90" />
                  <span>{speed}x</span>
                  <ChevronUp size={13} className={`text-white/70 transition-transform duration-200 ${showSpeedMenu ? "rotate-180" : ""}`} />
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-12 right-0 z-[150] flex flex-col w-32 rounded-2xl liquid-glass border border-white/20 backdrop-blur-2xl p-1.5 shadow-[0_12px_48px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-bottom-2 duration-150 select-none">
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white/50 border-b border-white/10 mb-1">
                      Tốc độ
                    </div>
                    {[0.5, 1, 1.25, 1.5, 2].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          changeSpeed(v);
                          setShowSpeedMenu(false);
                        }}
                        className={`flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                          speed === v ? "bg-white/25 text-white border border-white/30 shadow-[0_0_12px_rgba(255,255,255,0.2)]" : "text-white/80 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span>{v}x</span>
                        {speed === v && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Picture-in-Picture */}
              <button 
                onClick={() => videoRef.current?.requestPictureInPicture()} 
                className="glass-player-btn cursor-pointer" aria-label="Picture in picture"
              >
                <PictureInPicture2 size={16} />
              </button>
              
              {/* Fullscreen */}
              <button 
                onClick={handleFullscreen} 
                className="glass-player-btn cursor-pointer" aria-label="Fullscreen"
              >
                <Maximize size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Netflix-style Auto Next Episode Countdown Overlay Card */}
      {showNextCountdown && hasNextEpisode && onNextEpisode && (
        <div className="absolute bottom-24 right-4 sm:right-8 z-40 max-w-sm rounded-2xl liquid-glass p-4 border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start justify-between gap-3 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-600/80 text-white shadow-sm">
              Tập tiếp theo
            </span>
            <button
              onClick={() => {
                setDismissedCountdown(true);
                setShowNextCountdown(false);
              }}
              className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
              aria-label="Dismiss countdown"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-sm font-bold text-white mb-1">
            Tự động chuyển tập sau <span className="text-red-400 font-extrabold">{countdown}s</span>...
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => {
                setShowNextCountdown(false);
                onNextEpisode();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white hover:bg-white/90 text-black font-bold text-xs transition active:scale-95 shadow-lg cursor-pointer"
            >
              <Play size={13} fill="currentColor" /> Phát ngay
            </button>
            <button
              onClick={() => {
                setDismissedCountdown(true);
                setShowNextCountdown(false);
              }}
              className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition active:scale-95 cursor-pointer"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

