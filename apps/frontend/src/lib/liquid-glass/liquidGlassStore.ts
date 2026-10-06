import { create } from "zustand";

export interface LiquidGlassConfig {
  blurRadius: number;
  edgeIntensity: number;
  rimIntensity: number;
  baseIntensity: number;
  edgeDistance: number;
  rimDistance: number;
  baseDistance: number;
  cornerBoost: number;
  rippleEffect: number;
  tintOpacity: number;
  warp: boolean;
}

export interface LiquidGlassStore extends LiquidGlassConfig {
  updateConfig: (config: Partial<LiquidGlassConfig>) => void;
  resetConfig: () => void;
}

export const DEFAULT_LIQUID_GLASS_CONFIG: LiquidGlassConfig = {
  blurRadius: 5.0,        // matches repo default
  edgeIntensity: 0.01,    // matches repo default
  rimIntensity: 0.05,     // matches repo default
  baseIntensity: 0.01,    // matches repo default
  edgeDistance: 0.15,      // matches repo default
  rimDistance: 0.8,        // matches repo default
  baseDistance: 0.1,       // matches repo default
  cornerBoost: 0.02,      // matches repo default
  rippleEffect: 0.1,      // matches repo default
  tintOpacity: 0.2,       // matches repo default
  warp: false,
};

export const useLiquidGlassStore = create<LiquidGlassStore>((set) => ({
  ...DEFAULT_LIQUID_GLASS_CONFIG,
  updateConfig: (config) => set((state) => ({ ...state, ...config })),
  resetConfig: () => set(DEFAULT_LIQUID_GLASS_CONFIG),
}));
