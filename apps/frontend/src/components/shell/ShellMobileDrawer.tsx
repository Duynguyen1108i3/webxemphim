import { X, User, LogIn, UserPlus, ShieldCheck } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { usePlaybackStore } from "../../store/playbackStore";
import type { AuthUser } from "../../store/authStore";

interface ShellMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  avatarUrl: string | null;
  logout: () => void;
  watchHistory: any[];
  onGenreClick: (slug: string) => void;
}

export function ShellMobileDrawer({
  isOpen,
  onClose,
  user,
  avatarUrl,
  logout,
  watchHistory,
  onGenreClick
}: ShellMobileDrawerProps) {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dark blur background overlay */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Left slide-in drawer */}
          <motion.nav
            className="fixed bottom-0 left-0 top-0 z-[101] w-72 bg-[#141414] p-6 pb-16 shadow-2xl flex flex-col gap-6 overflow-y-auto max-h-[100dvh] overscroll-contain touch-pan-y"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between">
              <span className="brand-logo text-xl font-black text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)] tracking-tight">RytoxGroup</span>
              <button
                onClick={onClose}
                className="nf-icon rounded-full p-2 hover:bg-white/10 text-white/70 hover:text-white"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-4 text-lg font-medium text-white/80">
              <NavLink to="/" onClick={onClose} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-white font-bold underline underline-offset-4" : ""}`}>Home</NavLink>
              <NavLink to="/anime" onClick={onClose} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-white font-bold underline underline-offset-4" : ""}`}>Anime</NavLink>
              <NavLink to="/new-popular" onClick={onClose} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-white font-bold underline underline-offset-4" : ""}`}>New & Popular</NavLink>
              <NavLink to="/my-list" onClick={onClose} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-white font-bold underline underline-offset-4" : ""}`}>My List</NavLink>
              <NavLink to="/search" onClick={onClose} className={({ isActive }) => `hover:text-white transition ${isActive ? "text-white font-bold underline underline-offset-4" : ""}`}>Browse by Languages</NavLink>
              
              {/* Profile section for mobile */}
              <hr className="border-white/10 my-1" />
              {user ? (
                <>
                  <p className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-1">Tài khoản & Hồ sơ</p>
                  <div className="flex flex-col gap-3">
                    {user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                      <button 
                        onClick={() => {
                          onClose();
                          navigate("/admin");
                        }}
                        className="flex items-center gap-2.5 text-left text-sm font-bold text-amber-400 hover:text-amber-300 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-sm"
                      >
                        <ShieldCheck size={18} className="text-amber-400" />
                        <span>Trang quản lý Admin</span>
                      </button>
                    )}

                    <button 
                      onClick={() => {
                        onClose();
                        navigate("/profile");
                      }}
                      className="flex items-center gap-2.5 text-left text-sm font-semibold text-white/60 hover:text-white"
                    >
                      {avatarUrl && (avatarUrl.startsWith("http") || avatarUrl.startsWith("data:") || avatarUrl.startsWith("/") || avatarUrl.includes("/")) ? (
                        <img src={avatarUrl} className="h-6 w-6 rounded object-cover border border-white/20" alt="Avatar" />
                      ) : (
                        <span className={`grid h-6 w-6 place-items-center rounded bg-gradient-to-br ${avatarUrl || "from-blue-500 to-cyan-300"}`}>
                          <span className="text-[10px] font-black text-white">
                            {user?.username ? user.username[0].toUpperCase() : "M"}
                          </span>
                        </span>
                      )}
                      <span>Cài đặt hồ sơ</span>
                    </button>

                    <button 
                      onClick={() => {
                        onClose();
                        logout();
                        navigate("/login");
                      }}
                      className="flex items-center gap-2.5 text-left text-sm font-bold text-white/80 hover:text-white"
                    >
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-1">Tài khoản</p>
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 mb-0.5">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 border border-white/20 text-white/70">
                        <User size={16} />
                      </span>
                      <div className="text-xs">
                        <p className="font-bold text-white">Khách</p>
                        <p className="text-white/40">Đăng nhập để lưu phim</p>
                      </div>
                    </div>
                    <NavLink
                      to="/login"
                      onClick={onClose}
                      className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-bold text-white transition border border-white/25 shadow-md backdrop-blur-md active:scale-95"
                    >
                      <LogIn size={16} />
                      Đăng nhập
                    </NavLink>
                    <NavLink
                      to="/register"
                      onClick={onClose}
                      className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/12 text-sm font-semibold text-white/80 hover:text-white transition border border-white/10 backdrop-blur-md active:scale-95"
                    >
                      <UserPlus size={16} />
                      Đăng ký tài khoản
                    </NavLink>
                  </div>
                </>
              )}
              
              {/* Separator line */}
              <hr className="border-white/10 my-1" />
              
              {/* Featured Genres List */}
              <p className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-1">Featured Genres</p>
              <div className="grid grid-cols-2 gap-2 text-sm font-semibold text-white/60">
                <button onClick={() => onGenreClick("phim-moi-cap-nhat")} className="text-left hover:text-white hover:bg-white/5 py-1.5 px-2.5 rounded transition cursor-pointer">Phim Mới</button>
                <button onClick={() => onGenreClick("phim-le")} className="text-left hover:text-white hover:bg-white/5 py-1.5 px-2.5 rounded transition cursor-pointer">Phim Lẻ</button>
                <button onClick={() => onGenreClick("phim-bo")} className="text-left hover:text-white hover:bg-white/5 py-1.5 px-2.5 rounded transition cursor-pointer">Phim Bộ</button>
                <button onClick={() => onGenreClick("hanh-dong")} className="text-left hover:text-white hover:bg-white/5 py-1.5 px-2.5 rounded transition cursor-pointer">Hành Động</button>
                <button onClick={() => onGenreClick("hoat-hinh")} className="text-left hover:text-white hover:bg-white/5 py-1.5 px-2.5 rounded transition cursor-pointer">Hoạt Hình</button>
                <button onClick={() => onGenreClick("han-quoc")} className="text-left hover:text-white hover:bg-white/5 py-1.5 px-2.5 rounded transition cursor-pointer">Hàn Quốc</button>
              </div>
              
              {/* Watch History List */}
              {watchHistory && watchHistory.length > 0 && (
                <>
                  <hr className="border-white/10 my-1" />
                  <p className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-1">Lịch sử xem</p>
                  <div className="flex flex-col gap-2.5 text-sm font-semibold text-white/60">
                    {watchHistory.slice(0, 3).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          onClose();
                          usePlaybackStore.getState().openPlayback(item.movieData, `card-${item.id}`);
                        }}
                        className="flex items-center gap-2 hover:text-white hover:bg-white/5 py-1 px-1.5 rounded transition cursor-pointer text-left w-full focus:outline-none"
                      >
                        <img src={item.posterUrl || item.backdropUrl} className="w-8 aspect-[2/3] object-cover rounded shadow-md border border-white/10 shrink-0" alt="" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-xs text-white/80">{item.title}</p>
                          <div className="w-full bg-zinc-700 h-1 rounded overflow-hidden mt-1 max-w-[120px]">
                            <div className="bg-white/80 h-full" style={{ width: `${item.progress}%` }} />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}
