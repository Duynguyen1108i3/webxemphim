import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { VideoPlayer } from "../components/VideoPlayer";
import { movieApi } from "../lib/movieApi";

export function WatchPage() {
  const { id } = useParams();
  const { data, error, isLoading } = useQuery({
    queryKey: ["playback", id],
    enabled: Boolean(id),
    queryFn: () => movieApi.getPlayback(String(id)),
    retry: false
  });
  const title = data?.title ?? id ?? "Now Playing";

  return (
    <main className="min-h-screen bg-transparent text-white">
      <div className="absolute left-4 top-4 z-20">
        <Link to="/" className="inline-flex h-11 items-center justify-center gap-2 rounded bg-black/45 px-4 text-sm font-semibold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70">
          <ArrowLeft size={18} /> Back
        </Link>
      </div>
      <div className="absolute left-4 top-20 z-20 hidden text-shadow md:block">
        <p className="text-sm uppercase tracking-[.25em] text-white/55">Now Playing</p>
        <h1 className="mt-1 text-3xl font-black">{title}</h1>
      </div>
      {isLoading && <div className="grid min-h-screen place-items-center text-white/70">Loading playback...</div>}
      {error && !data && <div className="grid min-h-screen place-items-center text-white/70">Playback is not available.</div>}
      {data && <VideoPlayer source={data} />}
    </main>
  );
}
