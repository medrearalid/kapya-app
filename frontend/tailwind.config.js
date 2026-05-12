/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        kapya: {
          50: '#fff1f2',
          100: '#ffe0e3',
          200: '#ffc5cb',
          300: '#ff9ba6',
          400: '#f06d7c',
          500: '#e63946',
          600: '#cd2f3d',
          700: '#a62431',
          800: '#7e1c26',
          900: '#4f1118',
        },
        sage: {
          50: '#e9faf8',
          100: '#cdf3ee',
          200: '#a0e6dd',
          300: '#72d6c8',
          400: '#45c1b1',
          500: '#2a9d8f',
          600: '#228277',
          700: '#1b665d',
          800: '#144a44',
          900: '#0d2f2b',
        },
        porcelain: '#f8f9fa',
        'slate-night': '#1e1e24',
        sand: {
          50: '#f7f7f3',
          100: '#efeee6',
          700: '#666050',
          900: '#2b2822',
        },
      },
      fontFamily: {
        sans: ['Sora', 'Segoe UI', 'sans-serif'],
        display: ['Fraunces', 'serif'],
      },
      boxShadow: {
        soft: '0 10px 35px rgba(21, 28, 44, 0.08)',
        float: '0 18px 45px rgba(230, 57, 70, 0.28)',
      },
      keyframes: {
        'kapya-pulse': {
          '0%, 100%': {
            transform: 'scale(1)',
            boxShadow: '0 12px 28px rgba(230, 57, 70, 0.18)',
          },
          '50%': {
            transform: 'scale(1.03)',
            boxShadow: '0 18px 36px rgba(230, 57, 70, 0.3)',
          },
        },
      },
      animation: {
        'kapya-pulse': 'kapya-pulse 3.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}