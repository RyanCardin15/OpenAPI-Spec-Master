import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Download, FileText, Image, Code, Filter } from 'lucide-react';
import { EndpointData, FilterState } from '../types/openapi';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpoints: EndpointData[];
  filters: FilterState;
  onExport: (format: 'json' | 'pdf' | 'csv' | 'markdown', options: ExportOptions) => void;
}

interface ExportOptions {
  includeDeprecated: boolean;
  includeBusinessContext: boolean;
  includeAISuggestions: boolean;
  includeCodeExamples: boolean;
  format: 'summary' | 'detailed';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  endpoints,
  filters,
  onExport
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'pdf' | 'csv' | 'markdown'>('json');
  const [options, setOptions] = useState<ExportOptions>({
    includeDeprecated: true,
    includeBusinessContext: true,
    includeAISuggestions: true,
    includeCodeExamples: true,
    format: 'detailed'
  });

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Focus the first focusable element when modal opens
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'Tab':
        // Focus trapping
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements?.length) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
        break;
    }
  }, [isOpen, onClose]);

  // Click outside to close
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleExport = () => {
    onExport(selectedFormat, options);
    onClose();
  };

  // Format selection with keyboard support
  const handleFormatKeyDown = useCallback((e: React.KeyboardEvent, format: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedFormat(format as any);
    }
  }, []);

  if (!isOpen) return null;

  const exportFormats = [
    {
      id: 'json',
      name: 'JSON',
      description: 'Machine-readable format for API documentation',
      icon: Code,
      color: 'text-blue-600'
    },
    {
      id: 'pdf',
      name: 'PDF',
      description: 'Professional document for sharing and printing',
      icon: FileText,
      color: 'text-red-600'
    },
    {
      id: 'csv',
      name: 'CSV',
      description: 'Spreadsheet format for analysis and reporting',
      icon: Filter,
      color: 'text-green-600'
    },
    {
      id: 'markdown',
      name: 'Markdown',
      description: 'Documentation format compatible with GitHub, GitLab',
      icon: FileText,
      color: 'text-purple-600'
    }
  ];

  const activeFiltersCount = filters.methods.length + filters.tags.length + filters.statusCodes.length + 
    (filters.deprecated !== null ? 1 : 0) + (filters.search ? 1 : 0);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      onKeyDown={handleKeyDown}
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 
              id="modal-title"
              className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white"
            >
              Export API Documentation
            </h2>
            <p 
              id="modal-description"
              className="text-sm text-gray-600 dark:text-gray-400 mt-1"
            >
              Export {endpoints.length} filtered endpoint{endpoints.length !== 1 ? 's' : ''}
              {activeFiltersCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                  {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} applied
                </span>
              )}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-target focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-50"
            aria-label="Close export dialog"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* Format Selection */}
          <fieldset className="mb-6">
            <legend className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">
              Export Format
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3" role="radiogroup" aria-labelledby="format-legend">
              {exportFormats.map((format) => {
                const Icon = format.icon;
                const isSelected = selectedFormat === format.id;
                
                return (
                  <label
                    key={format.id}
                    className={`
                      flex items-start p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all touch-target
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 ring-opacity-50' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-50'
                      }
                    `}
                  >
                    <input
                      ref={format.id === 'json' ? firstInputRef : undefined}
                      type="radio"
                      name="format"
                      value={format.id}
                      checked={isSelected}
                      onChange={(e) => setSelectedFormat(e.target.value as any)}
                      onKeyDown={(e) => handleFormatKeyDown(e, format.id)}
                      className="sr-only"
                      aria-describedby={`${format.id}-description`}
                    />
                    <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${format.color} mr-3 mt-0.5 flex-shrink-0`} aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                        {format.name}
                      </div>
                      <div 
                        id={`${format.id}-description`}
                        className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 break-words"
                      >
                        {format.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Export Options */}
          <fieldset className="mb-6">
            <legend className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">
              Export Options
            </legend>
            
            {/* Detail Level */}
            <div className="mb-4">
              <fieldset>
                <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Detail Level
                </legend>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4" role="radiogroup">
                  <label className="flex items-center touch-target">
                    <input
                      type="radio"
                      name="detailLevel"
                      value="summary"
                      checked={options.format === 'summary'}
                      onChange={(e) => setOptions({ ...options, format: e.target.value as any })}
                      className="border-gray-300 text-blue-600 focus:ring-blue-500 mr-2 touch-target-sm"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Summary</span>
                  </label>
                  <label className="flex items-center touch-target">
                    <input
                      type="radio"
                      name="detailLevel"
                      value="detailed"
                      checked={options.format === 'detailed'}
                      onChange={(e) => setOptions({ ...options, format: e.target.value as any })}
                      className="border-gray-300 text-blue-600 focus:ring-blue-500 mr-2 touch-target-sm"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Detailed</span>
                  </label>
                </div>
              </fieldset>
            </div>

            {/* Include Options */}
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Include in Export
              </legend>
              <div className="space-y-3">
                <label className="flex items-start gap-3 touch-target">
                  <input
                    type="checkbox"
                    checked={options.includeDeprecated}
                    onChange={(e) => setOptions({ ...options, includeDeprecated: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5 touch-target-sm"
                  />
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      Include deprecated endpoints
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Export endpoints marked as deprecated
                    </p>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 touch-target">
                  <input
                    type="checkbox"
                    checked={options.includeBusinessContext}
                    onChange={(e) => setOptions({ ...options, includeBusinessContext: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5 touch-target-sm"
                  />
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      Include business context
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Add business descriptions and use cases
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 touch-target">
                  <input
                    type="checkbox"
                    checked={options.includeAISuggestions}
                    onChange={(e) => setOptions({ ...options, includeAISuggestions: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5 touch-target-sm"
                  />
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      Include AI suggestions
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Export AI-generated recommendations and insights
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 touch-target">
                  <input
                    type="checkbox"
                    checked={options.includeCodeExamples}
                    onChange={(e) => setOptions({ ...options, includeCodeExamples: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5 touch-target-sm"
                  />
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      Include code examples
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Add cURL and other code examples
                    </p>
                  </div>
                </label>
              </div>
            </fieldset>
          </fieldset>
        </div>

        {/* Footer */}
        <footer className="flex flex-col sm:flex-row gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-target focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-opacity-50"
            aria-label="Cancel export"
          >
            Cancel
          </button>
          <button
            ref={lastFocusableRef}
            onClick={handleExport}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 touch-target focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-50"
            aria-label={`Export ${endpoints.length} endpoints as ${selectedFormat.toUpperCase()}`}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>Export {selectedFormat.toUpperCase()}</span>
          </button>
        </footer>
      </div>
    </div>
  );
};