/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#08080b',
        elev: '#101015',
        card: '#17171e',
        edge: '#26262f',
        muted: '#8b8b96',
        accent: '#e11d2a', // roșu cinematic
        'accent-2': '#ff5a3c',
        focus: '#ffcf4d', // inel de focus (vizibilitate TV)
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        focus: '0 0 0 4px rgba(255,207,77,0.9), 0 20px 50px -12px rgba(0,0,0,0.8)',
        card: '0 12px 30px -12px rgba(0,0,0,0.7)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 0.4s ease both',
      },
    },
  },
  plugins: [],
}
