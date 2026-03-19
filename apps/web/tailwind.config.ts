import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Modo claro
        'bg-base': '#F8FAFC',
        surface: '#FFFFFF',
        'surface-alt': '#F0F9FF',
        'text-base': '#1E293B',
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
        },
        secondary: '#10B981',
        accent: '#F59E0B',

        // Modo oscuro (prefijo dark-)
        'dark-bg-base': '#0F172A',
        'dark-surface': '#1E293B',
        'dark-text-base': '#E2E8F0',
        'dark-primary': '#60A5FA',
        'dark-secondary': '#34D399',
        'dark-accent': '#FBBF24',
      },
    },
  },
  plugins: [],
};

export default config;
