import type { Config } from "tailwindcss";

const config: Config = {
  // The app sets <html class="dark">, so dark: variants must follow that class
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./types.ts",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
      },
      colors: {
        brand: {
          nile: "#2350FF",
          indigo: "#5B3DF5",
          teal: "#21E3C0",
          ink: "#0B1230",
        },
        lab: {
          950: "#070b14",
          900: "#0b1120",
          850: "#0f172a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
