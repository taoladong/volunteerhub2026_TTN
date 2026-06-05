/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Airtable Blue — primary CTA & interactive
        primary: {
          50:  '#f0f5ff',
          100: '#dbe8ff',
          200: '#b8d0ff',
          300: '#7aaaf5',
          400: '#4d84e8',
          500: '#2d64d4',
          600: '#1b61c9',  // Airtable Blue
          700: '#1552b0',
          800: '#0f3d85',
          900: '#0a2d66',
        },
        // Deep Navy — primary text & sidebar
        navy: {
          DEFAULT: '#181d26',
          50:  '#f3f4f6',
          100: '#e4e6eb',
          200: '#c8cbd4',
          300: '#9ca3b0',
          400: '#6b7585',
          500: '#4a5568',
          600: '#333d4d',
          700: '#232a38',
          800: '#181d26',  // Deep Navy
          900: '#0d1119',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      letterSpacing: {
        'tight-xs': '0.07px',
        'tight-sm': '0.08px',
        'tight':    '0.12px',
        'wide-sm':  '0.16px',
        'wide':     '0.18px',
        'wide-lg':  '0.28px',
      },
      borderRadius: {
        'btn': '12px',
        'card': '16px',
        'card-lg': '24px',
      },
      boxShadow: {
        'blue':     'rgba(0,0,0,0.32) 0px 0px 1px, rgba(0,0,0,0.08) 0px 0px 2px, rgba(45,127,249,0.28) 0px 1px 3px, rgba(0,0,0,0.06) 0px 0px 0px 0.5px inset',
        'blue-sm':  'rgba(45,127,249,0.20) 0px 1px 3px, rgba(0,0,0,0.06) 0px 0px 1px',
        'soft':     'rgba(15,48,106,0.05) 0px 0px 20px',
        'card':     '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
}
