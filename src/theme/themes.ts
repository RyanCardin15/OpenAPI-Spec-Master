import { ThemeDefinition } from './types';

// Shared design tokens
const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
};

const typography = {
  fontFamily: {
    sans: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ],
    mono: [
      'JetBrains Mono',
      'Fira Code',
      'Consolas',
      'Monaco',
      'monospace',
    ],
  },
  fontSize: {
    xs: ['0.75rem', '1rem'] as [string, string],
    sm: ['0.875rem', '1.25rem'] as [string, string],
    base: ['1rem', '1.5rem'] as [string, string],
    lg: ['1.125rem', '1.75rem'] as [string, string],
    xl: ['1.25rem', '1.75rem'] as [string, string],
    '2xl': ['1.5rem', '2rem'] as [string, string],
    '3xl': ['1.875rem', '2.25rem'] as [string, string],
    '4xl': ['2.25rem', '2.5rem'] as [string, string],
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

const borderRadius = {
  none: '0',
  sm: '0.125rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  full: '9999px',
};

// Light Theme
export const lightTheme: ThemeDefinition = {
  name: 'light',
  displayName: 'Light',
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },
    secondary: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87',
      950: '#3b0764',
    },
    neutral: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712',
    },
    success: {
      50: '#f0fdf4',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
    },
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
    },
    error: {
      50: '#fef2f2',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },
    info: {
      50: '#eff6ff',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
    },
  },
  spacing,
  typography,
  borderRadius,
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
};

// Dark Theme
export const darkTheme: ThemeDefinition = {
  name: 'dark',
  displayName: 'Dark',
  colors: {
    primary: {
      50: '#172554',
      100: '#1e3a8a',
      200: '#1e40af',
      300: '#1d4ed8',
      400: '#2563eb',
      500: '#3b82f6',
      600: '#60a5fa',
      700: '#93c5fd',
      800: '#bfdbfe',
      900: '#dbeafe',
      950: '#eff6ff',
    },
    secondary: {
      50: '#3b0764',
      100: '#581c87',
      200: '#6b21a8',
      300: '#7c3aed',
      400: '#9333ea',
      500: '#a855f7',
      600: '#c084fc',
      700: '#d8b4fe',
      800: '#e9d5ff',
      900: '#f3e8ff',
      950: '#faf5ff',
    },
    neutral: {
      50: '#030712',
      100: '#111827',
      200: '#1f2937',
      300: '#374151',
      400: '#4b5563',
      500: '#6b7280',
      600: '#9ca3af',
      700: '#d1d5db',
      800: '#e5e7eb',
      900: '#f3f4f6',
      950: '#f9fafb',
    },
    success: {
      50: '#0f1e13',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
    },
    warning: {
      50: '#1f1611',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
    },
    error: {
      50: '#1f1113',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },
    info: {
      50: '#172554',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
    },
  },
  spacing,
  typography,
  borderRadius,
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.5)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.5), 0 2px 4px -2px rgb(0 0 0 / 0.5)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.5)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)',
  },
};

// High Contrast Theme
export const highContrastTheme: ThemeDefinition = {
  name: 'high-contrast',
  displayName: 'High Contrast',
  colors: {
    primary: {
      50: '#000000',
      100: '#1a1a1a',
      200: '#333333',
      300: '#4d4d4d',
      400: '#666666',
      500: '#0066cc',
      600: '#0052a3',
      700: '#003d7a',
      800: '#002952',
      900: '#001429',
      950: '#000000',
    },
    secondary: {
      50: '#000000',
      100: '#1a1a1a',
      200: '#333333',
      300: '#4d4d4d',
      400: '#666666',
      500: '#9900cc',
      600: '#7a00a3',
      700: '#5c007a',
      800: '#3d0052',
      900: '#1f0029',
      950: '#000000',
    },
    neutral: {
      50: '#000000',
      100: '#1a1a1a',
      200: '#333333',
      300: '#4d4d4d',
      400: '#666666',
      500: '#808080',
      600: '#999999',
      700: '#b3b3b3',
      800: '#cccccc',
      900: '#e6e6e6',
      950: '#ffffff',
    },
    success: {
      50: '#000000',
      500: '#00cc44',
      600: '#00a336',
      700: '#007a29',
    },
    warning: {
      50: '#000000',
      500: '#ffcc00',
      600: '#cca300',
      700: '#997a00',
    },
    error: {
      50: '#000000',
      500: '#ff0033',
      600: '#cc0029',
      700: '#99001f',
    },
    info: {
      50: '#000000',
      500: '#0066cc',
      600: '#0052a3',
      700: '#003d7a',
    },
  },
  spacing,
  typography,
  borderRadius,
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 1), 0 2px 4px -2px rgb(0 0 0 / 1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 1), 0 4px 6px -4px rgb(0 0 0 / 1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 1), 0 8px 10px -6px rgb(0 0 0 / 1)',
  },
};

// Default theme mapping
export const themes = {
  light: lightTheme,
  dark: darkTheme,
  'high-contrast': highContrastTheme,
} as const;

export const getThemeDefinition = (themeName: keyof typeof themes): ThemeDefinition => {
  return themes[themeName];
}; 