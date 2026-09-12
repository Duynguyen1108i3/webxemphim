import { useEffect, useState } from "react";
import { Button } from "@streamforge/ui";
import { Film, Plus, Search, Edit2, Trash2, Layers, Check, X, Play, Loader2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { api } from "../lib/api";

interface MovieItem {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  releaseYear: number;
  runtimeMinutes: number;
  averageRating: number;
  hlsUrl?: string;
  publishedAt?: string | null;
  _count?: {
    ratings: number;
    reviews: number;
  };
  seasons?: Array<{
    id: string;
    number: number;
    title: string;
    episodes?: Array<{
      id: string;
      number: number;
      title: string;
      runtimeMinutes: number;
      hlsUrl?: string;
      posterUrl?: string;
    }>;
  }>;
}

const sourcePresets = [
  {
    label: "Mux HLS demo",
    title: "Mux Streaming Demo",
    sourceUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    posterUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=900&auto=format&fit=crop&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1600&auto=format&fit=crop&q=80"
  },
  {
    label: "Apple HLS sample",
    title: "BipBop HLS Sample",
    sourceUrl: "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8",
    posterUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=900&auto=format&fit=crop&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1600&auto=format&fit=crop&q=80"
  },
  {
    label: "MDN MP4 sample",
    title: "Flower MP4 Sample",
    sourceUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    posterUrl: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=900&auto=format&fit=crop&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1600&auto=format&fit=crop&q=80"
  }
];

export function MovieManagementPage() {
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Form creation state
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900");
  const [backdropUrl, setBackdropUrl] = useState("https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1600");
  const [creating, setCreating] = useState(false);

  // Modals state
  const [editingMovie, setEditingMovie] = useState<MovieItem | null>(null);
  const [deletingMovie, setDeletingMovie] = useState<MovieItem | null>(null);
  const [managingSeries, setManagingSeries] = useState<MovieItem | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSyncPhimApi = async () => {
    try {
      setIsSyncing(true);
      const res = await api.post<{ success: boolean; totalSynced: number; message: string }>(
        "/admin/movies/sync-phimapi",
        {},
        { timeout: 90_000 }
      );
      showToast(res.data?.message || "Đã đồng bộ phim thật từ PhimAPI thành công!");
      await fetchMovies(search, 1);
      setPage(1);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Không thể đồng bộ từ PhimAPI lúc này.");
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchMovies = async (query = "", pageNum = 1) => {
    setLoading(true);
    try {
      const res = await api.get<{ movies: MovieItem[]; total: number; totalPages: number }>(
        `/admin/movies?search=${encodeURIComponent(query)}&page=${pageNum}&limit=15`
      );
      setMovies(res.data.movies || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalCount(res.data.total || 0);
    } catch (err: any) {
      console.error("fetchMovies error:", err);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies(search, page);
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMovies(search, 1);
  };

  function applyPreset(label: string) {
    const preset = sourcePresets.find((item) => item.label === label);
    if (!preset) return;
    setTitle(preset.title);
    setSourceUrl(preset.sourceUrl);
    setPosterUrl(preset.posterUrl);
    setBackdropUrl(preset.backdropUrl);
  }

  async function createMovie() {
    if (!title.trim()) return;
    setCreating(true);
    try {
      await api.post("/admin/movies", {
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        title,
        synopsis: "Một tác phẩm điện ảnh đặc sắc được tuyển chọn cho hệ thống RytoxGroup.",
        description: "Bộ phim được lưu trữ với định dạng Full HD / HLS mượt mà và phụ đề đa ngôn ngữ.",
        posterUrl,
        backdropUrl,
        releaseYear: new Date().getFullYear(),
        runtimeMinutes: 112,
        maturityRating: "PG_13",
        hlsUrl: sourceUrl || undefined,
        publishedAt: new Date()
      });
      setTitle("");
      setSourceUrl("");
      showToast("Đã thêm phim mới thành công! 🎉");
      setActiveTab("list");
      fetchMovies(search, 1);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Lỗi khi tạo phim mới");
    } finally {
      setCreating(false);
    }
  }

  // Handle Edit Movie
  const handleUpdateMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovie) return;
    try {
      await api.patch(`/admin/movies/${editingMovie.id}`, {
        title: editingMovie.title,
        synopsis: editingMovie.synopsis,
        posterUrl: editingMovie.posterUrl,
        backdropUrl: editingMovie.backdropUrl,
        hlsUrl: editingMovie.hlsUrl,
        releaseYear: Number(editingMovie.releaseYear),
        runtimeMinutes: Number(editingMovie.runtimeMinutes)
      });
      showToast("Đã cập nhật thông tin phim!");
      setEditingMovie(null);
      fetchMovies(search, page);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Lỗi khi cập nhật phim");
    }
  };

  // Handle Delete Movie
  const handleDeleteMovie = async () => {
    if (!deletingMovie) return;
    try {
      await api.delete(`/admin/movies/${deletingMovie.id}`);
      showToast("Đã xóa phim khỏi hệ thống!");
      setDeletingMovie(null);
      fetchMovies(search, page);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Lỗi khi xóa phim");
    }
  };

  return (
    <section className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-emerald-600 text-white px-5 py-3 text-sm font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-300 flex items-center gap-2">
          <Check size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <h2 className="text-2xl md:text-3xl font-black hero-title text-white">Quản Lý Kho Phim & Tập HLS</h2>
          <p className="text-xs md:text-sm text-white/50 mt-0.5">
            Quản lý danh mục phim, các mùa và tập phim bộ, luồng phát HLS .m3u8 thích ứng
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-md">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
              activeTab === "list"
                ? "bg-white text-black shadow-xl"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            Kho phim ({totalCount})
          </button>
          <button
            onClick={handleSyncPhimApi}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg disabled:opacity-50"
            title="Tự động đồng bộ các bộ phim mới nhất từ nguồn PhimAPI về hệ thống"
          >
            {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {isSyncing ? "Đang đồng bộ..." : "Đồng bộ từ PhimAPI"}
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
              activeTab === "create"
                ? "bg-white text-black shadow-xl"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Plus size={14} /> Thêm phim mới
          </button>
        </div>
      </div>

      {/* Tab 1: Movie Catalog List Table */}
      {activeTab === "list" && (
        <div className="space-y-4">
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm phim theo tiêu đề, slug..."
                className="h-10 w-full rounded-full border border-white/10 bg-white/5 pl-10 pr-4 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
              />
            </div>
            <button
              type="submit"
              className="nf-button px-5 py-2 rounded-full bg-white hover:bg-white/90 active:bg-white/80 text-xs font-bold text-black transition shadow-xl cursor-pointer"
            >
              Tìm Kiếm
            </button>
          </form>

          {/* Table Container with Liquid Glass Panel */}
          <div className="liquid-glass-panel rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-white/80">
                <thead className="border-b border-white/10 bg-white/5 text-xs uppercase font-bold text-white/50">
                  <tr>
                    <th className="py-3 px-4">Poster</th>
                    <th className="py-3 px-4">Tiêu đề</th>
                    <th className="py-3 px-4">Năm</th>
                    <th className="py-3 px-4">Đánh giá</th>
                    <th className="py-3 px-4">Tập phim</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-white/40">
                        <Loader2 size={24} className="animate-spin mx-auto mb-2 text-white/60" />
                        Đang tải danh sách phim...
                      </td>
                    </tr>
                  ) : movies.length > 0 ? (
                    movies.map((m) => {
                      const epCount = m.seasons?.flatMap((s) => s.episodes || []).length ?? 0;
                      return (
                        <tr key={m.id} className="hover:bg-white/[0.04] transition">
                          <td className="py-3 px-4">
                            <img
                              src={m.posterUrl}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="h-14 w-10 object-cover rounded shadow-md border border-white/10 bg-[#1e202d]"
                            />
                          </td>
                          <td className="py-3 px-4 font-bold text-white max-w-xs truncate">
                            {m.title}
                            <div className="text-xs font-normal text-white/40 font-mono truncate">{m.slug}</div>
                          </td>
                          <td className="py-3 px-4 text-white/70">{m.releaseYear}</td>
                          <td className="py-3 px-4">
                            {m._count && m._count.ratings > 0 ? (
                              <div className="flex flex-col">
                                <span className="text-amber-400 font-bold flex items-center gap-1">
                                  <span>⭐</span> {m.averageRating.toFixed(1)} <span className="text-white/40 text-[11px] font-normal">/ 10</span>
                                </span>
                                <span className="text-[11px] text-emerald-400 font-medium">
                                  {m._count.ratings} đánh giá thật
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-white/40 italic">Chưa có đánh giá</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {epCount > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs font-semibold">
                                {m.seasons?.length} Mùa ({epCount} tập)
                              </span>
                            ) : (
                              <span className="text-xs text-white/40">Phim lẻ</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setManagingSeries(m)}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition"
                                title="Quản lý tập phim"
                              >
                                <Layers size={15} />
                              </button>
                              <button
                                onClick={() => setEditingMovie({ ...m })}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition"
                                title="Chỉnh sửa phim"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => setDeletingMovie(m)}
                                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 transition"
                                title="Xóa phim"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-white/40">
                        Chưa có phim nào trong danh mục hoặc không tìm thấy kết quả.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-xs text-white/60">
                <span>Trang {page} / {totalPages} (Tổng {totalCount} phim)</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 transition"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 transition"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Create Movie Form */}
      {activeTab === "create" && (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 max-w-4xl space-y-5">
          <h3 className="font-bold text-lg text-white">Thêm phim mới vào hệ thống</h3>
          
          <div className="grid gap-4 md:grid-cols-[220px_1fr_1fr_auto]">
            <select
              onChange={(event) => applyPreset(event.target.value)}
              defaultValue=""
              className="h-11 rounded-xl border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-white/30"
            >
              <option value="" disabled>Chọn mẫu phim có sẵn</option>
              {sourcePresets.map((preset) => <option key={preset.label} value={preset.label}>{preset.label}</option>)}
            </select>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề phim *"
              className="h-11 flex-1 rounded-xl border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-white/30"
            />
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="URL luồng HLS (.m3u8) hoặc MP4"
              className="h-11 flex-1 rounded-xl border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-white/30"
            />
            <button
              type="button"
              onClick={createMovie}
              disabled={!title || creating}
              className="nf-button h-11 px-6 rounded-full bg-white hover:bg-white/90 active:bg-white/80 text-black font-bold text-xs sm:text-sm transition shadow-xl cursor-pointer disabled:opacity-50"
            >
              {creating ? "Đang tạo..." : "Tạo phim"}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs text-white/50 block mb-1">Poster URL (Ảnh dọc)</label>
              <input
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                placeholder="Poster URL"
                className="h-11 w-full rounded-xl border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">Backdrop URL (Ảnh nền ngang)</label>
              <input
                value={backdropUrl}
                onChange={(e) => setBackdropUrl(e.target.value)}
                placeholder="Backdrop URL"
                className="h-11 w-full rounded-xl border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-white/30"
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Movie Modal */}
      {editingMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/20 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white">Chỉnh sửa phim: {editingMovie.title}</h3>
              <button onClick={() => setEditingMovie(null)} className="text-white/50 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateMovie} className="space-y-4">
              <div>
                <label className="text-xs text-white/50 block mb-1">Tiêu đề phim</label>
                <input
                  value={editingMovie.title}
                  onChange={(e) => setEditingMovie({ ...editingMovie, title: e.target.value })}
                  className="w-full h-10 rounded-lg border border-white/15 bg-black px-3 text-sm text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 block mb-1">Năm phát hành</label>
                  <input
                    type="number"
                    value={editingMovie.releaseYear}
                    onChange={(e) => setEditingMovie({ ...editingMovie, releaseYear: Number(e.target.value) })}
                    className="w-full h-10 rounded-lg border border-white/15 bg-black px-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">Thời lượng (phút)</label>
                  <input
                    type="number"
                    value={editingMovie.runtimeMinutes}
                    onChange={(e) => setEditingMovie({ ...editingMovie, runtimeMinutes: Number(e.target.value) })}
                    className="w-full h-10 rounded-lg border border-white/15 bg-black px-3 text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">HLS Playback URL</label>
                <input
                  value={editingMovie.hlsUrl || ""}
                  onChange={(e) => setEditingMovie({ ...editingMovie, hlsUrl: e.target.value })}
                  className="w-full h-10 rounded-lg border border-white/15 bg-black px-3 text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 block mb-1">Poster URL</label>
                  <input
                    value={editingMovie.posterUrl}
                    onChange={(e) => setEditingMovie({ ...editingMovie, posterUrl: e.target.value })}
                    className="w-full h-10 rounded-lg border border-white/15 bg-black px-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">Backdrop URL</label>
                  <input
                    value={editingMovie.backdropUrl}
                    onChange={(e) => setEditingMovie({ ...editingMovie, backdropUrl: e.target.value })}
                    className="w-full h-10 rounded-lg border border-white/15 bg-black px-3 text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingMovie(null)}
                  className="nf-button px-5 py-2 rounded-full glass-button text-xs font-bold text-white transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="nf-button px-6 py-2 rounded-full bg-white text-black hover:bg-white/90 active:bg-white/80 text-xs font-bold transition shadow-xl cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Xác nhận xóa phim</h3>
            <p className="text-sm text-white/70">
              Bạn có chắc chắn muốn xóa bộ phim <strong className="text-white font-bold">{deletingMovie.title}</strong>? Thao tác này sẽ xóa toàn bộ các mùa và tập phim liên quan.
            </p>
            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setDeletingMovie(null)}
                className="nf-button px-5 py-2 rounded-full glass-button text-xs font-bold text-white transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteMovie}
                className="nf-button px-5 py-2 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-xs font-bold text-red-400 transition cursor-pointer"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Seasons & Episodes Modal */}
      {managingSeries && (
        <SeriesManagerModal movie={managingSeries} onClose={() => { setManagingSeries(null); fetchMovies(search, page); }} />
      )}
    </section>
  );
}

function SeriesManagerModal({ movie, onClose }: { movie: MovieItem; onClose: () => void }) {
  const [seasons, setSeasons] = useState(movie.seasons || []);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(seasons[0]?.id || "");
  const [newSeasonTitle, setNewSeasonTitle] = useState("");
  const [epTitle, setEpTitle] = useState("");
  const [epNumber, setEpNumber] = useState(1);
  const [epUrl, setEpUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeSeason = seasons.find((s) => s.id === selectedSeasonId) || seasons[0];

  const handleAddSeason = async () => {
    if (!newSeasonTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const nextNum = seasons.length + 1;
      const res = await api.post(`/admin/movies/${movie.id}/seasons`, {
        number: nextNum,
        title: newSeasonTitle.trim()
      });
      setSeasons([...seasons, { ...res.data.season, episodes: [] }]);
      setNewSeasonTitle("");
      setSelectedSeasonId(res.data.season.id);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Lỗi khi thêm mùa phim");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeasonId || !epTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await api.post(`/admin/seasons/${selectedSeasonId}/episodes`, {
        number: Number(epNumber),
        title: epTitle.trim(),
        runtimeMinutes: 45,
        posterUrl: movie.posterUrl,
        hlsUrl: epUrl || undefined
      });
      const updated = seasons.map((s) => {
        if (s.id === selectedSeasonId) {
          return { ...s, episodes: [...(s.episodes || []), res.data.episode] };
        }
        return s;
      });
      setSeasons(updated);
      setEpTitle("");
      setEpUrl("");
      setEpNumber((prev) => prev + 1);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Lỗi khi thêm tập phim");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEpisode = async (episodeId: string) => {
    try {
      await api.delete(`/admin/episodes/${episodeId}`);
      const updated = seasons.map((s) => ({
        ...s,
        episodes: s.episodes?.filter((e) => e.id !== episodeId)
      }));
      setSeasons(updated);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Lỗi khi xóa tập phim");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-white/20 bg-zinc-950 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h3 className="text-lg font-bold text-white">Quản lý Tập phim: {movie.title}</h3>
            <p className="text-xs text-white/50">Thêm mùa phim và các tập phim bộ</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Seasons Row */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-white/60 uppercase">Mùa phim (Seasons)</label>
              <div className="flex items-center gap-2">
                <input
                  value={newSeasonTitle}
                  onChange={(e) => setNewSeasonTitle(e.target.value)}
                  placeholder="Tiêu đề mùa mới..."
                  className="h-8 rounded-lg border border-white/10 bg-black px-2.5 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleAddSeason}
                  disabled={isSubmitting || !newSeasonTitle.trim()}
                  className="h-8 px-3 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold text-white transition"
                >
                  + Mùa mới
                </button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {seasons.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSeasonId(s.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                    (selectedSeasonId ? selectedSeasonId === s.id : activeSeason?.id === s.id)
                      ? "bg-white text-black shadow-md"
                      : "bg-white/5 text-white/60 hover:bg-white/15"
                  }`}
                >
                  {s.title || `Mùa ${s.number}`} ({s.episodes?.length || 0} tập)
                </button>
              ))}
            </div>
          </div>

          {/* Add Episode Form */}
          {activeSeason && (
            <form onSubmit={handleAddEpisode} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase">Thêm tập mới vào {activeSeason.title || `Mùa ${activeSeason.number}`}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <input
                  type="number"
                  value={epNumber}
                  onChange={(e) => setEpNumber(Number(e.target.value))}
                  placeholder="Tập số"
                  className="h-9 rounded-lg border border-white/10 bg-black px-2.5 text-xs text-white"
                  required
                />
                <input
                  value={epTitle}
                  onChange={(e) => setEpTitle(e.target.value)}
                  placeholder="Tên tập phim *"
                  className="sm:col-span-2 h-9 rounded-lg border border-white/10 bg-black px-2.5 text-xs text-white"
                  required
                />
                <input
                  value={epUrl}
                  onChange={(e) => setEpUrl(e.target.value)}
                  placeholder="HLS Playback URL"
                  className="h-9 rounded-lg border border-white/10 bg-black px-2.5 text-xs text-white"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting || !epTitle.trim()}>
                  Thêm tập phim
                </Button>
              </div>
            </form>
          )}

          {/* Episodes List */}
          <div>
            <h4 className="text-xs font-bold text-white/60 uppercase mb-3">
              Danh sách tập phim ({activeSeason?.episodes?.length || 0})
            </h4>
            <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.02]">
              {activeSeason?.episodes && activeSeason.episodes.length > 0 ? (
                activeSeason.episodes.map((ep) => (
                  <div key={ep.id} className="flex items-center justify-between p-3 hover:bg-white/5 transition">
                    <div className="flex items-center gap-3">
                      <span className="grid h-7 w-7 place-items-center rounded bg-white/10 text-xs font-bold text-white">
                        {ep.number}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-white">{ep.title}</p>
                        <p className="text-[10px] text-white/40">{ep.runtimeMinutes} phút • {ep.hlsUrl ? "Có HLS URL" : "Chưa có nguồn"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteEpisode(ep.id)}
                      className="p-1.5 text-white/40 hover:text-red-400 transition"
                      title="Xóa tập phim"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-white/40">
                  Mùa phim này chưa có tập nào. Hãy thêm tập đầu tiên ở trên!
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 flex justify-end">
          <Button onClick={onClose}>Hoàn tất</Button>
        </div>
      </div>
    </div>
  );
}

