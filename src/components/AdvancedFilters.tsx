import React, { useState } from 'react';
import { 
  Filter, 
  X, 
  Search, 
  Tag, 
  Code, 
  CheckCircle, 
  AlertTriangle,
  Shield,
  Clock,
  Layers,
  Settings,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { FilterState } from '../types/openapi';

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  availableTags: string[];
  availableMethods: string[];
  availableStatusCodes: string[];
  endpointCount: number;
  filteredCount: number;
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  availableTags,
  availableMethods,
  availableStatusCodes,
  endpointCount,
  filteredCount
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic', 'methods', 'tags'])
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleMethodToggle = (method: string) => {
    const newMethods = filters.methods.includes(method)
      ? filters.methods.filter(m => m !== method)
      : [...filters.methods, method];
    onFilterChange({ ...filters, methods: newMethods });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    onFilterChange({ ...filters, tags: newTags });
  };

  const handleStatusCodeToggle = (code: string) => {
    const newCodes = filters.statusCodes.includes(code)
      ? filters.statusCodes.filter(c => c !== code)
      : [...filters.statusCodes, code];
    onFilterChange({ ...filters, statusCodes: newCodes });
  };

  const handleComplexityToggle = (complexity: string) => {
    const newComplexity = filters.complexity.includes(complexity)
      ? filters.complexity.filter(c => c !== complexity)
      : [...filters.complexity, complexity];
    onFilterChange({ ...filters, complexity: newComplexity });
  };

  const handleSecurityToggle = (security: string) => {
    const newSecurity = filters.security.includes(security)
      ? filters.security.filter(s => s !== security)
      : [...filters.security, security];
    onFilterChange({ ...filters, security: newSecurity });
  };

  const handleResponseTimeToggle = (time: string) => {
    const newResponseTime = filters.responseTime.includes(time)
      ? filters.responseTime.filter(t => t !== time)
      : [...filters.responseTime, time];
    onFilterChange({ ...filters, responseTime: newResponseTime });
  };

  const clearAllFilters = () => {
    onFilterChange({
      methods: [],
      tags: [],
      statusCodes: [],
      deprecated: null,
      search: '',
      complexity: [],
      security: [],
      pathPattern: '',
      hasParameters: null,
      hasRequestBody: null,
      responseTime: []
    });
  };

  const getMethodColor = (method: string) => {
    const colors = {
      GET: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
      POST: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
      PUT: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700',
      PATCH: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700',
      DELETE: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
      OPTIONS: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600',
      HEAD: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700',
      TRACE: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900 dark:text-pink-200 dark:border-pink-700'
    };
    return colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusCodeColor = (code: string) => {
    if (code.startsWith('2')) return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700';
    if (code.startsWith('3')) return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700';
    if (code.startsWith('4')) return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700';
    if (code.startsWith('5')) return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700';
    return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600';
  };

  const FilterSection: React.FC<{
    id: string;
    title: string;
    icon: React.ComponentType<any>;
    children: React.ReactNode;
  }> = ({ id, title, icon: Icon, children }) => {
    const isExpanded = expandedSections.has(id);
    
    return (
      <div className="border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-gray-900 dark:text-white">{title}</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </button>
        {isExpanded && (
          <div className="px-4 pb-4">
            {children}
          </div>
        )}
      </div>
    );
  };

  const activeFiltersCount = filters.methods.length + filters.tags.length + filters.statusCodes.length + 
    filters.complexity.length + filters.security.length + filters.responseTime.length +
    (filters.deprecated !== null ? 1 : 0) + (filters.search ? 1 : 0) + (filters.pathPattern ? 1 : 0) +
    (filters.hasParameters !== null ? 1 : 0) + (filters.hasRequestBody !== null ? 1 : 0);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:sticky top-0 left-0 h-screen w-96 bg-white dark:bg-gray-800 
        border-r border-gray-200 dark:border-gray-700 z-50 transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Advanced Filters</h2>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results Counter */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing <span className="font-semibold text-blue-600">{filteredCount}</span> of{' '}
            <span className="font-semibold">{endpointCount}</span> endpoints
          </div>
          {activeFiltersCount > 0 && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
              </span>
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <RotateCcw className="h-3 w-3" />
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Basic Search */}
          <FilterSection id="basic" title="Search & Text" icon={Search}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search endpoints
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                  placeholder="Search paths, descriptions, summaries..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Path pattern
                </label>
                <input
                  type="text"
                  value={filters.pathPattern}
                  onChange={(e) => onFilterChange({ ...filters, pathPattern: e.target.value })}
                  placeholder="/api/v1/users, /pets/{id}, etc."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          </FilterSection>

          {/* HTTP Methods */}
          <FilterSection id="methods" title="HTTP Methods" icon={Code}>
            <div className="grid grid-cols-2 gap-2">
              {availableMethods.map(method => (
                <label key={method} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.methods.includes(method)}
                    onChange={() => handleMethodToggle(method)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getMethodColor(method)}`}>
                    {method}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Tags */}
          {availableTags.length > 0 && (
            <FilterSection id="tags" title="Tags" icon={Tag}>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableTags.map(tag => (
                  <label key={tag} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.tags.includes(tag)}
                      onChange={() => handleTagToggle(tag)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {tag}
                    </span>
                  </label>
                ))}
              </div>
            </FilterSection>
          )}

          {/* Status Codes */}
          <FilterSection id="status" title="Response Codes" icon={CheckCircle}>
            <div className="grid grid-cols-3 gap-2">
              {availableStatusCodes.map(code => (
                <label key={code} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.statusCodes.includes(code)}
                    onChange={() => handleStatusCodeToggle(code)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusCodeColor(code)}`}>
                    {code}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Complexity */}
          <FilterSection id="complexity" title="Complexity" icon={Layers}>
            <div className="space-y-2">
              {['low', 'medium', 'high'].map(complexity => (
                <label key={complexity} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.complexity.includes(complexity)}
                    onChange={() => handleComplexityToggle(complexity)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                  />
                  <span className={`px-2 py-1 rounded text-xs font-medium border capitalize ${
                    complexity === 'low' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700' :
                    complexity === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700' :
                    'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700'
                  }`}>
                    {complexity}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Security */}
          <FilterSection id="security" title="Security" icon={Shield}>
            <div className="space-y-2">
              {['none', 'apiKey', 'oauth2', 'bearer', 'basic'].map(security => (
                <label key={security} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.security.includes(security)}
                    onChange={() => handleSecurityToggle(security)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {security === 'none' ? 'No Authentication' : security}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Performance */}
          <FilterSection id="performance" title="Performance" icon={Clock}>
            <div className="space-y-2">
              {['fast', 'medium', 'slow'].map(time => (
                <label key={time} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.responseTime.includes(time)}
                    onChange={() => handleResponseTimeToggle(time)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                  />
                  <span className={`px-2 py-1 rounded text-xs font-medium border capitalize ${
                    time === 'fast' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700' :
                    time === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700' :
                    'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700'
                  }`}>
                    {time} response
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Advanced Options */}
          <FilterSection id="advanced" title="Advanced Options" icon={Settings}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Deprecated Status
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="deprecated"
                      checked={filters.deprecated === null}
                      onChange={() => onFilterChange({ ...filters, deprecated: null })}
                      className="border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">All endpoints</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="deprecated"
                      checked={filters.deprecated === false}
                      onChange={() => onFilterChange({ ...filters, deprecated: false })}
                      className="border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Active only</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="deprecated"
                      checked={filters.deprecated === true}
                      onChange={() => onFilterChange({ ...filters, deprecated: true })}
                      className="border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Deprecated only</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Parameters
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="hasParameters"
                      checked={filters.hasParameters === null}
                      onChange={() => onFilterChange({ ...filters, hasParameters: null })}
                      className="border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Any</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="hasParameters"
                      checked={filters.hasParameters === true}
                      onChange={() => onFilterChange({ ...filters, hasParameters: true })}
                      className="border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Has parameters</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="hasParameters"
                      checked={filters.hasParameters === false}
                      onChange={() => onFilterChange({ ...filters, hasParameters: false })}
                      className="border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">No parameters</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Request Body
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="hasRequestBody"
                      checked={filters.hasRequestBody === null}
                      onChange={() => onFilterChange({ ...filters, hasRequestBody: null })}
                      className="border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Any</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="hasRequestBody"
                      checked={filters.hasRequestBody === true}
                      onChange={() => onFilterChange({ ...filters, hasRequestBody: true })}
                      className="border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Has request body</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="hasRequestBody"
                      checked={filters.hasRequestBody === false}
                      onChange={() => onFilterChange({ ...filters, hasRequestBody: false })}
                      className="border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">No request body</span>
                  </label>
                </div>
              </div>
            </div>
          </FilterSection>
        </div>
      </div>
    </>
  );
};