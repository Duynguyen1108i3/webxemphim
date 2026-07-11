import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
import { movieApi, type NormalizedMovie } from "../lib/movieApi";

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const genre = searchParams.get("genre") ?? "";
  
  const hasTmdb = Boolean(
    localStorage.getItem("streamforge:settings:tmdb_key") || 
    (import.meta.env && import.meta.env.VITE_TMDB_API_KEY)
  );

  const genresList = hasTmdb ? [
    { name: "Hành Động", slug: "action" },
    { name: "Phiêu Lưu", slug: "adventure" },
    { name: "Hoạt Hình", slug: "animation" },
    { name: "Hài Hước", slug: "comedy" },
    { name: "Hình Sự", slug: "crime" },
    { name: "Chính Kịch", slug: "drama" },
    { name: "Viễn Tưởng", slug: "fantasy" },
    { name: "Kinh Dị", slug: "horror" },
    { name: "Tình Cảm", slug: "romance" },
    { name: "Hồi Hộp", slug: "thriller" }
  ] : [
    { name: "Phim Mới", slug: "phim-moi-cap-nhat" },
    { name: "Phim Lẻ", slug: "phim-le" },
    { name: "Phim Bộ", slug: "phim-bo" },
    { name: "Hành Động", slug: "hanh-dong" },
    { name: "Viễn Tưởng", slug: "vien-tuong" },
    { name: "Tình Cảm", slug: "tinh-cam" },
    { name: "Hài Hước", slug: "hai-huoc" },
    { name: "Kinh Dị", slug: "kinh-di" },
    { name: "Cổ Trang", slug: "co-trang" },
    { name: "Hoạt Hình", slug: "hoat-hinh" }
  ];

  const { data, isLoading } = useQuery({
    queryKey: ["search", q, genre],
    retry: false,
    queryFn: async () => {
      if (q.length >= 2) {
        const results = await movieApi.searchMovies(q);
        return { results };
      }
      if (genre) {
        const results = await movieApi.getByGenre(genre, 1);
        return { results };
      }
      const results = await movieApi.getNewMovies(1);
      return { results };
    }
  });
  
  const results = data?.results ?? [];
  const activeGenreName = genresList.find((g) => g.slug === genre)?.name;

  return (
    <main className="min-h-screen bg-[#141414] px-4 pt-28 pb-16 sm:px-8 md:px-14 lg:px-16">
      <label className="flex max-w-2xl items-center gap-3 rounded-sm border border-white/35 bg-black/75 px-3 py-2 transition focus-within:border-white focus-within:bg-black/90">
        <Search className="shrink-0 text-white/80" size={24} />
        <input 
          value={q} 
          onChange={(e) => setSearchParams(e.target.value ? { q: e.target.value } : {})} 
          autoFocus 
          placeholder="Titles, people, genres" 
          className="w-full bg-transparent text-lg font-semibold outline-none placeholder:text-white/45 md:text-xl" 
        />
      </label>

      {/* Genre Pills */}
      <div className="mt-6">
        <p className="text-xs uppercase tracking-wider text-white/40 font-bold mb-3">Browse by Genre</p>
        <div className="flex flex-wrap gap-2">
          {genresList.map((g) => {
            const isActive = genre === g.slug;
            return (
              <button
                key={g.slug}
                onClick={() => setSearchParams({ genre: g.slug })}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition duration-200 cursor-pointer ${
                  isActive 
                    ? "bg-[#e50914] text-white shadow-lg" 
                    : "bg-white/10 text-white/80 hover:bg-white/15 hover:text-white"
                }`}
              >
                {g.name}
              </button>
            );
          })}
          {genre && (
            <button
              onClick={() => setSearchParams({})}
              className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition duration-200 cursor-pointer border border-white/10"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      <h1 className="mt-10 text-2xl font-bold">
        {q.length > 1 
          ? `Search results for "${q}"` 
          : genre 
            ? `Category: ${activeGenreName}` 
            : "Explore titles"
        }
      </h1>

      {isLoading ? (
        <div className="mt-10 text-center text-white/50">Loading titles...</div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
          {results.map((movie: NormalizedMovie) => (
            <Link key={movie.id} to={`/movie/${movie.slug}`} className="group">
              <img src={movie.posterUrl || movie.backdropUrl} alt={movie.title} loading="lazy" className="aspect-[2/3] rounded bg-zinc-900 object-cover transition duration-300 group-hover:scale-105 group-hover:brightness-75" />
              <p className="mt-2 line-clamp-1 font-semibold">{movie.title}</p>
              <p className="text-sm text-[#46d369]">{movie.match ?? Math.round(movie.averageRating * 10)}% Match</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
