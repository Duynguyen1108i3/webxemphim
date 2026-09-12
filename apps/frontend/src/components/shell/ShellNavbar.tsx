import { Bell, Menu, Search, X, Sliders, User, LogIn, UserPlus } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { usePlaybackStore } from "../../store/playbackStore";
import { InteractiveNavScrubber } from "../InteractiveNavScrubber";
import type { NormalizedMovie } from "../../lib/movieApi";
import type { AuthUser } from "../../store/authStore";

interface ShellNavbarProps {
  scrolled: boolean;
  searchExpanded: boolean;
  setSearchExpanded: (val: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  localQ: string;
  setLocalQ: (val: string) => void;
  onClearSearch: () => void;
  onOpenMobileMenu: () => void;
  settingsOpen: boolean;
  toggleSettings: () => void;
  settingsRef: React.RefObject<HTMLDivElement | null>;
  glassness: number;
  onGlassnessChange: (val: number) => void;
  ambientOpacity: number;
  onAmbientOpacityChange: (val: number) => void;
  notificationRef: React.RefObject<HTMLDivElement | null>;
  notificationOpen: boolean;
  toggleNotification: () => void;
  hasNotification: boolean;
  latestMovies: NormalizedMovie[];
  profileRef: React.RefObject<HTMLDivElement | null>;
  isProfileOpen: boolean;
  setIsProfileOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  user: AuthUser | null;
  avatarUrl: string | null;
  logout: () => void;
}

export function ShellNavbar({
  scrolled,
  searchExpanded,
  setSearchExpanded,
  searchInputRef,
  localQ,
  setLocalQ,
  onClearSearch,
  onOpenMobileMenu,
  settingsOpen,
  toggleSettings,
  settingsRef,
  glassness,
  onGlassnessChange,
  ambientOpacity,
  onAmbientOpacityChange,
  notificationRef,
  notificationOpen,
  toggleNotification,
  hasNotification,
  latestMovies,
  profileRef,
  isProfileOpen,
  setIsProfileOpen,
  user,
  avatarUrl,
  logout
}: ShellNavbarProps) {
  const navigate = useNavigate();

  return (
    <header 
      className={`fixed inset-x-0 top-0 z-50 flex h-[68px] items-center justify-between px-4 sm:px-8 md:px-14 lg:px-16 liquid-glass-header ${scrolled ? "scrolled" : ""}`}
    >
      <div className="flex items-center gap-2 sm:gap-7">
        <button
          onClick={onOpenMobileMenu}
          className={`nf-icon rounded-full hover:bg-white/10 ${searchExpanded ? "xl:hidden" : "md:hidden"}`}
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>
        
        <NavLink to="/" className={`brand-logo text-xs font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)] sm:text-sm md:text-base ${searchExpanded ? "hidden md:block" : ""}`}>RytoxGroup</NavLink>
        <InteractiveNavScrubber variant="header" searchExpanded={searchExpanded} />
      </div>

      <nav className="flex items-center gap-2.5 text-sm font-semibold text-white">
        {/* Inline Expanding Search Bar */}
        <div className="search-container">
          <motion.div
            initial={false}
            animate={{
              width: searchExpanded ? (window.innerWidth < 768 ? 160 : 270) : "100%",
              borderColor: searchExpanded ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.12)",
              paddingLeft: searchExpanded ? 12 : 0,
              paddingRight: searchExpanded ? 12 : 0,
            }}
            whileHover={{
              scale: searchExpanded ? 1 : 1.04,
              y: searchExpanded ? 0 : -2,
            }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onMouseEnter={() => {
              setSearchExpanded(true);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            onMouseLeave={() => {
              if (document.activeElement !== searchInputRef.current && !localQ) {
                setSearchExpanded(false);
              }
            }}
            className={`absolute right-0 top-0 z-20 flex h-full items-center overflow-hidden rounded-full border select-none cursor-pointer glass-search ${searchExpanded ? "px-3.5 gap-1.5" : "justify-center gap-0"}`}
          >
            <Search
              size={22}
              className="text-white/80 shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
              onClick={() => {
                setSearchExpanded(!searchExpanded);
                if (!searchExpanded) {
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                } else {
                  onClearSearch();
                }
              }}
            />
            <motion.input
              ref={searchInputRef}
              type="text"
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              onBlur={() => {
                if (!localQ) {
                  setSearchExpanded(false);
                }
              }}
              animate={{
                width: searchExpanded ? "100%" : "0%",
                opacity: searchExpanded ? 1 : 0
              }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              placeholder="Titles, people, genres..."
              className="bg-transparent text-sm text-white focus:outline-none placeholder-white/50 w-full"
              aria-label="Search movies"
            />
            {searchExpanded && localQ && (
              <button
                onClick={onClearSearch}
                className="text-white/60 hover:text-white p-0.5 shrink-0"
                aria-label="Clear search text"
              >
                <X size={14} />
              </button>
            )}
          </motion.div>
        </div>

        {/* Liquid Glass Settings Slider Button */}
        <div ref={settingsRef} className="relative hidden md:block">
          <button
            onClick={toggleSettings}
            className={`glass-capsule glass-capsule--icon ${settingsOpen ? "active" : ""}`}
            aria-label="Liquid Glass Settings"
          >
            <Sliders size={22} />
          </button>
          
          <AnimatePresence>
            {settingsOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ type: "spring", stiffness: 350, damping: 26, mass: 0.85 }}
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl liquid-glass p-4 shadow-2xl z-50"
              >
                <h4 className="text-sm font-bold text-white mb-3">Liquid Glass Controls</h4>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span>Glass Transparency</span>
                      <span className="font-bold text-white">{Math.round(glassness * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={glassness}
                      onChange={(e) => onGlassnessChange(parseFloat(e.target.value))}
                      className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span>Ambient Background</span>
                      <span className="font-bold text-white">{Math.round(ambientOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={ambientOpacity}
                      onChange={(e) => onAmbientOpacityChange(parseFloat(e.target.value))}
                      className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Live Updates Notification Bell Icon */}
        <div ref={notificationRef} className="relative hidden md:block">
          <button
            onClick={toggleNotification}
            className={`glass-capsule glass-capsule--icon ${notificationOpen ? "active" : ""}`}
            aria-label="Notifications"
          >
            <Bell size={22} />
            {hasNotification && (
              <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-red-500 border border-white shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse" />
            )}
          </button>
          
          <AnimatePresence>
            {notificationOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ type: "spring", stiffness: 350, damping: 26, mass: 0.85 }}
                className="absolute right-0 top-full mt-2 w-84 sm:w-96 rounded-2xl liquid-glass py-3 shadow-2xl z-50 border border-white/20"
              >
                <div className="flex items-center justify-between px-4 pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      Trung tâm Thông báo
                    </span>
                    {hasNotification && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-600 text-white">
                        Mới
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-white/50">Rytox Cinema</span>
                </div>

                {/* System announcements & new releases feed */}
                <div className="max-h-96 overflow-y-auto font-sans divide-y divide-white/5">
                  {/* Pinned system feature update */}
                  <div className="p-3.5 hover:bg-white/5 transition text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                        TÍNH NĂNG MỚI
                      </span>
                      <span className="text-[10px] text-white/40">Hôm nay</span>
                    </div>
                    <p className="text-xs font-bold text-white">Đã ra mắt Đánh giá sao, Phụ đề CC & Tự động chuyển tập! ⭐</p>
                    <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                      Bạn có thể chấm điểm 1-10 sao, gửi bình luận và tùy chỉnh bật/tắt phụ đề Vietsub trực tiếp trong Player.
                    </p>
                  </div>

                  {latestMovies.length > 0 ? (
                    latestMovies.map((movie) => (
                      <button
                        key={movie.slug}
                        onClick={() => {
                          toggleNotification();
                          usePlaybackStore.getState().openDetailModal(movie, `notif-${movie.id}`);
                        }}
                        className="flex items-center gap-3 w-full p-3.5 hover:bg-white/5 transition text-left cursor-pointer focus:outline-none group"
                      >
                        <img
                          src={movie.posterUrl || movie.backdropUrl}
                          className="h-14 aspect-[2/3] object-cover rounded-lg border border-white/10 shadow-md shrink-0 group-hover:scale-105 transition-transform"
                          alt=""
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-red-400">PHIM MỚI</span>
                            <span className="text-[10px] text-white/40">• {movie.releaseYear || "2024"}</span>
                          </div>
                          <p className="text-xs font-bold text-white truncate group-hover:text-red-300 transition">{movie.title}</p>
                          <p className="text-[11px] text-white/50 mt-0.5 line-clamp-1">{movie.description || "Đã có bản phát Full HD phụ đề tiếng Việt."}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-xs text-white/40">
                      Không có thông báo mới.
                    </div>
                  )}
                </div>

                <div className="pt-2 px-4 border-t border-white/10 flex justify-between items-center text-[11px] text-white/50">
                  <span>Kho phim được cập nhật mỗi ngày</span>
                  <button
                    onClick={() => {
                      toggleNotification();
                    }}
                    className="text-white/80 hover:text-white font-semibold transition"
                  >
                    Đóng
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Account / Profile Dropdown */}
        <div ref={profileRef} className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsProfileOpen((prev) => !prev);
            }}
            className={`glass-capsule pl-2 pr-3 rounded-full flex items-center gap-2 ${isProfileOpen ? "active" : ""}`}
            aria-label="Account Menu"
          >
            {user ? (
              avatarUrl && (avatarUrl.startsWith("http") || avatarUrl.startsWith("data:") || avatarUrl.startsWith("/") || avatarUrl.includes("/")) ? (
                <img src={avatarUrl} className="h-8 w-8 rounded-full object-cover border border-white/40 shadow-lg ring-2 ring-white/10 hover:scale-105 transition duration-300" alt="Avatar" />
              ) : (
                <span className={`grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br ${avatarUrl || "from-blue-500 to-cyan-300"} border border-white/40 shadow-lg ring-2 ring-white/10 hover:scale-105 transition duration-300`}>
                  <span className="text-xs font-black text-white">
                    {user?.username ? user.username[0].toUpperCase() : "M"}
                  </span>
                </span>
              )
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 border border-white/20 text-white/80 shadow-lg ring-2 ring-white/10 hover:scale-105 transition duration-300">
                <User size={16} />
              </span>
            )}
            <span className={`border-l-4 border-r-4 border-t-4 border-transparent border-t-white transition duration-300 ${isProfileOpen ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ type: "spring", stiffness: 350, damping: 26, mass: 0.85 }}
                className="absolute right-0 top-full mt-2 w-56 origin-top-right overflow-hidden rounded-2xl liquid-glass p-3 shadow-2xl z-[120]"
              >
                {user ? (
                  <>
                    <div className="px-2 py-1.5 mb-1 text-xs font-bold text-white/50 border-b border-white/10 uppercase tracking-wider">
                      Hồ sơ của tôi
                    </div>

                    <NavLink to="/profile" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 transition text-xs font-semibold text-white/70 hover:text-white mt-1">
                      Cài đặt hồ sơ
                    </NavLink>
                    
                    <hr className="border-white/10 my-1.5" />

                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        logout();
                        navigate("/login");
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-white/10 transition text-xs font-bold text-white/80 hover:text-white text-left cursor-pointer"
                    >
                      Đăng xuất khỏi RytoxGroup
                    </button>
                  </>
                ) : (
                  <>
                    <div className="px-2 py-1.5 mb-2 text-xs font-bold text-white/50 border-b border-white/10 uppercase tracking-wider">
                      Tài khoản
                    </div>

                    <NavLink
                      to="/login"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold text-white transition border border-white/30 shadow-[0_4px_16px_rgba(0,0,0,0.3)] backdrop-blur-md mb-2 active:scale-95"
                    >
                      <LogIn size={14} />
                      Đăng nhập
                    </NavLink>

                    <NavLink
                      to="/register"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/12 text-xs font-semibold text-white/80 hover:text-white transition border border-white/10 backdrop-blur-md active:scale-95"
                    >
                      <UserPlus size={14} />
                      Đăng ký tài khoản
                    </NavLink>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>
    </header>
  );
}
