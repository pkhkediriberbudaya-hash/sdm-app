/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef3f8',
          100: '#d3e0ec',
          400: '#3d6690',
          600: '#22456b',
          700: '#1d3557',
          800: '#152840',
          900: '#0f1c2c',
        },
        rust: {
          400: '#f0925a',
          500: '#e9762b',
          600: '#c95f1c',
        },
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
