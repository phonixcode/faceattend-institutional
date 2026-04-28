/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display",
               "Segoe UI", "system-ui", "sans-serif"],
      },
      colors: {
        navy : { DEFAULT: "#0F172A", 50: "#f8fafc", 900: "#0F172A" },
        brand: { DEFAULT: "#2563EB", light: "#EFF6FF", dark: "#1D4ED8" },
      },
      borderRadius: { xl: "1rem", "2xl": "1.25rem", "3xl": "1.5rem" },
      boxShadow: {
        card  : "0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)",
        modal : "0 20px 60px rgba(0,0,0,.15)",
        glow  : "0 0 0 3px rgba(37,99,235,.15)",
      },
      animation: {
        "fade-in"  : "fadeIn .2s ease-out",
        "slide-up" : "slideUp .25s cubic-bezier(.16,1,.3,1)",
        "scale-in" : "scaleIn .2s cubic-bezier(.16,1,.3,1)",
        "pulse-slow": "pulse 3s cubic-bezier(.4,0,.6,1) infinite",
      },
      keyframes: {
        fadeIn  : { from: { opacity: 0 },                    to: { opacity: 1 } },
        slideUp : { from: { opacity: 0, transform: "translateY(12px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        scaleIn : { from: { opacity: 0, transform: "scale(.96)" },       to: { opacity: 1, transform: "scale(1)" } },
      },
    },
  },
  plugins: [],
}