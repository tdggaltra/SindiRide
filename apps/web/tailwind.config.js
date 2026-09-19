/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Escala ancorada nos azuis oficiais DriveSíndicos:
        // 600 = Azul Institucional (#185FA5), 800 = Azul Profundo (#0F4C81).
        // Antes desta mudança, 300/500/700 não existiam no config mas já
        // eram referenciados no código (sindico/index.tsx, mapas,
        // reset-password) — essas classes eram no-ops silenciosos.
        brand: {
          50:  '#E6F1FB',
          100: '#B5D4F4',
          200: '#85B7EB',
          300: '#5FA0E0',
          400: '#3BA6FF',
          500: '#2E7FC7',
          600: '#185FA5',
          700: '#125189',
          800: '#0F4C81',
          900: '#042C53',
        },
        success: '#00C853',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Manrope', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
    },
  },
  plugins: [],
}
