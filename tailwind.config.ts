import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    screens: {
      xs: "390px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        heading: ["'Plus Jakarta Sans'", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // ── Primary palette (2 colors + neutral) ──
        ink: "#0f172a",
        navy: "#0a1128",
        mist: "#f8fafc",

        brand: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
        },

        // ── Extended slate for sidebar & depth ──
        slate: {
          850: "#131b2e",
          950: "#080d1a",
        },

        // ── Functional status (used sparingly for badges only) ──
        status: {
          success: "#16a34a",
          warning: "#d97706",
          info: "#2563eb",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)",
        "card-hover": "0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.06)",
        dropdown: "0 10px 40px -4px rgba(0, 0, 0, 0.14), 0 2px 8px -2px rgba(0, 0, 0, 0.06)",
        modal: "0 20px 60px -10px rgba(0, 0, 0, 0.2)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      animation: {
        "fade-in": "fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-slow": "pulseSlow 2.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseSlow: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.05)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
