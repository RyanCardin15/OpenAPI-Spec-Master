import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  ThemeMode, 
  ThemeContextType, 
  ThemeProviderProps, 
  CustomBrandingConfig,
  ThemeDefinition 
} from './types';
import { themes, getThemeDefinition } from './themes';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Hook to detect system color scheme preference
const useSystemPreference = (): 'light' | 'dark' => {
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return systemPreference;
};

// Hook for local storage persistence
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return [storedValue, setValue];
}

// Helper function to apply theme variables to CSS
const applyThemeVariables = (theme: ThemeDefinition, branding?: CustomBrandingConfig) => {
  const root = document.documentElement;
  const { colors, spacing, typography, borderRadius, shadows } = theme;
  
  // Apply color variables
  Object.entries(colors).forEach(([colorName, colorSet]) => {
    if (typeof colorSet === 'object') {
      Object.entries(colorSet).forEach(([shade, value]) => {
        root.style.setProperty(`--color-${colorName}-${shade}`, value);
      });
    }
  });
  
  // Apply spacing variables
  Object.entries(spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value);
  });
  
  // Apply typography variables
  root.style.setProperty('--font-family-sans', typography.fontFamily.sans.join(', '));
  root.style.setProperty('--font-family-mono', typography.fontFamily.mono.join(', '));
  
  Object.entries(typography.fontSize).forEach(([key, [size, lineHeight]]) => {
    root.style.setProperty(`--text-${key}-size`, size);
    root.style.setProperty(`--text-${key}-line-height`, lineHeight);
  });
  
  Object.entries(typography.fontWeight).forEach(([key, value]) => {
    root.style.setProperty(`--font-weight-${key}`, value);
  });
  
  // Apply border radius variables
  Object.entries(borderRadius).forEach(([key, value]) => {
    root.style.setProperty(`--border-radius-${key}`, value);
  });
  
  // Apply shadow variables
  Object.entries(shadows).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value);
  });
  
  // Apply custom branding if provided
  if (branding) {
    if (branding.primaryColor) {
      root.style.setProperty('--color-brand-primary', branding.primaryColor);
    }
    if (branding.secondaryColor) {
      root.style.setProperty('--color-brand-secondary', branding.secondaryColor);
    }
  }
  
  // Apply custom CSS if provided
  if (branding?.customCSS) {
    const existingCustomStyle = document.getElementById('custom-theme-css');
    if (existingCustomStyle) {
      existingCustomStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'custom-theme-css';
    style.textContent = branding.customCSS;
    document.head.appendChild(style);
  }
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
  customBranding,
  storageKey = 'openapi-explorer-theme',
}) => {
  const systemPreference = useSystemPreference();
  const [storedTheme, setStoredTheme] = useLocalStorage<ThemeMode>(storageKey, defaultTheme);
  const [storedBranding, setStoredBranding] = useLocalStorage<CustomBrandingConfig | undefined>(
    `${storageKey}-branding`,
    customBranding
  );

  // Determine the actual theme to use
  const getActiveTheme = useCallback((theme: ThemeMode): Exclude<ThemeMode, 'system'> => {
    return theme === 'system' ? systemPreference : theme;
  }, [systemPreference]);

  const activeTheme = getActiveTheme(storedTheme);
  const themeDefinition = getThemeDefinition(activeTheme as keyof typeof themes);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark', 'high-contrast');
    
    // Add current theme class
    root.classList.add(activeTheme);
    
    // Apply custom CSS variables based on theme
    applyThemeVariables(themeDefinition, storedBranding);
    
    // Set color-scheme for browser native elements
    root.style.colorScheme = activeTheme === 'dark' ? 'dark' : 'light';
  }, [activeTheme, themeDefinition, storedBranding]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setStoredTheme(newTheme);
  }, [setStoredTheme]);

  const setCustomBranding = useCallback((branding?: CustomBrandingConfig) => {
    setStoredBranding(branding);
  }, [setStoredBranding]);

  const toggleTheme = useCallback(() => {
    const currentActive = getActiveTheme(storedTheme);
    const nextTheme: ThemeMode = currentActive === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
  }, [storedTheme, setTheme, getActiveTheme]);

  const contextValue: ThemeContextType = {
    currentTheme: storedTheme,
    themeDefinition,
    systemPreference,
    customBranding: storedBranding,
    setTheme,
    setCustomBranding,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}; 