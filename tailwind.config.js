/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        elevated: "var(--elevated)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        sunken: "var(--sunken)",
        "accent-soft": "var(--accent-soft)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        accent: "var(--accent)",
        "accent-strong": "var(--accent-strong)",
        "accent-ink": "var(--accent-ink)",
        steel: "var(--steel)",
        "steel-elevated": "var(--steel-elevated)",
        "steel-line": "var(--steel-line)",
        "steel-ink": "var(--steel-ink)",
        "steel-ink-muted": "var(--steel-ink-muted)",
        brand: "var(--brand)",
        "brand-strong": "var(--brand-strong)",
        "brand-deep": "var(--brand-deep)",
        "brand-glow": "var(--brand-glow)",
        "brand-ink": "var(--brand-ink)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)"],
      },
    },
  },
  plugins: [],
};
