export type ThemeMode = 'light' | 'dark' | 'high-contrast' | 'system';

export interface ColorPalette {
  // Primary colors
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
  
  // Secondary colors
  secondary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
  
  // Neutral/Gray colors
  neutral: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
  
  // Status colors
  success: {
    50: string;
    500: string;
    600: string;
    700: string;
  };
  
  warning: {
    50: string;
    500: string;
    600: string;
    700: string;
  };
  
  error: {
    50: string;
    500: string;
    600: string;
    700: string;
  };
  
  info: {
    50: string;
    500: string;
    600: string;
    700: string;
  };
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
}

export interface ThemeTypography {
  fontFamily: {
    sans: string[];
    mono: string[];
  };
  fontSize: {
    xs: [string, string];
    sm: [string, string];
    base: [string, string];
    lg: [string, string];
    xl: [string, string];
    '2xl': [string, string];
    '3xl': [string, string];
    '4xl': [string, string];
  };
  fontWeight: {
    normal: string;
    medium: string;
    semibold: string;
    bold: string;
  };
}

export interface ThemeBorderRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  full: string;
}

export interface ThemeDefinition {
  name: string;
  displayName: string;
  colors: ColorPalette;
  spacing: ThemeSpacing;
  typography: ThemeTypography;
  borderRadius: ThemeBorderRadius;
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

export interface CustomBrandingConfig {
  logo?: {
    url: string;
    alt: string;
    width?: number;
    height?: number;
  };
  companyName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customCSS?: string;
  favicon?: string;
}

export interface ThemeContextType {
  currentTheme: ThemeMode;
  themeDefinition: ThemeDefinition;
  systemPreference: 'light' | 'dark';
  customBranding?: CustomBrandingConfig;
  setTheme: (theme: ThemeMode) => void;
  setCustomBranding: (branding?: CustomBrandingConfig) => void;
  toggleTheme: () => void;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  customBranding?: CustomBrandingConfig;
  storageKey?: string;
} 