import {
  VERTEX_SHADER,
  CONTAINER_FRAGMENT_SHADER,
  NESTED_FRAGMENT_SHADER,
} from "./liquidGlassShaders";
import { type LiquidGlassConfig, DEFAULT_LIQUID_GLASS_CONFIG } from "./liquidGlassStore";
import { snapshotManager } from "./snapshotManager";

export type GlassShapeType = "rounded" | "circle" | "pill";

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vsSource: string,
  fsSource: string
): WebGLProgram | null {
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

let globalActiveWebGLContexts = 0;
const MAX_CONCURRENT_WEBGL_CONTEXTS = 8;

/**
 * WebGL Engine for Standalone Liquid Glass Container
 */
export class LiquidGlassContainerRenderer {
  public canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private animFrameId: number | null = null;
  private unsubscribeSnapshot: (() => void) | null = null;
  private contextLostHandler: ((e: Event) => void) | null = null;
  private contextRestoredHandler: (() => void) | null = null;

  // Uniform locations
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  public shapeType: GlassShapeType = "rounded";
  public borderRadius: number = 48;
  public elementRef: HTMLElement | null = null;

  constructor(canvas: HTMLCanvasElement, shape: GlassShapeType = "rounded") {
    this.canvas = canvas;
    this.shapeType = shape;
    this.initWebGL();
  }

  private initWebGL() {
    if (globalActiveWebGLContexts >= MAX_CONCURRENT_WEBGL_CONTEXTS) {
      this.canvas.style.display = "none";
      return;
    }

    this.contextLostHandler = (e: Event) => {
      e.preventDefault();
      this.canvas.style.display = "none";
    };
    this.contextRestoredHandler = () => {
      this.canvas.style.display = "";
      this.render();
    };
    this.canvas.addEventListener("webglcontextlost", this.contextLostHandler, false);
    this.canvas.addEventListener("webglcontextrestored", this.contextRestoredHandler, false);

    this.gl = this.canvas.getContext("webgl", {
      preserveDrawingBuffer: true,
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
    });
    if (!this.gl) return;
    globalActiveWebGLContexts++;

    const gl = this.gl;
    this.program = createProgram(gl, VERTEX_SHADER, CONTAINER_FRAGMENT_SHADER);
    if (!this.program) return;

    gl.useProgram(this.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Buffers
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(this.program, "a_position");
    const texLoc = gl.getAttribLocation(this.program, "a_texcoord");

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    // Collect uniform locations
    const uniformNames = [
      "u_resolution",
      "u_textureSize",
      "u_scrollY",
      "u_pageHeight",
      "u_viewportHeight",
      "u_blurRadius",
      "u_borderRadius",
      "u_containerPosition",
      "u_warp",
      "u_edgeIntensity",
      "u_rimIntensity",
      "u_baseIntensity",
      "u_edgeDistance",
      "u_rimDistance",
      "u_baseDistance",
      "u_cornerBoost",
      "u_rippleEffect",
      "u_tintOpacity",
      "u_image",
    ];

    uniformNames.forEach((name) => {
      this.uniforms[name] = gl.getUniformLocation(this.program!, name);
    });

    // Texture
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Initial snapshot subscription
    this.unsubscribeSnapshot = snapshotManager.subscribe((img) => {
      this.updateTexture(img);
    });

    // Apply baseline default parameters immediately
    this.updateParams(DEFAULT_LIQUID_GLASS_CONFIG);
  }

  public updateTexture(source: HTMLCanvasElement | HTMLImageElement) {
    if (!this.gl || !this.texture) return;
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    if (this.uniforms.u_textureSize) {
      gl.useProgram(this.program);
      gl.uniform2f(this.uniforms.u_textureSize, source.width, source.height);
    }
    this.render();
  }

  public resize(width: number, height: number, radius?: number) {
    if (!this.gl || width <= 0 || height <= 0) return;
    this.canvas.width = width;
    this.canvas.height = height;

    if (radius !== undefined) {
      this.borderRadius = radius;
    } else if (this.shapeType === "circle") {
      this.borderRadius = Math.min(width, height) / 2;
    } else if (this.shapeType === "pill") {
      this.borderRadius = height / 2;
    }

    this.gl.viewport(0, 0, width, height);
    if (this.program && this.uniforms.u_resolution) {
      const gl = this.gl;
      gl.useProgram(this.program);
      gl.uniform2f(this.uniforms.u_resolution, width, height);
      gl.uniform1f(this.uniforms.u_borderRadius, this.borderRadius);
    }
    this.render();
  }

  public updateParams(config: LiquidGlassConfig) {
    if (!this.gl || !this.program) return;
    const gl = this.gl;
    gl.useProgram(this.program);

    if (this.uniforms.u_blurRadius) gl.uniform1f(this.uniforms.u_blurRadius, config.blurRadius);
    if (this.uniforms.u_edgeIntensity) gl.uniform1f(this.uniforms.u_edgeIntensity, config.edgeIntensity);
    if (this.uniforms.u_rimIntensity) gl.uniform1f(this.uniforms.u_rimIntensity, config.rimIntensity);
    if (this.uniforms.u_baseIntensity) gl.uniform1f(this.uniforms.u_baseIntensity, config.baseIntensity);
    if (this.uniforms.u_edgeDistance) gl.uniform1f(this.uniforms.u_edgeDistance, config.edgeDistance);
    if (this.uniforms.u_rimDistance) gl.uniform1f(this.uniforms.u_rimDistance, config.rimDistance);
    if (this.uniforms.u_baseDistance) gl.uniform1f(this.uniforms.u_baseDistance, config.baseDistance);
    if (this.uniforms.u_cornerBoost) gl.uniform1f(this.uniforms.u_cornerBoost, config.cornerBoost);
    if (this.uniforms.u_rippleEffect) gl.uniform1f(this.uniforms.u_rippleEffect, config.rippleEffect);
    if (this.uniforms.u_tintOpacity) gl.uniform1f(this.uniforms.u_tintOpacity, config.tintOpacity);
    if (this.uniforms.u_warp) gl.uniform1f(this.uniforms.u_warp, config.warp ? 1.0 : 0.0);

    this.render();
  }

  public render = () => {
    if (!this.gl || !this.program) return;
    const gl = this.gl;
    gl.useProgram(this.program);

    if (this.texture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      if (this.uniforms.u_image) {
        gl.uniform1i(this.uniforms.u_image, 0);
      }
    }

    const scrollY = typeof window !== "undefined" ? window.scrollY || window.pageYOffset : 0;
    const pageHeight = typeof document !== "undefined" ? Math.max(document.body.scrollHeight, 1000) : 1000;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;

    if (this.uniforms.u_scrollY) gl.uniform1f(this.uniforms.u_scrollY, scrollY);
    if (this.uniforms.u_pageHeight) gl.uniform1f(this.uniforms.u_pageHeight, pageHeight);
    if (this.uniforms.u_viewportHeight) gl.uniform1f(this.uniforms.u_viewportHeight, viewportHeight);

    const el = this.elementRef || this.canvas;
    if (el && this.uniforms.u_containerPosition) {
      const rect = el.getBoundingClientRect();
      const posX = rect.left + rect.width / 2;
      const posY = rect.top + rect.height / 2;
      gl.uniform2f(this.uniforms.u_containerPosition, posX, posY);
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  public destroy() {
    if (this.contextLostHandler) {
      this.canvas.removeEventListener("webglcontextlost", this.contextLostHandler);
      this.contextLostHandler = null;
    }
    if (this.contextRestoredHandler) {
      this.canvas.removeEventListener("webglcontextrestored", this.contextRestoredHandler);
      this.contextRestoredHandler = null;
    }
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.gl) {
      try {
        const ext = this.gl.getExtension("WEBGL_lose_context");
        if (ext) ext.loseContext();
      } catch {
        // ignore
      }
      this.gl = null;
      this.program = null;
      this.texture = null;
      globalActiveWebGLContexts = Math.max(0, globalActiveWebGLContexts - 1);
    }
  }
}

/**
 * WebGL Engine for Nested Liquid Glass Button
 * Samples parent Container's rendered canvas in real time
 */
export class LiquidGlassNestedRenderer {
  public canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private animFrameId: number | null = null;

  public shapeType: GlassShapeType = "rounded";
  public borderRadius: number = 24;
  public elementRef: HTMLElement | null = null;
  public parentContainer: LiquidGlassContainerRenderer | null = null;
  private contextLostHandler: ((e: Event) => void) | null = null;
  private contextRestoredHandler: (() => void) | null = null;

  private uniforms: Record<string, WebGLUniformLocation | null> = {};

  constructor(
    canvas: HTMLCanvasElement,
    shape: GlassShapeType = "rounded",
    parent?: LiquidGlassContainerRenderer
  ) {
    this.canvas = canvas;
    this.shapeType = shape;
    if (parent) this.parentContainer = parent;
    this.initWebGL();
  }

  private initWebGL() {
    if (globalActiveWebGLContexts >= MAX_CONCURRENT_WEBGL_CONTEXTS) {
      this.canvas.style.display = "none";
      return;
    }

    this.contextLostHandler = (e: Event) => {
      e.preventDefault();
      this.canvas.style.display = "none";
    };
    this.contextRestoredHandler = () => {
      this.canvas.style.display = "";
      this.render();
    };
    this.canvas.addEventListener("webglcontextlost", this.contextLostHandler, false);
    this.canvas.addEventListener("webglcontextrestored", this.contextRestoredHandler, false);

    this.gl = this.canvas.getContext("webgl", {
      preserveDrawingBuffer: true,
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
    });
    if (!this.gl) return;
    globalActiveWebGLContexts++;

    const gl = this.gl;
    this.program = createProgram(gl, VERTEX_SHADER, NESTED_FRAGMENT_SHADER);
    if (!this.program) return;

    gl.useProgram(this.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Buffers
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(this.program, "a_position");
    const texLoc = gl.getAttribLocation(this.program, "a_texcoord");

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    const uniformNames = [
      "u_resolution",
      "u_textureSize",
      "u_blurRadius",
      "u_borderRadius",
      "u_buttonPosition",
      "u_containerPosition",
      "u_containerSize",
      "u_warp",
      "u_edgeIntensity",
      "u_rimIntensity",
      "u_baseIntensity",
      "u_edgeDistance",
      "u_rimDistance",
      "u_baseDistance",
      "u_cornerBoost",
      "u_rippleEffect",
      "u_tintOpacity",
      "u_image",
    ];

    uniformNames.forEach((name) => {
      this.uniforms[name] = gl.getUniformLocation(this.program!, name);
    });

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Apply baseline default parameters immediately
    this.updateParams(DEFAULT_LIQUID_GLASS_CONFIG);
  }

  public resize(width: number, height: number, radius?: number) {
    if (!this.gl || width <= 0 || height <= 0) return;
    this.canvas.width = width;
    this.canvas.height = height;

    if (radius !== undefined) {
      this.borderRadius = radius;
    } else if (this.shapeType === "circle") {
      this.borderRadius = Math.min(width, height) / 2;
    } else if (this.shapeType === "pill") {
      this.borderRadius = height / 2;
    }

    this.gl.viewport(0, 0, width, height);
    if (this.program && this.uniforms.u_resolution) {
      const gl = this.gl;
      gl.useProgram(this.program);
      gl.uniform2f(this.uniforms.u_resolution, width, height);
      gl.uniform1f(this.uniforms.u_borderRadius, this.borderRadius);
    }
    this.render();
  }

  public updateParams(config: LiquidGlassConfig) {
    if (!this.gl || !this.program) return;
    const gl = this.gl;
    gl.useProgram(this.program);

    if (this.uniforms.u_blurRadius) gl.uniform1f(this.uniforms.u_blurRadius, config.blurRadius);
    if (this.uniforms.u_edgeIntensity) gl.uniform1f(this.uniforms.u_edgeIntensity, config.edgeIntensity);
    if (this.uniforms.u_rimIntensity) gl.uniform1f(this.uniforms.u_rimIntensity, config.rimIntensity);
    if (this.uniforms.u_baseIntensity) gl.uniform1f(this.uniforms.u_baseIntensity, config.baseIntensity);
    if (this.uniforms.u_edgeDistance) gl.uniform1f(this.uniforms.u_edgeDistance, config.edgeDistance);
    if (this.uniforms.u_rimDistance) gl.uniform1f(this.uniforms.u_rimDistance, config.rimDistance);
    if (this.uniforms.u_baseDistance) gl.uniform1f(this.uniforms.u_baseDistance, config.baseDistance);
    if (this.uniforms.u_cornerBoost) gl.uniform1f(this.uniforms.u_cornerBoost, config.cornerBoost);
    if (this.uniforms.u_rippleEffect) gl.uniform1f(this.uniforms.u_rippleEffect, config.rippleEffect);
    if (this.uniforms.u_tintOpacity) gl.uniform1f(this.uniforms.u_tintOpacity, config.tintOpacity);
    if (this.uniforms.u_warp) gl.uniform1f(this.uniforms.u_warp, config.warp ? 1.0 : 0.0);

    this.render();
  }

  public render = () => {
    if (!this.gl || !this.program || !this.parentContainer) return;
    const gl = this.gl;
    gl.useProgram(this.program);

    const pCanvas = this.parentContainer.canvas;
    if (pCanvas.width > 0 && pCanvas.height > 0) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      try {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, pCanvas);
      } catch {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pCanvas);
      }

      if (this.uniforms.u_image) {
        gl.uniform1i(this.uniforms.u_image, 0);
      }
      if (this.uniforms.u_textureSize) {
        gl.uniform2f(this.uniforms.u_textureSize, pCanvas.width, pCanvas.height);
      }
      if (this.uniforms.u_containerSize) {
        gl.uniform2f(this.uniforms.u_containerSize, pCanvas.width, pCanvas.height);
      }
    }

    const bEl = this.elementRef || this.canvas;
    const pEl = this.parentContainer.elementRef || this.parentContainer.canvas;
    if (bEl && pEl) {
      const bRect = bEl.getBoundingClientRect();
      const pRect = pEl.getBoundingClientRect();

      const bX = bRect.left + bRect.width / 2;
      const bY = bRect.top + bRect.height / 2;
      const pX = pRect.left + pRect.width / 2;
      const pY = pRect.top + pRect.height / 2;

      if (this.uniforms.u_buttonPosition) gl.uniform2f(this.uniforms.u_buttonPosition, bX, bY);
      if (this.uniforms.u_containerPosition) gl.uniform2f(this.uniforms.u_containerPosition, pX, pY);
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  public startAnimation() {
    // Render on demand instead of running an infinite 60fps WebGL loop to eliminate high GPU/battery drain
    this.render();
  }

  public destroy() {
    if (this.contextLostHandler) {
      this.canvas.removeEventListener("webglcontextlost", this.contextLostHandler);
      this.contextLostHandler = null;
    }
    if (this.contextRestoredHandler) {
      this.canvas.removeEventListener("webglcontextrestored", this.contextRestoredHandler);
      this.contextRestoredHandler = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.gl) {
      try {
        const ext = this.gl.getExtension("WEBGL_lose_context");
        if (ext) ext.loseContext();
      } catch {
        // ignore
      }
      this.gl = null;
      this.program = null;
      this.texture = null;
      globalActiveWebGLContexts = Math.max(0, globalActiveWebGLContexts - 1);
    }
  }
}
