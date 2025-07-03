import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { FileUpload } from './components/FileUpload';
import { Header } from './components/Header';
import { AdvancedFilters } from './components/AdvancedFilters';
import { ViewControls } from './components/ViewControls';
import { EndpointCard } from './components/EndpointCard';
import { VirtualList, VirtualListSkeleton } from './components/VirtualList';
import { MCPInstructions } from './components/MCPInstructions';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { 
  LazyAnalyticsDashboard, 
  LazyExportModal, 
  LazySchemaExplorer, 
  LazyValidationCenter,
  usePreloadOnHover,
  useLazyLoadingStats
} from './components/LazyComponents';
import { OpenAPIParser } from './utils/openapi-parser';
import { ExportUtils } from './utils/export-utils';
import { generateAnalytics } from './utils/analytics';
import { useAdvancedSearchWithWorkers } from './hooks/useAdvancedSearchWithWorkers';
import { useTouchGestures } from './utils/touchGestures';
import { useWorkerManager } from './utils/worker-manager';
import { OpenAPIStreamingParser } from './utils/streaming-parser';
import { useMemoryOptimization } from './utils/memory-optimizer';
import { OpenAPISpec, EndpointData, FilterState, GroupingState, ViewState } from './types/openapi';
import { Zap, FileText, Search, BarChart3, ChevronDown, Shield, Code, ChevronUp, Layers, GitBranch, Users, RotateCcw } from 'lucide-react';
import { SchemaExplorer } from './components/SchemaExplorer';
import testSpec from '../test-openapi.json';
import { produce } from 'immer';

