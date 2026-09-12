import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#080a0f",
        ember: "#e50914",
        gold: "#d8b35a"
      },
      fontFamily: {
        sans: ["Poppins", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        spartan: ["'League Spartan'", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"]
      },
      boxShadow: {
        glow: "0 24px 70px rgba(229,9,20,.22)",
        ember: "0 0 30px rgba(229,9,20,.35)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)"
      }
    }
  },
  plugins: []
} satisfies Config;
