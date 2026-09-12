import React, { useState, useEffect, useRef } from "react";
import { ExternalLink, Menu, X, Home, Shield, LogOut, User as UserIcon } from "lucide-react";
import { NavLink, Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LiquidGlassBackground } from "../../components/LiquidGlassBackground";
import { AdminNavScrubber } from "./AdminNavScrubber";
import { ADMIN_NAV_ITEMS } from "./navItems";
import { useAuthStore } from "../../store/authStore";

export function AdminShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, avatarUrl, logout } = useAuthStore();

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
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const effectiveAvatar = avatarUrl || user?.avatarUrl || "https://i.pinimg.com/736x/d9/29/00/d9290081650be42d78fda3208fc97b8f.jpg";

  return (
    <div className="relative min-h-screen text-white bg-transparent">
      {/* Real Animated Liquid Glass Background */}
      <LiquidGlassBackground />

      {/* Top Fixed Navigation Bar */}
      <header
        className={`fixed inset-x-0 top-0 z-50 flex h-[68px] items-center justify-between px-3 sm:px-6 md:px-8 liquid-glass-header w-full ${
          scrolled ? "scrolled" : ""
        }`}
      >
        {/* Left: Brand Logo + Interactive Scrubber Nav Bar */}
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-5 min-w-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="nf-icon rounded-full hover:bg-white/10 md:hidden p-2 text-white/80 transition shrink-0"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Link to="/admin" className="flex items-center gap-2 group shrink-0">
            <span className="brand-logo text-base sm:text-lg lg:text-xl font-black tracking-tight text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.3)]">
              RytoxGroup
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/20">
              ADMIN
            </span>
          </Link>

          {/* Interactive Nav Scrubber */}
          <AdminNavScrubber />
        </div>

        {/* Right: Status Dot + Back to Client + Admin Profile Pill */}
        <div className="flex items-center gap-2 sm:gap-2.5 text-sm font-semibold text-white shrink-0">
          {/* Live Green Status Dot */}
          <div
            title="Máy chủ đang hoạt động bình thường"
            className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shrink-0 cursor-help"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            </span>
          </div>

          {/* Quick link to main client */}
          <Link
            to="/"
            className="glass-capsule flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white/90 hover:text-white shrink-0 h-9"
            title="Quay về trang xem phim"
          >
            <Home size={13} className="text-white/70" />
            <span className="hidden sm:inline">Trang Xem Phim</span>
          </Link>

          {/* Admin Profile Pill */}
          <div ref={profileRef} className="relative shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setProfileOpen((prev) => !prev);
              }}
              className={`glass-capsule pl-1.5 pr-2.5 sm:pr-3 rounded-full flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 h-9 ${profileOpen ? "active" : ""}`}
              aria-label="Admin Profile Menu"
            >
              <img
                src={effectiveAvatar}
                alt="Admin Avatar"
                className="h-7 w-7 rounded-full object-cover border border-white/40 shadow-lg ring-2 ring-white/10 hover:scale-105 transition duration-300 shrink-0"
              />
              <span className="text-xs font-semibold text-white whitespace-nowrap">
                {user?.username || "Admin"}
              </span>
              <span className={`border-l-4 border-r-4 border-t-4 border-transparent border-t-white transition duration-300 shrink-0 ${profileOpen ? "rotate-180" : ""}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 origin-top-right overflow-hidden rounded-2xl liquid-glass p-3 shadow-2xl z-[120] animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="text-xs font-bold text-white">{user?.username || "Admin"}</p>
                  <p className="text-[10px] text-white/40 truncate">{user?.email || "admin@rytoxgroup.com"}</p>
                  <span className="inline-block mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {user?.role || "ADMIN"}
                  </span>
                </div>
                <div className="pt-2 space-y-1 text-xs">
                  <Link
                    to="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition font-medium"
                  >
                    <UserIcon size={14} />
                    Hồ sơ xem phim
                  </Link>
                  <Link
                    to="/"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition font-medium"
                  >
                    <Home size={14} />
                    Quay về trang chủ
                  </Link>
                  <hr className="border-white/10 my-1" />
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                      navigate("/login");
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-300 hover:text-red-200 transition font-medium text-left"
                  >
                    <LogOut size={14} />
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="flex flex-col h-full p-6 pt-20 overflow-y-auto">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white"
            >
              <X size={20} />
            </button>
            <p className="text-xs uppercase tracking-wider text-white/40 font-bold mb-4">Admin Navigation</p>
            <div className="flex flex-col gap-2">
              {ADMIN_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to || (item.to !== "/admin" && location.pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-semibold ${
                      active ? "bg-white/20 text-white font-bold" : "text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <hr className="border-white/10 my-6" />

            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-sm font-semibold"
            >
              <Home size={18} />
              Quay về Web Xem Phim
            </Link>
          </div>
        </div>
      )}

      {/* Main Outlet */}
      <main className="pt-24 px-3 sm:px-6 md:px-8 pb-16 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
