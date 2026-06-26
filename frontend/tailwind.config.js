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
        brand: {
          50: 'oklch(0.92 0.06 290)',
          100: 'oklch(0.85 0.08 290)',
          200: 'oklch(0.75 0.12 290)',
          300: 'oklch(0.65 0.16 285)',
          400: 'oklch(0.58 0.20 285)',
          500: 'oklch(0.52 0.22 280)',
          600: 'oklch(0.46 0.20 280)',
          700: 'oklch(0.40 0.18 280)',
          800: 'oklch(0.35 0.15 280)',
          900: 'oklch(0.30 0.12 280)',
        },
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      fontFamily: {
        display: ['"Noto Serif SC"', 'Newsreader', 'Georgia', 'serif'],
        body: ['"Noto Sans SC"', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', '"SF Mono"', 'monospace'],
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        30: '7.5rem',
      },
      maxWidth: {
        'content': '75ch',
      },
      boxShadow: {
        'card': '0 1px 2px oklch(1 0 0 / 0.03), 0 1px 3px oklch(1 0 0 / 0.04)',
        'card-hover': '0 10px 15px oklch(1 0 0 / 0.05), 0 4px 6px oklch(1 0 0 / 0.04)',
        'modal': '0 20px 25px oklch(1 0 0 / 0.06), 0 8px 10px oklch(1 0 0 / 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
        'slide-in-right': 'slideInRight 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