function App() {
  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  const [allSpecs, setAllSpecs] = useState<OpenAPISpec[]>([]);
  const [endpoints, setEndpoints] = useState<EndpointData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isMCPOpen, setIsMCPOpen] = useState(false);
  const [isSchemaExplorerOpen, setIsSchemaExplorerOpen] = useState(false);
  const [isValidationCenterOpen, setIsValidationCenterOpen] = useState(false);
  const [isPerformanceMonitorOpen, setIsPerformanceMonitorOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showGestureHint, setShowGestureHint] = useState(false);
  const [parseProgress, setParseProgress] = useState<{ progress: number; message: string } | null>(null);
  
  // Refs for gesture handling
  const mainContentRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  
  // Worker manager for background processing
  const workerManager = useWorkerManager();
  
  // Memory optimization for performance monitoring
  const { createObjectPool } = useMemoryOptimization();
  
  // Create object pools for frequently created objects
  React.useEffect(() => {
    // Object pool for endpoint card data
    createObjectPool(
      'endpointCardData',
      () => ({ method: '', path: '', summary: '', tags: [], responses: {} }),
      (obj) => {
        obj.method = '';
        obj.path = '';
        obj.summary = '';
        obj.tags = [];
        obj.responses = {};
      },
      50
    );
  }, []);
  
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
  const { 
    filteredEndpoints, 
    groupedEndpoints, 
    totalFiltered, 
    isSearching, 
    searchProgress: searchProgressWorker, 
    shouldUseWorkers 
  } = useAdvancedSearchWithWorkers(endpoints, filters, grouping);
  const analytics = generateAnalytics(endpoints);

  // Lazy loading stats for performance monitoring
  const lazyStats = useLazyLoadingStats();

  // Preload functions for hover optimization
  const preloadAnalytics = usePreloadOnHover(() => import('./components/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
  const preloadExport = usePreloadOnHover(() => import('./components/ExportModal').then(m => ({ default: m.ExportModal })));
  const preloadValidation = usePreloadOnHover(() => import('./components/ValidationCenter').then(m => ({ default: m.ValidationCenter })));
  const preloadSchemas = usePreloadOnHover(() => import('./components/SchemaExplorer').then(m => ({ default: m.SchemaExplorer })));

  // Performance monitoring for mobile optimization
  const [performanceMetrics, setPerformanceMetrics] = useState({
    memoryUsage: 0,
    renderTime: 0,
    isSlowDevice: false
  });

  // Virtual scrolling configuration for large endpoint lists
  const [containerHeight, setContainerHeight] = useState(600);

  // Performance monitoring effect
  useEffect(() => {
    const checkDevicePerformance = () => {
      // Simple heuristics for slow devices
      const isSlowDevice = navigator.hardwareConcurrency <= 2 || 
                          /Android [4-6]|iPhone [5-8]/.test(navigator.userAgent);
      
      return isSlowDevice;
    };

    const updatePerformanceMetrics = () => {
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        setPerformanceMetrics(prev => ({
          ...prev,
          memoryUsage: memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit,
          isSlowDevice: checkDevicePerformance()
        }));
      } else {
        setPerformanceMetrics(prev => ({
          ...prev,
          isSlowDevice: checkDevicePerformance()
        }));
      }
    };

    updatePerformanceMetrics();
    const interval = setInterval(updatePerformanceMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update container height on resize
  useEffect(() => {
    const updateContainerHeight = () => {
      const viewportHeight = window.innerHeight;
      const headerHeight = 120; // Approximate header height
      const controlsHeight = 120; // Approximate controls height
      const availableHeight = viewportHeight - headerHeight - controlsHeight;
      setContainerHeight(Math.max(400, availableHeight));
    };

    updateContainerHeight();
    window.addEventListener('resize', updateContainerHeight);
    return () => window.removeEventListener('resize', updateContainerHeight);
  }, []);

  // Calculate item height based on view layout
  const getItemHeight = useCallback((index: number): number => {
    return view.layout === 'grid' ? 200 : view.layout === 'list' ? 80 : 120;
  }, [view.layout]);

  // Determine if virtual scrolling should be used
  const shouldUseVirtualScrolling = filteredEndpoints.length > 50 || performanceMetrics.isSlowDevice;

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    if (!spec || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // Simulate refresh delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Re-extract endpoints using worker
      const extractedEndpoints = await workerManager.extractEndpoints(spec);
      setEndpoints(extractedEndpoints);
    } catch (err) {
      setError('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [spec, isRefreshing, workerManager.extractEndpoints]);

  // Touch gesture handlers
  const handleSwipe = useCallback((gesture: { direction: 'left' | 'right' | 'up' | 'down'; distance: number; velocity: number; duration: number }) => {
    if (window.innerWidth < 1024) { // Only on mobile/tablet
      switch (gesture.direction) {
        case 'left':
          setIsFilterOpen(true);
          break;
        case 'right':
          setIsFilterOpen(false);
          break;
        case 'up':
          // Scroll to top on swipe up
          if (mainContentRef.current) {
            mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          }
          break;
        case 'down':
          // Expand all groups on swipe down (if not at top)
          if (mainContentRef.current && mainContentRef.current.scrollTop > 100) {
            expandAllGroups();
          }
          break;
      }
    }
  }, []);

  const handleDoubleTap = useCallback((point: { x: number; y: number }) => {
    // Double tap to toggle filter sidebar
    setIsFilterOpen(prev => !prev);
  }, []);

  const handlePullRefresh = useCallback((gesture: { distance: number; isTriggered: boolean }) => {
    if (gesture.isTriggered && !isRefreshing) {
      handleRefresh();
    }
  }, [handleRefresh, isRefreshing]);

  // Initialize touch gestures
  useTouchGestures(appRef, {
    onSwipe: handleSwipe,
    onDoubleTap: handleDoubleTap,
    onPullRefresh: handlePullRefresh,
  });

  // Reset expanded groups when grouping changes
  useEffect(() => {
    setExpandedGroups(new Set());
  }, [grouping.groupBy]);

  // Show gesture hint on mobile devices
  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    const hasSeenHint = localStorage.getItem('gesture-hint-seen');
    
    if (isMobile && !hasSeenHint && spec) {
      setShowGestureHint(true);
      localStorage.setItem('gesture-hint-seen', 'true');
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setShowGestureHint(false);
      }, 5000);
    }
  }, [spec]);

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setParseProgress({ progress: 0, message: 'Reading file...' });
    
    try {
      // Use streaming parser for large files (>5MB) or if device is slow
      const fileSize = file.size;
      const useLargeFileStreaming = fileSize > 5 * 1024 * 1024; // 5MB threshold
      const useStreamingOptimization = performanceMetrics.isSlowDevice || useLargeFileStreaming;
      
      if (useStreamingOptimization) {
        setParseProgress({ progress: 0, message: `Streaming large file (${Math.round(fileSize / 1024 / 1024)}MB)...` });
        
        const streamingParser = new OpenAPIStreamingParser({
          chunkSize: performanceMetrics.isSlowDevice ? 32 * 1024 : 64 * 1024, // Smaller chunks for slow devices
          maxMemoryUsage: performanceMetrics.isSlowDevice ? 50 : 100, // Reduced memory limit for slow devices
          enableCompression: fileSize > 10 * 1024 * 1024, // Enable compression for files >10MB
          validateOnParse: true,
          prioritizeEndpoints: true,
          progressCallback: ({ percentage, stage, message }) => {
            setParseProgress({ 
              progress: percentage, 
              message: `${stage}: ${message}` 
            });
          }
        });
        
        const result = await streamingParser.parseFile(file);
        
        setSpec(result.spec);
        setEndpoints(result.endpoints);
        
        // Report streaming performance
        if (result.metadata) {
          console.log('Streaming Parse Performance:', {
            fileSize: `${Math.round(result.metadata.totalSize / 1024 / 1024)}MB`,
            parseTime: `${Math.round(result.metadata.parseTime)}ms`,
            chunksProcessed: result.metadata.chunksProcessed,
            memoryUsed: `${Math.round(result.metadata.memoryUsed / 1024 / 1024)}MB`,
            compressionRatio: result.metadata.compressionRatio
          });
        }
      } else {
        // Use standard parsing for smaller files
        const text = await file.text();
        setParseProgress({ progress: 25, message: 'Parsing specification...' });
        
        const result = await workerManager.parseOpenAPIContent(
          text,
          { validateSpec: true, extractMetadata: true },
          (progress: number, message?: string) => {
            setParseProgress({ progress: 25 + (progress * 0.75), message: message || 'Processing...' });
          }
        );
        
        setSpec(result.spec);
        setEndpoints(result.endpoints || []);
      }
      
      setShowUpload(false);
      setParseProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
      setParseProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextUpload = async (text: string) => {
    setIsLoading(true);
    setError(null);
    setParseProgress({ progress: 0, message: 'Parsing specification...' });
    
    try {
      // Use streaming parser for large text content (>2MB) or if device is slow
      const textSize = new Blob([text]).size;
      const useLargeTextStreaming = textSize > 2 * 1024 * 1024; // 2MB threshold for text
      const useStreamingOptimization = performanceMetrics.isSlowDevice || useLargeTextStreaming;
      
      if (useStreamingOptimization) {
        setParseProgress({ progress: 0, message: `Streaming large content (${Math.round(textSize / 1024 / 1024)}MB)...` });
        
        const streamingParser = new OpenAPIStreamingParser({
          chunkSize: performanceMetrics.isSlowDevice ? 32 * 1024 : 64 * 1024,
          maxMemoryUsage: performanceMetrics.isSlowDevice ? 50 : 100,
          enableCompression: textSize > 5 * 1024 * 1024, // Enable compression for content >5MB
          validateOnParse: true,
          prioritizeEndpoints: true,
          progressCallback: ({ percentage, stage, message }) => {
            setParseProgress({ 
              progress: percentage, 
              message: `${stage}: ${message}` 
            });
          }
        });
        
        const result = await streamingParser.parseText(text);
        
        setSpec(result.spec);
        setEndpoints(result.endpoints);
        
        // Report streaming performance
        if (result.metadata) {
          console.log('Streaming Text Parse Performance:', {
            textSize: `${Math.round(result.metadata.totalSize / 1024 / 1024)}MB`,
            parseTime: `${Math.round(result.metadata.parseTime)}ms`,
            chunksProcessed: result.metadata.chunksProcessed,
            memoryUsed: `${Math.round(result.metadata.memoryUsed / 1024 / 1024)}MB`,
            compressionRatio: result.metadata.compressionRatio
          });
        }
      } else {
        // Use standard worker parsing for smaller content
        const result = await workerManager.parseOpenAPIContent(
          text,
          { validateSpec: true, extractMetadata: true },
          (progress: number, message?: string) => {
            setParseProgress({ progress, message: message || 'Processing...' });
          }
        );
        
        setSpec(result.spec);
        setEndpoints(result.endpoints || []);
      }
      
      setShowUpload(false);
      setParseProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse specification');
      setParseProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlUpload = async (url: string) => {
    setIsLoading(true);
    setError(null);
    setParseProgress({ progress: 0, message: 'Fetching from URL...' });
    
    try {
      // Fetch content from URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      
      // Check content length for streaming decision
      const contentLength = response.headers.get('content-length');
      const estimatedSize = contentLength ? parseInt(contentLength) : 0;
      const shouldStreamFromSize = estimatedSize > 2 * 1024 * 1024; // 2MB threshold
      
      setParseProgress({ progress: 20, message: 'Processing fetched content...' });
      
      if (shouldStreamFromSize || performanceMetrics.isSlowDevice) {
        // For large content or slow devices, use streaming approach
        const text = await response.text();
        const actualSize = new Blob([text]).size;
        
        setParseProgress({ progress: 30, message: `Streaming fetched content (${Math.round(actualSize / 1024 / 1024)}MB)...` });
        
        const streamingParser = new OpenAPIStreamingParser({
          chunkSize: performanceMetrics.isSlowDevice ? 32 * 1024 : 64 * 1024,
          maxMemoryUsage: performanceMetrics.isSlowDevice ? 50 : 100,
          enableCompression: actualSize > 5 * 1024 * 1024,
          validateOnParse: true,
          prioritizeEndpoints: true,
          progressCallback: ({ percentage, stage, message }) => {
            setParseProgress({ 
              progress: 30 + (percentage * 0.7), 
              message: `${stage}: ${message}` 
            });
          }
        });
        
        const result = await streamingParser.parseText(text);
        
        setSpec(result.spec);
        setEndpoints(result.endpoints);
        
        // Report streaming performance
        if (result.metadata) {
          console.log('Streaming URL Parse Performance:', {
            contentSize: `${Math.round(result.metadata.totalSize / 1024 / 1024)}MB`,
            parseTime: `${Math.round(result.metadata.parseTime)}ms`,
            chunksProcessed: result.metadata.chunksProcessed,
            memoryUsed: `${Math.round(result.metadata.memoryUsed / 1024 / 1024)}MB`,
            compressionRatio: result.metadata.compressionRatio
          });
        }
      } else {
        // Use standard parsing for smaller content
        const text = await response.text();
        setParseProgress({ progress: 30, message: 'Parsing specification...' });
        
        const result = await workerManager.parseOpenAPIContent(
          text,
          { validateSpec: true, extractMetadata: true },
          (progress: number, message?: string) => {
            setParseProgress({ progress: 30 + (progress * 0.7), message: message || 'Processing...' });
          }
        );
        
        setSpec(result.spec);
        setEndpoints(result.endpoints || []);
      }
      
      setShowUpload(false);
      setParseProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch or parse specification from URL');
      setParseProgress(null);
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

  // Extract filter options from endpoints
  const availableTags = React.useMemo(() => {
    const tags = new Set<string>();
    endpoints.forEach(endpoint => {
      endpoint.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [endpoints]);

  const availableMethods = React.useMemo(() => {
    const methods = new Set<string>();
    endpoints.forEach(endpoint => {
      methods.add(endpoint.method);
    });
    return Array.from(methods).sort();
  }, [endpoints]);

  const availableStatusCodes = React.useMemo(() => {
    const codes = new Set<string>();
    endpoints.forEach(endpoint => {
      Object.keys(endpoint.responses).forEach(code => codes.add(code));
    });
    return Array.from(codes).sort();
  }, [endpoints]);

  // Show upload screen if no spec is loaded
  if (showUpload || !spec) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 sm:mb-6">
              <Zap className="h-8 w-8 sm:h-12 sm:w-12 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
              OpenAPI Explorer
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Advanced OpenAPI specification visualizer with intelligent filtering, grouping, 
              analytics, and AI-powered insights for better API understanding.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid gap-4 sm:gap-6 mb-8 sm:mb-12 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900 rounded-lg w-fit mb-3 sm:mb-4">
                <Search className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Advanced Filtering
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Multi-dimensional filtering by methods, tags, complexity, security, and more with intelligent search.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900 rounded-lg w-fit mb-3 sm:mb-4">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Smart Grouping
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Organize endpoints by tags, methods, complexity, or path patterns with flexible sorting options.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow sm:col-span-2 lg:col-span-1">
              <div className="p-2 sm:p-3 bg-purple-100 dark:bg-purple-900 rounded-lg w-fit mb-3 sm:mb-4">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Analytics & Insights
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Comprehensive analytics with complexity scoring, performance estimates, and business insights.
              </p>
            </div>
          </div>

          {/* Additional Features */}
          <div className="grid gap-3 sm:gap-4 mb-8 sm:mb-12 grid-cols-2 sm:grid-cols-4">
            <div className="text-center p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 mx-auto mb-2" />
              <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">Security Analysis</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <Code className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 mx-auto mb-2" />
              <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">Code Generation</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <GitBranch className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500 mx-auto mb-2" />
              <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">Version Control</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500 mx-auto mb-2" />
              <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">Team Collaboration</p>
            </div>
          </div>

          {/* Upload Component */}
          <FileUpload 
            onFileUpload={handleFileUpload}
            onTextUpload={handleTextUpload}
            onUrlUpload={handleUrlUpload}
            isLoading={isLoading}
            parseProgress={parseProgress}
          />
        </div>
      </div>
    );
  }

  // Main application view
  return (
    <div ref={appRef} className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header
        title={spec.info.title}
        subtitle={`${endpoints.length} endpoints • v${spec.info.version}`}
        onFilterToggle={() => setIsFilterOpen(!isFilterOpen)}
        onExportClick={() => setIsExportOpen(true)}
        onUploadClick={() => setShowUpload(true)}
        onAnalyticsClick={() => setIsAnalyticsOpen(true)}
        onMCPClick={() => setIsMCPOpen(true)}
        searchValue={filters.search}
        onSearchChange={(search) => setFilters({ ...filters, search })}
        isSpecLoaded={!!spec}
      />

      <div className="flex min-h-0">
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

        <main 
          ref={mainContentRef}
          id="main-content"
          className="flex-1 lg:ml-0 min-w-0"
          role="main"
          aria-label="API specification content"
        >
          {/* View Controls */}
          <ViewControls
            grouping={grouping}
            onGroupingChange={setGrouping}
            view={view}
            onViewChange={setView}
          />

          {/* Pull-to-refresh indicator */}
          {isRefreshing && (
            <div className="flex items-center justify-center py-4 px-6">
              <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                <RotateCcw className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Refreshing...</span>
              </div>
            </div>
          )}

          <div className="p-3 sm:p-6">
            {/* API Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 break-words">
                    {spec.info.title}
                  </h1>
                  {spec.info.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-3xl leading-relaxed">
                      {spec.info.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <span>Version: <strong className="text-gray-900 dark:text-white">{spec.info.version}</strong></span>
                    <span>OpenAPI: <strong className="text-gray-900 dark:text-white">{spec.openapi}</strong></span>
                    <span>Endpoints: <strong className="text-gray-900 dark:text-white">{endpoints.length}</strong></span>
                    {availableTags.length > 0 && (
                      <span>Tags: <strong className="text-gray-900 dark:text-white">{availableTags.length}</strong></span>
                    )}
                    <span>Filtered: <strong className="text-blue-600 dark:text-blue-400">{totalFiltered}</strong></span>
                  </div>
                </div>
                
                {/* Advanced Tools */}
                <div className="flex flex-col xs:flex-row gap-2 flex-shrink-0">
                  <button
                    onClick={() => setIsValidationCenterOpen(true)}
                    {...preloadValidation}
                    className="touch-target-sm flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                    aria-label="Open validation center"
                  >
                    <Shield className="h-4 w-4" />
                    <span className="xs:hidden sm:inline">Validate</span>
                  </button>
                  <button
                    onClick={() => setIsSchemaExplorerOpen(true)}
                    onMouseEnter={preloadSchemas.onMouseEnter}
                    disabled={!spec}
                    className="touch-target-sm flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Open schema explorer"
                  >
                    <Layers className="h-4 w-4" />
                    <span className="xs:hidden sm:inline">Schemas</span>
                  </button>
                  <button
                    onClick={() => setIsPerformanceMonitorOpen(true)}
                    className="touch-target-sm flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium focus:ring-2 focus:ring-green-300 focus:ring-offset-2"
                    aria-label="Open performance monitor"
                  >
                    <Zap className="h-4 w-4" />
                    <span className="xs:hidden sm:inline">Performance</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Group Controls */}
            {grouping.groupBy !== 'none' && Object.keys(groupedEndpoints).length > 1 && (
              <div className="flex flex-col xs:flex-row xs:items-center gap-3 mb-4 sm:mb-6">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Group Controls:
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={expandAllGroups}
                    className="touch-target-sm px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white dark:text-white rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md border border-blue-700"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={collapseAllGroups}
                    className="touch-target-sm px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700 text-white dark:text-white rounded-lg transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 shadow-md border border-gray-700"
                  >
                    Collapse All
                  </button>
                </div>
              </div>
            )}

            {/* No Results Message */}
            {totalFiltered === 0 && (
              <div className="text-center py-8 sm:py-12">
                <div className="p-3 sm:p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-fit mx-auto mb-4">
                  <Search className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No endpoints found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Try adjusting your filters or search terms to find the endpoints you're looking for.
                </p>
              </div>
            )}

            {/* Grouped Endpoints */}
            <div className="space-y-4 sm:space-y-6">
              {Object.entries(groupedEndpoints).map(([groupName, groupEndpoints]) => {
                const isExpanded = expandedGroups.has(groupName);
                const showGroupHeader = grouping.groupBy !== 'none' && Object.keys(groupedEndpoints).length > 1;

                return (
                  <div key={groupName} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {showGroupHeader && (
                      <button
                        onClick={() => toggleGroup(groupName)}
                        className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-inset touch-target"
                        aria-expanded={isExpanded}
                        aria-controls={`group-${groupName}`}
                      >
                        <div className="flex items-center gap-3">
                          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                            {groupName}
                          </h2>
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs sm:text-sm rounded-full">
                            {groupEndpoints.length}
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                      </button>
                    )}

                    {(isExpanded || !showGroupHeader) && (
                      <div 
                        id={showGroupHeader ? `group-${groupName}` : undefined}
                        className={`
                          ${showGroupHeader ? 'p-3 sm:p-4' : 'p-0'}
                          ${view.layout === 'grid' ? 'grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2' : 
                            view.layout === 'compact' ? 'space-y-2' : 
                            view.layout === 'table' ? '' : 'space-y-3 sm:space-y-4'}
                        `}
                      >
                        {view.layout === 'table' ? (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px]">
                              <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th>
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Path</th>
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Summary</th>
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Tags</th>
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Complexity</th>
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Status</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {(shouldUseVirtualScrolling && groupEndpoints.length > 20) ? (
                                  <tr>
                                    <td colSpan={6} className="p-0">
                                      <VirtualList
                                        items={groupEndpoints}
                                        height={containerHeight}
                                        itemHeight={getItemHeight}
                                        renderItem={(virtualItem, isScrolling) => (
                                          <EndpointCard
                                            key={`${virtualItem.data.method}-${virtualItem.data.path}`}
                                            endpoint={virtualItem.data}
                                            view={view}
                                          />
                                        )}
                                        className="custom-scrollbar"
                                        getItemKey={(endpoint, index) => `${endpoint.method}-${endpoint.path}`}
                                        loadingState={<VirtualListSkeleton count={5} itemHeight={60} />}
                                        emptyState={<div className="text-center text-gray-500 py-8">No endpoints found</div>}
                                      />
                                    </td>
                                  </tr>
                                ) : (
                                  groupEndpoints.map((endpoint) => (
                                    <EndpointCard
                                      key={`${endpoint.method}-${endpoint.path}`}
                                      endpoint={endpoint}
                                      view={view}
                                    />
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <>
                            {(shouldUseVirtualScrolling && groupEndpoints.length > 20) ? (
                              <VirtualList
                                items={groupEndpoints}
                                height={containerHeight}
                                itemHeight={getItemHeight}
                                renderItem={(virtualItem, isScrolling) => (
                                  <EndpointCard
                                    key={`${virtualItem.data.method}-${virtualItem.data.path}`}
                                    endpoint={virtualItem.data}
                                    view={view}
                                  />
                                )}
                                className="custom-scrollbar"
                                getItemKey={(endpoint, index) => `${endpoint.method}-${endpoint.path}`}
                                loadingState={<VirtualListSkeleton count={5} itemHeight={getItemHeight(0)} />}
                                emptyState={<div className="text-center text-gray-500 py-8">No endpoints found</div>}
                              />
                            ) : (
                              groupEndpoints.map((endpoint) => (
                                <EndpointCard
                                  key={`${endpoint.method}-${endpoint.path}`}
                                  endpoint={endpoint}
                                  view={view}
                                />
                              ))
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      {isAnalyticsOpen && (
        <LazyAnalyticsDashboard
          isOpen={isAnalyticsOpen}
          onClose={() => setIsAnalyticsOpen(false)}
          analytics={analytics}
        />
      )}

      {isExportOpen && (
        <LazyExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          endpoints={filteredEndpoints}
          filters={filters}
          onExport={handleExport}
        />
      )}

      {isValidationCenterOpen && (
        <LazyValidationCenter
          isOpen={isValidationCenterOpen}
          onClose={() => setIsValidationCenterOpen(false)}
          spec={spec}
          endpoints={endpoints}
        />
      )}

      {isMCPOpen && (
        <MCPInstructions
          isOpen={isMCPOpen}
          onClose={() => setIsMCPOpen(false)}
        />
      )}

      {isSchemaExplorerOpen && (
        <SchemaExplorer
          spec={spec}
          allSpecs={allSpecs}
          isOpen={isSchemaExplorerOpen}
          onClose={() => setIsSchemaExplorerOpen(false)}
        />
      )}

      {isPerformanceMonitorOpen && (
        <PerformanceMonitor
          isVisible={isPerformanceMonitorOpen}
          onClose={() => setIsPerformanceMonitorOpen(false)}
          endpointCount={endpoints.length}
          filteredCount={totalFiltered}
          isSearching={isSearching}
          searchProgress={searchProgressWorker || parseProgress}
          shouldUseWorkers={shouldUseWorkers}
        />
      )}

      {/* Mobile Gesture Hint */}
      {showGestureHint && (
        <div className="fixed bottom-4 left-4 right-4 z-50 lg:hidden">
          <div className="bg-blue-600 text-white rounded-lg p-4 shadow-lg animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-2">Touch Gestures Available</h4>
                <ul className="text-xs space-y-1 opacity-90">
                  <li>• Swipe left/right: Open/close filters</li>
                  <li>• Double tap: Toggle filters</li>
                  <li>• Pull down: Refresh data</li>
                  <li>• Swipe up: Scroll to top</li>
                </ul>
              </div>
              <button
                onClick={() => setShowGestureHint(false)}
                className="ml-3 p-1 hover:bg-blue-700 rounded"
                aria-label="Close gesture hint"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vercel Analytics */}
      <Analytics />
    </div>
  );
}

export default App;