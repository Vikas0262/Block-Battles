/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#c7d7ff',
          300: '#a3bfff',
          400: '#5c8eff',
          500: '#155eff',
          600: '#0041e6',
          700: '#0033b3',
          800: '#002580',
          900: '#00174d',
        },
        secondary: {
          50: '#faf5ff',
          100: '#f5ebff',
          200: '#e6ccff',
          300: '#d7adff',
          400: '#b970ff',
          500: '#9b33ff',
          600: '#8000e6',
          700: '#6600b3',
          800: '#4d0080',
          900: '#33004d',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-up': 'scaleUp 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideIn: {
          from: { transform: 'translateX(400px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        scaleUp: {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
