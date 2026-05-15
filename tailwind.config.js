module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      keyframes: {
        motivationHint: {
          '0%':   { opacity: '0' },
          '10%':  { opacity: '1' },
          '85%':  { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        'motivation-hint': 'motivationHint 2s ease-in-out forwards',
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}