import React from "react";

export function LiquidGlassBackground() {
  return (
    <div
      aria-hidden="true"
      className="auth-liquid-screen fixed inset-0 pointer-events-none -z-20 overflow-hidden bg-[#060608] select-none"
    >
      {/* Absolute dark base to completely seal off any external colors */}
      <div className="absolute inset-0 bg-[#060608]" />

      {/* Layer 1: Monochromatic Liquid Glass Caustic Waves (Flowing glass ripples) */}
      <div className="absolute inset-0 opacity-25 mix-blend-screen pointer-events-none">
        <svg
          className="w-full h-full animate-[liquid-caustic-drift_22s_ease-in-out_infinite_alternate]"
          viewBox="0 0 1440 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M-100 250 C 300 450, 650 150, 1100 350 C 1300 450, 1500 250, 1600 300 V900 H-100 Z"
            fill="url(#liquid-wave-1)"
          />
          <path
            d="M-100 450 C 250 250, 750 550, 1050 380 C 1350 220, 1450 480, 1600 420 V900 H-100 Z"
            fill="url(#liquid-wave-2)"
          />
          <defs>
            <linearGradient id="liquid-wave-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="40%" stopColor="#ffffff" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="liquid-wave-2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.06" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0.01" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Layer 2: Primary Morphing Liquid Glass Blob (Top-Left / Center) */}
      <div
        className="absolute top-[-12%] left-[-8%] w-[580px] h-[580px] sm:w-[720px] sm:h-[720px] rounded-full filter blur-[40px] opacity-85"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.05) 35%, rgba(255, 255, 255, 0.01) 65%, transparent 80%)",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          boxShadow:
            "inset 0 0 60px rgba(255, 255, 255, 0.12), 0 20px 80px rgba(0, 0, 0, 0.8)",
          animation: "liquid-glass-morph-1 20s ease-in-out infinite alternate",
        }}
      />

      {/* Layer 3: Secondary Morphing Liquid Glass Blob (Bottom-Right / Center) */}
      <div
        className="absolute bottom-[-15%] right-[-10%] w-[620px] h-[620px] sm:w-[780px] sm:h-[780px] rounded-full filter blur-[48px] opacity-75"
        style={{
          background:
            "radial-gradient(circle at 65% 65%, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.04) 40%, rgba(255, 255, 255, 0.01) 70%, transparent 85%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow:
            "inset 0 0 70px rgba(255, 255, 255, 0.10), 0 30px 90px rgba(0, 0, 0, 0.8)",
          animation: "liquid-glass-morph-2 26s ease-in-out infinite alternate",
        }}
      />

      {/* Layer 4: Viscous Liquid Glass Droplet (Center Floating Specular Pulse) */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[440px] sm:w-[560px] sm:h-[560px] rounded-full filter blur-[35px] opacity-60 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.03) 45%, transparent 75%)",
          boxShadow: "inset 0 0 50px rgba(255, 255, 255, 0.08)",
          animation:
            "liquid-glass-morph-3 17s ease-in-out infinite alternate, liquid-ripple-pulse 10s ease-in-out infinite alternate",
        }}
      />

      {/* Layer 5: Concentric Liquid Glass Refraction Ripples */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] rounded-full border border-white/[0.04] opacity-40 pointer-events-none"
        style={{
          animation: "liquid-ripple-pulse 14s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1150px] h-[1150px] rounded-full border border-white/[0.025] opacity-30 pointer-events-none"
        style={{
          animation: "liquid-ripple-pulse 18s ease-in-out infinite alternate-reverse",
        }}
      />

      {/* Layer 6: Dynamic Liquid Glass Specular Sheen Beam */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 25%, transparent 60%)",
        }}
      />

      {/* Layer 7: Soft Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#060608]/40 to-[#060608]/90 pointer-events-none" />
    </div>
  );
}
