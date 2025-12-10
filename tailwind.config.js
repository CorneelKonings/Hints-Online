/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        christmas: ['"Mountains of Christmas"', 'cursive'],
      },
      colors: {
        xmas: {
          red: '#E63946',         // Vibrant modern red
          darkred: '#9B2226',     // Deep elegant red
          green: '#2A9D8F',       // Modern teal/green
          darkgreen: '#264653',   // Deep slate green
          gold: '#E9C46A',        // Warm gold
          cream: '#F1FAEE',       // Off-white
          background: '#1D3557',  // Deep navy winter night
        }
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'wiggle': 'wiggle 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'fall': 'fall 10s linear infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fall: {
          '0%': { transform: 'translateY(-10vh) translateX(0)' },
          '100%': { transform: 'translateY(110vh) translateX(20px)' },
        }
      }
    },
  },
  plugins: [],
}