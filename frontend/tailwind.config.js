/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        kapya: {
          50: '#f6f6f6',
          100: '#ebebeb',
          200: '#d9d9d9',
          300: '#b8b8b8',
          400: '#8f8f8f',
          500: '#171717',
          600: '#121212',
          700: '#0d0d0d',
          800: '#080808',
          900: '#000000',
        },
        sage: {
          50: '#f3f3f3',
          100: '#e3e3e3',
          200: '#c7c7c7',
          300: '#aaaaaa',
          400: '#8e8e8e',
          500: '#737373',
          600: '#5e5e5e',
          700: '#4b4b4b',
          800: '#383838',
          900: '#262626',
        },
        porcelain: '#e4dfd9',
        'slate-night': '#1e1e24',
        sand: {
          50: '#f5f2ee',
          100: '#ece7e2',
          700: '#4b4b4b',
          900: '#050505',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      boxShadow: {
        soft: 'rgba(0, 0, 0, 0.07) 0px 6px 27px 0px',
        float: 'rgba(0, 0, 0, 0.09) 0px 12px 34px 0px',
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