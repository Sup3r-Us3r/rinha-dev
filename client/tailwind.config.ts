import type { Config } from 'tailwindcss';

const config: Config = {
  theme: {
    extend: {
      keyframes: {
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0.35' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        blink: 'blink 1s steps(2, end) infinite',
        float: 'float 2s ease-in-out infinite',
      },
    },
  },
};

export default config;
