/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sand: {
          50: '#f8f7f1',
          100: '#f2f0e6',
          700: '#675f4a',
          900: '#2f2a1e',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}