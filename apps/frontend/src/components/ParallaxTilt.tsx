import React, { useState, useRef, useEffect } from "react";

interface ParallaxTiltProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // max tilt degrees, default 10
}

export function ParallaxTilt({ children, className = "", maxTilt = 10 }: ParallaxTiltProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Calculate normalized position from -1 to 1 relative to center
    const x = (e.clientX - rect.left - width / 2) / (width / 2);
    const y = (e.clientY - rect.top - height / 2) / (height / 2);
    
    setTilt({
      x: Math.max(-1, Math.min(1, x)) * maxTilt,
      y: Math.max(-1, Math.min(1, y)) * maxTilt
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`transition-all duration-300 ease-out ${className}`}
      style={{
        transform: isHovered 
          ? `perspective(1000px) rotateY(${tilt.x}deg) rotateX(${-tilt.y}deg) scale3d(1.02, 1.02, 1.02)` 
          : "perspective(1000px) rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)",
        transformStyle: "preserve-3d",
        // Inject offset values as CSS variables so nested children can parallax translate
        // tilt.x and tilt.y represent the pixel range for translation
        ["--tilt-x" as any]: `${tilt.x * 2.5}px`,
        ["--tilt-y" as any]: `${tilt.y * 2.5}px`
      }}
    >
      {children}
    </div>
  );
}
