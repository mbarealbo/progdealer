/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark base palette
        'coal': {
          950: '#050507',
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1e1e28',
          600: '#2a2a36',
          500: '#3a3a48',
        },
        'asphalt': {
          900: '#1c1c24',
          800: '#2c2c36',
          700: '#3c3c48',
          600: '#4c4c5a',
          500: '#5c5c6e',
        },
        // Vibrant accent colors
        'neon': {
          green: '#39ff14',
          'green-dim': '#2bcc10',
          violet: '#8b5cf6',
          'violet-dim': '#7c3aed',
          cyan: '#06b6d4',
          pink: '#ec4899',
        },
        'industrial-green': {
          900: '#0a1f0a',
          800: '#153015',
          700: '#1f421f',
          600: '#39ff14',
          500: '#5fff3d',
          400: '#80ff66',
        },
        'burgundy': {
          900: '#2e1a1a',
          800: '#3e2a2a',
          700: '#4e3a3a',
          600: '#5e4a4a',
          500: '#6e5a5a',
        }
      },
      fontFamily: {
        'condensed': ['Arial Narrow', 'Liberation Sans Narrow', 'sans-serif'],
        'industrial': ['Impact', 'Franklin Gothic Bold', 'Arial Black', 'sans-serif'],
        'rock-salt': ['Rock Salt', 'cursive'],
      },
      letterSpacing: {
        'ultra-wide': '0.2em',
        'mega-wide': '0.3em',
      },
      backgroundImage: {
        'noise': "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 256 256\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\" opacity=\"0.03\"/%3E%3C/svg%3E')",
      }
    },
  },
  plugins: [],
};