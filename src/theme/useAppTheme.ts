import { useColorScheme } from 'react-native';
import { useMaterial3Theme } from '@pchmn/expo-material3-theme';

export interface AppThemeColors {
  background: string;
  surface: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  onBackground: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  // Specific Expressive Priority Colors
  highPriority: string;
  highPriorityContainer: string;
  onHighPriorityContainer: string;
  mediumPriority: string;
  mediumPriorityContainer: string;
  onMediumPriorityContainer: string;
  lowPriority: string;
  lowPriorityContainer: string;
  onLowPriorityContainer: string;
  nonePriority: string;
  nonePriorityContainer: string;
  onNonePriorityContainer: string;
}

export const fallbackDarkColors: AppThemeColors = {
  background: '#141218',
  surface: '#141218',
  surfaceContainerLowest: '#0F0D13',
  surfaceContainerLow: '#1D1B20',
  surfaceContainer: '#211F26',
  surfaceContainerHigh: '#2B2930',
  surfaceContainerHighest: '#36343B',
  primary: '#D0BCFF',
  onPrimary: '#381E72',
  primaryContainer: '#4F378B',
  onPrimaryContainer: '#EADDFF',
  secondary: '#CCC2DC',
  onSecondary: '#332D41',
  secondaryContainer: '#4A4458',
  onSecondaryContainer: '#E8DEF8',
  tertiary: '#EFB8C8',
  onTertiary: '#492532',
  tertiaryContainer: '#633B48',
  onTertiaryContainer: '#FFD8E4',
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',
  onBackground: '#E6E0E9',
  onSurface: '#E6E0E9',
  onSurfaceVariant: '#CAC4D0',
  outline: '#938F99',
  outlineVariant: '#49454F',
  // Priority Colors
  highPriority: '#FFB4AB',
  highPriorityContainer: '#690005',
  onHighPriorityContainer: '#FFDAD6',
  mediumPriority: '#FFD8E4',
  mediumPriorityContainer: '#4A3440',
  onMediumPriorityContainer: '#FFD8E4',
  lowPriority: '#B4F1DF',
  lowPriorityContainer: '#1F3C34',
  onLowPriorityContainer: '#B4F1DF',
  nonePriority: '#938F99',
  nonePriorityContainer: '#2B2930',
  onNonePriorityContainer: '#CAC4D0',
};

export const fallbackLightColors: AppThemeColors = {
  background: '#FEF7FF',
  surface: '#FEF7FF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F7F2FA',
  surfaceContainer: '#F3EDF7',
  surfaceContainerHigh: '#ECE6F0',
  surfaceContainerHighest: '#E6E0E9',
  primary: '#6750A4',
  onPrimary: '#FFFFFF',
  primaryContainer: '#EADDFF',
  onPrimaryContainer: '#21005D',
  secondary: '#625B71',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E8DEF8',
  onSecondaryContainer: '#1D192B',
  tertiary: '#7D5260',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFD8E4',
  onTertiaryContainer: '#31111D',
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  onBackground: '#1D1B20',
  onSurface: '#1D1B20',
  onSurfaceVariant: '#49454F',
  outline: '#79747E',
  outlineVariant: '#CAC4D0',
  // Priority Colors
  highPriority: '#BA1A1A',
  highPriorityContainer: '#FFDAD6',
  onHighPriorityContainer: '#410002',
  mediumPriority: '#7D5260',
  mediumPriorityContainer: '#FFD8E4',
  onMediumPriorityContainer: '#31111D',
  lowPriority: '#006B56',
  lowPriorityContainer: '#A2F2D7',
  onLowPriorityContainer: '#002018',
  nonePriority: '#79747E',
  nonePriorityContainer: '#ECE6F0',
  onNonePriorityContainer: '#49454F',
};

