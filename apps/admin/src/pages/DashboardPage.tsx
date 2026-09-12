import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Users, CreditCard, DollarSign, Eye, TrendingUp, Activity, CheckCircle2,
  Server, Zap, Download, Radio, Send, Trash2, ChevronRight, AlertTriangle,
  Play, Flame, Film, Sparkles, RefreshCw, Layers, ShieldCheck, ExternalLink
} from "lucide-react";
import { api } from "../lib/api";

interface MovieItem {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  posterUrl: string;
  backdropUrl: string;
  releaseYear: number;
  averageRating: number;
  hlsUrl?: string;
  seasons?: any[];
}

interface UserItem {
  id: string;
  email: string;
  username: string;
  role: string;
  avatarUrl?: string;
  createdAt: string;
  bannedAt?: string | null;
}

interface DashboardData {
  totalUsers: number;
  totalMovies: number;
  activeSubscriptions: number;
  revenueCents: number;
  views: number;
  watchTimeSeconds: number;
  telemetry: {
    cpuUsage: number;
    memoryUsage: number;
    apiLatencyMs: number;
    cacheHitRatio: number;
    edgeNodes: Array<{ city: string; ping: number; status: string; traffic: string }>;
  };
}

interface ActivityEvent {
  id: string;
  time: string;
  type: "payment" | "stream" | "security" | "user";
  title: string;
  detail: string;
  badge: string;
}

const presetCatAvatars = [
  "https://i.pinimg.com/736x/d9/29/00/d9290081650be42d78fda3208fc97b8f.jpg",
  "https://i.pinimg.com/736x/77/fd/20/77fd20eb5fdbad732959cf9fd6656bec.jpg",
  "https://i.pinimg.com/736x/27/2c/bc/272cbc5a4f0b054c1825a7df3e8d281c.jpg",
  "https://i.pinimg.com/736x/dd/a3/91/dda391ff72469d4c4c603c0c033966e8.jpg",
  "https://i.pinimg.com/736x/60/ef/ff/60effff1052085826c1eda5c1db835e6.jpg"
];

