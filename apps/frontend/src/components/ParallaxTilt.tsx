import React, { useRef } from "react";

interface ParallaxTiltProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // max tilt degrees, default 10
}

export function ParallaxTilt({ children, className = "", maxTilt = 10 }: ParallaxTiltProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafId = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Avoid calculating tilt on touch screens or invalid container
    if (!containerRef.current) return;
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(hover: none)").matches) {
      return;
    }

    const el = containerRef.current;
    const rect = el.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width <= 0 || height <= 0) return;

    // Calculate normalized position from -1 to 1 relative to center
    const x = (e.clientX - rect.left - width / 2) / (width / 2);
    const y = (e.clientY - rect.top - height / 2) / (height / 2);

    const tiltX = Math.max(-1, Math.min(1, x)) * maxTilt;
    const tiltY = Math.max(-1, Math.min(1, y)) * maxTilt;

    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      if (!el) return;
      el.style.transform = `perspective(1000px) rotateY(${tiltX}deg) rotateX(${-tiltY}deg) scale3d(1.02, 1.02, 1.02)`;
      el.style.setProperty("--tilt-x", `${tiltX * 2.5}px`);
      el.style.setProperty("--tilt-y", `${tiltY * 2.5}px`);
      rafId.current = null;
    });
  };

  const handleMouseLeave = () => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    const el = containerRef.current;
    if (el) {
      el.style.transform = "perspective(1000px) rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)";
      el.style.setProperty("--tilt-x", "0px");
      el.style.setProperty("--tilt-y", "0px");
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-200 ease-out will-change-transform ${className}`}
      style={{
        transform: "perspective(1000px) rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)",
        transformStyle: "preserve-3d"
      }}
    >
      {children}
    </div>
  );
}
