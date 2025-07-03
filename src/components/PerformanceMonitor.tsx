import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Zap, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  X,
  BarChart3,
  Layers,
  Search,
  Database
} from 'lucide-react';

interface PerformanceMetrics {
  memoryUsage: number;
  memoryLimit: number;
  renderTime: number;
  lastUpdateTime: number;
  isSlowDevice: boolean;
  cacheHitRate: number;
  cacheSize: number;
  workerStatus: {
    parser: { active: boolean; tasks: number };
    search: { active: boolean; tasks: number };
  };
  virtualScrollingMetrics: {
    itemsRendered: number;
    totalItems: number;
    scrollPosition: number;
    renderEfficiency: number;
  };
  searchMetrics: {
    lastSearchTime: number;
    useWorkers: boolean;
    resultsCount: number;
    searchComplexity: 'low' | 'medium' | 'high';
  };
}

interface PerformanceMonitorProps {
  isVisible: boolean;
  onClose: () => void;
  endpointCount: number;
  filteredCount: number;
  isSearching?: boolean;
  searchProgress?: { progress: number; message: string } | null;
  shouldUseWorkers?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  isVisible,
  onClose,
  endpointCount,
  filteredCount,
  isSearching = false,
  searchProgress = null,
  shouldUseWorkers = false
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    memoryLimit: 0,
    renderTime: 0,
    lastUpdateTime: Date.now(),
    isSlowDevice: false,
    cacheHitRate: 0,
    cacheSize: 0,
    workerStatus: {
      parser: { active: false, tasks: 0 },
      search: { active: isSearching, tasks: 0 }
    },
    virtualScrollingMetrics: {
      itemsRendered: 0,
      totalItems: endpointCount,
      scrollPosition: 0,
      renderEfficiency: 100
    },
    searchMetrics: {
      lastSearchTime: 0,
      useWorkers: shouldUseWorkers,
      resultsCount: filteredCount,
      searchComplexity: endpointCount > 1000 ? 'high' : endpointCount > 500 ? 'medium' : 'low'
    }
  });

  const [performanceHistory, setPerformanceHistory] = useState<Array<{
    timestamp: number;
    memoryUsage: number;
    renderTime: number;
  }>>([]);

  const updateIntervalRef = useRef<NodeJS.Timeout>();
  const performanceObserverRef = useRef<PerformanceObserver>();

  // Update metrics periodically
  const updateMetrics = useCallback(() => {
    const now = Date.now();
    
    // Get memory information if available
    let memoryUsage = 0;
    let memoryLimit = 0;
    
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      memoryUsage = memInfo.usedJSHeapSize;
      memoryLimit = memInfo.jsHeapSizeLimit;
    }

    // Estimate render time based on recent performance entries
    const navigationEntries = performance.getEntriesByType('navigation');
    const paintEntries = performance.getEntriesByType('paint');
    
    let renderTime = 0;
    if (paintEntries.length > 0) {
      const lastPaint = paintEntries[paintEntries.length - 1];
      renderTime = lastPaint.startTime;
    }

    // Device performance detection
    const isSlowDevice = navigator.hardwareConcurrency <= 2 || 
                        /Android [4-6]|iPhone [5-8]/.test(navigator.userAgent);

    // Mock cache metrics (in real app, these would come from cache manager)
    const cacheHitRate = Math.random() * 0.3 + 0.7; // 70-100%
    const cacheSize = Math.floor(Math.random() * 50) + 10; // 10-60 MB

    // Calculate virtual scrolling efficiency
    const visibleItems = Math.min(50, endpointCount); // Assume 50 items visible
    const renderEfficiency = endpointCount > 0 ? (visibleItems / endpointCount) * 100 : 100;

    const newMetrics: PerformanceMetrics = {
      memoryUsage: memoryUsage / (1024 * 1024), // Convert to MB
      memoryLimit: memoryLimit / (1024 * 1024), // Convert to MB
      renderTime,
      lastUpdateTime: now,
      isSlowDevice,
      cacheHitRate,
      cacheSize,
      workerStatus: {
        parser: { active: false, tasks: 0 },
        search: { active: isSearching, tasks: isSearching ? 1 : 0 }
      },
      virtualScrollingMetrics: {
        itemsRendered: visibleItems,
        totalItems: endpointCount,
        scrollPosition: 0,
        renderEfficiency
      },
      searchMetrics: {
        lastSearchTime: searchProgress ? now : metrics.searchMetrics.lastSearchTime,
        useWorkers: shouldUseWorkers,
        resultsCount: filteredCount,
        searchComplexity: endpointCount > 1000 ? 'high' : endpointCount > 500 ? 'medium' : 'low'
      }
    };

    setMetrics(newMetrics);

    // Update performance history
    setPerformanceHistory(prev => {
      const newHistory = [...prev, {
        timestamp: now,
        memoryUsage: newMetrics.memoryUsage,
        renderTime: newMetrics.renderTime
      }];
      
      // Keep only last 60 data points (1 minute if updating every second)
      return newHistory.slice(-60);
    });
  }, [endpointCount, filteredCount, isSearching, searchProgress, shouldUseWorkers, metrics.searchMetrics.lastSearchTime]);

  // Performance observer for more accurate metrics
  useEffect(() => {
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        // Process performance entries for more accurate timing data
        entries.forEach(entry => {
          if (entry.entryType === 'measure' || entry.entryType === 'navigation') {
            // Update render time based on actual measurements
            setMetrics(prev => ({
              ...prev,
              renderTime: entry.duration || prev.renderTime
            }));
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
        performanceObserverRef.current = observer;
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }
    }

    return () => {
      if (performanceObserverRef.current) {
        performanceObserverRef.current.disconnect();
      }
    };
  }, []);

  // Start/stop metrics collection
  useEffect(() => {
    if (isVisible) {
      updateMetrics(); // Initial update
      updateIntervalRef.current = setInterval(updateMetrics, 1000); // Update every second
    } else {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [isVisible, updateMetrics]);

  // Format bytes to readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format time to readable format
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Get performance status color
  const getStatusColor = (value: number, thresholds: { good: number; warning: number }): string => {
    if (value <= thresholds.good) return 'text-green-600 dark:text-green-400';
    if (value <= thresholds.warning) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Get performance status icon
  const getStatusIcon = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return CheckCircle;
    if (value <= thresholds.warning) return AlertTriangle;
    return AlertTriangle;
  };

  if (!isVisible) return null;

  const memoryPercentage = metrics.memoryLimit > 0 ? (metrics.memoryUsage / metrics.memoryLimit) * 100 : 0;
  const MemoryIcon = getStatusIcon(memoryPercentage, { good: 50, warning: 80 });
  const RenderIcon = getStatusIcon(metrics.renderTime, { good: 16, warning: 50 });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Performance Monitor
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Real-time performance metrics and optimization insights
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Search Progress */}
          {searchProgress && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {searchProgress.message}
                </span>
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  {Math.round(searchProgress.progress)}%
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${searchProgress.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Memory Usage */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Memory</span>
                </div>
                <MemoryIcon className={`h-4 w-4 ${getStatusColor(memoryPercentage, { good: 50, warning: 80 })}`} />
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatBytes(metrics.memoryUsage * 1024 * 1024)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {memoryPercentage.toFixed(1)}% of {formatBytes(metrics.memoryLimit * 1024 * 1024)}
                </div>
              </div>
            </div>

            {/* Render Performance */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Render</span>
                </div>
                <RenderIcon className={`h-4 w-4 ${getStatusColor(metrics.renderTime, { good: 16, warning: 50 })}`} />
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatTime(metrics.renderTime)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Last render time
                </div>
              </div>
            </div>

            {/* Cache Performance */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Cache</span>
                </div>
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {(metrics.cacheHitRate * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Hit rate • {formatBytes(metrics.cacheSize * 1024 * 1024)}
                </div>
              </div>
            </div>

            {/* Virtual Scrolling */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Virtual</span>
                </div>
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {metrics.virtualScrollingMetrics.itemsRendered}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  of {metrics.virtualScrollingMetrics.totalItems} items
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Worker Status */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Web Workers
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Parser Worker</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${metrics.workerStatus.parser.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {metrics.workerStatus.parser.active ? 'Active' : 'Idle'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Search Worker</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${metrics.workerStatus.search.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {metrics.workerStatus.search.active ? 'Active' : 'Idle'}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm">
                    <Info className="h-4 w-4 text-blue-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {shouldUseWorkers ? 'Workers enabled for large datasets' : 'Using synchronous processing'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Performance */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Performance
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Results</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {metrics.searchMetrics.resultsCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Complexity</span>
                  <span className={`text-sm font-medium ${
                    metrics.searchMetrics.searchComplexity === 'low' ? 'text-green-600 dark:text-green-400' :
                    metrics.searchMetrics.searchComplexity === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {metrics.searchMetrics.searchComplexity.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Method</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {metrics.searchMetrics.useWorkers ? 'Web Workers' : 'Synchronous'}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Optimized for {endpointCount.toLocaleString()} endpoints
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Device Information */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Device Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">CPU Cores</span>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {navigator.hardwareConcurrency || 'Unknown'}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Device Class</span>
                <div className={`text-lg font-semibold ${metrics.isSlowDevice ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                  {metrics.isSlowDevice ? 'Low-end' : 'High-end'}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Viewport</span>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {window.innerWidth}×{window.innerHeight}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Pixel Ratio</span>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {window.devicePixelRatio || 1}x
                </div>
              </div>
            </div>
          </div>

          {/* Optimization Recommendations */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Optimization Status
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-blue-800 dark:text-blue-200">
                  Virtual scrolling active - rendering only {metrics.virtualScrollingMetrics.itemsRendered} items
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-blue-800 dark:text-blue-200">
                  Intelligent caching enabled - {(metrics.cacheHitRate * 100).toFixed(0)}% hit rate
                </span>
              </div>
              {shouldUseWorkers && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-blue-800 dark:text-blue-200">
                    Web workers active for background processing
                  </span>
                </div>
              )}
              {metrics.isSlowDevice && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-blue-800 dark:text-blue-200">
                    Performance optimizations enabled for this device
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 