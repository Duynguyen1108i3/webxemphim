import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
import { movieApi, type NormalizedMovie } from "../lib/movieApi";

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  
  const { data } = useQuery({
    queryKey: ["search", q],
    retry: false,
    queryFn: async () => ({ results: q.length < 2 ? await movieApi.getNewMovies(1) : await movieApi.searchMovies(q) })
  });
  
  const results = data?.results ?? [];

  return (
    <main className="min-h-screen bg-[#141414] px-4 pt-28 sm:px-8 md:px-14 lg:px-16">
      <label className="flex max-w-2xl items-center gap-3 rounded-sm border border-white/35 bg-black/75 px-3 py-2 transition focus-within:border-white focus-within:bg-black/90">
        <Search className="shrink-0 text-white/80" size={24} />
        <input value={q} onChange={(e) => setSearchParams(e.target.value ? { q: e.target.value } : {})} autoFocus placeholder="Titles, people, genres" className="w-full bg-transparent text-lg font-semibold outline-none placeholder:text-white/45 md:text-xl" />
      </label>
      <h1 className="mt-10 text-2xl font-bold">{q.length > 1 ? `Search results for "${q}"` : "Explore titles"}</h1>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
        {results.map((movie: NormalizedMovie) => (
          <Link key={movie.id} to={`/movie/${movie.slug}`} className="group">
            <img src={movie.posterUrl || movie.backdropUrl} alt={movie.title} loading="lazy" className="aspect-[2/3] rounded bg-zinc-900 object-cover transition duration-300 group-hover:scale-105 group-hover:brightness-75" />
            <p className="mt-2 line-clamp-1 font-semibold">{movie.title}</p>
            <p className="text-sm text-[#46d369]">{movie.match ?? Math.round(movie.averageRating * 10)}% Match</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
