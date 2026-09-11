import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bookmark, Film, Flame, Globe, Home } from "lucide-react";

export interface NavScrubberItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const MAIN_NAV_ITEMS: NavScrubberItem[] = [
  { to: "/", label: "Home", shortLabel: "Home", icon: Home },
  { to: "/anime", label: "Anime", shortLabel: "Anime", icon: Film },
  { to: "/new-popular", label: "New & Popular", shortLabel: "Mới & Hot", icon: Flame },
  { to: "/my-list", label: "My List", shortLabel: "Danh sách", icon: Bookmark },
  { to: "/search", label: "Browse by Languages", shortLabel: "Ngôn ngữ", icon: Globe },
];

interface InteractiveNavScrubberProps {
  variant?: "header" | "mobile-dock";
  className?: string;
  searchExpanded?: boolean;
}

export function InteractiveNavScrubber({
  variant = "header",
  className = "",
  searchExpanded = false,
}: InteractiveNavScrubberProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine current active item based on route
  const activeIndex = useMemo(() => {
    const path = location.pathname;
    const idx = MAIN_NAV_ITEMS.findIndex((item) => {
      if (item.to === "/") return path === "/";
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
    // Only primary button (left click or touch)
    if (e.button !== 0) return;

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
            // Haptic vibration feedback on mobile when sliding between tabs
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              try {
                navigator.vibrate(8);
              } catch {
                // Ignore vibration errors
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
        const dest = MAIN_NAV_ITEMS[finalIdx];
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
        aria-label="Mobile Bottom Navigation Dock"
        className={`fixed bottom-3 inset-x-0 z-40 mx-auto w-[94%] max-w-[420px] md:hidden select-none touch-none ${className}`}
        style={{ bottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <div
          className={`relative flex items-center justify-around rounded-full p-1.5 transition-all duration-300 ${
            isScrubbing
              ? "bg-[#16161c]/90 border border-white/40 shadow-[0_0_28px_rgba(255,255,255,0.25)] ring-1 ring-white/30"
              : "liquid-glass shadow-[0_12px_36px_rgba(0,0,0,0.85)] border border-white/20"
          }`}
        >


          {MAIN_NAV_ITEMS.map((item, index) => {
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
                className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-full transition-all duration-200 z-10 flex-1 cursor-pointer select-none active:scale-95 ${
                  isTarget ? "text-white" : "text-white/60 hover:text-white/90"
                }`}
                aria-label={item.label}
              >
                {isTarget && (
                  <motion.div
                    layoutId="active-mobile-dock-pill"
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
        </div>
      </nav>
    );
  }

  // Header desktop & tablet variant
  return (
    <nav
      aria-label="Main Navigation"
      className={`items-center gap-1.5 text-sm font-semibold p-1.5 rounded-full backdrop-blur-md shadow-inner relative whitespace-nowrap select-none touch-none transition-all duration-300 ${
        searchExpanded ? "hidden xl:flex" : "hidden md:flex"
      } ${
        isScrubbing
          ? "bg-white/10 border border-white/35 shadow-[0_0_24px_rgba(255,255,255,0.22)] ring-1 ring-white/20"
          : "bg-white/5 border border-white/10"
      } ${className}`}
    >


      {MAIN_NAV_ITEMS.map((item, index) => {
        const isTarget = displayedIndex === index;

        return (
          <button
            key={item.to}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            onPointerDown={(e) => startScrubbing(index, e)}
            type="button"
            className={`relative px-4 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all duration-200 z-10 select-none cursor-pointer text-white/70 hover:text-white flex items-center gap-2 active:scale-95 ${
              isTarget ? "text-white" : ""
            } ${isScrubbing && !isTarget ? "opacity-50" : "opacity-100"}`}
          >
            {isTarget && (
              <motion.div
                layoutId="active-header-nav-pill"
                className="absolute inset-0 bg-white/20 border border-white/25 rounded-full shadow-[0_3px_14px_rgba(255,255,255,0.15)] z-[-1] backdrop-blur-xl"
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
              />
            )}
            <span
              className={`transition-all duration-200 ${
                isTarget ? "font-bold text-white scale-105" : ""
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