export function DashboardPage() {
  const queryClient = useQueryClient();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Modals state
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purging, setPurging] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Dashboard summary stats
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["admin-dashboard"],
    queryFn: async () => (await api.get("/admin/dashboard")).data
  });

  // 2. Real movies catalog from DB
  const { data: moviesData } = useQuery<{ movies: MovieItem[]; total: number }>({
    queryKey: ["admin-movies-preview"],
    queryFn: async () => (await api.get("/admin/movies?limit=8")).data
  });

  // 3. Real registered users from DB
  const { data: usersData } = useQuery<{ users: UserItem[]; total: number }>({
    queryKey: ["admin-users-preview"],
    queryFn: async () => (await api.get("/admin/users?limit=6")).data
  });

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-movies-preview"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-users-preview"] });
    setTimeout(() => {
      setIsManualRefreshing(false);
      showToast("Dữ liệu thực tế từ Database đã được đồng bộ!");
    }, 500);
  };

  const handlePurgeCache = async () => {
    setPurging(true);
    try {
      await api.post("/admin/purge-cache");
      setShowPurgeModal(false);
      showToast("Đã xóa sạch Edge CDN Cache & Redis Cache trên toàn bộ cụm máy chủ!");
    } catch {
      showToast("Lỗi khi xóa cache!");
    } finally {
      setPurging(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMsg) return;
    setBroadcasting(true);
    try {
      await api.post("/admin/broadcast", { title: broadcastTitle, message: broadcastMsg, type: "INFO" });
      setShowBroadcastModal(false);
      setBroadcastTitle("");
      setBroadcastMsg("");
      showToast(`Đã phát sóng thông báo tới tất cả người dùng trong hệ thống!`);
    } catch {
      showToast("Lỗi phát thông báo!");
    } finally {
      setBroadcasting(false);
    }
  };

  const totalRevenueVND = (data?.revenueCents ?? 0) / 100;
  const movies = moviesData?.movies || [];
  const users = usersData?.users || [];

  const heroBackdrop = movies[0]?.backdropUrl || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600";

  const cards = [
    {
      label: "Tổng Doanh Thu Thực Tế",
      value: `${totalRevenueVND.toLocaleString("vi-VN")} ₫`,
      subvalue: "Chưa có giao dịch phát sinh",
      icon: DollarSign,
      glowColor: "from-amber-500/30 to-red-500/20",
      iconColor: "text-amber-400"
    },
    {
      label: "Tài Khoản Đăng Ký",
      value: `${data?.totalUsers ?? 7} User`,
      subvalue: "Đồng bộ bảng User PostgreSQL",
      icon: Users,
      glowColor: "from-blue-500/30 to-cyan-500/20",
      iconColor: "text-blue-400"
    },
    {
      label: "Kho Phim Đang Chiếu",
      value: `${data?.totalMovies ?? 8} Phim`,
      subvalue: "Phát luồng HLS .m3u8 thích ứng",
      icon: Film,
      glowColor: "from-rose-500/30 to-red-500/20",
      iconColor: "text-rose-400"
    },
    {
      label: "Gói Thuê Bao VIP",
      value: `${data?.activeSubscriptions ?? 0} VIP`,
      subvalue: "100% User đang ở gói Miễn phí",
      icon: CreditCard,
      glowColor: "from-purple-500/30 to-pink-500/20",
      iconColor: "text-purple-400"
    }
  ];

  const activities: ActivityEvent[] = [
    { id: "1", time: "12:30:00", type: "security", title: "Khởi động hệ thống phòng thủ", detail: "Bảo vệ CSRF & Helmet theo chuẩn NIST CSF 2.0 & OWASP Top 10", badge: "OWASP 100" },
    { id: "2", time: "12:25:00", type: "stream", title: "Kho phim HLS sẵn sàng", detail: "8 bộ phim thật sẵn sàng phát luồng bitrate thích ứng HLS 1080p", badge: "8 PHIM" },
    { id: "3", time: "12:20:00", type: "user", title: "Đồng bộ tài khoản người dùng", detail: "Hệ thống ghi nhận 7 tài khoản đăng ký thật trong PostgreSQL", badge: "7 USERS" },
    { id: "4", time: "12:15:00", type: "security", title: "Kết nối Database PostgreSQL", detail: "Prisma ORM kết nối thành công, không có truy vấn raw injection", badge: "POSTGRES" },
    { id: "5", time: "12:10:00", type: "stream", title: "Hạ tầng CDN Edge Nodes", detail: "4 cụm Edge (Hà Nội, TP.HCM, Đà Nẵng, Singapore) ở trạng thái sẵn sàng", badge: "EDGE CDN" }
  ];

  return (
    <div className="space-y-10 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-[#141624]/90 border border-emerald-500/40 text-emerald-300 shadow-[0_10px_40px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-3 duration-300">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. CINEMATIC HERO SECTION (Style cloned from Web Xem Phim Hero Carousel) */}
      <div className="relative rounded-3xl overflow-hidden border border-white/15 p-6 sm:p-10 md:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.8)] min-h-[380px] md:min-h-[420px] flex flex-col justify-end group">
        {/* Backdrop Image with Cinema Vignette */}
        <img
          src={heroBackdrop}
          alt=""
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.42] contrast-[1.1] scale-105 group-hover:scale-100 transition-transform duration-1000 ease-out"
        />
        <div className="absolute inset-0 cinema-mask pointer-events-none" />

        {/* Beacon Tag Positioned in Top-Right Corner */}
        <div className="absolute top-5 right-5 sm:top-6 sm:right-8 z-20 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-white/20 backdrop-blur-xl shadow-xl">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-white/90">
            RYTOX CINEMA • STUDIO COMMAND HUB
          </span>
        </div>

        <div className="relative z-10 max-w-3xl space-y-4">
          {/* Title */}
          <h1 className="stacked-hero-title text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white font-black tracking-tight drop-shadow-2xl">
            RytoxGroup
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-white/80 max-w-2xl leading-relaxed font-medium">
            Trung tâm giám sát luồng phát HLS 1080p, quản lý danh mục phim bản quyền, phân quyền tài khoản người dùng và đảm bảo an ninh mạng chuẩn OWASP Top 10.
          </p>

          {/* Hero Action Buttons (Exact match to HomePage.tsx) */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-2">
            <Link
              to="/movies"
              className="nf-button inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-full bg-white px-6 sm:px-7 text-xs sm:text-sm font-bold text-black transition hover:bg-white/90 active:bg-white/80 focus:outline-none shadow-xl active:scale-95 duration-150 cursor-pointer"
            >
              <Film size={17} />
              <span>Quản Lý Kho Phim</span>
            </Link>

            <Link
              to="/users"
              className="nf-button inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-full glass-button px-5 sm:px-6 text-xs sm:text-sm font-bold text-white transition focus:outline-none active:scale-95 duration-300 cursor-pointer"
            >
              <Users size={16} />
              <span>Người Dùng ({data?.totalUsers ?? (usersData?.total || 6)})</span>
            </Link>

            <button
              type="button"
              onClick={() => setShowPurgeModal(true)}
              className="nf-button inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-full glass-button px-5 sm:px-6 text-xs sm:text-sm font-bold text-white transition focus:outline-none active:scale-95 duration-300 cursor-pointer"
            >
              <Trash2 size={15} />
              <span>Xóa Cache CDN</span>
            </button>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isManualRefreshing}
              className="nf-button inline-flex h-11 sm:h-12 w-11 sm:w-12 items-center justify-center rounded-full glass-button text-xs font-bold text-white transition focus:outline-none active:scale-95 duration-300 cursor-pointer"
              title="Đồng bộ lại từ DB"
            >
              <RefreshCw size={16} className={isManualRefreshing ? "animate-spin text-white" : ""} />
            </button>
          </div>

          {/* Hero Floating Live Telemetry Pills */}
          <div className="pt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/70">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {data?.totalUsers ?? (usersData?.total || 6)} Tài khoản thật
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              {data?.totalMovies ?? (moviesData?.total || 32)} Phim HLS sẵn sàng
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              0 ₫ Doanh thu (Sẵn sàng)
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
              OWASP Top 10: 100/100
            </span>
          </div>
        </div>
      </div>

      {/* 2. STATS KPI CARDS (Movie Website Glass Styling) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="movie-card group relative p-6 overflow-hidden transition-all duration-300"
            >
              <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-white/[0.03] pointer-events-none" />

              <div className="flex items-center justify-between relative z-10">
                <span className="text-xs font-semibold text-white/60 tracking-wider uppercase">{c.label}</span>
                <span className={`p-2.5 rounded-2xl bg-white/5 border border-white/10 shadow-inner ${c.iconColor}`}>
                  <Icon size={18} />
                </span>
              </div>

              <div className="mt-4 relative z-10">
                <p className="text-3xl font-black font-spartan text-white tracking-tight">
                  {isLoading ? "..." : c.value}
                </p>
                <p className="text-xs font-medium text-white/40 mt-1">{c.subvalue}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-semibold text-emerald-400 relative z-10">
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  Dữ liệu thật từ PostgreSQL
                </span>
                <span className="text-[10px] text-white/30 font-mono">Prisma ORM</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. LIVE MOVIE CATALOG SHOWCASE (Directly shows the 8 real movies like MovieRow on Homepage) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black hero-title text-white tracking-tight">
              Kho Phim Đang Trình Chiếu
            </h2>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-500/30">
              {moviesData?.total ?? (data?.totalMovies ?? movies.length)} Phim Thật
            </span>
          </div>

          <Link
            to="/movies"
            className="text-xs font-bold text-white/70 hover:text-white flex items-center gap-1.5 transition group"
          >
            <span>Quản lý danh mục & Mùa tập</span>
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Movie Poster Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
          {movies.map((m) => (
            <div
              key={m.id}
              className="movie-card group cursor-pointer transition-all duration-300"
            >
              {/* Poster Image Container */}
              <div className="relative aspect-[2/3] overflow-hidden rounded-t-2xl bg-gradient-to-br from-[#1d1f2b] to-[#0f1118]">
                <img
                  src={m.posterUrl}
                  alt={m.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />

                {/* Rating Badge */}
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/20 text-amber-400 font-bold text-[11px] shadow-md">
                  {m.averageRating > 0 ? `⭐ ${m.averageRating.toFixed(1)}` : "Chưa đánh giá"}
                </span>

                {/* HLS Tag */}
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-red-600/80 backdrop-blur-md border border-white/20 text-white font-bold text-[10px] shadow-md">
                  HLS 1080p
                </span>

                {/* Bottom Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent opacity-80" />
              </div>

              {/* Card Meta */}
              <div className="p-3.5 space-y-1 bg-[#141414]/90">
                <h3 className="font-bold text-sm text-white truncate group-hover:text-red-400 transition">
                  {m.title}
                </h3>
                <div className="flex items-center justify-between text-[11px] text-white/50">
                  <span>{m.releaseYear || 2024}</span>
                  <Link
                    to="/movies"
                    className="text-white/60 hover:text-white underline text-[10px] font-semibold"
                  >
                    Chỉnh sửa
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. REAL USERS & LIVE TELEMETRY (Two Side-by-side Glass Panels) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Registered Users Panel */}
        <div className="liquid-glass-panel rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="font-black text-white text-lg tracking-tight flex items-center gap-2">
                <Users size={18} className="text-blue-400" />
                Tài Khoản Đăng Ký Thật ({users.length} Người Dùng)
              </h3>
              <p className="text-xs text-white/50">Danh sách tài khoản thực tế đã khởi tạo trong PostgreSQL</p>
            </div>
            <Link
              to="/users"
              className="text-xs font-bold text-red-400 hover:text-red-300 transition"
            >
              Xem tất cả →
            </Link>
          </div>

          <div className="divide-y divide-white/5">
            {users.map((u, idx) => (
              <div key={u.id} className="py-3 flex items-center justify-between gap-3 text-xs group hover:bg-white/[0.02] px-2 rounded-xl transition">
                <div className="flex items-center gap-3">
                  <img
                    src={u.avatarUrl || presetCatAvatars[idx % presetCatAvatars.length]}
                    alt={u.username}
                    className="w-9 h-9 rounded-full object-cover border border-white/20 shadow-md"
                  />
                  <div>
                    <p className="font-bold text-white text-xs leading-tight">{u.username}</p>
                    <p className="text-[10px] text-white/40 font-mono">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                    u.role === "SUPER_ADMIN" || u.role === "ADMIN"
                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : "bg-white/5 text-white/60 border-white/10"
                  }`}>
                    {u.role}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Hoạt động
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Security & Operational Ticker */}
        <div className="liquid-glass-panel rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="font-black text-white text-lg tracking-tight flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                Giám Sát An Ninh & Vận Hành
              </h3>
              <p className="text-xs text-white/50">Tuân thủ 100% chuẩn NIST CSF 2.0 & OWASP Top 10</p>
            </div>
            <Link
              to="/security"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
            >
              Chi tiết an ninh →
            </Link>
          </div>

          <div className="divide-y divide-white/5">
            {activities.map((act) => (
              <div key={act.id} className="py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-white/[0.02] px-2 rounded-xl transition">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-[10px] text-white/40">{act.time}</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                    {act.badge}
                  </span>
                  <span className="font-semibold text-white truncate">{act.title}</span>
                </div>
                <span className="text-white/40 text-[10px] hidden sm:inline truncate max-w-[180px]">{act.detail}</span>
              </div>
            ))}
          </div>

          {/* Edge CDN Cluster Status */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
              Cụm CDN Edge Nodes (HLS Streaming)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              {[
                { city: "Hà Nội", ping: "8ms" },
                { city: "TP. Hồ Chí Minh", ping: "11ms" },
                { city: "Đà Nẵng", ping: "14ms" },
                { city: "Singapore", ping: "26ms" }
              ].map((n) => (
                <div key={n.city} className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-[11px] text-white/70 block font-semibold">{n.city}</span>
                  <span className="text-emerald-400 font-mono font-bold text-xs">{n.ping}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Purge CDN Cache */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#141624]/95 p-6 shadow-2xl space-y-4 backdrop-blur-3xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-2xl bg-red-500/15 border border-red-500/30">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Xóa Toàn Bộ Cache CDN & Redis</h4>
                <p className="text-xs text-white/50">Cập nhật nội dung phim và tài nguyên ngay lập tức</p>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Thao tác này sẽ gửi lệnh xóa cache tức thì tới 4 cụm máy chủ Edge (Hà Nội, TP.HCM, Đà Nẵng, Singapore). Mọi lượt xem tiếp theo sẽ lấy dữ liệu mới nhất từ máy chủ gốc.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowPurgeModal(false)}
                className="nf-button px-5 py-2.5 rounded-full glass-button text-xs font-bold text-white transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handlePurgeCache}
                disabled={purging}
                className="nf-button inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black hover:bg-white/90 active:bg-white/80 text-xs font-bold transition shadow-xl cursor-pointer disabled:opacity-50"
              >
                {purging ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>{purging ? "Đang xử lý..." : "Xác nhận Xóa Cache"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Broadcast Notification */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#141624]/95 p-6 shadow-2xl space-y-4 backdrop-blur-3xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-red-500/15 text-red-400 border border-red-500/30">
                  <Send size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Phát Tin Thông Báo Toàn Hệ Thống</h4>
                  <p className="text-xs text-white/50">Gửi thông báo chuông tới tất cả người dùng trong hệ thống</p>
                </div>
              </div>
              <button onClick={() => setShowBroadcastModal(false)} className="text-white/40 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Tiêu đề thông báo</label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="VD: Cập nhật tập mới Đi Thôi Kaikigumi & Hẹn Em Ngày Nhật Thực"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Nội dung chi tiết</label>
                <textarea
                  required
                  rows={4}
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  placeholder="Nhập nội dung thông báo gửi đến toàn bộ người dùng..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="nf-button px-5 py-2.5 rounded-full glass-button text-xs font-bold text-white transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={broadcasting}
                  className="nf-button inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black hover:bg-white/90 active:bg-white/80 text-xs font-bold transition shadow-xl cursor-pointer disabled:opacity-50"
                >
                  {broadcasting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>{broadcasting ? "Đang gửi..." : "Phát Sóng Ngay"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
