import type { Config } from "tailwindcss";

const config: Config = {
  // The app sets <html class="dark">, so dark: variants must follow that class
  // (Tailwind's default follows the OS setting, which caused theme clashes).
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Space Grotesk'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      colors: {
        lab: {
          950: "#070b14",
          900: "#0b1120",
        },
      },
    },
  },
  plugins: [],
};

export default config;
