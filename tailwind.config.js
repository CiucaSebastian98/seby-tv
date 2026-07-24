/** @type {import('tailwindcss').Config} */
const c = (v) => `rgb(var(${v}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Tokeni semantici, alimentați din CSS vars (vezi index.css). Canale RGB
        // ca să funcționeze modificatorii de opacitate (ex. bg-bg/70).
        bg: c('--c-bg'),
        elev: c('--c-elev'),
        card: c('--c-card'),
        edge: c('--c-edge'),
        fg: c('--c-fg'),
        muted: c('--c-muted'),
        accent: c('--c-accent'),
        'accent-2': c('--c-accent-2'),
        focus: c('--c-focus'),
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        focus: '0 0 0 4px rgb(var(--c-focus) / 0.9), 0 20px 50px -12px rgba(0,0,0,0.55)',
        card: '0 12px 30px -12px rgba(0,0,0,0.5)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'slide-in': {
          '0%': { opacity: 0, transform: 'translateX(48px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' },
        },
        progress: {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 0.4s ease both',
        'slide-in': 'slide-in 0.45s cubic-bezier(0.22,1,0.36,1) both',
        // Durata TREBUIE să fie egală cu ROTATE_MS din Hero.jsx (7s).
        progress: 'progress 7s linear both',
      },
    },
  },
  plugins: [],
}
