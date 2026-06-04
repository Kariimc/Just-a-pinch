export const Colors = {
  // Accents
  accent: '#2E9E57',
  accentDeep: '#1E7A41',
  accentSoft: '#E4F2E8',
  accentInk: '#14542C',

  // Light theme
  paper: '#FAF6EF',
  surface: '#FFFFFF',
  surface2: '#F4EEE4',
  ink: '#211C16',
  ink2: '#6A6157',
  ink3: '#9C9387',
  line: '#ECE4D7',
  line2: '#E0D6C6',

  // Dark theme
  darkPaper: '#15120D',
  darkSurface: '#211C15',
  darkSurface2: '#2B251C',
  darkInk: '#F5EEE1',
  darkInk2: '#B7AC9A',
  darkInk3: '#837A6B',
  darkLine: '#322B21',
  darkLine2: '#3D352A',

  error: '#D14545',
  instacart: '#0AAD0A',
  white: '#FFFFFF',
  transparent: 'transparent',
};

export const Fonts = {
  display: 'serif', // replaced by loaded font in app
  ui: 'System',
};

export const Radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 22,
  xl: 32,
};

export const Shadow = {
  card: {
    shadowColor: '#14100A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
};

// Food placeholder colours matching the design
export const FoodColors: Record<string, { a: string; b: string }> = {
  toast:  { a: '#c98a4e', b: '#ecc98f' },
  greens: { a: '#5f8a4c', b: '#aecb86' },
  berry:  { a: '#7d3f63', b: '#c98aa9' },
  soup:   { a: '#cf9b3f', b: '#ecd087' },
  bread:  { a: '#b07a44', b: '#e3bd84' },
  cream:  { a: '#b9a37e', b: '#e8dcc2' },
  tomato: { a: '#b34430', b: '#e89177' },
  choc:   { a: '#6b4423', b: '#a9794a' },
  blue:   { a: '#4a6f86', b: '#9fc0d2' },
};
