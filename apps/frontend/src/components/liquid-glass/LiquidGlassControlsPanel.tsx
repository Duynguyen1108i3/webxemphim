import React from "react";
import { useLiquidGlassStore } from "../../lib/liquid-glass/liquidGlassStore";
import { Sliders, RotateCcw } from "lucide-react";

export function LiquidGlassControlsPanel() {
  const {
    blurRadius,
    edgeIntensity,
    rimIntensity,
    cornerBoost,
    rippleEffect,
    tintOpacity,
    warp,
    updateConfig,
    resetConfig,
  } = useLiquidGlassStore();

  return (
    <div className="space-y-4 text-xs select-none">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <span className="flex items-center gap-1.5 font-bold text-white uppercase tracking-wider text-[11px]">
          <Sliders size={14} className="text-white/80" />
          Liquid Glass Studio
        </span>
        <button
          onClick={resetConfig}
          className="text-white/50 hover:text-white flex items-center gap-1 transition"
          title="Reset to default"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      </div>

      <div className="space-y-3">
        {/* Blur Radius */}
        <div className="space-y-1">
          <div className="flex justify-between text-white/70">
            <span>Độ nhòe quang học (Blur)</span>
            <span className="font-mono text-white/90">{blurRadius.toFixed(0)}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="40"
            step="1"
            value={blurRadius}
            onChange={(e) => updateConfig({ blurRadius: parseFloat(e.target.value) })}
            className="w-full accent-white h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Rim Intensity */}
        <div className="space-y-1">
          <div className="flex justify-between text-white/70">
            <span>Ánh khúc xạ viền mép (Rim)</span>
            <span className="font-mono text-white/90">{rimIntensity.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="3"
            step="0.05"
            value={rimIntensity}
            onChange={(e) => updateConfig({ rimIntensity: parseFloat(e.target.value) })}
            className="w-full accent-white h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Edge Intensity */}
        <div className="space-y-1">
          <div className="flex justify-between text-white/70">
            <span>Độ cong cạnh (Edge Curvature)</span>
            <span className="font-mono text-white/90">{edgeIntensity.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={edgeIntensity}
            onChange={(e) => updateConfig({ edgeIntensity: parseFloat(e.target.value) })}
            className="w-full accent-white h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Corner Boost */}
        <div className="space-y-1">
          <div className="flex justify-between text-white/70">
            <span>Khuếch đại 4 góc (Corner Boost)</span>
            <span className="font-mono text-white/90">{cornerBoost.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={cornerBoost}
            onChange={(e) => updateConfig({ cornerBoost: parseFloat(e.target.value) })}
            className="w-full accent-white h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Ripple Effect */}
        <div className="space-y-1">
          <div className="flex justify-between text-white/70">
            <span>Gợn sóng lỏng (Liquid Ripple)</span>
            <span className="font-mono text-white/90">{rippleEffect.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="0.3"
            step="0.01"
            value={rippleEffect}
            onChange={(e) => updateConfig({ rippleEffect: parseFloat(e.target.value) })}
            className="w-full accent-white h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Tint Opacity */}
        <div className="space-y-1">
          <div className="flex justify-between text-white/70">
            <span>Độ phủ mờ kính (Tint)</span>
            <span className="font-mono text-white/90">{(tintOpacity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="0.6"
            step="0.02"
            value={tintOpacity}
            onChange={(e) => updateConfig({ tintOpacity: parseFloat(e.target.value) })}
            className="w-full accent-white h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Center Warp */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-white/80">Biến dạng tâm (Center Warp)</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={warp}
              onChange={(e) => updateConfig({ warp: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white/70"></div>
          </label>
        </div>
      </div>
    </div>
  );
}
