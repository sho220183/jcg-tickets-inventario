/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Identidad JCG Infotech (misma línea que la landing page)
        navy: {
          50: '#eef2fb',
          100: '#d7e0f4',
          200: '#adc0e8',
          300: '#7f9bd9',
          400: '#4d6fc4',
          500: '#2c4ba3',
          600: '#1f3880',
          700: '#182c63',
          800: '#0f1c40',
          900: '#0a132c',
        },
        cyan: {
          50: '#e8fbfd',
          100: '#c8f4f9',
          200: '#93e8f2',
          300: '#5cd9e8',
          400: '#2ec5d9',
          500: '#15a4b8',
          600: '#0f8294',
          700: '#0d6577',
          800: '#0c4d5c',
          900: '#093a45',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
