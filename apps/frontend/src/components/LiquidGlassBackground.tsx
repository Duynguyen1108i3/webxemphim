import React from "react";

export function LiquidGlassBackground() {
  return (
    <div
      aria-hidden="true"
      className="auth-liquid-screen fixed inset-0 pointer-events-none -z-20 overflow-hidden bg-[#060608] select-none [contain:strict] [transform:translate3d(0,0,0)] [backface-visibility:hidden]"
    >
      {/* Absolute dark base to completely seal off any external colors */}
      <div className="absolute inset-0 bg-[#060608]" />

      {/* Layer 1: Monochromatic Liquid Glass Caustic Waves (Flowing glass ripples) */}
      <div className="absolute inset-0 opacity-30 mix-blend-screen pointer-events-none [transform:translate3d(0,0,0)]">
        <svg
          className="w-full h-full animate-[liquid-caustic-drift_26s_ease-in-out_infinite_alternate]"
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
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.10" />
              <stop offset="40%" stopColor="#ffffff" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="liquid-wave-2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Layer 2: Primary Morphing Liquid Glass Aura (Top-Left / Center) */}
      <div
        className="absolute top-[-12%] left-[-8%] w-[600px] h-[600px] sm:w-[760px] sm:h-[760px] rounded-full filter blur-[50px] opacity-80 ambient-glass-drift-1 pointer-events-none [transform:translate3d(0,0,0)] [backface-visibility:hidden]"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.05) 35%, rgba(255, 255, 255, 0.01) 65%, transparent 80%)"
        }}
      />

      {/* Layer 3: Secondary Morphing Liquid Glass Aura (Bottom-Right / Center) */}
      <div
        className="absolute bottom-[-15%] right-[-10%] w-[640px] h-[640px] sm:w-[800px] sm:h-[800px] rounded-full filter blur-[55px] opacity-70 ambient-glass-drift-2 pointer-events-none [transform:translate3d(0,0,0)] [backface-visibility:hidden]"
        style={{
          background:
            "radial-gradient(circle at 65% 65%, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.04) 40%, rgba(255, 255, 255, 0.01) 70%, transparent 85%)"
        }}
      />

      {/* Layer 4: Viscous Liquid Glass Specular Glow (Center) */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] sm:w-[620px] sm:h-[620px] rounded-full filter blur-[45px] opacity-55 ambient-glass-drift-3 pointer-events-none [transform:translate3d(0,0,0)] [backface-visibility:hidden]"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.03) 45%, transparent 75%)"
        }}
      />

      {/* Layer 5: Dynamic Liquid Glass Specular Sheen Beam */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 25%, transparent 60%)"
        }}
      />

      {/* Layer 6: Soft Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#060608]/40 to-[#060608]/90 pointer-events-none" />
    </div>
  );
}
