import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#06070a",
        ember: "#e50914",
        gold: "#d8b35a"
      },
      boxShadow: {
        glow: "0 24px 70px rgba(229,9,20,.22)"
      }
    }
  },
  plugins: []
} satisfies Config;
