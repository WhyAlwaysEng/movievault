import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ultra-Clean Neo-Noir palette
        obsidian: "#060709", // Deep OLED Black
        surface: "#0c0e12",  // Card & component background
        accent: "#00f0ff",   // Refined Electric Cyan
        neon: "#ff0066",     // Refined Neon Pink
        mist: "#8b949e",     // Elegant slate text
      },
      fontFamily: {
        display: ["Space Grotesk", "Orbitron", "Inter", "system-ui", "sans-serif"],
        body: ["Inter", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 12px 40px rgba(0, 0, 0, 0.6)",
        subtle: "0 4px 20px rgba(0, 0, 0, 0.4)",
        "neon-cyan": "0 0 20px rgba(0, 240, 255, 0.2)",
        "neon-pink": "0 0 20px rgba(255, 0, 102, 0.2)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "pulse-glow-cyan": "pulseGlowCyan 2.4s ease-in-out infinite",
        "pulse-glow-pink": "pulseGlowPink 2.4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulseGlowCyan: {
          "0%, 100%": { boxShadow: "0 0 12px rgba(0,242,254,.25)" },
          "50%": { boxShadow: "0 0 28px rgba(0,242,254,.55)" },
        },
        pulseGlowPink: {
          "0%, 100%": { boxShadow: "0 0 12px rgba(255,0,127,.25)" },
          "50%": { boxShadow: "0 0 28px rgba(255,0,127,.55)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;