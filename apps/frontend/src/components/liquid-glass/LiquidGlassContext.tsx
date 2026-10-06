import React, { createContext, useContext } from "react";
import type { LiquidGlassContainerRenderer } from "../../lib/liquid-glass/liquidGlassEngine";

export interface LiquidGlassContextValue {
  containerRenderer: LiquidGlassContainerRenderer | null;
  registerChild: () => void;
}

export const LiquidGlassContext = createContext<LiquidGlassContextValue>({
  containerRenderer: null,
  registerChild: () => {},
});

export const useLiquidGlassContext = () => useContext(LiquidGlassContext);
