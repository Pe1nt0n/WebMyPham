/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      colors: {
        lumiere: {
          50: '#fdf6f7',
          100: '#fbecef',
          200: '#f7d9e0',
          300: '#f0b9c6',
          400: '#e58ea3',
          500: '#d76682',
          600: '#c24868',
          700: '#a33653',
          800: '#882f48',
          900: '#742b40',
          950: '#411421',
        },
        champagne: {
          50: '#fbf9f5',
          100: '#f5f0e6',
          200: '#eadecd',
          300: '#dcc6ab',
          400: '#caa782',
          500: '#bc8f65',
          600: '#af7a56',
          700: '#926248',
          800: '#77523e',
          900: '#614334',
        },
      },
      keyframes: {
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateX(24px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'modal-in': {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'toast-in': 'toast-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.25s ease-out',
        'modal-in': 'modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
