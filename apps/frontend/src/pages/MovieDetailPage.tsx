import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Play, Plus, ThumbsUp, Volume2, Star, Trash2, Send, Check, MessageSquare, Film } from "lucide-react";
import { Badge, Button } from "@streamforge/ui";
import { MovieRow } from "../components/MovieRow";
import { movieApi, type NormalizedMovie } from "../lib/movieApi";
import { decodeHtml } from "../lib/htmlUtils";
import { apiRequest } from "../lib/http";
import { useAuthStore } from "../store/authStore";

const tabs = ["Overview", "Episodes", "Cast", "Reviews", "Similar Titles"] as const;

export function MovieDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");

  // Fetch movie detail
  const { data, refetch: refetchMovie } = useQuery({
    queryKey: ["movie", slug],
    enabled: Boolean(slug),
    retry: false,
    queryFn: () => movieApi.getMovieDetail(String(slug))
  });

  const movie = data?.movie as NormalizedMovie | undefined;

  // Dynamic SEO & OpenGraph Meta
  useEffect(() => {
    if (movie?.title) {
      document.title = `${movie.title} (${movie.releaseYear || ""}) - Xem Phim Online HD | RytoxGroup`;

      let metaDesc = document.querySelector("meta[name='description']");
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", movie.description || movie.synopsis || "Xem phim chất lượng cao tại RytoxGroup.");

      const setMetaTag = (property: string, content: string) => {
        let tag = document.querySelector(`meta[property='${property}']`);
        if (!tag) {
          tag = document.createElement("meta");
          tag.setAttribute("property", property);
          document.head.appendChild(tag);
        }
        tag.setAttribute("content", content);
      };

      setMetaTag("og:title", `${movie.title} - RytoxGroup Cinema`);
      setMetaTag("og:description", movie.description || movie.synopsis || "Xem phim online Full HD miễn phí.");
      setMetaTag("og:image", movie.posterUrl || movie.backdropUrl || "");
      setMetaTag("og:type", "video.movie");
    }
  }, [movie]);

  // Fetch Reviews
  const { data: reviewsData, refetch: refetchReviews } = useQuery({
    queryKey: ["reviews", movie?.id || slug],
    enabled: Boolean(movie?.id || slug),
    queryFn: async () => {
      try {
        const res = await apiRequest<{ reviews: any[] }>(`/movies/${movie?.id || slug}/reviews`);
        return res.reviews || [];
      } catch {
        return movie?.reviews || [];
      }
    }
  });

  // Fetch User's Rating
  const { data: userRatingData, refetch: refetchUserRating } = useQuery({
    queryKey: ["userRating", movie?.id, user?.id],
    enabled: Boolean(movie?.id && user?.id),
    queryFn: async () => {
      try {
        const res = await apiRequest<{ rating: number | null }>(`/movies/${movie!.id}/ratings/me`);
        return res.rating;
      } catch {
        return null;
      }
    }
  });

  // Fetch Similar
  const { data: similarData } = useQuery({
    queryKey: ["similar", data?.movie.genres[0]?.slug],
    enabled: Boolean(data?.movie.genres[0]?.slug),
    retry: false,
    queryFn: () => movieApi.getByGenre(String(data?.movie.genres[0]?.slug), 1)
  });

  // Rating & Review form state
  const [hoverScore, setHoverScore] = useState<number | null>(null);
  const [reviewInput, setReviewInput] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [activeSeasonNumber, setActiveSeasonNumber] = useState(1);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Submit Rating
  const handleRate = async (score: number) => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!movie?.id) return;
    setIsSubmittingRating(true);
    try {
      await apiRequest(`/movies/${movie.id}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: score })
      });
      showToast(`Cảm ơn bạn đã đánh giá ${score}/10 sao! ⭐`);
      refetchUserRating();
      refetchMovie();
    } catch (err: any) {
      showToast(err.message || "Không thể lưu đánh giá");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }
    if (!reviewInput.trim() || reviewInput.trim().length < 2) {
      showToast("Bình luận cần ít nhất 2 ký tự");
      return;
    }
    setIsSubmittingReview(true);
    try {
      await apiRequest(`/movies/${movie?.id || slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reviewInput.trim() })
      });
      setReviewInput("");
      showToast("Đã gửi bình luận thành công! 🎉");
      refetchReviews();
    } catch (err: any) {
      showToast(err.message || "Lỗi khi gửi bình luận");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Delete Review
  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bình luận này?")) return;
    try {
      await apiRequest(`/movies/${movie?.id || slug}/reviews/${reviewId}`, {
        method: "DELETE"
      });
      showToast("Đã xóa bình luận");
      refetchReviews();
    } catch (err: any) {
      showToast(err.message || "Không thể xóa bình luận");
    }
  };

  const similarTitles = (similarData ?? []).filter((item) => item.id !== movie?.id);
  const seasons = movie?.seasons || [];
  const activeSeason = seasons.find((s, idx) => ((s as any).number ?? (idx + 1)) === activeSeasonNumber) || seasons[0];
  const reviewsList = reviewsData && reviewsData.length > 0 ? reviewsData : (movie?.reviews || []);


  if (!movie) return <div className="min-h-screen px-10 pt-28 text-white/70">Loading title...</div>;

  const userRating = userRatingData ?? null;

  return (
    <main className="min-h-screen bg-transparent pb-20">
      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl liquid-glass border border-white/30 px-5 py-3 text-sm font-bold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-300 flex items-center gap-2">
          <Check size={16} className="text-green-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Hero Banner Section */}
      <section className="relative min-h-[78vh] overflow-hidden">
        {movie.trailerUrl ? (
          <video className="absolute inset-0 h-full w-full object-cover opacity-45" autoPlay muted loop playsInline poster={movie.backdropUrl} src={movie.trailerUrl} />
        ) : (
          <img src={movie.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        )}
        <div className="cinema-mask absolute inset-0" />
        <div className="relative z-10 max-w-5xl px-4 pt-36 sm:px-8 md:px-14 lg:px-16">
          <h1 className="max-w-3xl text-5xl font-black leading-none md:text-7xl drop-shadow-lg">{movie.title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-semibold text-white/80">
            {movie.averageRating > 0 ? (
              <span className="text-[#46d369] font-bold">⭐ {movie.averageRating.toFixed(1)} / 10</span>
            ) : (
              <span className="text-white/60 font-medium">⭐ Chưa có đánh giá</span>
            )}
            {userRating && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                Điểm của bạn: {userRating}⭐
              </span>
            )}
            <span>{movie.releaseYear}</span>
            <Badge>{movie.maturityRating.replace("_", "-")}</Badge>
            <span>{movie.runtimeMinutes}m</span>
            <span className="rounded border border-white/40 px-1 text-xs">HD</span>
            <span>{movie.genres.map((g: any) => g.genre?.name ?? g.name).join(", ")}</span>
          </div>
          <p className="synopsis mt-5 max-w-2xl text-lg leading-8 text-white/90">{movie.description}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to={`/watch/${movie.id}`} className="inline-flex h-12 items-center justify-center gap-2 rounded bg-white px-7 text-lg font-bold text-black transition hover:bg-white/85 focus:outline-none focus:ring-2 focus:ring-white/70 shadow-lg">
              <Play size={22} fill="currentColor" /> Play
            </Link>
            <Button variant="ghost" className="h-12 rounded-full px-4"><Plus size={18} /> My List</Button>
            <Button variant="ghost" className="h-12 w-12 rounded-full p-0" aria-label="Like"><ThumbsUp size={18} /></Button>
            <Button variant="ghost" className="h-12 w-12 rounded-full p-0" aria-label="Mute preview"><Volume2 size={18} /></Button>
          </div>
        </div>
      </section>

      {/* Tabs Navigation */}
      <section className="px-4 sm:px-8 md:px-14 lg:px-16 mt-6">
        <div className="flex gap-2 overflow-x-auto border-b border-white/10">
          {tabs.map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`px-4 py-3 text-sm font-semibold transition cursor-pointer ${
                tab === item ? "border-b-2 border-[#e50914] text-white font-bold" : "text-white/55 hover:text-white"
              }`}
            >
              {item === "Overview" ? "Tổng quan" :
               item === "Episodes" ? `Tập phim ${seasons.length > 0 ? `(${seasons.flatMap(s => s.episodes || []).length})` : ""}` :
               item === "Cast" ? "Diễn viên" :
               item === "Reviews" ? `Đánh giá (${reviewsList.length})` :
               "Phim tương tự"}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="py-8 text-white/80">
          {/* 1. Overview Tab */}
          {tab === "Overview" && (
            <div className="grid gap-8 md:grid-cols-[1.4fr_.8fr]">
              <p className="max-w-3xl text-lg leading-8">{decodeHtml(movie.synopsis)}</p>
              <div className="space-y-3 text-sm rounded-2xl liquid-glass p-5 border border-white/10">
                <p><span className="text-white/45 font-bold">Cast:</span> {movie.cast?.join(", ") || "Đang cập nhật"}</p>
                <p><span className="text-white/45 font-bold">Director:</span> {movie.director || "Đang cập nhật"}</p>
                <p><span className="text-white/45 font-bold">Tags:</span> {(movie.tags ?? ["Hấp dẫn", "Kịch tính", "Điện ảnh"]).join(", ")}</p>
                <p><span className="text-white/45 font-bold">Độ phân giải:</span> Full HD 1080p, HLS/Dash Streaming</p>
              </div>
            </div>
          )}

          {/* 2. Episodes Tab (Phim bộ / Series) */}
          {tab === "Episodes" && (
            <div className="space-y-6">
              {seasons.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <span className="text-xs font-bold text-white/50 uppercase mr-2">Mùa phim:</span>
                  {seasons.map((s, idx) => {
                    const sNum = (s as any).number ?? (idx + 1);
                    const isSelected = activeSeason ? ((activeSeason as any).number ?? 1) === sNum : idx === 0;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActiveSeasonNumber(sNum)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                          isSelected ? "bg-white text-black shadow-md" : "bg-white/10 text-white/70 hover:bg-white/20"
                        }`}
                      >
                        {s.title || `Mùa ${sNum}`}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                {activeSeason?.episodes && activeSeason.episodes.length > 0 ? (
                  activeSeason.episodes.map((e, index) => {
                    const epNum = (e as any).episodeNumber ?? (e as any).number ?? (index + 1);
                    return (
                      <article
                        key={e.id}
                        className="group flex gap-4 rounded-xl border border-white/10 bg-white/[.03] p-3 transition hover:bg-white/10 hover:border-white/25"
                      >
                        <span className="grid w-8 shrink-0 place-items-center text-2xl font-black text-white/35 group-hover:text-white transition">
                          {epNum}
                        </span>
                        <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded">
                          <img src={e.posterUrl || movie.posterUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                          <Link
                            to={`/watch/${movie.id}?episode=${e.id}`}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition"
                            aria-label={`Phát tập ${epNum}`}
                          >
                            <Play size={24} fill="currentColor" className="text-white" />
                          </Link>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between gap-4">
                            <h3 className="font-bold text-white truncate group-hover:text-red-400 transition">{e.title}</h3>
                            <span className="text-xs text-white/60 shrink-0">{e.runtimeMinutes}m</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-white/65">{decodeHtml(e.synopsis)}</p>
                          <Link
                            to={`/watch/${movie.id}?episode=${e.id}`}
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-white/90 hover:text-white"
                          >
                            <Play size={12} fill="currentColor" /> Xem tập này
                          </Link>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p className="text-white/50 text-sm py-8">Phim lẻ hoặc chưa có danh sách tập phim.</p>
                )}
              </div>

            </div>
          )}

          {/* 3. Cast Tab */}
          {tab === "Cast" && (
            <div className="space-y-4 max-w-2xl">
              <h3 className="text-lg font-bold text-white">Dàn diễn viên & Đội ngũ sản xuất</h3>
              <p className="text-base text-white/85 leading-7">{movie.cast?.join(", ") || "Đang cập nhật thông tin diễn viên."}</p>
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-white/60">Đạo diễn: <span className="text-white font-semibold">{movie.director || "Đang cập nhật"}</span></p>
              </div>
            </div>
          )}

          {/* 4. Interactive Reviews & Ratings Tab */}
          {tab === "Reviews" && (
            <div className="max-w-4xl space-y-8">
              {/* Star Rating Interactive Panel */}
              <div className="rounded-2xl liquid-glass p-6 border border-white/15 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Star size={20} className="text-amber-400 fill-amber-400" />
                      Đánh giá khán giả {movie.averageRating > 0 ? `(${movie.averageRating.toFixed(1)}/10)` : "(Chưa có đánh giá)"}
                    </h3>
                    <p className="text-xs text-white/50 mt-1">
                      {userRating ? `Bạn đã cho ${userRating}/10 sao. Bạn có thể nhấn để thay đổi.` : "Hãy chấm điểm cho bộ phim này để giúp cộng đồng có thêm góc nhìn!"}
                    </p>
                  </div>
                  
                  {/* 10-Star Picker */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
                      const active = (hoverScore !== null ? star <= hoverScore : userRating !== null ? star <= userRating : false);
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverScore(star)}
                          onMouseLeave={() => setHoverScore(null)}
                          onClick={() => handleRate(star)}
                          disabled={isSubmittingRating}
                          className="p-1 text-white/25 hover:scale-125 transition-transform cursor-pointer focus:outline-none"
                          title={`Chấm ${star}/10 sao`}
                        >
                          <Star
                            size={20}
                            className={active ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" : "text-white/25"}
                          />
                        </button>
                      );
                    })}
                    <span className="ml-2 font-mono font-bold text-sm text-amber-400 min-w-[28px]">
                      {hoverScore !== null ? `${hoverScore}★` : userRating ? `${userRating}★` : ""}
                    </span>
                  </div>
                </div>

                {/* Review Form */}
                <form onSubmit={handleSubmitReview} className="mt-5">
                  <div className="flex items-start gap-3">
                    <img
                      src={user?.avatarUrl || "/avatars/cat-1.jpg"}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover border border-white/30 shrink-0"
                    />
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={reviewInput}
                        onChange={(e) => setReviewInput(e.target.value)}
                        placeholder={user ? "Viết cảm nhận của bạn về nội dung, diễn xuất hay âm nhạc..." : "Đăng nhập để tham gia bình luận..."}
                        rows={3}
                        maxLength={1000}
                        disabled={!user || isSubmittingReview}
                        className="w-full rounded-xl border border-white/15 bg-black/40 p-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40"
                      />
                      <div className="flex items-center justify-between text-xs text-white/50">
                        <span>{reviewInput.length}/1000 ký tự</span>
                        {user ? (
                          <button
                            type="submit"
                            disabled={isSubmittingReview || !reviewInput.trim()}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-xs font-bold text-black transition hover:bg-white/90 disabled:opacity-40 cursor-pointer active:scale-95 shadow-md"
                          >
                            <Send size={12} /> Gửi đánh giá
                          </button>
                        ) : (
                          <Link
                            to="/login"
                            className="inline-flex items-center gap-1.5 rounded-full bg-white/20 hover:bg-white/30 px-4 py-1.5 text-xs font-bold text-white transition active:scale-95"
                          >
                            Đăng nhập để bình luận
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              {/* Reviews List */}
              <div className="space-y-4">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquare size={16} /> Bình luận từ người xem ({reviewsList.length})
                </h4>

                {reviewsList.length > 0 ? (
                  reviewsList.map((r: any) => {
                    const isOwner = user && (r.userId === user.id || user.role === "ADMIN" || user.role === "SUPER_ADMIN");
                    return (
                      <article
                        key={r.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 transition hover:bg-white/[0.06]"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-3">
                            <img
                              src={r.user?.avatarUrl || "/avatars/cat-1.jpg"}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover border border-white/25"
                            />
                            <div>
                              <span className="font-bold text-sm text-white">{r.user?.username || "Thành viên Rytox"}</span>
                              <span className="text-xs text-white/40 ml-2">
                                {r.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : "Gần đây"}
                              </span>
                            </div>
                          </div>

                          {isOwner && (
                            <button
                              onClick={() => handleDeleteReview(r.id)}
                              className="text-white/40 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                              title="Xóa bình luận"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-white/80 leading-6 pl-11">{decodeHtml(r.body)}</p>
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/45">
                    Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ cảm nghĩ về bộ phim!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Similar Titles Tab */}
          {tab === "Similar Titles" && <MovieRow title="More Like This" items={similarTitles} compact />}
        </div>
      </section>
    </main>
  );
}

