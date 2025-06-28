import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { Header } from './components/Header';
import { AdvancedFilters } from './components/AdvancedFilters';
import { ViewControls } from './components/ViewControls';
import { EndpointCard } from './components/EndpointCard';
import { ExportModal } from './components/ExportModal';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { IntegrationsModal } from './components/IntegrationsModal';
import { SchemaExplorer } from './components/SchemaExplorer';
import { ValidationCenter } from './components/ValidationCenter';
import { CodeGenerator } from './components/CodeGenerator';
import { OpenAPIParser } from './utils/openapi-parser';
import { ExportUtils } from './utils/export-utils';
import { generateAnalytics } from './utils/analytics';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useAdvancedSearch } from './hooks/useAdvancedSearch';
import { OpenAPISpec, EndpointData, FilterState, GroupingState, ViewState } from './types/openapi';
import { AlertCircle, Loader2, Zap, FileText, Search, BarChart3, ChevronDown, ChevronRight, Cpu, Database, Shield, Code } from 'lucide-react';

function App() {
  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  const [endpoints, setEndpoints] = useState<EndpointData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [isSchemaExplorerOpen, setIsSchemaExplorerOpen] = useState(false);
  const [isValidationCenterOpen, setIsValidationCenterOpen] = useState(false);
  const [isCodeGeneratorOpen, setIsCodeGeneratorOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
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

  // Grouping and view state - Default to grouping by tag
  const [grouping, setGrouping] = useState<GroupingState>({
    groupBy: 'tag',
    sortBy: 'path',
    sortOrder: 'asc'
  });

  const [view, setView] = useState<ViewState>({
    layout: 'list',
    showDetails: true,
    showBusinessContext: true,
    showAISuggestions: true,
    showCodeExamples: false,
    density: 'comfortable'
  });

  const parser = new OpenAPIParser();
  const { filteredEndpoints, groupedEndpoints, totalFiltered } = useAdvancedSearch(endpoints, filters, grouping);
  const analytics = generateAnalytics(endpoints);

  // Reset expanded groups when grouping changes
  useEffect(() => {
    setExpandedGroups(new Set());
  }, [grouping.groupBy]);

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const parsedSpec = await parser.parseFromFile(file);
      setSpec(parsedSpec);
      const extractedEndpoints = parser.extractEndpoints();
      setEndpoints(extractedEndpoints);
      setShowUpload(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextUpload = async (text: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const parsedSpec = await parser.parseFromText(text);
      setSpec(parsedSpec);
      const extractedEndpoints = parser.extractEndpoints();
      setEndpoints(extractedEndpoints);
      setShowUpload(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse specification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlUpload = async (url: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const parsedSpec = await parser.parseFromUrl(url);
      setSpec(parsedSpec);
      const extractedEndpoints = parser.extractEndpoints();
      setEndpoints(extractedEndpoints);
      setShowUpload(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch or parse specification from URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'pdf' | 'csv' | 'markdown', options: any) => {
    try {
      switch (format) {
        case 'json':
          await ExportUtils.exportToJSON(filteredEndpoints, options);
          break;
        case 'csv':
          await ExportUtils.exportToCSV(filteredEndpoints, options);
          break;
        case 'markdown':
          await ExportUtils.exportToMarkdown(filteredEndpoints, options);
          break;
        case 'pdf':
          await ExportUtils.exportToPDF(filteredEndpoints, options);
          break;
      }
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export documentation. Please try again.');
    }
  };

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const expandAllGroups = () => {
    setExpandedGroups(new Set(Object.keys(groupedEndpoints)));
  };

  const collapseAllGroups = () => {
    setExpandedGroups(new Set());
  };

  const availableTags = parser.getAllTags();
  const availableMethods = parser.getAllMethods();
  const availableStatusCodes = parser.getAllStatusCodes();

  // Show upload screen if no spec is loaded
  if (showUpload || !spec) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6">
              <Zap className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              OpenAPI Explorer
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Advanced OpenAPI specification visualizer with intelligent filtering, grouping, 
              analytics, and AI-powered insights for better API understanding.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg w-fit mb-4">
                <Search className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Advanced Filtering
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Multi-dimensional filtering by methods, tags, complexity, security, and more with intelligent search.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg w-fit mb-4">
                <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Smart Grouping
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Organize endpoints by tags, methods, complexity, or path patterns with flexible sorting options.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg w-fit mb-4">
                <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Analytics Dashboard
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Comprehensive analytics with distribution charts, complexity analysis, and API health insights.
              </p>
            </div>
          </div>

          {/* Upload Section */}
          <FileUpload 
            onFileUpload={handleFileUpload}
            onTextUpload={handleTextUpload}
            onUrlUpload={handleUrlUpload}
            isLoading={isLoading}
          />

          {/* Error Display */}
          {error && (
            <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <div>
                  <h3 className="text-red-800 dark:text-red-200 font-medium">Import Failed</h3>
                  <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="mt-6 flex items-center justify-center gap-3 text-blue-600 dark:text-blue-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-medium">Processing OpenAPI specification...</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setIsIntegrationsOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-colors font-medium"
            >
              <Cpu className="h-5 w-5" />
              Explore Integrations
            </button>
          </div>

          {/* Ecosystem Highlights */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {/* MCP Integration */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <Cpu className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    🤖 AI-Powered Analysis
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm">
                    Connect to Claude Desktop, Cursor, or other AI clients via Model Context Protocol (MCP). 
                    Get instant API insights through natural conversation.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                      Load & Analyze APIs
                    </span>
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded-full">
                      Generate Code Examples
                    </span>
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                      Validate API Design
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* VS Code Extension */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                  <Code className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    🧩 VS Code Extension
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm">
                    The same powerful OpenAPI analysis engine is available as a VS Code extension. Bring advanced API exploration 
                    directly into your development environment.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded-full">
                      Rich Tree Views
                    </span>
                    <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-xs rounded-full">
                      Code Generation
                    </span>
                    <span className="px-3 py-1 bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200 text-xs rounded-full">
                      Performance Optimized
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Web Application */}
            <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    🌐 Web Application
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm">
                    You're currently using the web application! This beautiful, responsive interface provides 
                    intuitive API exploration with advanced filtering and analytics.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                      Beautiful Interface
                    </span>
                    <span className="px-3 py-1 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 text-xs rounded-full">
                      No Installation
                    </span>
                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs rounded-full">
                      Share & Collaborate
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Integrations Modal */}
        <IntegrationsModal
          isOpen={isIntegrationsOpen}
          onClose={() => setIsIntegrationsOpen(false)}
        />
      </div>
    );
  }

  // Main application view
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header
        title={spec.info.title}
        subtitle={`${endpoints.length} endpoints • v${spec.info.version}`}
        onFilterToggle={() => setIsFilterOpen(!isFilterOpen)}
        onExportClick={() => setIsExportOpen(true)}
        onUploadClick={() => setShowUpload(true)}
        onAnalyticsClick={() => setIsAnalyticsOpen(true)}
        onMCPClick={() => setIsIntegrationsOpen(true)}
        searchValue={filters.search}
        onSearchChange={(search) => setFilters({ ...filters, search })}
        isSpecLoaded={!!spec}
      />

      <div className="flex">
        <AdvancedFilters
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          filters={filters}
          onFilterChange={setFilters}
          availableTags={availableTags}
          availableMethods={availableMethods}
          availableStatusCodes={availableStatusCodes}
          endpointCount={endpoints.length}
          filteredCount={totalFiltered}
        />

        <main className="flex-1 lg:ml-0">
          {/* View Controls */}
          <ViewControls
            grouping={grouping}
            onGroupingChange={setGrouping}
            view={view}
            onViewChange={setView}
          />

          <div className="p-6">
            {/* API Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {spec.info.title}
                  </h1>
                  {spec.info.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-3xl">
                      {spec.info.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>Version: <strong>{spec.info.version}</strong></span>
                    <span>OpenAPI: <strong>{spec.openapi}</strong></span>
                    <span>Endpoints: <strong>{endpoints.length}</strong></span>
                    {availableTags.length > 0 && (
                      <span>Tags: <strong>{availableTags.length}</strong></span>
                    )}
                    <span>Filtered: <strong>{totalFiltered}</strong></span>
                  </div>
                </div>
                
                {/* Advanced Tools */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setIsSchemaExplorerOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Database className="h-4 w-4" />
                    Schema Explorer
                  </button>
                  <button
                    onClick={() => setIsValidationCenterOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Shield className="h-4 w-4" />
                    Validation
                  </button>
                  <button
                    onClick={() => setIsCodeGeneratorOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Code className="h-4 w-4" />
                    Code Gen
                  </button>
                </div>
              </div>
            </div>

            {/* Results Info */}
            {totalFiltered !== endpoints.length && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <p className="text-blue-800 dark:text-blue-200 text-sm">
                  Showing <strong>{totalFiltered}</strong> of{' '}
                  <strong>{endpoints.length}</strong> endpoints based on your filters and grouping.
                </p>
              </div>
            )}

            {/* Group Controls */}
            {grouping.groupBy !== 'none' && Object.keys(groupedEndpoints).length > 1 && (
              <div className="flex items-center gap-3 mb-6">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Group Controls:
                </span>
                <button
                  onClick={expandAllGroups}
                  className="px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-lg transition-colors"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAllGroups}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  Collapse All
                </button>
              </div>
            )}

            {/* Grouped Endpoints */}
            {Object.keys(groupedEndpoints).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(groupedEndpoints).map(([groupName, groupEndpoints]) => {
                  const isExpanded = expandedGroups.has(groupName);
                  const showGroupHeader = grouping.groupBy !== 'none';
                  
                  return (
                    <div key={groupName} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                      {showGroupHeader && (
                        <button
                          onClick={() => toggleGroup(groupName)}
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-gray-500" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-gray-500" />
                              )}
                              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {groupName}
                              </h2>
                            </div>
                            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full font-medium">
                              {groupEndpoints.length} endpoint{groupEndpoints.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          
                          {/* Group metadata */}
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            {grouping.groupBy === 'method' && (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                groupName === 'GET' ? 'bg-green-100 text-green-800' :
                                groupName === 'POST' ? 'bg-blue-100 text-blue-800' :
                                groupName === 'PUT' ? 'bg-orange-100 text-orange-800' :
                                groupName === 'PATCH' ? 'bg-yellow-100 text-yellow-800' :
                                groupName === 'DELETE' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {groupName}
                              </span>
                            )}
                            {grouping.groupBy === 'complexity' && (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                groupName.toLowerCase() === 'low' ? 'bg-green-100 text-green-800' :
                                groupName.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {groupName}
                              </span>
                            )}
                          </div>
                        </button>
                      )}
                      
                      {/* Group Content */}
                      {(isExpanded || !showGroupHeader) && (
                        <div className={`
                          ${showGroupHeader ? 'p-4' : 'p-0'}
                          ${view.layout === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 
                            view.layout === 'compact' ? 'space-y-2' : 
                            view.layout === 'table' ? '' : 'space-y-4'}
                        `}>
                          {view.layout === 'table' ? (
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Path</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Summary</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tags</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Complexity</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                  {groupEndpoints.map(endpoint => (
                                    <EndpointCard
                                      key={endpoint.id}
                                      endpoint={endpoint}
                                      view={view}
                                      onSelect={(endpoint) => {
                                        console.log('Selected endpoint:', endpoint);
                                      }}
                                    />
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            groupEndpoints.map(endpoint => (
                              <EndpointCard
                                key={endpoint.id}
                                endpoint={endpoint}
                                view={view}
                                onSelect={(endpoint) => {
                                  console.log('Selected endpoint:', endpoint);
                                }}
                              />
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No endpoints found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Try adjusting your filters or search terms to find the endpoints you're looking for.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        endpoints={filteredEndpoints}
        filters={filters}
        onExport={handleExport}
      />

      <AnalyticsDashboard
        analytics={analytics}
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
      />

      <IntegrationsModal
        isOpen={isIntegrationsOpen}
        onClose={() => setIsIntegrationsOpen(false)}
      />

      <SchemaExplorer
        spec={spec}
        isOpen={isSchemaExplorerOpen}
        onClose={() => setIsSchemaExplorerOpen(false)}
      />

      <ValidationCenter
        spec={spec}
        endpoints={endpoints}
        isOpen={isValidationCenterOpen}
        onClose={() => setIsValidationCenterOpen(false)}
      />

      <CodeGenerator
        spec={spec}
        endpoints={endpoints}
        isOpen={isCodeGeneratorOpen}
        onClose={() => setIsCodeGeneratorOpen(false)}
      />
    </div>
  );
}

export default App;