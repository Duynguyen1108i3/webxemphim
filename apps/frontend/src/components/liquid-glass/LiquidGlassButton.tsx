import React, { useEffect, useRef } from "react";
import {
  LiquidGlassNestedRenderer,
  LiquidGlassContainerRenderer,
  type GlassShapeType,
} from "../../lib/liquid-glass/liquidGlassEngine";
import { useLiquidGlassStore } from "../../lib/liquid-glass/liquidGlassStore";
import { useLiquidGlassContext } from "./LiquidGlassContext";

export interface LiquidGlassButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  type?: "button" | "submit" | "reset";
  shape?: GlassShapeType;
  borderRadius?: number;
  tintOpacity?: number;
  blurRadius?: number;
  edgeIntensity?: number;
  rimIntensity?: number;
  warp?: boolean;
  disableWebGL?: boolean;
  children?: React.ReactNode;
}

export const LiquidGlassButton = React.forwardRef<
  HTMLButtonElement,
  LiquidGlassButtonProps
>(({
  type = "button",
  shape = "pill",
  borderRadius,
  tintOpacity,
  blurRadius,
  edgeIntensity,
  rimIntensity,
  warp,
  disableWebGL = false,
  children,
  className = "",
  style = {},
  ...restProps
}, forwardedRef) => {
  const innerRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nestedRendererRef = useRef<LiquidGlassNestedRenderer | null>(null);
  const standaloneRendererRef = useRef<LiquidGlassContainerRenderer | null>(null);

  React.useImperativeHandle(forwardedRef, () => innerRef.current!);

  const { containerRenderer, registerChild } = useLiquidGlassContext();
  const globalConfig = useLiquidGlassStore();

  const getRadius = (w: number, h: number): number => {
    if (borderRadius !== undefined) return borderRadius;
    if (shape === "circle") return Math.min(w, h) / 2;
    if (shape === "pill") return h / 2;
    return 16;
  };

  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const shouldDisableWebGL = disableWebGL || isMobile;

  useEffect(() => {
    if (shouldDisableWebGL || !canvasRef.current || !innerRef.current) return;

    if (containerRenderer) {
      const nested = new LiquidGlassNestedRenderer(
        canvasRef.current,
        shape,
        containerRenderer
      );
      nested.elementRef = innerRef.current;
      nestedRendererRef.current = nested;

      const updateSize = () => {
        if (!innerRef.current || !nestedRendererRef.current) return;
        const rect = innerRef.current.getBoundingClientRect();
        const w = Math.ceil(rect.width);
        const h = Math.ceil(rect.height);
        const rad = getRadius(w, h);
        nestedRendererRef.current.resize(w, h, rad);
      };

      updateSize();
      nested.startAnimation();
      registerChild();

      let ro: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => updateSize());
        ro.observe(innerRef.current);
      }

      return () => {
        if (ro) ro.disconnect();
        nested.destroy();
        nestedRendererRef.current = null;
      };
    } else {
      const standalone = new LiquidGlassContainerRenderer(canvasRef.current, shape);
      standalone.elementRef = innerRef.current;
      standaloneRendererRef.current = standalone;

      const updateSize = () => {
        if (!innerRef.current || !standaloneRendererRef.current) return;
        const rect = innerRef.current.getBoundingClientRect();
        const w = Math.ceil(rect.width);
        const h = Math.ceil(rect.height);
        const rad = getRadius(w, h);
        standaloneRendererRef.current.resize(w, h, rad);
      };

      updateSize();

      let ro: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => updateSize());
        ro.observe(innerRef.current);
      }

      let scrollScheduled = false;
      const onScroll = () => {
        if (!scrollScheduled) {
          scrollScheduled = true;
          requestAnimationFrame(() => {
            standaloneRendererRef.current?.render();
            scrollScheduled = false;
          });
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });

      return () => {
        if (ro) ro.disconnect();
        window.removeEventListener("scroll", onScroll);
        standalone.destroy();
        standaloneRendererRef.current = null;
      };
    }
  }, [containerRenderer, shape, shouldDisableWebGL]);

  useEffect(() => {
    const config = {
      ...globalConfig,
      ...(tintOpacity !== undefined ? { tintOpacity } : {}),
      ...(blurRadius !== undefined ? { blurRadius } : {}),
      ...(edgeIntensity !== undefined ? { edgeIntensity } : {}),
      ...(rimIntensity !== undefined ? { rimIntensity } : {}),
      ...(warp !== undefined ? { warp } : {}),
    };

    if (nestedRendererRef.current) {
      nestedRendererRef.current.updateParams(config);
    }
    if (standaloneRendererRef.current) {
      standaloneRendererRef.current.updateParams(config);
    }
  }, [globalConfig, tintOpacity, blurRadius, edgeIntensity, rimIntensity, warp]);

  const shapeClass =
    shape === "circle"
      ? "rounded-full aspect-square"
      : shape === "pill"
      ? "rounded-full"
      : "rounded-2xl";

  const hasCustomDisplay = /\b(hidden|block|flex|grid|inline-block)\b/.test(className);
  const displayClass = hasCustomDisplay ? "" : "inline-flex items-center justify-center";

  return (
    <button
      ref={innerRef}
      type={type}
      className={`glass-button relative isolate overflow-hidden transition-all duration-200 select-none active:scale-95 ${displayClass} ${shapeClass} ${className}`}
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
      <span className="relative z-10 inline-flex items-center justify-center gap-2 w-full h-full">
        {children}
      </span>
    </button>
  );
});

LiquidGlassButton.displayName = "LiquidGlassButton";
