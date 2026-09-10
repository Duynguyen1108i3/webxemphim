import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Flame,
  Film,
  Tv,
  ExternalLink,
  Plus,
  Check,
  X,
  Search,
  Clock,
  Calendar,
  Layers,
  Clapperboard,
  Play
} from "lucide-react";
import { imdbApi, IMDB_GENRES, GENRE_LABELS_VI, type ImdbItem } from "../lib/imdbApi";
import { usePlaybackStore } from "../store/playbackStore";
import { useAuthStore } from "../store/auth";
import type { NormalizedMovie } from "../lib/movieApi";

function imdbItemToNormalized(item: ImdbItem): NormalizedMovie {
  const year = item.year ? parseInt(item.year, 10) : new Date().getFullYear();
  const rating = item.imdbRating ? parseFloat(item.imdbRating) : 8.0;
  return {
    id: item.id,
    slug: item.id,
    title: item.name,
    synopsis: item.description || "",
    posterUrl: item.poster || "",
    backdropUrl: item.background || item.poster || "",
    trailerUrl: null,
    releaseYear: year,
    runtimeMinutes: item.runtime ? parseInt(String(item.runtime).match(/\d+/)?.[0] || "45", 10) : 45,
    maturityRating: "PG_13",
    averageRating: rating,
    genres: (item.genres || []).map((g) => ({ id: g, name: g, slug: g.toLowerCase().replace(/\s+/g, "-") })),
    mediaType: item.type === "series" ? "tv" : "movie",
    imdbId: item.imdb_id,
    name: item.name,
    origin_name: item.name,
    poster: item.poster || "",
    thumb: item.background || item.poster || "",
    year,
    quality: "4K Ultra HD",
    lang: "en",
    episode_current: item.type === "series" ? "TV Series" : "Movie",
    category: [],
    country: [{ id: "us", name: "United States", slug: "us" }],
    description: item.description || "",
    cast: item.cast || [],
    director: item.director?.join(", ") || "",
    tags: item.genres || [],
    match: Math.round(rating * 10),
    reviews: [],
    seasons: []
  };
}

