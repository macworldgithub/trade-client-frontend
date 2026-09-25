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
      },
      colors: {
        ink: "#0f172a",
        navy: "#0a1128",
        brand: {
          50: "#fff1f1",
          100: "#ffe1e1",
          500: "#ef2029",
          600: "#dc1922",
          700: "#b91018",
        },
        slate: {
          850: "#131b2e",
          950: "#080d1a",
        },
        teal: {
          DEFAULT: "#00838f",
          50: "#e0f7fa",
          100: "#b2ebf2",
          500: "#00acc1",
          600: "#00838f",
          700: "#006064",
        },
        coral: {
          DEFAULT: "#ef2029",
        },
        mist: "#f8fafc",
      },
      boxShadow: {
        card: "0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.08)",
        dropdown: "0 10px 30px rgba(0, 0, 0, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
