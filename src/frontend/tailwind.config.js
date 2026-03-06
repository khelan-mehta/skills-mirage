/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mirage: {
          bg: '#0a0a0a',
          'bg-secondary': '#111111',
          card: 'rgba(255, 255, 255, 0.03)',
          'card-hover': 'rgba(255, 255, 255, 0.06)',
          teal: '#00d4aa',
          cyan: '#00bcd4',
          'teal-dim': 'rgba(0, 212, 170, 0.15)',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-accent': 'rgba(0, 212, 170, 0.3)',
        },
        risk: {
          critical: '#ff4444',
          high: '#ff8800',
          medium: '#ffcc00',
          low: '#00d4aa',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'teal-gradient': 'linear-gradient(180deg, #0a0a0a 0%, #0a2a2a 50%, rgba(0,212,170,0.13) 100%)',
        'accent-gradient': 'linear-gradient(135deg, #00d4aa, #00bcd4)',
        'grid-pattern': `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
      },
      backgroundSize: {
        'grid': '200px 200px',
      },
      animation: {
        'float-up': 'floatUp 20s linear infinite',
        'pulse-teal': 'pulseTeal 2s ease-in-out infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        floatUp: {
          '0%': { transform: 'translateY(100%) translateX(-50%)' },
          '100%': { transform: 'translateY(-100%) translateX(50%)' },
        },
        pulseTeal: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
