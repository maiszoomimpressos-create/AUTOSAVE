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
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
    },
  },
  plugins: [],
};
