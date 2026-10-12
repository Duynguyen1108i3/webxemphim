import * as React from "react";
import { cn } from "@streamforge/utils";

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  return (
    <button
      className={cn(
        "nf-button inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-full px-5 sm:px-6 text-xs sm:text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-white/70 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
        variant === "primary" && "bg-white text-black hover:bg-white/90 active:bg-white/80 shadow-xl",
        variant === "ghost" && "glass-button text-white hover:bg-white/15",
        variant === "danger" && "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30",
        className
      )}
      {...props}
    />
  );
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("rounded-full border border-white/20 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-white/85 backdrop-blur-md", className)} {...props} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-white/10", className)} />;
}
