/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light theme colors
        'light-bg': '#ffffff',
        'light-surface': '#f3f4f6',
        'light-border': '#e5e7eb',
        'light-text': '#111827',
        
        // Dark theme colors
        'dark-bg': '#111827',
        'dark-surface': '#1f2937',
        'dark-border': '#374151',
        'dark-text': '#f9fafb',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      },
    },
  },
  plugins: [],
};