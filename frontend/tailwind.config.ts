import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "sky-bg":     "var(--sky-bg)",
        "sky-panel":  "var(--sky-panel)",
        "sky-border": "var(--sky-border)",
        "sky-accent": "var(--sky-accent)",
        "sky-cyan":   "var(--sky-cyan)",
        "sky-text":   "var(--sky-text)",
        "sky-muted":  "var(--sky-muted)",
        "sky-surface":"var(--sky-surface)",
      },
    },
  },
  plugins: [],
};
export default config;
