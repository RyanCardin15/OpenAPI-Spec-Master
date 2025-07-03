import React from 'react';
import {
  Search, Brain, Wand2, Filter, Type, AlertTriangle, CheckCircle, ChevronLeft, Copy, Edit3, Database
} from 'lucide-react';
import { SchemaMetrics, PropertyResult } from '../types';

interface ExplorerTabProps {
  selectedSchema: string | null;
  schemas: Record<string, any>;
  schemaMetrics: Map<string, SchemaMetrics>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isAiSearchEnabled: boolean;
  setIsAiSearchEnabled: (enabled: boolean) => void;
  aiSearchSuggestions: string[];
  enhancedSearchProperties: PropertyResult[];
  searchProperties: PropertyResult[];
  complexityFilter: string;
  setComplexityFilter: (filter: string) => void;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (show: boolean) => void;
  AdvancedFilterControls: React.FC;
  scrollElementRef: React.RefObject<HTMLDivElement>;
  totalHeight: number;
  visibleSchemas: { data: string, offset: number }[];
  selectedSchemas: Set<string>;
  setSelectedSchema: (name: string | null) => void;
  toggleSchemaSelection: (name: string) => void;
  copyToClipboard: (text: string, label: string) => void;
  copiedText: string | null;
  setEditingSchema: (name: string | null) => void;
  generateAIInsights: (name: string) => string[];
  schemaNames: string[];
}

