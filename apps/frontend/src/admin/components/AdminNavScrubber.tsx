import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ADMIN_NAV_ITEMS } from "./navItems";
import { LiquidGlassContainer } from "../../components/liquid-glass";

interface AdminNavScrubberProps {
  variant?: "header" | "mobile-dock";
  className?: string;
}

export function AdminNavScrubber({ variant = "header", className = "" }: AdminNavScrubberProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine current active item based on route
  const activeIndex = useMemo(() => {
    const path = location.pathname;
    const idx = ADMIN_NAV_ITEMS.findIndex((item) => {
      if (item.to === "/admin") return path === "/admin";
      return path.startsWith(item.to);
    });
    return idx !== -1 ? idx : 0;
  }, [location.pathname]);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number>(activeIndex);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const startPointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDragged = useRef(false);

  // Sync hovered index when active route changes and not scrubbing
  useEffect(() => {
    if (!isScrubbing) {
      setHoveredIndex(activeIndex);
    }
  }, [activeIndex, isScrubbing]);

  const startScrubbing = (index: number, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();

    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    startPointerPos.current = { x: e.clientX, y: e.clientY };
    hasDragged.current = false;
    setIsScrubbing(true);
    setHoveredIndex(index);

    const onPointerMove = (ev: PointerEvent) => {
      const deltaX = Math.abs(ev.clientX - startPointerPos.current.x);
      const deltaY = Math.abs(ev.clientY - startPointerPos.current.y);

      if (deltaX > 6 || deltaY > 6) {
        hasDragged.current = true;
      }

      let closestIdx = -1;
      let minDistance = Infinity;

      tabRefs.current.forEach((tabEl, i) => {
        if (!tabEl) return;
        const rect = tabEl.getBoundingClientRect();

        if (ev.clientX >= rect.left && ev.clientX <= rect.right) {
          closestIdx = i;
          minDistance = 0;
        } else {
          const dist = Math.min(
            Math.abs(ev.clientX - rect.left),
            Math.abs(ev.clientX - rect.right)
          );
          if (dist < minDistance) {
            minDistance = dist;
            closestIdx = i;
          }
        }
      });

      if (closestIdx !== -1) {
        setHoveredIndex((prev) => {
          if (prev !== closestIdx) {
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              try {
                navigator.vibrate(8);
              } catch {
                // Ignore
              }
            }
            return closestIdx;
          }
          return prev;
        });
      }
    };

    const onPointerUp = () => {
      try {
        target.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      setIsScrubbing(false);

      setHoveredIndex((finalIdx) => {
        const dest = ADMIN_NAV_ITEMS[finalIdx];
        if (dest && dest.to !== location.pathname) {
          navigate(dest.to);
        }
        return finalIdx;
      });
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const displayedIndex = isScrubbing ? hoveredIndex : activeIndex;

  if (variant === "mobile-dock") {
    return (
      <nav
        aria-label="Admin Mobile Bottom Navigation Dock"
        className={`fixed bottom-3 inset-x-0 z-50 mx-auto w-[94%] max-w-[420px] md:hidden select-none touch-none ${className}`}
        style={{ bottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <LiquidGlassContainer
          type="pill"
          className={`relative flex items-center justify-around p-1.5 transition-all duration-300 ${
            isScrubbing
              ? "border border-white/40 shadow-[0_0_28px_rgba(255,255,255,0.25)] ring-1 ring-white/30"
              : "shadow-[0_12px_36px_rgba(0,0,0,0.85)] border border-white/20"
          }`}
        >
          {ADMIN_NAV_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isTarget = displayedIndex === index;

            return (
              <button
                key={item.to}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                onPointerDown={(e) => startScrubbing(index, e)}
                type="button"
                draggable={false}
                className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-full transition-all duration-200 z-10 flex-1 cursor-pointer select-none active:scale-95 focus:outline-none ${
                  isTarget ? "text-white" : "text-white/60 hover:text-white/90"
                }`}
                aria-label={item.label}
              >
                {isTarget && (
                  <motion.div
                    layoutId="active-admin-mobile-dock-pill"
                    className="absolute inset-0 bg-white/20 border border-white/30 rounded-full shadow-[0_4px_16px_rgba(255,255,255,0.18)] z-[-1] backdrop-blur-xl"
                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  />
                )}
                <Icon
                  size={19}
                  className={`transition-transform duration-200 ${
                    isTarget ? "scale-110 text-white" : "text-white/70"
                  }`}
                />
                <span
                  className={`mt-0.5 text-[10px] tracking-tight leading-tight transition-all duration-200 ${
                    isTarget ? "font-black text-white" : "font-medium text-white/60"
                  }`}
                >
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </LiquidGlassContainer>
      </nav>
    );
  }

  return (
    <LiquidGlassContainer
      type="pill"
      aria-label="Admin Main Navigation"
      className={`items-center gap-1.5 text-sm font-semibold p-1.5 rounded-full backdrop-blur-md shadow-inner relative whitespace-nowrap select-none touch-none transition-all duration-300 hidden md:flex ${
        isScrubbing
          ? "border-white/40 shadow-[0_0_24px_rgba(255,255,255,0.22)] ring-1 ring-white/20"
          : "border-white/10"
      } ${className}`}
    >
      {ADMIN_NAV_ITEMS.map((item, index) => {
        const Icon = item.icon;
        const isTarget = displayedIndex === index;

        return (
          <button
            key={item.to}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            onPointerDown={(e) => startScrubbing(index, e)}
            type="button"
            draggable={false}
            className={`relative px-4 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all duration-200 z-10 select-none cursor-pointer text-white/70 hover:text-white flex items-center gap-2 active:scale-95 focus:outline-none ${
              isTarget ? "text-white" : ""
            } ${isScrubbing && !isTarget ? "opacity-50" : "opacity-100"}`}
          >
            {isTarget && (
              <motion.div
                layoutId="active-admin-header-pill"
                className="absolute inset-0 bg-white/20 border border-white/25 rounded-full shadow-[0_3px_14px_rgba(255,255,255,0.15)] z-[-1] backdrop-blur-xl"
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
              />
            )}
            <Icon
              size={15}
              className={`transition-transform duration-200 shrink-0 ${
                isTarget ? "scale-110 text-white" : "text-white/70"
              }`}
            />
            <span
              className={`transition-all duration-200 ${
                isTarget ? "font-bold text-white scale-105" : "font-medium text-white/80"
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </LiquidGlassContainer>
  );
}
