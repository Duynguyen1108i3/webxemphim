import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { VideoPlayer } from "../components/VideoPlayer";
import { movieApi } from "../lib/movieApi";

export function WatchPage() {
  const { id } = useParams();
  const [controlsVisible, setControlsVisible] = useState(true);
  const { data, error, isLoading } = useQuery({
    queryKey: ["playback", id],
    enabled: Boolean(id),
    queryFn: () => movieApi.getPlayback(String(id)),
    retry: false
  });
  const title = data?.title ?? id ?? "Now Playing";

  return (
    <main className={`min-h-screen bg-[#0c0d14] text-white ${!controlsVisible ? "cursor-none" : ""}`}>
      {/* Top Scrim Gradient Overlay for Contrast on Bright/White Video Scenes */}
      <div className={`absolute top-0 inset-x-0 h-32 sm:h-40 bg-gradient-to-b from-black/85 via-black/45 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${
        controlsVisible ? "opacity-100" : "opacity-0"
      }`} />

      <div className={`absolute left-4 top-4 z-20 transition-all duration-300 ${
        controlsVisible ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none -translate-y-2"
      }`}>
        <Link to="/" className="player-capsule inline-flex h-10 items-center justify-center gap-2 px-4 text-xs sm:text-sm font-bold text-white transition cursor-pointer">
          <ArrowLeft size={18} /> Back
        </Link>
      </div>
      <div className={`absolute left-4 top-20 z-20 hidden text-shadow md:block transition-all duration-300 ${
        controlsVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}>
        <p className="text-sm uppercase tracking-[.25em] text-white/55">Now Playing</p>
        <h1 className="mt-1 text-3xl font-black">{title}</h1>
      </div>
      {isLoading && <div className="grid min-h-screen place-items-center text-white/70">Loading playback...</div>}
      {error && !data && <div className="grid min-h-screen place-items-center text-white/70">Playback is not available.</div>}
      {data && <VideoPlayer source={data} onControlsVisibilityChange={setControlsVisible} />}
    </main>
  );
}
