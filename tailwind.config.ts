import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        srv: {
          bg:            'var(--srv-bg)',
          surface:       'var(--srv-surface)',
          surface2:      'var(--srv-surface2)',
          border:        'rgba(255,255,255,0.07)',
          accent:        'var(--srv-accent)',
          'accent-soft': 'var(--srv-accent-soft)',
          text:          'var(--srv-text)',
          'text-sub':    'var(--srv-text-sub)',
          'text-muted':  'var(--srv-text-muted)',
          ok:            'var(--srv-ok)',
          warn:          'var(--srv-warn)',
          crit:          'var(--srv-crit)',
          info:          'var(--srv-info)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '10': '10px',
        '12': '12px',
        '14': '14px',
      },
    },
  },
  plugins: [],
} satisfies Config;
