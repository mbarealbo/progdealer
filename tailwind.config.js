/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Industrial color palette
        'coal': {
          900: '#0a0a0a',
          800: '#1a1a1a',
          700: '#2a2a2a',
          600: '#3a3a3a',
          500: '#4a4a4a',
        },
        'asphalt': {
          900: '#1c1c1e',
          800: '#2c2c2e',
          700: '#3c3c3e',
          600: '#4c4c4e',
          500: '#5c5c5e',
        },
        'industrial-green': {
          900: '#1a2e1a',
          800: '#2a3e2a',
          700: '#3a4e3a',
          600: '#4a5e4a',
          500: '#5a6e5a',
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