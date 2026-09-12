import React, { useState, useEffect } from "react";
import { ExternalLink, Menu, X } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LiquidGlassBackground } from "./LiquidGlassBackground";
import { AdminNavScrubber } from "./AdminNavScrubber";
import { ADMIN_NAV_ITEMS } from "./navItems";

export function AdminShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = React.useRef<HTMLDivElement>(null);
  const location = useLocation();

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

  return (
    <div className="relative min-h-screen text-white bg-transparent">
      {/* Real Animated Liquid Glass Background */}
      <LiquidGlassBackground />

      {/* Top Fixed Navigation Bar - Exact style as Web Xem Phim */}
      <header
        className={`fixed inset-x-0 top-0 z-50 flex h-[68px] items-center justify-between px-3 sm:px-6 md:px-8 liquid-glass-header w-full ${
          scrolled ? "scrolled" : ""
        }`}
      >
        {/* Left: Brand Logo + Interactive Scrubber Nav Bar side-by-side */}
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-5 min-w-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="nf-icon rounded-full hover:bg-white/10 md:hidden p-2 text-white/80 transition shrink-0"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <NavLink to="/" className="flex items-center gap-2 group shrink-0">
            <span className="brand-logo text-base sm:text-lg lg:text-xl font-black tracking-tight text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.3)]">
              RytoxGroup
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/20">
              STUDIO
            </span>
          </NavLink>

          {/* Interactive Nav Scrubber (Draggable & Scrubbable with liquid glass physics) */}
          <AdminNavScrubber />
        </div>

        {/* Right: Green Status Dot Only + Quick Link + Admin Profile Pill */}
        <div className="flex items-center gap-2 sm:gap-2.5 text-sm font-semibold text-white shrink-0">
          {/* Live Green Status Dot Only (No text, pulsing radar ring) */}
          <div
            title="Hệ thống 100% SLA - Máy chủ đang hoạt động bình thường"
            className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shrink-0 cursor-help"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            </span>
          </div>

          {/* Quick link to main client */}
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-capsule flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white/90 hover:text-white shrink-0 h-9"
            title="Mở giao diện Web Khách"
          >
            <span className="hidden sm:inline">Web Khách</span>
            <ExternalLink size={13} className="text-white/60" />
          </a>

          {/* Admin Profile Cat Avatar Pill - Never clipped */}
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
                src="https://i.pinimg.com/736x/d9/29/00/d9290081650be42d78fda3208fc97b8f.jpg"
                alt="Admin Cat"
                className="h-7 w-7 rounded-full object-cover border border-white/40 shadow-lg ring-2 ring-white/10 hover:scale-105 transition duration-300 shrink-0"
              />
              <span className="text-xs font-semibold text-white whitespace-nowrap">Duy Nguyen</span>
              <span className={`border-l-4 border-r-4 border-t-4 border-transparent border-t-white transition duration-300 shrink-0 ${profileOpen ? "rotate-180" : ""}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 origin-top-right overflow-hidden rounded-2xl liquid-glass p-3 shadow-2xl z-[120] animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="text-xs font-bold text-white">Duy Nguyen</p>
                  <p className="text-[10px] text-white/40 truncate">admin@rytox.group</p>
                  <span className="inline-block mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15">
                    ROOT ADMIN
                  </span>
                </div>
                <div className="pt-2 space-y-1 text-xs">
                  <a
                    href="http://localhost:5173/profile"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition font-medium"
                  >
                    Hồ sơ xem phim
                  </a>
                  <a
                    href="http://localhost:5173"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition font-medium"
                  >
                    Quay về trang chủ
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-2xl pt-20 px-6 pb-6 animate-in fade-in duration-200">
          <nav className="space-y-2">
            {ADMIN_NAV_ITEMS.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-full font-bold text-sm transition ${
                    isActive
                      ? "bg-white text-black shadow-xl"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content Area: Centered, Spacious, Cinema Atmosphere */}
      <main className="pt-[80px] pb-16 px-4 sm:px-8 md:px-12 max-w-[1440px] mx-auto w-full min-h-screen relative z-10">
        <Outlet />
      </main>
    </div>
  );
}

