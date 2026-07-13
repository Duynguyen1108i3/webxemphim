import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET || "http://localhost:4000",
        changeOrigin: true
      }
    }
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: { output: { manualChunks: { vendor: ["react", "react-dom", "react-router-dom"], player: ["hls.js"] } } }
  }
});
