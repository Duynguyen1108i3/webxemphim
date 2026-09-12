import React from "react";

export function LiquidGlassBackground() {
  return (
    <div
      aria-hidden="true"
      className="auth-liquid-screen fixed inset-0 pointer-events-none -z-20 overflow-hidden bg-[#0a0c12] select-none [contain:strict] [transform:translate3d(0,0,0)]"
    >
      {/* Base Dark Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0c0d14] via-[#08090f] to-[#050608]" />

      {/* Layer 1: Monochromatic Liquid Glass Caustic Waves */}
      <div className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none">
        <svg
          className="w-full h-full animate-[liquid-caustic-drift_20s_ease-in-out_infinite_alternate]"
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
              <stop offset="0%" stopColor="#e50914" stopOpacity="0.18" />
              <stop offset="40%" stopColor="#8b5cf6" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="admin-liquid-wave-2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
              <stop offset="60%" stopColor="#e50914" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Layer 2: Primary Morphing Liquid Glass Blob (Top-Left Cinema Red Glow) */}
      <div
        className="absolute top-[-10%] left-[-5%] w-[620px] h-[620px] sm:w-[780px] sm:h-[780px] rounded-full filter blur-[50px] opacity-75"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, rgba(229, 9, 20, 0.28) 0%, rgba(139, 92, 246, 0.12) 40%, rgba(255, 255, 255, 0.02) 65%, transparent 80%)",
          border: "1px solid rgba(255, 255, 255, 0.16)",
          boxShadow:
            "inset 0 0 70px rgba(229, 9, 20, 0.2), 0 20px 80px rgba(0, 0, 0, 0.8)",
          animation: "liquid-glass-morph-1 22s ease-in-out infinite alternate",
        }}
      />

      {/* Layer 3: Secondary Morphing Liquid Glass Blob (Bottom-Right Cyan/Blue Sheen) */}
      <div
        className="absolute bottom-[-15%] right-[-10%] w-[680px] h-[680px] sm:w-[840px] sm:h-[840px] rounded-full filter blur-[55px] opacity-70"
        style={{
          background:
            "radial-gradient(circle at 65% 65%, rgba(6, 182, 212, 0.22) 0%, rgba(59, 130, 246, 0.1) 40%, rgba(255, 255, 255, 0.02) 70%, transparent 85%)",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          boxShadow:
            "inset 0 0 80px rgba(6, 182, 212, 0.15), 0 30px 90px rgba(0, 0, 0, 0.8)",
          animation: "liquid-glass-morph-2 28s ease-in-out infinite alternate",
        }}
      />

      {/* Layer 4: Viscous Liquid Glass Droplet (Center Floating Specular Pulse) */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full filter blur-[40px] opacity-55 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.15) 0%, rgba(229, 9, 20, 0.08) 35%, transparent 75%)",
          boxShadow: "inset 0 0 60px rgba(255, 255, 255, 0.12)",
          animation:
            "liquid-glass-morph-3 18s ease-in-out infinite alternate, liquid-ripple-pulse 12s ease-in-out infinite alternate",
        }}
      />

      {/* Layer 5: Concentric Liquid Glass Refraction Ripples */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-white/[0.06] opacity-40 pointer-events-none"
        style={{
          animation: "liquid-ripple-pulse 15s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1250px] h-[1250px] rounded-full border border-white/[0.035] opacity-30 pointer-events-none"
        style={{
          animation: "liquid-ripple-pulse 20s ease-in-out infinite alternate-reverse",
        }}
      />

      {/* Layer 6: Dynamic Liquid Glass Specular Sheen Beam */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.03) 30%, transparent 65%)",
        }}
      />

      {/* Layer 7: Soft Cinema Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0c12]/20 to-[#0a0c12]/80 pointer-events-none" />
    </div>
  );
}
