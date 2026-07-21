import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Play, Plus, ThumbsUp, Volume2 } from "lucide-react";
import { Badge, Button } from "@streamforge/ui";
import { MovieRow } from "../components/MovieRow";
import { movieApi, type NormalizedMovie } from "../lib/movieApi";
import { decodeHtml } from "../lib/htmlUtils";

const tabs = ["Overview", "Episodes", "Cast", "Reviews", "Similar Titles"] as const;

export function MovieDetailPage() {
  const { slug } = useParams();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const { data } = useQuery({
    queryKey: ["movie", slug],
    enabled: Boolean(slug),
    retry: false,
    queryFn: () => movieApi.getMovieDetail(String(slug))
  });
  const { data: similarData } = useQuery({
    queryKey: ["similar", data?.movie.genres[0]?.slug],
    enabled: Boolean(data?.movie.genres[0]?.slug),
    retry: false,
    queryFn: () => movieApi.getByGenre(String(data?.movie.genres[0]?.slug), 1)
  });
  const movie = data?.movie as NormalizedMovie | undefined;
  const similarTitles = (similarData ?? []).filter((item) => item.id !== movie?.id);
  if (!movie) return <div className="min-h-screen px-10 pt-28">Loading title...</div>;
  return (
    <main className="min-h-screen bg-transparent pb-20">
      <section className="relative min-h-[78vh] overflow-hidden">
        {movie.trailerUrl ? (
          <video className="absolute inset-0 h-full w-full object-cover opacity-45" autoPlay muted loop playsInline poster={movie.backdropUrl} src={movie.trailerUrl} />
        ) : (
          <img src={movie.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        )}
        <div className="cinema-mask absolute inset-0" />
        <div className="relative z-10 max-w-5xl px-4 pt-36 sm:px-8 md:px-14 lg:px-16">
          <h1 className="max-w-3xl text-5xl font-black leading-none md:text-7xl">{movie.title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-semibold text-white/80">
            <span className="text-[#46d369] font-bold">⭐ {movie.averageRating ? movie.averageRating.toFixed(1) : "8.0"} IMDb</span>
            <span>{movie.releaseYear}</span>
            <Badge>{movie.maturityRating.replace("_", "-")}</Badge>
            <span>{movie.runtimeMinutes}m</span>
            <span className="rounded border border-white/40 px-1 text-xs">HD</span>
            <span>{movie.genres.map((g: any) => g.genre?.name ?? g.name).join(", ")}</span>
          </div>
          <p className="synopsis mt-5 max-w-2xl text-lg leading-8 text-white/90">{movie.description}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to={`/watch/${movie.id}`} className="inline-flex h-12 items-center justify-center gap-2 rounded bg-white px-7 text-lg font-bold text-black transition hover:bg-white/85 focus:outline-none focus:ring-2 focus:ring-white/70">
              <Play size={22} fill="currentColor" /> Play
            </Link>
            <Button variant="ghost" className="h-12 rounded-full px-4"><Plus size={18} /> My List</Button>
            <Button variant="ghost" className="h-12 w-12 rounded-full p-0" aria-label="Like"><ThumbsUp size={18} /></Button>
            <Button variant="ghost" className="h-12 w-12 rounded-full p-0" aria-label="Mute preview"><Volume2 size={18} /></Button>
          </div>
        </div>
      </section>
      <section className="px-4 sm:px-8 md:px-14 lg:px-16">
        <div className="flex gap-2 overflow-x-auto border-b border-white/10">
          {tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`px-4 py-3 text-sm font-semibold ${tab === item ? "border-b-2 border-[#e50914] text-white" : "text-white/55 hover:text-white"}`}>{item}</button>)}
        </div>
        <div className="py-8 text-white/80">
          {tab === "Overview" && (
            <div className="grid gap-8 md:grid-cols-[1.4fr_.8fr]">
              <p className="max-w-3xl text-lg leading-8">{decodeHtml(movie.synopsis)}</p>
              <div className="space-y-3 text-sm">
                <p><span className="text-white/45">Cast:</span> {movie.cast?.join(", ") || "Updating"}</p>
                <p><span className="text-white/45">Director:</span> {movie.director || "Updating"}</p>
                <p><span className="text-white/45">This title is:</span> {(movie.tags ?? ["Exciting", "Cinematic"]).join(", ")}</p>
              </div>
            </div>
          )}
          {tab === "Episodes" && <div className="grid gap-3 md:grid-cols-2">{movie.seasons?.flatMap((s) => s.episodes ?? []).map((e, index) => <article key={e.id} className="flex gap-4 border-b border-white/10 bg-white/[.03] p-3 transition hover:bg-white/10"><span className="grid w-8 shrink-0 place-items-center text-2xl text-white/45">{index + 1}</span><img src={e.posterUrl} alt="" loading="lazy" className="h-24 w-36 rounded object-cover" /><div><div className="flex justify-between gap-4"><h3 className="font-bold text-white">{e.title}</h3><span className="text-sm">{e.runtimeMinutes}m</span></div><p className="mt-1 line-clamp-2 text-sm">{decodeHtml(e.synopsis)}</p></div></article>) ?? <p>No episodes for this title.</p>}</div>}
          {tab === "Cast" && <p>{movie.cast?.join(", ") || "Updating"}</p>}
          {tab === "Reviews" && <div className="space-y-3">{(movie.reviews?.length ? movie.reviews : [{ id: "seed-review", body: "A sharp, premium streaming experience with strong discovery, clean detail pages and reliable playback." }]).map((r) => <p key={r.id} className="rounded bg-white/5 p-4">{r.body}</p>)}</div>}
          {tab === "Similar Titles" && <MovieRow title="More Like This" items={similarTitles} compact />}
        </div>
      </section>
    </main>
  );
}
