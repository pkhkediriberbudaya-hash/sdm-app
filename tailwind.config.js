/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Palet biru terinspirasi SIKS-NG: gradasi navy tua -> biru langit
        brand: {
          50: '#eaf3fc',
          100: '#d3e6fa',
          400: '#3d7fd9',
          500: '#2566c9',
          600: '#1a56b0',
          700: '#154a94',
          800: '#123d78',
          900: '#0d2c58',
        },
        sky: {
          400: '#5bb8f5',
          500: '#4a9eea',
        },
        accent: {
          green: '#16a34a',
          red: '#dc2626',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #123d78 0%, #1a56b0 45%, #4a9eea 100%)',
        'brand-gradient-header': 'linear-gradient(90deg, #154a94 0%, #2566c9 55%, #4a9eea 100%)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
