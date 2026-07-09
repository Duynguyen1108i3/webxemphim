import Hls from "hls.js";
import { Maximize, Pause, PictureInPicture2, Play, RotateCcw, RotateCw, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@streamforge/ui";
import type { PlaybackSourceDto } from "@streamforge/shared-types";

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

export function VideoPlayer({ source, onProgress, onPlayStarted }: { source: PlaybackSourceDto & { title?: string }; onProgress?: (seconds: number, duration: number) => void; onPlayStarted?: () => void }) {
  const isEmbed = isEmbedUrl(source.hlsUrl);

  useEffect(() => {
    if (isEmbed) {
      const timer = setTimeout(() => {
        onPlayStarted?.();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isEmbed, onPlayStarted]);

  if (isEmbed) {
    let embedSrc = source.hlsUrl;
    if (embedSrc.includes("youtube.com") || embedSrc.includes("youtu.be")) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = embedSrc.match(regExp);
      const videoId = (match && match[2].length === 11) ? match[2] : null;
      if (videoId) {
        embedSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&rel=0`;
      }
    }

    return (
      <div className="relative h-full w-full bg-black flex items-center justify-center">
        <iframe
          src={embedSrc}
          className="w-full h-full border-none max-h-screen aspect-video"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={source.title || "Movie Player"}
          onLoad={() => onPlayStarted?.()}
        />
      </div>
    );
  }

  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [bufferedProgress, setBufferedProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const isHls = source.hlsUrl.includes(".m3u8");
    
    let hls: Hls | null = null;
    if (isHls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(source.hlsUrl);
      hls.attachMedia(video);
    } else {
      video.src = source.hlsUrl;
    }

    // Explicitly play and handle autoplay rejection (which is standard on mobile)
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

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [source.hlsUrl, onPlayStarted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handler = () => onProgress?.(Math.floor(video.currentTime), Math.floor(video.duration || 0));
    const interval = window.setInterval(handler, 10_000);
    return () => window.clearInterval(interval);
  }, [onProgress]);

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
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !progressBarRef.current || !video.duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const seekTime = (clickX / width) * video.duration;
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

  return (
    <div className="group relative grid min-h-screen place-items-center overflow-hidden bg-black select-none">
      <video ref={videoRef} className="h-full max-h-screen w-full object-contain" autoPlay playsInline poster="" crossOrigin="anonymous">
        {source.subtitles.map((sub) => <track key={sub.url} kind="subtitles" srcLang={sub.language} label={sub.label} src={sub.url} />)}
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
      <div className="absolute inset-x-0 bottom-0 space-y-4 bg-gradient-to-t from-black via-black/80 to-transparent p-4 opacity-100 transition md:p-8 md:opacity-0 md:group-hover:opacity-100">
        
        {/* Clickable Seekbar Wrapper */}
        <div 
          ref={progressBarRef}
          onClick={handleSeek}
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <Button onClick={toggle} className="h-12 w-12 rounded-full p-0" aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause size={22} /> : <Play size={22} fill="currentColor" />}
            </Button>
            
            {/* Rewind 10s */}
            <Button variant="ghost" onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10); }} className="h-11 w-11 rounded-full p-0" aria-label="Rewind 10 seconds">
              <RotateCcw size={18} />
            </Button>

            {/* Forward 10s */}
            <Button variant="ghost" onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10); }} className="h-11 w-11 rounded-full p-0" aria-label="Forward 10 seconds">
              <RotateCw size={18} />
            </Button>

            {/* Skip Intro */}
            {source.introEndSeconds && (
              <Button variant="ghost" onClick={() => { if (videoRef.current) videoRef.current.currentTime = source.introEndSeconds!; }}>
                <SkipForward size={16} /> Skip Intro
              </Button>
            )}

            {/* Volume bar */}
            <div className="flex items-center gap-2 group/volume ml-2">
              <Button variant="ghost" onClick={toggleMute} className="h-11 w-11 rounded-full p-0" aria-label={muted ? "Unmute" : "Mute"}>
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </Button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="h-1 w-16 cursor-pointer rounded-lg bg-zinc-600 accent-[#e50914] appearance-none"
                aria-label="Volume level"
              />
            </div>

            {/* Time display */}
            <div className="text-xs sm:text-sm font-semibold tracking-wider text-zinc-300 ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Speed selection */}
            <select value={speed} onChange={(e) => changeSpeed(Number(e.target.value))} className="rounded bg-white/10 border border-white/10 px-2 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white">
              {[0.5, 1, 1.25, 1.5, 2].map((value) => <option key={value} value={value} className="bg-zinc-900">{value}x</option>)}
            </select>
            
            {/* Picture-in-Picture */}
            <Button variant="ghost" onClick={() => videoRef.current?.requestPictureInPicture()} className="h-11 w-11 rounded-full p-0" aria-label="Picture in picture">
              <PictureInPicture2 size={16} />
            </Button>
            
            {/* Fullscreen */}
            <Button variant="ghost" onClick={() => videoRef.current?.requestFullscreen()} className="h-11 w-11 rounded-full p-0" aria-label="Fullscreen">
              <Maximize size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
