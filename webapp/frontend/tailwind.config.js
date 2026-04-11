/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          400: '#818CF8',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        surface: {
          DEFAULT:       '#FFFFFF',
          secondary:     '#F8FAFC',
          tertiary:      '#F1F5F9',
          border:        '#E2E8F0',
          'border-strong':'#CBD5E1',
        },
        risk: {
          low:       '#10B981',
          medium:    '#F59E0B',
          high:      '#EF4444',
          'low-bg':    '#ECFDF5',
          'medium-bg': '#FFFBEB',
          'high-bg':   '#FEF2F2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        xs:    ['12px', '16px'],
        sm:    ['13px', '18px'],
        base:  ['14px', '20px'],
        md:    ['15px', '22px'],
        lg:    ['16px', '24px'],
        xl:    ['18px', '26px'],
        '2xl': ['20px', '28px'],
        '3xl': ['24px', '32px'],
      },
      borderRadius: {
        sm:    '4px',
        DEFAULT:'6px',
        md:    '8px',
        lg:    '10px',
        xl:    '12px',
        '2xl': '16px',
        full:  '9999px',
      },
      boxShadow: {
        card:       '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover':'0 4px 12px 0 rgb(0 0 0 / 0.08)',
        dropdown:   '0 8px 24px 0 rgb(0 0 0 / 0.12)',
      },
    },
  },
  plugins: [],
}
