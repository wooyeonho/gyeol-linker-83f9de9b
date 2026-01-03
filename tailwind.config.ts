import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // 다크모드 기본
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00A86B', // Jade Green 메인 컬러
          50: '#E6F5F0',
          100: '#CCEBE1',
          200: '#99D7C3',
          300: '#66C3A5',
          400: '#33AF87',
          500: '#00A86B',
          600: '#008656',
          700: '#006441',
          800: '#00422B',
          900: '#002116',
        },
        'jade-green': '#00A86B',
      },
    },
  },
  plugins: [],
};

export default config;

