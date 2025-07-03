import React, { useState } from 'react';
import {
  Search, Brain, Wand2, Filter, Type, AlertTriangle, CheckCircle, ChevronLeft, Copy, Edit3, Database, PlusCircle, MinusCircle, Download
} from 'lucide-react';
import { SchemaMetrics, PropertyResult } from '../types';
import Highlight from 'react-highlight-words';
import { PropertyTypeFilter } from '../components/PropertyTypeFilter';
import { getIconForType } from '../utils/getIconForType';
import { SchemaExportModal } from '../components/SchemaExportModal';

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
  propertyTypeFilter: string[];
  setPropertyTypeFilter: (filter: string[]) => void;
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
  expandAll: () => void;
  collapseAll: () => void;
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
  propertyTypeFilter,
  setPropertyTypeFilter,
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
  expandAll,
  collapseAll,
}) => {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const renderSchemaProperties = (schemaName: string) => {
    const schema = schemas[schemaName];
    if (!schema || !schema.properties) return null;

    return (
      <div className="p-4">
        {Object.entries(schema.properties).map(([propName, propSchema]: [string, any]) => (
          <div key={propName} className="flex items-center gap-2 mb-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            {getIconForType(propSchema.type)}
            <span className="font-mono text-sm">{propName}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{propSchema.type}</span>
            {propSchema.description && <p className="text-xs text-gray-600 dark:text-gray-300 ml-auto">{propSchema.description}</p>}
          </div>
        ))}
      </div>
    );
  };

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
              <PropertyTypeFilter selectedTypes={propertyTypeFilter} onChange={setPropertyTypeFilter} />
            </div>
          )}
        </div>
        
        {/* Schema List Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h4 className="font-medium text-gray-900 dark:text-white">Schemas</h4>
          <div className="flex items-center gap-2">
            <button onClick={expandAll} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600" title="Expand All">
              <PlusCircle className="h-4 w-4" />
            </button>
            <button onClick={collapseAll} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600" title="Collapse All">
              <MinusCircle className="h-4 w-4" />
            </button>
          </div>
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
                          {searchQuery ? (
                            <Highlight
                              searchWords={searchQuery.split(' ')}
                              autoEscape={true}
                              textToHighlight={schemaName}
                            />
                          ) : (
                            schemaName
                          )}
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
                    
                    <div className="flex items-center gap-1">
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
      {/* Main Content */}
      <div className="flex-1 p-6 bg-white dark:bg-gray-800 overflow-y-auto">
        {selectedSchema ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedSchema}</h2>
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </div>
              <button onClick={() => setSelectedSchema(null)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>
            {renderSchemaProperties(selectedSchema)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
            <Database className="h-16 w-16 mb-4" />
            <h3 className="text-lg font-medium">Select a schema</h3>
            <p>Choose a schema from the list to view its details.</p>
          </div>
        )}
      </div>
      {selectedSchema && (
        <SchemaExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          schemaName={selectedSchema}
          schema={schemas[selectedSchema]}
        />
      )}
    </div>
  );
};
