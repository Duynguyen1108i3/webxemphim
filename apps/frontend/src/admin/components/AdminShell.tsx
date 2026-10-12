import React, { useState, useEffect, useRef } from "react";
import { Menu, X, Home, LogOut, User as UserIcon, Sliders, ShieldCheck } from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AmbientBackground } from "../../components/AmbientBackground";
import { Footer } from "../../components/Footer";
import { SEOHead } from "../../components/SEOHead";
import { LiquidGlassButton, LiquidGlassControlsPanel } from "../../components/liquid-glass";
import { AdminNavScrubber } from "./AdminNavScrubber";
import { ADMIN_NAV_ITEMS } from "./navItems";
import { useAuthStore } from "../../store/authStore";
import { apiBaseUrl } from "../../lib/http";

export function AdminShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, avatarUrl, logout } = useAuthStore();

  useEffect(() => {
    if (!user?.id && !user?.email) return;

    const sendPresence = (offline = false) => {
      const payload = JSON.stringify({
        userId: user.id,
        email: user.email,
        username: user.username,
        currentPath: window.location.pathname,
        offline
      });
      if (offline && typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(`${apiBaseUrl}/playback/presence`, blob);
        return;
      }
      fetch(`${apiBaseUrl}/playback/presence`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: payload
      }).catch(() => {});
    };

    sendPresence(false);
    const interval = window.setInterval(() => sendPresence(false), 15_000);
    const handlePageHide = () => sendPresence(true);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [user?.id, user?.email, user?.username]);

  const [glassness, setGlassness] = useState(() => {
    const val = localStorage.getItem("system-glassness");
    return val ? parseFloat(val) : 0.85;
  });
  const [ambientOpacity, setAmbientOpacity] = useState(() => {
    const val = localStorage.getItem("system-ambient-opacity");
    return val ? parseFloat(val) : 0.65;
  });

  const applyGlassProperties = (val: number, ambient: number) => {
    const root = document.documentElement;
    root.style.setProperty("--system-glassness", String(val));
    root.style.setProperty("--glass-blur", `${Math.round(val * 32 + 6)}px`);
    root.style.setProperty("--glass-bg-opacity", `${(0.92 - val * 0.70).toFixed(3)}`);
    root.style.setProperty("--glass-border-opacity", `${(0.08 + val * 0.22).toFixed(3)}`);
    root.style.setProperty("--glass-specular-opacity", `${(0.04 + val * 0.20).toFixed(3)}`);
    root.style.setProperty("--ambient-opacity", String(ambient));
  };

  const handleGlassnessChange = (val: number) => {
    setGlassness(val);
    localStorage.setItem("system-glassness", String(val));
    applyGlassProperties(val, ambientOpacity);
  };

  const handleAmbientOpacityChange = (val: number) => {
    setAmbientOpacity(val);
    localStorage.setItem("system-ambient-opacity", String(val));
    applyGlassProperties(glassness, val);
  };

  useEffect(() => {
    applyGlassProperties(glassness, ambientOpacity);
  }, [glassness, ambientOpacity]);

  useEffect(() => {
    const onScroll = () => {
      const isScrolled = window.scrollY > 16;
      setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(target)) {
        setSettingsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProfileOpen(false);
        setSettingsOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Close mobile drawer & reset scroll on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open (same as AppShell)
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const effectiveAvatar =
    avatarUrl ||
    user?.avatarUrl ||
    "https://i.pinimg.com/736x/d9/29/00/d9290081650be42d78fda3208fc97b8f.jpg";

  const activeNavItem = ADMIN_NAV_ITEMS.find((item) =>
    item.to === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(item.to)
  );
  const pageTitle = activeNavItem ? `${activeNavItem.label} — Quản Trị RytoxGroup` : "Hệ Thống Quản Trị RytoxGroup";

  return (
    <div id="admin-shell-root" className="relative min-h-screen text-white bg-transparent isolate">
      <SEOHead title={pageTitle} noindex={true} />

      {/* Synchronized Ambient Liquid Glass Background (same as AppShell) */}
      <AmbientBackground opacity={ambientOpacity} />

      {/* Top Fixed Navigation Bar (Synchronized with ShellNavbar) */}
      <header
        className={`fixed inset-x-0 top-0 z-50 flex h-[68px] items-center justify-between px-4 sm:px-8 md:px-14 lg:px-16 liquid-glass-header w-full ${
          scrolled ? "scrolled" : ""
        }`}
      >
        {/* Left: Mobile Menu + Brand Logo + Interactive Scrubber Nav Bar */}
        <div className="flex items-center gap-2 sm:gap-7 min-w-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="nf-icon rounded-full hover:bg-white/10 md:hidden p-1.5 sm:p-2 text-white/80 transition shrink-0 cursor-pointer"
            aria-label="Open navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Link to="/admin" className="flex items-center gap-2 group shrink-0">
            <span className="brand-logo text-xs sm:text-sm md:text-base font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]">
              RytoxGroup
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/20 backdrop-blur-md">
              <ShieldCheck size={11} className="text-emerald-400" />
              ADMIN
            </span>
          </Link>

          {/* Interactive Nav Scrubber (Header variant) */}
          <AdminNavScrubber variant="header" />
        </div>

        {/* Right: Live Status + Liquid Glass Settings + Back to Client + Admin Profile Pill */}
        <nav className="flex items-center gap-2.5 text-sm font-semibold text-white shrink-0">
          {/* Live Green Status Dot */}
          <div
            title="Máy chủ quản trị đang hoạt động ổn định"
            className="hidden lg:flex items-center justify-center rounded-full glass-capsule glass-capsule--icon shrink-0 cursor-help"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            </span>
          </div>

          {/* Liquid Glass Settings Slider Button (Synchronized with ShellNavbar) */}
          <div ref={settingsRef} className="relative hidden md:block">
            <LiquidGlassButton
              shape="circle"
              onClick={() => setSettingsOpen((prev) => !prev)}
              className={`glass-capsule glass-capsule--icon text-white cursor-pointer ${settingsOpen ? "active" : ""}`}
              aria-label="Liquid Glass Settings"
            >
              <Sliders size={22} />
            </LiquidGlassButton>

            <AnimatePresence>
              {settingsOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ type: "spring", stiffness: 350, damping: 26, mass: 0.85 }}
                  className="absolute right-0 top-full mt-2 w-72 rounded-2xl liquid-glass p-4 shadow-2xl z-50 space-y-4"
                >
                  <LiquidGlassControlsPanel />

                  <div className="border-t border-white/10 pt-3 space-y-3 text-xs">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-white/70">
                        <span>Ambient Glow Layer</span>
                        <span className="font-bold text-white font-mono">{Math.round(ambientOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={ambientOpacity}
                        onChange={(e) => handleAmbientOpacityChange(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick link to main client using LiquidGlassButton capsule */}
          <LiquidGlassButton
            shape="pill"
            onClick={() => navigate("/")}
            className="glass-capsule px-3.5 sm:px-5 rounded-full text-xs sm:text-sm font-semibold text-white/90 hover:text-white shrink-0 cursor-pointer"
            title="Quay về trang xem phim"
          >
            <Home size={16} className="text-white/85 shrink-0" />
            <span className="hidden sm:inline">Trang Xem Phim</span>
          </LiquidGlassButton>

          {/* Admin Profile Pill (Synchronized with ShellNavbar) */}
          <div ref={profileRef} className="relative shrink-0">
            <LiquidGlassButton
              shape="pill"
              onClick={(e) => {
                e.stopPropagation();
                setProfileOpen((prev) => !prev);
              }}
              className={`glass-capsule pl-2 pr-3 rounded-full flex items-center gap-2 text-white cursor-pointer shrink-0 ${
                profileOpen ? "active" : ""
              }`}
              aria-label="Admin Profile Menu"
            >
              <img
                src={effectiveAvatar}
                alt="Admin Avatar"
                className="h-8 w-8 rounded-full object-cover border border-white/40 shadow-lg ring-2 ring-white/10 hover:scale-105 transition duration-300 shrink-0"
              />
              <span className="hidden xl:inline text-xs font-semibold text-white whitespace-nowrap">
                {user?.username || "Admin"}
              </span>
              <span
                className={`border-l-4 border-r-4 border-t-4 border-transparent border-t-white transition duration-300 shrink-0 ${
                  profileOpen ? "rotate-180" : ""
                }`}
              />
            </LiquidGlassButton>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ type: "spring", stiffness: 350, damping: 26, mass: 0.85 }}
                  className="absolute right-0 top-full mt-2 w-60 origin-top-right overflow-hidden rounded-2xl liquid-glass p-3 shadow-2xl z-[120]"
                >
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="text-xs font-bold text-white">{user?.username || "Admin"}</p>
                    <p className="text-[10px] text-white/50 truncate">{user?.email || "admin@rytoxgroup.com"}</p>
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <ShieldCheck size={10} />
                      {user?.role || "ADMIN"}
                    </span>
                  </div>
                  <div className="pt-2 space-y-1 text-xs">
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition font-semibold"
                    >
                      <UserIcon size={14} />
                      Cài đặt hồ sơ
                    </Link>
                    <Link
                      to="/"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition font-semibold"
                    >
                      <Home size={14} />
                      Quay về trang chủ
                    </Link>
                    <hr className="border-white/10 my-1.5" />
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                        navigate("/login");
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-red-500/15 text-red-300 hover:text-red-200 transition font-bold text-left cursor-pointer"
                    >
                      <LogOut size={14} />
                      Đăng xuất khỏi RytoxGroup
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>
      </header>

      {/* Mobile Slide-in Drawer (Synchronized with ShellMobileDrawer) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.nav
              className="fixed bottom-0 left-0 top-0 z-[101] w-72 bg-[#141414] p-6 pb-20 shadow-2xl flex flex-col gap-5 overflow-y-auto max-h-[100dvh] overscroll-contain touch-pan-y md:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="brand-logo text-xl font-black text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)] tracking-tight">
                    RytoxGroup
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/20">
                    <ShieldCheck size={10} className="text-emerald-400" />
                    ADMIN
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="nf-icon rounded-full p-2 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-2 text-sm font-semibold text-white/80">
                <p className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-1">Hệ Thống Quản Trị</p>
                {ADMIN_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active =
                    location.pathname === item.to ||
                    (item.to !== "/admin" && location.pathname.startsWith(item.to));
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-full transition text-sm font-semibold ${
                        active
                          ? "bg-white text-black font-bold shadow-xl"
                          : "text-white/75 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              <hr className="border-white/10 my-1" />

              {/* Liquid Glass & Ambient Controls for Mobile (Synchronized with ShellMobileDrawer) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sliders size={14} className="text-white/60" />
                  <p className="text-xs uppercase tracking-wider text-white/40 font-semibold">Tùy chỉnh Giao diện</p>
                </div>
                <div className="space-y-3.5 bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-white/70">
                      <span>Độ mờ nền Ambient</span>
                      <span className="font-bold text-white">{Math.round(ambientOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={ambientOpacity}
                      onChange={(e) => handleAmbientOpacityChange(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-white/70">
                      <span>Độ trong suốt Liquid Glass</span>
                      <span className="font-bold text-white">{Math.round(glassness * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={glassness}
                      onChange={(e) => handleGlassnessChange(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>
                </div>
              </div>

              <hr className="border-white/10 my-1" />

              <div className="flex flex-col gap-2.5">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="nf-button flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-white text-black text-xs font-bold shadow-xl"
                >
                  <Home size={16} />
                  Quay về Web Xem Phim
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                    navigate("/login");
                  }}
                  className="nf-button flex items-center justify-center gap-2 py-2.5 px-4 rounded-full glass-button text-xs font-bold text-red-300"
                >
                  <LogOut size={15} />
                  Đăng xuất
                </button>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Main Outlet */}
      <main className="pt-24 px-4 sm:px-8 md:px-14 lg:px-16 pb-28 md:pb-16 max-w-[1600px] mx-auto w-full">
        <Outlet />
      </main>

      {/* Footer synchronized with main website */}
      <Footer />

      {/* Mobile Bottom Navigation Dock (Synchronized with AppShell) */}
      <AdminNavScrubber variant="mobile-dock" />
    </div>
  );
}

