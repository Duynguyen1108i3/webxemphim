import React from "react";

export function LiquidGlassBackground() {
  return (
    <div
      aria-hidden="true"
      className="auth-liquid-screen fixed inset-0 pointer-events-none -z-20 overflow-hidden bg-[#0c0d14] select-none [contain:strict] [transform:translate3d(0,0,0)] [backface-visibility:hidden]"
    >
      {/* Base Dark Gradient */}
      <div className="absolute inset-0 bg-[#08090f]" />

      {/* Layer 1: Monochromatic Liquid Glass Caustic Waves */}
      <div className="absolute inset-0 opacity-30 mix-blend-screen pointer-events-none [transform:translate3d(0,0,0)]">
        <svg
          className="w-full h-full animate-[liquid-caustic-drift_24s_ease-in-out_infinite_alternate]"
          viewBox="0 0 1440 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M-100 250 C 300 450, 650 150, 1100 350 C 1300 450, 1500 250, 1600 300 V900 H-100 Z"
            fill="url(#admin-liquid-wave-1)"
          />
          <path
            d="M-100 450 C 250 250, 750 550, 1050 380 C 1350 220, 1450 480, 1600 420 V900 H-100 Z"
            fill="url(#admin-liquid-wave-2)"
          />
          <defs>
            <linearGradient id="admin-liquid-wave-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.10" />
              <stop offset="40%" stopColor="#ffffff" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="admin-liquid-wave-2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Layer 2: Primary Morphing Liquid Glass Blob (Top-Left) */}
      <div
        className="absolute top-[-10%] left-[-5%] w-[620px] h-[620px] sm:w-[780px] sm:h-[780px] rounded-full filter blur-[50px] opacity-75 ambient-glass-drift-1 pointer-events-none [transform:translate3d(0,0,0)] [backface-visibility:hidden]"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.04) 35%, rgba(255, 255, 255, 0.01) 65%, transparent 80%)",
        }}
      />

      {/* Layer 3: Secondary Morphing Liquid Glass Blob (Bottom-Right) */}
      <div
        className="absolute bottom-[-15%] right-[-10%] w-[680px] h-[680px] sm:w-[840px] sm:h-[840px] rounded-full filter blur-[55px] opacity-70 ambient-glass-drift-2 pointer-events-none [transform:translate3d(0,0,0)] [backface-visibility:hidden]"
        style={{
          background:
            "radial-gradient(circle at 65% 65%, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.03) 40%, rgba(255, 255, 255, 0.01) 70%, transparent 85%)",
        }}
      />

      {/* Layer 4: Viscous Liquid Glass Droplet (Center) */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full filter blur-[45px] opacity-55 ambient-glass-drift-3 pointer-events-none [transform:translate3d(0,0,0)] [backface-visibility:hidden]"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 40%, transparent 75%)",
        }}
      />

      {/* Layer 5: Dynamic Liquid Glass Specular Sheen Beam */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 25%, transparent 60%)",
        }}
      />

      {/* Layer 6: Soft Dark Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0c12]/30 to-[#0a0c12]/85 pointer-events-none" />
    </div>
  );
}
