type SnapshotListener = (canvas: HTMLCanvasElement | HTMLImageElement) => void;

class SnapshotManager {
  private static instance: SnapshotManager;
  private currentSnapshot: HTMLCanvasElement | null = null;
  private listeners: Set<SnapshotListener> = new Set();
  private resizeTimer: number | null = null;
  private fallbackCanvas: HTMLCanvasElement | null = null;
  private snapshotCache: Map<string, HTMLCanvasElement> = new Map();
  private lastUrl: string = "";

  private constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("resize", this.handleResize, { passive: true });
    }
  }

  public static getInstance(): SnapshotManager {
    if (!SnapshotManager.instance) {
      SnapshotManager.instance = new SnapshotManager();
    }
    return SnapshotManager.instance;
  }

  /**
   * Generates a high-luminance, rich cinema ambient texture canvas
   * Provides vibrant colors and specular gradients so glass elements refract real light
   */
  public getOrCreateFallback(): HTMLCanvasElement {
    if (this.fallbackCanvas) return this.fallbackCanvas;

    const w = 512;
    const h = 288;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Base background
      ctx.fillStyle = "#0d0f18";
      ctx.fillRect(0, 0, w, h);

      // Vivid Top Cyan / Sky Blue Aura (illuminates header & top buttons)
      const g1 = ctx.createRadialGradient(w * 0.25, h * 0.15, 0, w * 0.25, h * 0.15, w * 0.45);
      g1.addColorStop(0, "rgba(56, 189, 248, 0.45)");
      g1.addColorStop(0.4, "rgba(99, 102, 241, 0.25)");
      g1.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      // Center-Right Electric Violet / Magenta Aura (illuminates hero CTA & middle)
      const g2 = ctx.createRadialGradient(w * 0.75, h * 0.4, 0, w * 0.75, h * 0.4, w * 0.55);
      g2.addColorStop(0, "rgba(217, 70, 239, 0.35)");
      g2.addColorStop(0.5, "rgba(139, 92, 246, 0.20)");
      g2.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      // Warm Amber / Gold Sparkle (for specular refraction flare)
      const g3 = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.3, w * 0.3);
      g3.addColorStop(0, "rgba(251, 191, 36, 0.25)");
      g3.addColorStop(0.6, "rgba(244, 63, 94, 0.12)");
      g3.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = g3;
      ctx.fillRect(0, 0, w, h);

      // Smooth vertical depth curve
      const g4 = ctx.createLinearGradient(0, 0, 0, h);
      g4.addColorStop(0, "rgba(20, 24, 38, 0.4)");
      g4.addColorStop(0.3, "rgba(15, 23, 42, 0.6)");
      g4.addColorStop(1, "rgba(10, 11, 16, 0.9)");
      ctx.fillStyle = g4;
      ctx.fillRect(0, 0, w, h);
    }

    this.fallbackCanvas = canvas;
    return canvas;
  }

  /**
   * Sets the active hero backdrop image as the refraction source
   */
  public setBackdropImage(url: string): void {
    if (!url || typeof window === "undefined") return;
    if (url === this.lastUrl && this.currentSnapshot) return;
    this.lastUrl = url;

    const cached = this.snapshotCache.get(url);
    if (cached) {
      this.currentSnapshot = cached;
      this.listeners.forEach((fn) => fn(cached));
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;

    img.onload = () => {
      const w = 512;
      const h = 288;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw backdrop image scaled to fit
      ctx.drawImage(img, 0, 0, w, h);

      // Add top light sheen
      const grad = ctx.createLinearGradient(0, 0, 0, h * 0.35);
      grad.addColorStop(0, "rgba(255, 255, 255, 0.15)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h * 0.35);

      if (this.snapshotCache.size >= 16) {
        const firstKey = this.snapshotCache.keys().next().value;
        if (firstKey) this.snapshotCache.delete(firstKey);
      }
      this.snapshotCache.set(url, canvas);
      this.currentSnapshot = canvas;
      this.listeners.forEach((fn) => fn(canvas));
    };
  }

  public getSnapshot(): HTMLCanvasElement {
    return this.currentSnapshot || this.getOrCreateFallback();
  }

  public subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    // Send initial snapshot right away
    listener(this.getSnapshot());

    // Trigger capture if not yet captured
    if (!this.currentSnapshot) {
      this.capture();
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  public capture(): void {
    if (typeof window === "undefined") return;
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snap));
  }

  private handleResize = () => {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.fallbackCanvas = null;
      this.capture();
    }, 350);
  };
}

export const snapshotManager = SnapshotManager.getInstance();