export const ExplorerTab: React.FC<ExplorerTabProps> = ({
  selectedSchema,
  schemas,
  schemaMetrics,
  searchQuery,
  setSearchQuery,
  isAiSearchEnabled,
  setIsAiSearchEnabled,
  aiSearchSuggestions,
  enhancedSearchProperties,
  searchProperties,
  complexityFilter,
  setComplexityFilter,
  showAdvancedFilters,
  setShowAdvancedFilters,
  AdvancedFilterControls,
  scrollElementRef,
  totalHeight,
  visibleSchemas,
  selectedSchemas,
  setSelectedSchema,
  toggleSchemaSelection,
  copyToClipboard,
  copiedText,
  setEditingSchema,
  generateAIInsights,
  schemaNames,
}) => {
  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className={`w-full md:w-80 border-r-0 md:border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800 ${selectedSchema ? 'hidden md:flex' : 'flex'}`}>
        {/* Search and Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
          {/* Enhanced Search with AI */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={isAiSearchEnabled ? "Try: 'Find user authentication fields' or 'Show required properties'" : "Search properties..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            
            {/* AI Search Toggle */}
            <button
              onClick={() => setIsAiSearchEnabled(!isAiSearchEnabled)}
              className={`px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                isAiSearchEnabled 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
              title={isAiSearchEnabled ? 'Disable AI Search' : 'Enable AI Search'}
            >
              <Brain className="h-4 w-4" />
              <span className="text-sm font-medium">AI</span>
            </button>
          </div>

          {/* AI Search Suggestions */}
          {isAiSearchEnabled && !searchQuery && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-3">
                <Wand2 className="h-4 w-4 text-blue-600" />
                <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  AI Search Suggestions
                </h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {aiSearchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setSearchQuery(suggestion)}
                    className="text-left px-3 py-2 text-sm bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors border border-blue-200 dark:border-blue-600"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results Count */}
          <div className="flex items-center justify-between mb-4">
                                 <p className="text-sm text-gray-600 dark:text-gray-400">
               {isAiSearchEnabled ? enhancedSearchProperties.length : searchProperties.length} properties found
              {searchQuery && (
                <span className="ml-1">
                  for "{searchQuery}"
                </span>
              )}
            </p>
            
            {/* Search Mode Indicator */}
            <div className="flex items-center gap-2 text-xs">
              {isAiSearchEnabled ? (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  Semantic Search
                </span>
              ) : (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full flex items-center gap-1">
                  <Search className="h-3 w-3" />
                  Basic Search
                </span>
              )}
            </div>
          </div>
          
          {/* Quick Filters */}
          <div className="flex gap-2">
            <select
              value={complexityFilter}
              onChange={(e) => setComplexityFilter(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Complexity</option>
              <option value="low">Low (≤10)</option>
              <option value="medium">Medium (11-50)</option>
              <option value="high">High (&gt;50)</option>
            </select>
            
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3 py-2 rounded-lg border transition-colors ${showAdvancedFilters 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>
          
          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="hidden md:block space-y-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <AdvancedFilterControls />
            </div>
          )}
        </div>
        
        {/* Schema List */}
        <div 
          ref={scrollElementRef}
          className="flex-1 overflow-y-auto"
        >
          <div style={{ height: totalHeight, position: 'relative' }} className="p-4">
            {visibleSchemas.map(({ data: schemaName, offset }) => {
              const metrics = schemaMetrics.get(schemaName);
              const isSelected = selectedSchema === schemaName;
              const isMultiSelected = selectedSchemas.has(schemaName);
              
              return (
                <div
                  key={schemaName}
                  style={{
                    position: 'absolute',
                    top: `${offset}px`,
                    left: '1rem',
                    right: '1rem',
                    height: '76px' // itemHeight - padding
                  }}
                  className={`group p-3 rounded-lg border transition-all cursor-pointer bg-white dark:bg-gray-800 ${
                    isSelected 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' 
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div 
                      className="flex-1"
                      onClick={() => setSelectedSchema(schemaName)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Type className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                          {schemaName}
                        </span>
                        {metrics?.circularRefs && (
                          <span title="Circular dependency">
                            <AlertTriangle className="h-3 w-3 text-orange-500" />
                          </span>
                        )}
                      </div>
                      
                      {metrics && (
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span>C: {metrics.complexity}</span>
                          <span>P: {metrics.propertyCount}</span>
                          <span>D: {metrics.dependencyCount}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSchemaSelection(schemaName);
                        }}
                        className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
                          isMultiSelected ? 'text-blue-600' : 'text-gray-400'
                        }`}
                        title="Add to comparison"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Schema Details */}
      <div className={`flex-1 flex flex-col bg-white dark:bg-gray-800 ${selectedSchema ? 'flex' : 'hidden md:flex'}`}>
        {selectedSchema ? (
          (() => {
            const schema = schemas[selectedSchema];
            const metrics = schemaMetrics.get(selectedSchema);
            const insights = generateAIInsights(selectedSchema);

            if (!schema) return <div className="p-6">Schema not found.</div>;
            
            return (
              <>
                <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setSelectedSchema(null)}
                        className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      >
                        <ChevronLeft className="h-5 w-5"/>
                      </button>
                      <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
                        {schema.title || selectedSchema}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(schema, null, 2), selectedSchema)}
                        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        {copiedText === selectedSchema ? 'Copied!' : 'Copy Schema'}
                      </button>
                      <button
                        onClick={() => setEditingSchema(selectedSchema)}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-12 md:ml-0">
                    {schema.description || 'No description provided.'}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                  {/* AI Insights */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Wand2 className="h-4 w-4 text-blue-600" />
                      <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        AI-Powered Insights
                      </h5>
                    </div>
                    <ul className="space-y-2">
                      {insights.map((insight, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
                          <Brain className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Properties Table */}
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Properties</h4>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Required</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                          {Object.entries(schema.properties || {}).map(([propName, propSchema]: [string, any]) => {
                            const isRequired = schema.required?.includes(propName);
                            return (
                              <tr key={propName}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{propName}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{propSchema.type}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  {isRequired ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                      Yes
                                    </span>
                                  ) : (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                      No
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{propSchema.description || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            );
          })()
        ) : (
          <div className="h-full flex items-center justify-center text-center text-gray-500 dark:text-gray-400">
            <div>
              <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium">Select a schema</p>
              <p className="text-sm text-gray-500">
                Choose a schema from the list to view its details.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
