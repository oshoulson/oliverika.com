/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mist: '#cfd2cb',
        sage: '#626552',
        'sage-dark': '#414435',
        bone: '#f5f2ec',
        charcoal: '#1f1d1b',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        frame: '0 25px 70px rgba(0, 0, 0, 0.2)',
      },
    },
  },
  plugins: [],
}
