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
        // Ink — neutral text scale (Linear/Notion-style)
        ink: {
          DEFAULT: '#0F0F0F',
          100: '#0F0F0F',
          80:  'rgba(15,15,15,0.80)',
          60:  'rgba(15,15,15,0.55)',
          35:  'rgba(15,15,15,0.35)',
          15:  'rgba(15,15,15,0.15)',
          8:   'rgba(15,15,15,0.08)',
          5:   'rgba(15,15,15,0.05)',
          3:   'rgba(15,15,15,0.03)',
        },
        // ── Direction A "Ấm áp tin cậy" warm tokens ──
        canvas: '#fbf7f1',          // warm ivory page background
        surface: '#ffffff',         // cards
        'surface-2': '#f6f1e9',     // subtle fills, table header, progress track
        accent: { DEFAULT: '#f0612f', 50: '#fdeee7', 700: '#d24c1d' },
        success: { DEFAULT: '#2f9e6e', 50: '#e7f5ee' },
        amber: { DEFAULT: '#e08c1a', 50: '#fdf3e0' },
        warmink: { DEFAULT: '#241f1a', 2: '#6b6258', 3: '#9b9286' },
        warmborder: { DEFAULT: '#ece4d8', 2: '#e0d6c7' },
      },
      fontFamily: {
        sans: ['Be Vietnam Pro', '-apple-system', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
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
        'media': '14px',
        'card': '18px',
        'card-lg': '24px',
      },
      boxShadow: {
        'blue':     'rgba(0,0,0,0.32) 0px 0px 1px, rgba(0,0,0,0.08) 0px 0px 2px, rgba(45,127,249,0.28) 0px 1px 3px, rgba(0,0,0,0.06) 0px 0px 0px 0.5px inset',
        'blue-sm':  'rgba(45,127,249,0.20) 0px 1px 3px, rgba(0,0,0,0.06) 0px 0px 1px',
        'soft':     'rgba(15,48,106,0.05) 0px 0px 20px',
        // warm card shadows (Direction A)
        'card':     '0 1px 2px rgba(60,45,25,0.04), 0 6px 20px -8px rgba(60,45,25,0.10)',
        'card-h':   '0 4px 8px rgba(60,45,25,0.06), 0 18px 40px -14px rgba(60,45,25,0.18)',
        'pop':      '0 12px 40px -10px rgba(60,45,25,0.22)',
      },
    },
  },
  plugins: [],
}
