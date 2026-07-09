import { usePlaybackStore } from "../store/playbackStore";
import { Link } from "react-router-dom";
import type { NormalizedMovie } from "../lib/movieApi";

export function MyListPage() {
  const myList = usePlaybackStore((state) => state.myList);
  const { openDetailModal } = usePlaybackStore();

  return (
    <main className="min-h-screen bg-[#141414] px-4 pt-28 pb-12 sm:px-8 md:px-14 lg:px-16">
      <h1 className="text-3xl font-bold tracking-tight text-white mb-8">My List</h1>
      
      {myList.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {myList.map((movie) => (
            <article
              key={movie.id}
              onClick={() => openDetailModal(movie, `mylist-${movie.id}`)}
              className="group cursor-pointer select-none"
            >
              <div className="relative aspect-video w-full overflow-hidden rounded bg-zinc-900 border border-white/5">
                <img
                  src={movie.backdropUrl || movie.posterUrl}
                  alt={movie.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              </div>
              <p className="mt-2 line-clamp-1 font-semibold text-white group-hover:text-[#46d369] transition duration-200 text-sm">
                {movie.title}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-[#46d369] font-medium">
                <span>{movie.match ?? Math.round(movie.averageRating * 10)}% Match</span>
                <span className="text-white/60">{movie.releaseYear}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <p className="text-zinc-500 text-base">
            You haven't added any titles to your list yet.
          </p>
          <Link
            to="/"
            className="nf-button inline-flex h-10 items-center justify-center rounded bg-white px-6 text-sm font-bold text-black hover:bg-white/80 transition"
          >
            Browse home page
          </Link>
        </div>
      )}
    </main>
  );
}
export default MyListPage;
