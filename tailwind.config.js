/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        ink: {
          950: '#07070c',
          900: '#0c0c14',
          850: '#11111b',
          800: '#171723',
          700: '#22222f',
          600: '#2e2e3e',
        },
        // Accent principal « vert électrique » : piloté par des variables CSS (voir index.css)
        // pour rester lisible en thème clair comme en thème sombre.
        brand: {
          50: 'rgb(var(--brand) / 0.06)',
          100: 'rgb(var(--brand) / 0.12)',
          200: 'rgb(var(--brand-hi) / <alpha-value>)',
          300: 'rgb(var(--brand-hi) / <alpha-value>)',
          400: 'rgb(var(--brand-hi) / <alpha-value>)',
          500: 'rgb(var(--brand) / <alpha-value>)',
          600: 'rgb(var(--brand) / <alpha-value>)',
          700: 'rgb(var(--brand-lo) / <alpha-value>)',
        },
        // Accent secondaire (équipe à l'extérieur, graphiques).
        electric: {
          400: 'rgb(var(--electric) / <alpha-value>)',
          500: 'rgb(var(--electric) / <alpha-value>)',
          600: 'rgb(var(--electric) / <alpha-value>)',
        },
        'on-brand': 'rgb(var(--on-brand) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.25), 0 8px 24px -12px rgba(0,0,0,0.45)',
        glow: '0 0 0 1px rgb(var(--brand) / 0.35), 0 8px 30px -10px rgb(var(--brand) / 0.45)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.97)' }, to: { opacity: '1', transform: 'none' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out both',
        'scale-in': 'scale-in 0.18s ease-out both',
        'slide-up': 'slide-up 0.25s ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};
