import React, { useState } from 'react';
import { useTheme } from './ThemeProvider';
import { ThemeMode } from './types';
import { Sun, Moon, Monitor, Contrast } from 'lucide-react';

interface ThemeSelectorProps {
  className?: string;
  showLabels?: boolean;
  variant?: 'dropdown' | 'buttons' | 'compact';
}

const themeOptions = [
  { value: 'light' as ThemeMode, label: 'Light', icon: Sun },
  { value: 'dark' as ThemeMode, label: 'Dark', icon: Moon },
  { value: 'high-contrast' as ThemeMode, label: 'High Contrast', icon: Contrast },
  { value: 'system' as ThemeMode, label: 'System', icon: Monitor },
];

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  className = '',
  showLabels = true,
  variant = 'dropdown',
}) => {
  const { currentTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const currentOption = themeOptions.find(option => option.value === currentTheme);
  const CurrentIcon = currentOption?.icon || Monitor;

  if (variant === 'buttons') {
    return (
      <div className={`flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-1 ${className}`}>
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isActive = currentTheme === option.value;
          
          return (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-primary-500 text-white shadow-sm' 
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }
              `}
              title={`Switch to ${option.label} theme`}
            >
              <Icon className="h-4 w-4" />
              {showLabels && <span>{option.label}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={() => {
          const currentIndex = themeOptions.findIndex(option => option.value === currentTheme);
          const nextIndex = (currentIndex + 1) % themeOptions.length;
          setTheme(themeOptions[nextIndex].value);
        }}
        className={`
          flex items-center justify-center p-2 rounded-lg border border-neutral-200 dark:border-neutral-700
          text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100
          hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200
          ${className}
        `}
        title={`Current: ${currentOption?.label}. Click to cycle themes.`}
      >
        <CurrentIcon className="h-4 w-4" />
      </button>
    );
  }

  // Default dropdown variant
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700
          text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100
          hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        "
        title="Change theme"
      >
        <CurrentIcon className="h-4 w-4" />
        {showLabels && (
          <>
            <span className="text-sm font-medium">{currentOption?.label}</span>
            <svg 
              className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div className="
            absolute right-0 mt-2 w-48 z-20 rounded-lg border border-neutral-200 dark:border-neutral-700
            bg-white dark:bg-neutral-800 shadow-lg ring-1 ring-black ring-opacity-5
            focus:outline-none animate-in fade-in-0 zoom-in-95 duration-200
          ">
            <div className="py-1">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = currentTheme === option.value;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      setTheme(option.value);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors duration-150
                      ${isActive 
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' 
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{option.label}</span>
                    {isActive && (
                      <svg 
                        className="ml-auto h-4 w-4" 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}; 