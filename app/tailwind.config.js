/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      // Nomi semantici mappati ai token CSS (OKLCH) di src/styles/index.css.
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        raised: "var(--raised)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        weekend: "var(--weekend)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          ink: "var(--primary-ink)",
          wash: "var(--primary-wash)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          ink: "var(--accent-ink)",
          wash: "var(--accent-wash)",
        },
        danger: "var(--danger)",
        now: "var(--now)",
      },
      fontFamily: {
        sans: "var(--font-sans)",
        serif: "var(--font-serif)",
        mono: "var(--font-mono)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        lg: "var(--shadow-lg)",
        card: "var(--shadow-card)",
      },
      zIndex: {
        dropdown: "1000",
        sticky: "1100",
        backdrop: "1200",
        modal: "1300",
        toast: "1400",
        tooltip: "1500",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
      },
    },
  },
  plugins: [],
};
