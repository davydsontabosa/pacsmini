import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:  'var(--bg)',
        s1:  'var(--s1)',
        s2:  'var(--s2)',
        bd:  'var(--bd)',
        ac:  'var(--ac)',
        ac2: 'var(--ac2)',
        tx:  'var(--tx)',
        mt:  'var(--mt)',
        ok:  'var(--ok)',
        wn:  'var(--wn)',
        er:  'var(--er)',
        surface:     'var(--s1)',
        'surface-alt': 'var(--s2)',
        border:      'var(--bd)',
        accent:      'var(--ac)',
        'accent-hover': 'var(--ac2)',
        'text-primary': 'var(--tx)',
        'text-muted':   'var(--mt)',
        success:     'var(--ok)',
        warning:     'var(--wn)',
        danger:      'var(--er)',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
} satisfies Config
