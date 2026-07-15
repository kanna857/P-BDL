/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        microsoft: {
          blue: '#0078d4',       // Fluent Blue
          blueHover: '#106ebe',  // Fluent Blue Hover
          blueLight: '#eff6fc',  // Very light brand blue
          bgLight: '#f3f2f1',    // Fluent grey page background
          cardLight: '#ffffff',  // Fluent white card background
          textLight: '#323130',  // Fluent primary dark text
          subtextLight: '#605e5c',// Fluent secondary text
          borderLight: '#edebe9',// Fluent border color
          
          bgDark: '#030712',     // Custom deep dark mode page background (deep slate/black)
          cardDark: '#080c1c',   // Card background for dark mode (sleek dark blue)
          textDark: '#f3f4f6',   // Dark mode primary light text
          subtextDark: '#9ca3af',// Dark mode secondary text
          borderDark: '#1e293b'  // Dark mode border color
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Segoe UI', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
