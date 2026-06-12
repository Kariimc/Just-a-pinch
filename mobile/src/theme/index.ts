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

// Font family names as loaded by expo-font
export const Fonts = {
  displayRegular: 'Newsreader_400Regular',
  displayRegularItalic: 'Newsreader_400Regular_Italic',
  displayMedium: 'Newsreader_500Medium',
  displayMediumItalic: 'Newsreader_500Medium_Italic',
  displaySemiBold: 'Newsreader_600SemiBold',
  uiRegular: 'HankenGrotesk_400Regular',
  uiMedium: 'HankenGrotesk_500Medium',
  uiSemiBold: 'HankenGrotesk_600SemiBold',
  uiBold: 'HankenGrotesk_700Bold',
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
  cardSoft: {
    shadowColor: '#14100A',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
  fab: {
    shadowColor: '#2E9E57',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
};

// Badge medallion metals. Each ramp is drawn by BadgeMedallion's SVG layers:
// rim* paints the polished outer ring, face* the inner dish, ink the engraving
// and icon, sparkle the glitter particles, glow the bloom behind earned badges.
// `stone` is the locked state — warm greys that sit quietly on paper surfaces.
export const BadgeMetals = {
  bronze: {
    rimLight: '#EDBE8E', rimMid: '#C98A4E', rimDeep: '#8C5526', edge: '#6E3F18',
    faceLight: '#F6D9B2', faceMid: '#E0AA72', faceDeep: '#BB8047',
    ink: '#5C3514', sparkle: '#FFEFD6', glow: 'rgba(201,138,78,0.55)',
  },
  silver: {
    rimLight: '#F4F4F2', rimMid: '#C9CDD1', rimDeep: '#8E959D', edge: '#6F7681',
    faceLight: '#FBFCFD', faceMid: '#DEE2E7', faceDeep: '#B8BFC8',
    ink: '#4E565F', sparkle: '#FFFFFF', glow: 'rgba(142,149,157,0.5)',
  },
  gold: {
    rimLight: '#FFE18C', rimMid: '#E9B940', rimDeep: '#B47E12', edge: '#8A5E07',
    faceLight: '#FFF1BA', faceMid: '#F5CF64', faceDeep: '#DAA934',
    ink: '#7A5605', sparkle: '#FFF7DA', glow: 'rgba(233,185,64,0.6)',
  },
  emerald: {
    rimLight: '#A4E2B8', rimMid: '#41B06B', rimDeep: '#1E7A41', edge: '#14542C',
    faceLight: '#DBF4E2', faceMid: '#82CF9D', faceDeep: '#48A76E',
    ink: '#0F4E27', sparkle: '#ECFFF2', glow: 'rgba(46,158,87,0.55)',
  },
  stone: {
    rimLight: '#E6DFD2', rimMid: '#CFC6B4', rimDeep: '#A99F8C', edge: '#8F8674',
    faceLight: '#F0EADE', faceMid: '#DED5C3', faceDeep: '#C6BCA8',
    ink: '#9C9387', sparkle: '#FFFFFF', glow: 'transparent',
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
