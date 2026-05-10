export const palette = {
  primary: '#1B7FF0',
  primaryLight: '#EBF4FF',
  primaryDark: '#1564C0',
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray600: '#4B5563',
  gray800: '#1F2937',
  charcoal: '#111827',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  overlay: 'rgba(0,0,0,0.35)',
  frostedWhite: 'rgba(255,255,255,0.88)',
  frostedDark: 'rgba(17,24,39,0.55)',
} as const;

export const colors = {
  primary: palette.primary,
  primaryLight: palette.primaryLight,
  primaryDark: palette.primaryDark,
  primaryPressed: palette.primaryDark,
  primarySoft: palette.primaryLight,
  white: palette.white,
  gray50: palette.gray50,
  gray100: palette.gray100,
  gray200: palette.gray200,
  gray400: palette.gray400,
  gray600: palette.gray600,
  gray800: palette.gray800,
  charcoal: palette.charcoal,
  success: palette.success,
  successSoft: '#D1FAE5',
  warning: palette.warning,
  warningSoft: '#FEF3C7',
  danger: palette.danger,
  dangerSoft: '#FEE2E2',
  overlay: palette.overlay,
  frostedWhite: palette.frostedWhite,
  frostedDark: palette.frostedDark,
  background: palette.white,
  surface: palette.white,
  surfaceAlt: palette.gray100,
  border: palette.gray200,
  text: palette.charcoal,
  textMuted: palette.gray600,
  textSubtle: palette.gray400,
  secondary: palette.primary,
  secondarySoft: palette.gray100,
  accent: palette.warning,
  accentSoft: '#FEF3C7',
  focus: palette.primary,
  disabled: palette.gray200,
  disabledText: palette.gray400,
} as const;

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
  pill: 999,
} as const;

export const fontFamily = {
  display: 'Nunito_900Black',
  headingExtraBold: 'Nunito_800ExtraBold',
  headingBold: 'Nunito_700Bold',
  label: 'Nunito_700Bold',
  labelSemiBold: 'Nunito_600SemiBold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
} as const;

const typeSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 42,
  price: 24,
} as const;

const lineHeight = {
  xs: 18,
  sm: 22,
  md: 22,
  lg: 24,
  xl: 28,
  xxl: 34,
  display: 48,
  price: 30,
} as const;

const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

export const typography = {
  fontFamily,
  size: typeSize,
  lineHeight,
  weight: fontWeight,
  display: {
    color: colors.white,
    fontFamily: fontFamily.display,
    fontSize: typeSize.display,
    fontWeight: fontWeight.black,
    letterSpacing: 0,
    lineHeight: lineHeight.display,
  },
  h1: {
    color: colors.charcoal,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: typeSize.xxl,
    fontWeight: fontWeight.extrabold,
    letterSpacing: 0,
    lineHeight: lineHeight.xxl,
  },
  h2: {
    color: colors.charcoal,
    fontFamily: fontFamily.headingBold,
    fontSize: typeSize.xl,
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.xl,
  },
  h3OnPhoto: {
    color: colors.white,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 20,
    fontWeight: fontWeight.extrabold,
    lineHeight: 26,
  },
  label: {
    color: colors.charcoal,
    fontFamily: fontFamily.label,
    fontSize: typeSize.md,
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.md,
  },
  body: {
    color: colors.gray600,
    fontFamily: fontFamily.body,
    fontSize: typeSize.sm,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.sm,
  },
  bodyMedium: {
    color: colors.gray800,
    fontFamily: fontFamily.bodyMedium,
    fontSize: typeSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.sm,
  },
  caption: {
    color: colors.gray400,
    fontFamily: fontFamily.body,
    fontSize: typeSize.xs,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.xs,
  },
  price: {
    color: colors.charcoal,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: typeSize.price,
    fontWeight: fontWeight.extrabold,
    lineHeight: lineHeight.price,
  },
} as const;

export const shadows = {
  none: {
    shadowOpacity: 0,
    elevation: 0,
  },
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  button: {
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

export const layout = {
  screenPadding: 20,
  sectionGap: 28,
  contentMaxWidth: 760,
  minTouchTarget: 44,
  cardRadius: radius.lg,
  featuredCardHeight: 220,
  secondaryCardHeight: 180,
  bottomSheetRadius: radius.xl,
} as const;

export const textStyles = {
  display: typography.display,
  h1: typography.h1,
  h2: typography.h2,
  h3OnPhoto: typography.h3OnPhoto,
  label: typography.label,
  body: typography.body,
  bodyMedium: typography.bodyMedium,
  caption: typography.caption,
  price: typography.price,
} as const;

export const motion = {
  fast: 200,
  normal: 300,
  slow: 450,
} as const;

export const theme = {
  palette,
  colors,
  spacing,
  radius,
  fontFamily,
  typography,
  shadows,
  layout,
  textStyles,
  motion,
} as const;

export type Theme = typeof theme;
