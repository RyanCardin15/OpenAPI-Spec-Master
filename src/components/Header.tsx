import React, { useState } from 'react';
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
  Cpu
} from 'lucide-react';

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

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
      <div className="px-6 py-4">
        {/* Top Row */}
        <div className="flex items-center justify-between mb-4">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                OpenAPI Explorer
              </h1>
              {subtitle && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onUploadClick}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Load Spec</span>
            </button>

            {isSpecLoaded && (
              <>
                <button
                  onClick={onAnalyticsClick}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </button>

                <button
                  onClick={onExportClick}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </>
            )}

            <button
              onClick={onMCPClick}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-colors"
            >
              <Cpu className="h-4 w-4" />
              <span className="hidden sm:inline">MCP</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Search and Filter Row */}
        {isSpecLoaded && (
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search endpoints, descriptions..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={onFilterToggle}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors lg:hidden"
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>
        )}

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => {
                  onUploadClick();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Upload className="h-5 w-5" />
                Load Spec
              </button>

              {isSpecLoaded && (
                <>
                  <button
                    onClick={() => {
                      onAnalyticsClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <BarChart3 className="h-5 w-5" />
                    Analytics
                  </button>

                  <button
                    onClick={() => {
                      onExportClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Download className="h-5 w-5" />
                    Export
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  onMCPClick();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors"
              >
                <Cpu className="h-5 w-5" />
                MCP Integration
              </button>

              <button className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Settings className="h-5 w-5" />
                Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};