export function useAppTheme() {
  const systemColorScheme = useColorScheme();
  const isDark = systemColorScheme !== 'light'; // Default to dark for premium deep plum
  const { theme } = useMaterial3Theme({ fallbackSourceColor: '#6750A4' });

  const m3Colors = isDark ? theme.dark : theme.light;
  const fallback = isDark ? fallbackDarkColors : fallbackLightColors;

  const colors: AppThemeColors = {
    background: m3Colors?.background || fallback.background,
    surface: m3Colors?.surface || fallback.surface,
    surfaceContainerLowest: (m3Colors as any)?.surfaceContainerLowest || fallback.surfaceContainerLowest,
    surfaceContainerLow: (m3Colors as any)?.surfaceContainerLow || fallback.surfaceContainerLow,
    surfaceContainer: (m3Colors as any)?.surfaceContainer || fallback.surfaceContainer,
    surfaceContainerHigh: (m3Colors as any)?.surfaceContainerHigh || fallback.surfaceContainerHigh,
    surfaceContainerHighest: (m3Colors as any)?.surfaceContainerHighest || fallback.surfaceContainerHighest,
    primary: m3Colors?.primary || fallback.primary,
    onPrimary: m3Colors?.onPrimary || fallback.onPrimary,
    primaryContainer: m3Colors?.primaryContainer || fallback.primaryContainer,
    onPrimaryContainer: m3Colors?.onPrimaryContainer || fallback.onPrimaryContainer,
    secondary: m3Colors?.secondary || fallback.secondary,
    onSecondary: m3Colors?.onSecondary || fallback.onSecondary,
    secondaryContainer: m3Colors?.secondaryContainer || fallback.secondaryContainer,
    onSecondaryContainer: m3Colors?.onSecondaryContainer || fallback.onSecondaryContainer,
    tertiary: m3Colors?.tertiary || fallback.tertiary,
    onTertiary: m3Colors?.onTertiary || fallback.onTertiary,
    tertiaryContainer: m3Colors?.tertiaryContainer || fallback.tertiaryContainer,
    onTertiaryContainer: m3Colors?.onTertiaryContainer || fallback.onTertiaryContainer,
    error: m3Colors?.error || fallback.error,
    onError: m3Colors?.onError || fallback.onError,
    errorContainer: m3Colors?.errorContainer || fallback.errorContainer,
    onErrorContainer: m3Colors?.onErrorContainer || fallback.onErrorContainer,
    onBackground: m3Colors?.onBackground || fallback.onBackground,
    onSurface: m3Colors?.onSurface || fallback.onSurface,
    onSurfaceVariant: m3Colors?.onSurfaceVariant || fallback.onSurfaceVariant,
    outline: m3Colors?.outline || fallback.outline,
    outlineVariant: m3Colors?.outlineVariant || fallback.outlineVariant,
    // Custom Priority Colors
    highPriority: fallback.highPriority,
    highPriorityContainer: fallback.highPriorityContainer,
    onHighPriorityContainer: fallback.onHighPriorityContainer,
    mediumPriority: fallback.mediumPriority,
    mediumPriorityContainer: fallback.mediumPriorityContainer,
    onMediumPriorityContainer: fallback.onMediumPriorityContainer,
    lowPriority: fallback.lowPriority,
    lowPriorityContainer: fallback.lowPriorityContainer,
    onLowPriorityContainer: fallback.onLowPriorityContainer,
    nonePriority: fallback.nonePriority,
    nonePriorityContainer: fallback.nonePriorityContainer,
    onNonePriorityContainer: fallback.onNonePriorityContainer,
  };

  return {
    colors,
    isDark,
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
      xxl: 24,
    },
    radii: {
      card: 28,
      sheet: 28,
      fab: 20,
      pill: 9999,
      sm: 8,
      md: 12,
      lg: 16,
    },
    typography: {
      editorialHeader: {
        fontSize: 40,
        fontWeight: '800' as const,
        letterSpacing: -0.5,
      },
      titleLarge: {
        fontSize: 22,
        fontWeight: '700' as const,
        letterSpacing: -0.3,
      },
      titleMedium: {
        fontSize: 17,
        fontWeight: '600' as const,
      },
      bodyLarge: {
        fontSize: 16,
        fontWeight: '400' as const,
        lineHeight: 22,
      },
      bodyMedium: {
        fontSize: 14,
        fontWeight: '400' as const,
        lineHeight: 20,
      },
      labelMedium: {
        fontSize: 12,
        fontWeight: '600' as const,
        letterSpacing: 0.2,
      },
      labelSmall: {
        fontSize: 11,
        fontWeight: '600' as const,
        letterSpacing: 0.3,
      },
    },
  };
}
