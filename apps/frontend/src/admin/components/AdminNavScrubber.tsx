import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ADMIN_NAV_ITEMS } from "./navItems";

interface AdminNavScrubberProps {
  className?: string;
}

export function AdminNavScrubber({ className = "" }: AdminNavScrubberProps) {
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
    // Only primary mouse button or touch
    if (e.button !== 0) return;

    startPointerPos.current = { x: e.clientX, y: e.clientY };
    hasDragged.current = false;
    setIsScrubbing(true);
    setHoveredIndex(index);

    const onPointerMove = (ev: PointerEvent) => {
      const deltaX = Math.abs(ev.clientX - startPointerPos.current.x);
      const deltaY = Math.abs(ev.clientY - startPointerPos.current.y);

      if (deltaX > 5 || deltaY > 5) {
        hasDragged.current = true;
      }

      // Calculate which tab button is closest to ev.clientX
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
            // Haptic feedback if available
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

  return (
    <div className="overflow-x-auto scrollbar-none max-w-full py-0.5">
      <nav
        aria-label="Admin Main Navigation"
        className={`items-center gap-1 text-xs sm:text-[13px] font-semibold p-1 sm:p-1.5 rounded-full backdrop-blur-md shadow-inner relative whitespace-nowrap select-none touch-none transition-all duration-300 hidden md:flex shrink-0 ${
          isScrubbing
            ? "bg-white/10 border border-white/35 shadow-[0_0_24px_rgba(255,255,255,0.22)] ring-1 ring-white/20"
            : "bg-white/5 border border-white/10"
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
              onClick={() => {
                if (!hasDragged.current) {
                  navigate(item.to);
                }
              }}
              type="button"
              className={`relative px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full transition-all duration-200 z-10 select-none cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                isTarget ? "text-white" : "text-white/70 hover:text-white"
              } ${isScrubbing && !isTarget ? "opacity-50" : "opacity-100"}`}
            >
              {isTarget && (
                <motion.div
                  layoutId="active-admin-nav-pill"
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
      </nav>
    </div>
  );
}
