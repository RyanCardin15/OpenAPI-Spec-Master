import React, { useState } from 'react';
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

  if (!isOpen) return null;

  const handleExport = () => {
    onExport(selectedFormat, options);
    onClose();
  };

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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Export API Documentation
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Export {endpoints.length} filtered endpoints
              {activeFiltersCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                  {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} applied
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Format Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Export Format
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {exportFormats.map((format) => {
                const Icon = format.icon;
                const isSelected = selectedFormat === format.id;
                
                return (
                  <label
                    key={format.id}
                    className={`
                      flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={format.id}
                      checked={isSelected}
                      onChange={(e) => setSelectedFormat(e.target.value as any)}
                      className="sr-only"
                    />
                    <Icon className={`h-6 w-6 ${format.color} mr-3 mt-0.5`} />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {format.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {format.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Export Options */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Export Options
            </h3>
            
            {/* Detail Level */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Detail Level
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="detailLevel"
                    value="summary"
                    checked={options.format === 'summary'}
                    onChange={(e) => setOptions({ ...options, format: e.target.value as any })}
                    className="border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Summary</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="detailLevel"
                    value="detailed"
                    checked={options.format === 'detailed'}
                    onChange={(e) => setOptions({ ...options, format: e.target.value as any })}
                    className="border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Detailed</span>
                </label>
              </div>
            </div>

            {/* Include Options */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeDeprecated}
                  onChange={(e) => setOptions({ ...options, includeDeprecated: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Include deprecated endpoints
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeBusinessContext}
                  onChange={(e) => setOptions({ ...options, includeBusinessContext: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Include business context
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeAISuggestions}
                  onChange={(e) => setOptions({ ...options, includeAISuggestions: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Include AI suggestions
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeCodeExamples}
                  onChange={(e) => setOptions({ ...options, includeCodeExamples: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Include code examples
                </span>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              Export Preview
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div>• {endpoints.length} endpoints will be exported</div>
              <div>• Format: {exportFormats.find(f => f.id === selectedFormat)?.name}</div>
              <div>• Detail level: {options.format}</div>
              <div>• Additional data: {[
                options.includeBusinessContext && 'Business context',
                options.includeAISuggestions && 'AI suggestions',
                options.includeCodeExamples && 'Code examples'
              ].filter(Boolean).join(', ') || 'None'}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export {exportFormats.find(f => f.id === selectedFormat)?.name}
          </button>
        </div>
      </div>
    </div>
  );
};