import type { Config } from "tailwindcss";
export default { content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"], theme: { extend: { colors: { ink: "#080a0f", ember: "#e50914" } } }, plugins: [] } satisfies Config;
