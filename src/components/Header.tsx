import React, { useState, useRef, useEffect } from 'react';
import { 
  Zap, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Settings,
  Menu,
  X,
  BarChart3,
  Cpu,
  ChevronDown
} from 'lucide-react';
import { ThemeSelector } from '../theme/ThemeSelector';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onFilterToggle: () => void;
  onExportClick: () => void;
  onUploadClick: () => void;
  onAnalyticsClick: () => void;
  onMCPClick: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  isSpecLoaded: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onFilterToggle,
  onExportClick,
  onUploadClick,
  onAnalyticsClick,
  onMCPClick,
  searchValue,
  onSearchChange,
  isSpecLoaded
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileMenuOpen && 
          mobileMenuRef.current && 
          !mobileMenuRef.current.contains(event.target as Node) &&
          menuButtonRef.current &&
          !menuButtonRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <a 
        href="#main-content" 
        className="skip-link"
        aria-label="Skip to main content"
      >
        Skip to main content
      </a>

      <header 
        className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 safe-top"
        role="banner"
        aria-label="Main navigation"
      >
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            {/* Logo and Title */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex-shrink-0">
                <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-white" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                  {title || 'OpenAPI Explorer'}
                </h1>
                {subtitle && (
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Desktop Actions */}
            <nav 
              className="hidden md:flex items-center gap-2 lg:gap-3"
              aria-label="Primary navigation"
            >
              <button
                onClick={onUploadClick}
                className="touch-target-sm flex items-center gap-2 px-3 lg:px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Load OpenAPI specification"
                type="button"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                <span className="hidden lg:inline">Load Spec</span>
              </button>

              {isSpecLoaded && (
                <>
                  <button
                    onClick={onAnalyticsClick}
                    className="touch-target-sm flex items-center gap-2 px-3 lg:px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label="View analytics dashboard"
                    type="button"
                  >
                    <BarChart3 className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden lg:inline">Analytics</span>
                  </button>

                  <button
                    onClick={onExportClick}
                    className="touch-target-sm flex items-center gap-2 px-3 lg:px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label="Export specification"
                    type="button"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden lg:inline">Export</span>
                  </button>
                </>
              )}

              {/* Theme Selector */}
              <div className="hidden lg:block">
                <ThemeSelector variant="compact" />
              </div>

              <button
                onClick={onMCPClick}
                className="touch-target-sm flex items-center gap-2 px-3 lg:px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-colors focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                aria-label="Open MCP integration"
                type="button"
              >
                <Cpu className="h-4 w-4" aria-hidden="true" />
                <span className="hidden lg:inline">MCP</span>
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              ref={menuButtonRef}
              onClick={handleMobileMenuToggle}
              className="md:hidden touch-target p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              type="button"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Search and Filter Row */}
          {isSpecLoaded && (
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="flex-1 relative max-w-md">
                <label htmlFor="search-input" className="sr-only">
                  Search endpoints and descriptions
                </label>
                <Search 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" 
                  aria-hidden="true"
                />
                <input
                  id="search-input"
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search endpoints, descriptions..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                  aria-describedby="search-help"
                />
                <div id="search-help" className="sr-only">
                  Search through API endpoints, descriptions, and documentation
                </div>
              </div>

              {/* Filter Toggle */}
              <button
                onClick={onFilterToggle}
                className="touch-target flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors lg:hidden focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                aria-label="Toggle filters panel"
                type="button"
              >
                <Filter className="h-4 w-4" aria-hidden="true" />
                <span className="text-sm font-medium">Filters</span>
              </button>
            </div>
          )}

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div 
              ref={mobileMenuRef}
              id="mobile-menu"
              className="md:hidden mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 animate-slide-up"
              role="navigation"
              aria-label="Mobile navigation menu"
            >
              <nav className="flex flex-col space-y-1">
                <button
                  onClick={() => {
                    onUploadClick();
                    closeMobileMenu();
                  }}
                  className="touch-target-lg flex items-center gap-3 px-3 py-3 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-left"
                  aria-label="Load OpenAPI specification"
                  type="button"
                >
                  <Upload className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <span className="font-medium">Load Specification</span>
                </button>

                {isSpecLoaded && (
                  <>
                    <button
                      onClick={() => {
                        onAnalyticsClick();
                        closeMobileMenu();
                      }}
                      className="touch-target-lg flex items-center gap-3 px-3 py-3 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-left"
                      aria-label="View analytics dashboard"
                      type="button"
                    >
                      <BarChart3 className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                      <span className="font-medium">Analytics Dashboard</span>
                    </button>

                    <button
                      onClick={() => {
                        onExportClick();
                        closeMobileMenu();
                      }}
                      className="touch-target-lg flex items-center gap-3 px-3 py-3 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-left"
                      aria-label="Export specification"
                      type="button"
                    >
                      <Download className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                      <span className="font-medium">Export Options</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    onMCPClick();
                    closeMobileMenu();
                  }}
                  className="touch-target-lg flex items-center gap-3 px-3 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 text-left"
                  aria-label="Open MCP integration"
                  type="button"
                >
                  <Cpu className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <span className="font-medium">MCP Integration</span>
                </button>

                {/* Mobile Theme Selector */}
                <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700 mt-2 pt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Theme
                  </label>
                  <ThemeSelector variant="dropdown" showLabels={true} />
                </div>

                <button 
                  className="touch-target-lg flex items-center gap-3 px-3 py-3 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-left"
                  aria-label="Open settings"
                  type="button"
                >
                  <Settings className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <span className="font-medium">Settings</span>
                </button>
              </nav>
            </div>
          )}
        </div>
      </header>
    </>
  );
};