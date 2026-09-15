import React from "react";

interface AmbientBackgroundProps {
  opacity?: number;
}

export function AmbientBackground({ opacity = 0.65 }: AmbientBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className="ambient-background fixed inset-0 pointer-events-none overflow-hidden select-none -z-10 [contain:strict] [transform:translate3d(0,0,0)] [backface-visibility:hidden]"
    >
      {/* Deep dark obsidian base - always solid, zero flicker */}
      <div className="absolute inset-0 bg-[#07070a]" />

      {/* Fluid Liquid Glass crystal aura container - responsive to ambientOpacity */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 ease-out [transform:translate3d(0,0,0)] [backface-visibility:hidden]"
        style={{ opacity }}
      >
        {/* Layer 1: Monochromatic Liquid Glass Caustic Waves */}
        <div className="absolute inset-0 opacity-35 mix-blend-screen pointer-events-none [transform:translate3d(0,0,0)]">
          <svg
            className="w-full h-full animate-[liquid-caustic-drift_26s_ease-in-out_infinite_alternate]"
            viewBox="0 0 1440 900"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <path
              d="M-100 250 C 300 450, 650 150, 1100 350 C 1300 450, 1500 250, 1600 300 V900 H-100 Z"
              fill="url(#ambient-liquid-wave-1)"
            />
            <path
              d="M-100 450 C 250 250, 750 550, 1050 380 C 1350 220, 1450 480, 1600 420 V900 H-100 Z"
              fill="url(#ambient-liquid-wave-2)"
            />
            <defs>
              <linearGradient id="ambient-liquid-wave-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
                <stop offset="50%" stopColor="#bae6fd" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="ambient-liquid-wave-2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.10" />
                <stop offset="60%" stopColor="#e0e7ff" stopOpacity="0.03" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Layer 2: Primary Crystal Liquid Glass Aura (Top-Left / Center) */}
        <div
          className="absolute top-[-10%] left-[-6%] w-[680px] h-[680px] sm:w-[840px] sm:h-[840px] rounded-full filter blur-[60px] sm:blur-[85px] opacity-80 ambient-glass-drift-1 pointer-events-none [transform:translate3d(0,0,0)] [backface-visibility:hidden]"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.22) 0%, rgba(224, 242, 254, 0.08) 35%, rgba(255, 255, 255, 0.015) 65%, transparent 80%)"
          }}
        />

        {/* Layer 3: Secondary Crystal Liquid Glass Aura (Bottom-Right / Center) */}
        <div
          className="absolute bottom-[-12%] right-[-8%] w-[720px] h-[720px] sm:w-[880px] sm:h-[880px] rounded-full filter blur-[70px] sm:blur-[95px] opacity-75 ambient-glass-drift-2 pointer-events-none [transform:translate3d(0,0,0)] [backface-visibility:hidden]"
          style={{
            background:
              "radial-gradient(circle at 65% 65%, rgba(255, 255, 255, 0.20) 0%, rgba(219, 234, 254, 0.07) 40%, rgba(255, 255, 255, 0.01) 70%, transparent 85%)"
          }}
        />

        {/* Layer 4: Center Diffuse Liquid Glass Specular Pulse */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] sm:w-[680px] sm:h-[680px] rounded-full filter blur-[50px] sm:blur-[70px] opacity-60 ambient-glass-drift-3 pointer-events-none [transform:translate3d(0,0,0)] [backface-visibility:hidden]"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.16) 0%, rgba(241, 245, 249, 0.04) 45%, transparent 75%)"
          }}
        />

        {/* Layer 5: Dynamic Liquid Glass Specular Sheen Beam */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(255, 255, 255, 0.10) 0%, rgba(255, 255, 255, 0.02) 30%, transparent 65%)"
          }}
        />
      </div>

      {/* Soft Vignette Frame */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />
    </div>
  );
}
