import React, { useEffect, useRef, useState } from "react";
import {
  LiquidGlassContainerRenderer,
  type GlassShapeType,
} from "../../lib/liquid-glass/liquidGlassEngine";
import { useLiquidGlassStore } from "../../lib/liquid-glass/liquidGlassStore";
import { LiquidGlassContext } from "./LiquidGlassContext";

export interface LiquidGlassContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: GlassShapeType;
  borderRadius?: number;
  tintOpacity?: number;
  blurRadius?: number;
  edgeIntensity?: number;
  rimIntensity?: number;
  warp?: boolean;
  children?: React.ReactNode;
  disableWebGL?: boolean;
}

export const LiquidGlassContainer = React.forwardRef<
  HTMLDivElement,
  LiquidGlassContainerProps
>(({
  type = "rounded",
  borderRadius,
  tintOpacity,
  blurRadius,
  edgeIntensity,
  rimIntensity,
  warp,
  children,
  className = "",
  style = {},
  disableWebGL = false,
  ...restProps
}, forwardedRef) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<LiquidGlassContainerRenderer | null>(null);
  const [rendererState, setRendererState] = useState<LiquidGlassContainerRenderer | null>(null);

  React.useImperativeHandle(forwardedRef, () => containerRef.current!);

  const globalConfig = useLiquidGlassStore();

  const getRadius = (w: number, h: number): number => {
    if (borderRadius !== undefined) return borderRadius;
    if (type === "circle") return Math.min(w, h) / 2;
    if (type === "pill") return h / 2;
    return 24;
  };

  const isMobile =
    typeof window !== "undefined" &&
    (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      (window.matchMedia && window.matchMedia("(max-width: 767px), (hover: none) and (pointer: coarse)").matches));
  const shouldDisableWebGL = disableWebGL || isMobile;

  useEffect(() => {
    if (shouldDisableWebGL || !canvasRef.current || !containerRef.current) return;

    const renderer = new LiquidGlassContainerRenderer(canvasRef.current, type);
    renderer.elementRef = containerRef.current;
    rendererRef.current = renderer;
    setRendererState(renderer);

    const updateSize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const w = Math.ceil(rect.width);
      const h = Math.ceil(rect.height);
      const rad = getRadius(w, h);
      rendererRef.current.resize(w, h, rad);
    };

    updateSize();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => updateSize());
      ro.observe(containerRef.current);
    }

    let scrollRaf: number | null = null;
    const onScroll = () => {
      if (scrollRaf !== null) return;
      scrollRaf = window.requestAnimationFrame(() => {
        scrollRaf = null;
        rendererRef.current?.render();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (scrollRaf !== null) {
        window.cancelAnimationFrame(scrollRaf);
      }
      renderer.destroy();
      rendererRef.current = null;
      setRendererState(null);
    };
  }, [type, shouldDisableWebGL]);

  useEffect(() => {
    if (!rendererRef.current) return;

    rendererRef.current.updateParams({
      ...globalConfig,
      ...(tintOpacity !== undefined ? { tintOpacity } : {}),
      ...(blurRadius !== undefined ? { blurRadius } : {}),
      ...(edgeIntensity !== undefined ? { edgeIntensity } : {}),
      ...(rimIntensity !== undefined ? { rimIntensity } : {}),
      ...(warp !== undefined ? { warp } : {}),
    });
  }, [
    globalConfig,
    tintOpacity,
    blurRadius,
    edgeIntensity,
    rimIntensity,
    warp,
  ]);

  const shapeClass =
    type === "pill"
      ? "rounded-full"
      : type === "circle"
      ? "rounded-full aspect-square"
      : "rounded-3xl";

  return (
    <LiquidGlassContext.Provider
      value={{
        containerRenderer: rendererState,
        registerChild: () => {
          rendererRef.current?.render();
        },
      }}
    >
      <div
        ref={containerRef}
        className={`glass-container relative isolate overflow-hidden liquid-glass ${shapeClass} ${className}`}
        style={{
          borderRadius: borderRadius ? `${borderRadius}px` : undefined,
          ...style,
        }}
        {...restProps}
      >
        {!shouldDisableWebGL && (
          <canvas
            ref={canvasRef}
            className="liquid-glass-canvas pointer-events-none absolute inset-0 -z-10 h-full w-full select-none"
            style={{
              borderRadius: borderRadius ? `${borderRadius}px` : undefined,
            }}
          />
        )}
        {children}
      </div>
    </LiquidGlassContext.Provider>
  );
});

LiquidGlassContainer.displayName = "LiquidGlassContainer";
