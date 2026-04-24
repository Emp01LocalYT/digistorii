/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
      
  ],
  // Enable dark mode support as seen in the demo
  darkMode: "class", 
  theme: {
    extend: {
      fontFamily: {
        // This ensures 'font-sans' uses Inter, matching Image 1
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        // These specific shades give that "premium" look from the demo
        gray: {
          200: "#E2E8F0",
          400: "#94A3B8",
          500: "#64748B",
          800: "#1C2434", // The deep charcoal used for names/titles
        },
        blue: {
          600: "#3C50E0", // The brand blue for buttons/icons
        }
      },
    },
  },
  plugins: [],
};