export function NewAndPopularPage() {
  const [sortMode, setSortMode] = useState<"top" | "imdbRating">("top");
  const [mediaType, setMediaType] = useState<"all" | "movie" | "series">("all");
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeItem, setActiveItem] = useState<ImdbItem | null>(null);
  const [trailerOpen, setTrailerOpen] = useState(false);

  const { user } = useAuthStore();
  const { myList, toggleMyList, openAuthModal } = usePlaybackStore();

  const { data: rawItems = [], isLoading, isFetching } = useQuery({
    queryKey: ["imdbCatalog", mediaType, sortMode, selectedGenre],
    queryFn: () =>
      imdbApi.fetchCatalog({
        type: mediaType,
        sort: sortMode,
        genre: selectedGenre
      }),
    staleTime: 5 * 60 * 1000,
  });

  // Client-side quick filter
  const items = useMemo(() => {
    if (!searchQuery.trim()) return rawItems;
    const q = searchQuery.toLowerCase().trim();
    return rawItems.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.genres.some((g) => g.toLowerCase().includes(q)) ||
        (m.year && m.year.includes(q))
    );
  }, [rawItems, searchQuery]);

  const handleToggleMyList = (item: ImdbItem) => {
    if (!user) {
      openAuthModal();
      return;
    }
    const normalized = imdbItemToNormalized(item);
    toggleMyList(normalized);
  };

  const isSaved = (item: ImdbItem) =>
    myList.some((m) => m.id === item.id || m.slug === item.id || (m as any).imdbId === item.id);

  // Close modals on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (trailerOpen) {
          setTrailerOpen(false);
        } else if (activeItem) {
          setActiveItem(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [trailerOpen, activeItem]);

  return (
    <div className="min-h-screen bg-[#07090e] text-white pt-24 pb-20 px-4 sm:px-6 md:px-10 max-w-7xl mx-auto selection:bg-amber-400/30 selection:text-white">
      {/* Header Banner */}
      <section className="relative mb-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-white/5 to-transparent p-6 sm:p-10 backdrop-blur-2xl shadow-2xl">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            IMDb Radar • Xếp Hạng & Thịnh Hành
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4 drop-shadow-[0_2px_12px_rgba(255,255,255,0.25)]">
            New & Popular
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl mb-6">
            Khám phá các tác phẩm điện ảnh và series truyền hình đang dẫn đầu xu hướng hoặc đạt điểm số{" "}
            <span className="text-amber-400 font-bold">IMDb</span> cao nhất toàn cầu. Tra cứu thông tin, diễn viên, đạo diễn và xem trailer chính thức.
          </p>

          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-zinc-400">
            <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
              <Star size={16} className="text-amber-400 fill-amber-400" /> Dữ liệu chuẩn IMDb
            </span>
            <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
              <Flame size={16} className="text-orange-400 fill-orange-400" /> Cập nhật thời gian thực
            </span>
            <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
              <Clapperboard size={16} className="text-blue-400" /> Phim lẻ & Phim bộ
            </span>
          </div>
        </div>
      </section>

      {/* Control Navigation & Filter Dock */}
      <div className="sticky top-20 z-30 mb-8 space-y-4 rounded-2xl border border-white/10 bg-[#07090e]/85 p-3.5 sm:p-4 backdrop-blur-2xl shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Sort Mode Segmented Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full bg-white/5 p-1 border border-white/10 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setSortMode("top")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  sortMode === "top"
                    ? "bg-white/20 text-white shadow-[0_2px_10px_rgba(255,255,255,0.15)] border border-white/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Flame size={15} className={sortMode === "top" ? "text-orange-400 fill-orange-400" : ""} />
                Thịnh hành (Top Trending)
              </button>

              <button
                type="button"
                onClick={() => setSortMode("imdbRating")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  sortMode === "imdbRating"
                    ? "bg-white/20 text-white shadow-[0_2px_10px_rgba(255,255,255,0.15)] border border-white/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Star size={15} className={sortMode === "imdbRating" ? "text-amber-400 fill-amber-400" : ""} />
                Điểm IMDb cao (Top Rated)
              </button>
            </div>

            {/* Media Type Filter */}
            <div className="inline-flex rounded-full bg-white/5 p-1 border border-white/10 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setMediaType("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  mediaType === "all" ? "bg-white/20 text-white font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setMediaType("movie")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  mediaType === "movie" ? "bg-white/20 text-white font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Film size={13} /> Phim lẻ
              </button>
              <button
                type="button"
                onClick={() => setMediaType("series")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  mediaType === "series" ? "bg-white/20 text-white font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Tv size={13} /> Phim bộ
              </button>
            </div>
          </div>

          {/* Quick Search Input */}
          <div className="relative min-w-[220px] max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Lọc nhanh phim, năm..."
              className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm bg-white/5 border border-white/10 rounded-full text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Genre Tags Scrollable Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-1 scrollbar-none">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 mr-2 shrink-0">
            <Layers size={14} /> Thể loại:
          </div>
          {IMDB_GENRES.map((g) => {
            const isSelected = selectedGenre === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGenre(g)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 select-none ${
                  isSelected
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.3)] font-semibold"
                    : "bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                {GENRE_LABELS_VI[g] || g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-2xl bg-white/5 border border-white/10 animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <Film size={48} className="mx-auto text-zinc-500 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Không tìm thấy tác phẩm phù hợp</h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            Thử thay đổi bộ lọc thể loại hoặc từ khóa tìm kiếm để khám phá thêm phim khác trên IMDb.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {items.map((item, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;
            const saved = isSaved(item);

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.02, 0.3) }}
                onClick={() => setActiveItem(item)}
                className="group relative cursor-pointer rounded-2xl overflow-hidden border border-white/10 bg-white/5 p-2 backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:border-white/30 hover:bg-white/10 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col"
              >
                {/* Poster Container */}
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-900">
                  <img
                    src={item.poster}
                    alt={item.name}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=60";
                    }}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Gradient shadow overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Rank Badge */}
                  <div
                    className={`absolute top-2 left-2 flex items-center justify-center font-black rounded-lg px-2 py-0.5 text-xs shadow-md border ${
                      isTop3
                        ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-yellow-200/50 shadow-amber-500/30"
                        : "bg-black/60 text-white/90 border-white/20 backdrop-blur-md"
                    }`}
                  >
                    #{rank}
                  </div>

                  {/* IMDb Rating Badge */}
                  {item.imdbRating && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/75 border border-amber-400/40 text-amber-300 font-extrabold text-[11px] px-2 py-0.5 rounded-lg backdrop-blur-md shadow-lg">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      {item.imdbRating}
                    </div>
                  )}

                  {/* Quick Save Bookmark button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMyList(item);
                    }}
                    title={saved ? "Đã lưu trong My List" : "Thêm vào My List"}
                    className={`absolute bottom-2 right-2 p-2 rounded-full border transition-all duration-200 shadow-md ${
                      saved
                        ? "bg-white text-black border-white"
                        : "bg-black/60 text-white border-white/20 hover:bg-white/20 backdrop-blur-md"
                    }`}
                  >
                    {saved ? <Check size={14} /> : <Plus size={14} />}
                  </button>

                  {/* Media Type pill on bottom-left */}
                  <div className="absolute bottom-2 left-2 text-[10px] uppercase font-bold text-white/70 bg-black/60 px-2 py-0.5 rounded backdrop-blur-md border border-white/10">
                    {item.type === "series" ? "TV Series" : "Movie"}
                  </div>
                </div>

                {/* Movie Info */}
                <div className="mt-2.5 px-1 flex-1 flex flex-col justify-between">
                  <div>
                    <h3
                      className="font-bold text-xs sm:text-sm text-white line-clamp-1 group-hover:text-amber-300 transition-colors"
                      title={item.name}
                    >
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                      {item.year && <span>{item.year}</span>}
                      {item.genres?.[0] && (
                        <>
                          <span>•</span>
                          <span className="line-clamp-1 text-zinc-300">
                            {GENRE_LABELS_VI[item.genres[0]] || item.genres[0]}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* IMDb Detail Modal */}
      <AnimatePresence>
        {activeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-10 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveItem(null)}
              className="fixed inset-0 bg-black/85 backdrop-blur-xl"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/20 bg-[#0c0f17]/95 shadow-[0_25px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl z-10 my-auto"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/90 border border-white/20 transition-all backdrop-blur-md"
              >
                <X size={20} />
              </button>

              {/* Backdrop Header */}
              <div className="relative h-56 sm:h-72 w-full overflow-hidden bg-zinc-900">
                <img
                  src={activeItem.background || activeItem.poster}
                  alt={activeItem.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f17] via-[#0c0f17]/60 to-transparent" />

                {/* Rating Badge Overlay */}
                {activeItem.imdbRating && (
                  <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/75 border border-amber-400/50 text-amber-300 font-black text-sm sm:text-base px-3 py-1.5 rounded-xl backdrop-blur-md shadow-xl">
                    <Star size={16} className="fill-amber-400 text-amber-400" />
                    {activeItem.imdbRating} <span className="text-xs text-white/70 font-normal">/ 10 IMDb</span>
                  </div>
                )}
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8 -mt-16 sm:-mt-20 relative z-10">
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Poster */}
                  <div className="shrink-0 w-28 sm:w-40 aspect-[2/3] rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-zinc-900 self-start">
                    <img
                      src={activeItem.poster}
                      alt={activeItem.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Title & Metadata */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs uppercase font-extrabold text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                        {activeItem.type === "series" ? "TV Series" : "Movie"}
                      </span>
                      {activeItem.year && (
                        <span className="flex items-center gap-1 text-xs text-zinc-300 bg-white/10 px-2.5 py-0.5 rounded-full">
                          <Calendar size={12} /> {activeItem.year}
                        </span>
                      )}
                      {activeItem.runtime && (
                        <span className="flex items-center gap-1 text-xs text-zinc-300 bg-white/10 px-2.5 py-0.5 rounded-full">
                          <Clock size={12} /> {activeItem.runtime}
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
                      {activeItem.name}
                    </h2>

                    {/* Genres */}
                    {activeItem.genres?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {activeItem.genres.map((g) => (
                          <span
                            key={g}
                            className="text-xs font-medium bg-white/5 border border-white/10 text-zinc-300 px-2.5 py-1 rounded-lg"
                          >
                            {GENRE_LABELS_VI[g] || g}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      {/* Trailer Button */}
                      {activeItem.trailers && activeItem.trailers.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setTrailerOpen(true)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-bold text-xs sm:text-sm hover:bg-zinc-200 transition-all shadow-[0_4px_16px_rgba(255,255,255,0.2)]"
                        >
                          <Play size={16} className="fill-black" />
                          Xem Trailer
                        </button>
                      )}

                      {/* Official IMDb Link */}
                      <a
                        href={`https://www.imdb.com/title/${activeItem.imdb_id}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f5c518] text-black font-black text-xs sm:text-sm hover:brightness-110 transition-all shadow-md"
                      >
                        IMDb
                        <ExternalLink size={14} />
                      </a>

                      {/* Save to My List */}
                      <button
                        type="button"
                        onClick={() => handleToggleMyList(activeItem)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm border transition-all ${
                          isSaved(activeItem)
                            ? "bg-white/20 border-white/40 text-white"
                            : "bg-white/5 border-white/15 text-white hover:bg-white/10"
                        }`}
                      >
                        {isSaved(activeItem) ? (
                          <>
                            <Check size={16} className="text-emerald-400" /> Đã lưu vào My List
                          </>
                        ) : (
                          <>
                            <Plus size={16} /> Lưu vào My List
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Synopsis / Description */}
                {activeItem.description && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <h4 className="text-xs uppercase font-extrabold text-zinc-400 tracking-wider mb-2">
                      Tóm tắt cốt truyện
                    </h4>
                    <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                      {activeItem.description}
                    </p>
                  </div>
                )}

                {/* Cast & Crew Details */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4 border-t border-white/10">
                  {activeItem.director && activeItem.director.length > 0 && (
                    <div>
                      <span className="text-zinc-500 font-semibold block mb-1">Đạo diễn:</span>
                      <span className="text-zinc-200 font-medium">
                        {activeItem.director.join(", ")}
                      </span>
                    </div>
                  )}

                  {activeItem.writer && activeItem.writer.length > 0 && (
                    <div>
                      <span className="text-zinc-500 font-semibold block mb-1">Biên kịch:</span>
                      <span className="text-zinc-200 font-medium">
                        {activeItem.writer.join(", ")}
                      </span>
                    </div>
                  )}

                  {activeItem.cast && activeItem.cast.length > 0 && (
                    <div className="sm:col-span-2">
                      <span className="text-zinc-500 font-semibold block mb-1">Diễn viên chính:</span>
                      <span className="text-zinc-200 font-medium">
                        {activeItem.cast.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Embedded YouTube Trailer Modal */}
      <AnimatePresence>
        {trailerOpen && activeItem?.trailers?.[0] && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTrailerOpen(false)}
              className="fixed inset-0 bg-black/90 backdrop-blur-2xl"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative z-10 w-full max-w-4xl aspect-video overflow-hidden rounded-3xl border border-white/20 bg-black shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setTrailerOpen(false)}
                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/70 text-white hover:bg-black border border-white/20 transition-all"
              >
                <X size={20} />
              </button>
              <iframe
                src={`https://www.youtube.com/embed/${activeItem.trailers[0].source}?autoplay=1`}
                title={`${activeItem.name} Official Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
