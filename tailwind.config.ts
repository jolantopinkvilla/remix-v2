import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "tertiary-fixed-dim": "#ffb1c1",
        "primary-container": "#e4006c",
        "on-surface-variant": "#5c3f45",
        "on-error": "#ffffff",
        "outline": "#906e75",
        "secondary-fixed-dim": "#c8c6c5",
        "background": "#faf9f9",
        "surface": "#faf9f9",
        "on-tertiary-fixed": "#3f0018",
        "on-background": "#1b1c1c",
        "on-tertiary-container": "#fffbff",
        "secondary-container": "#e2dfde",
        "primary-fixed-dim": "#ffb1c3",
        "tertiary-container": "#dd2269",
        "surface-container": "#efeded",
        "surface-variant": "#e3e2e2",
        "on-primary-container": "#fffbff",
        "on-secondary-fixed": "#1b1c1c",
        "surface-dim": "#dbdad9",
        "secondary": "#5f5e5e",
        "surface-container-highest": "#e3e2e2",
        "surface-container-high": "#e9e8e8",
        "on-secondary-fixed-variant": "#474746",
        "primary-fixed": "#ffd9e0",
        "secondary-fixed": "#e5e2e1",
        "on-primary-fixed": "#3f0019",
        "on-primary-fixed-variant": "#8f0041",
        "on-primary": "#ffffff",
        "surface-container-low": "#f5f3f3",
        "on-surface": "#1b1c1c",
        "tertiary": "#b70052",
        "on-error-container": "#93000a",
        "surface-bright": "#faf9f9",
        "on-tertiary": "#ffffff",
        "inverse-primary": "#ffb1c3",
        "on-secondary-container": "#636262",
        "inverse-surface": "#303031",
        "surface-tint": "#bb0058",
        "on-tertiary-fixed-variant": "#8f003f",
        "on-secondary": "#ffffff",
        "inverse-on-surface": "#f2f0f0",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "tertiary-fixed": "#ffd9df",
        "primary": "#b60055",
        "surface-container-lowest": "#ffffff",
        "outline-variant": "#e5bcc4"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      fontFamily: {
        "headline": ["Plus Jakarta Sans"],
        "body": ["Be Vietnam Pro"],
        "label": ["Be Vietnam Pro"]
      }
    },
  },
  plugins: [],
};

export default config;
