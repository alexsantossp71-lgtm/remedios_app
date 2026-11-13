/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'media',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#0f766e',
          green: '#0d9488',
          red: '#dc4c4c',
          yellow: '#d99a24',
          gray: {
            50: '#f8fafc',
            100: '#f1f5f6',
            200: '#e2e8ea',
            300: '#cbd5d9',
            400: '#94a3a8',
            500: '#647477',
            600: '#47585b',
            700: '#334448',
            800: '#1e3034',
            900: '#102326',
          },
        },
      },
      boxShadow: {
        soft: '0 8px 28px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
};
