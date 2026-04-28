/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#10B981', // Emerald 500
        secondary: '#064E3B', // Emerald 900
        accent: '#F59E0B', // Amber 500
        earth: '#78350F', // Amber 900
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
