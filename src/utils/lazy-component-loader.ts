import React, { lazy, Suspense, ComponentType, ReactNode, useState, useEffect, useRef, useCallback } from 'react';

interface LazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  fallback?: ReactNode;
  errorFallback?: ComponentType<{ error: Error; retry: () => void }>;
  loadingDelay?: number;
  retryCount?: number;
  preload?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

interface LazyComponentState {
  isLoaded: boolean;
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
}

// Performance monitoring for lazy loading
class LazyLoadingMonitor {
  private metrics = new Map<string, {
    loadTime: number;
    retryCount: number;
    errorCount: number;
    successCount: number;
  }>();

  recordLoadStart(componentName: string): () => void {
    const startTime = performance.now();
    return () => {
      const loadTime = performance.now() - startTime;
      const existing = this.metrics.get(componentName) || {
        loadTime: 0,
        retryCount: 0,
        errorCount: 0,
        successCount: 0
      };
      
      this.metrics.set(componentName, {
        ...existing,
        loadTime: (existing.loadTime + loadTime) / (existing.successCount + 1),
        successCount: existing.successCount + 1
      });
    };
  }

  recordError(componentName: string): void {
    const existing = this.metrics.get(componentName) || {
      loadTime: 0,
      retryCount: 0,
      errorCount: 0,
      successCount: 0
    };
    
    this.metrics.set(componentName, {
      ...existing,
      errorCount: existing.errorCount + 1
    });
  }

  recordRetry(componentName: string): void {
    const existing = this.metrics.get(componentName) || {
      loadTime: 0,
      retryCount: 0,
      errorCount: 0,
      successCount: 0
    };
    
    this.metrics.set(componentName, {
      ...existing,
      retryCount: existing.retryCount + 1
    });
  }

  getMetrics(componentName?: string) {
    if (componentName) {
      return this.metrics.get(componentName);
    }
    return Object.fromEntries(this.metrics.entries());
  }

  getOverallStats() {
    const allMetrics = Array.from(this.metrics.values());
    const totalComponents = allMetrics.length;
    const avgLoadTime = allMetrics.reduce((sum, m) => sum + m.loadTime, 0) / totalComponents;
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errorCount, 0);
    const totalRetries = allMetrics.reduce((sum, m) => sum + m.retryCount, 0);
    const successRate = allMetrics.reduce((sum, m) => sum + m.successCount, 0) / 
                       (allMetrics.reduce((sum, m) => sum + m.successCount + m.errorCount, 0) || 1);

    return {
      totalComponents,
      avgLoadTime,
      totalErrors,
      totalRetries,
      successRate
    };
  }
}

export const lazyLoadingMonitor = new LazyLoadingMonitor();

// Default error fallback component
const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-6 h-6 text-red-600 dark:text-red-400">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.694-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
        Component failed to load
      </h3>
    </div>
    <p className="text-sm text-red-700 dark:text-red-300 mb-3">
      {error.message || 'An unexpected error occurred while loading this component.'}
    </p>
    <button
      onClick={retry}
      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
    >
      Try Again
    </button>
  </div>
);

// Default loading fallback with skeleton
const DefaultLoadingFallback: React.FC = () => (
  <div className="animate-pulse">
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
    </div>
  </div>
);

// Component loader with intelligent loading strategies
export class LazyComponentLoader {
  private static loadedComponents = new Set<string>();
  private static preloadQueue = new Map<string, () => Promise<any>>();
  private static loadingPromises = new Map<string, Promise<any>>();

  // Create a lazy component with advanced options
  static createLazyComponent(
    importFn: () => Promise<{ default: ComponentType<any> }>,
    componentName: string,
    options: LazyLoadOptions = {}
  ): ComponentType<any> {
    const {
      fallback = <DefaultLoadingFallback />,
      errorFallback = DefaultErrorFallback,
      loadingDelay = 200,
      retryCount = 3,
      preload = false,
      priority = 'medium'
    } = options;

    // Preload if requested
    if (preload) {
      this.preloadComponent(importFn, componentName, priority);
    }

    const LazyComponent = lazy(() => {
      const finishLoading = lazyLoadingMonitor.recordLoadStart(componentName);
      
      // Reuse existing loading promise if available
      const existingPromise = this.loadingPromises.get(componentName);
      if (existingPromise) {
        return existingPromise;
      }

      const loadPromise = importFn()
        .then(module => {
          finishLoading();
          this.loadedComponents.add(componentName);
          this.loadingPromises.delete(componentName);
          return module;
        })
        .catch(error => {
          lazyLoadingMonitor.recordError(componentName);
          this.loadingPromises.delete(componentName);
          throw error;
        });

      this.loadingPromises.set(componentName, loadPromise);
      return loadPromise;
    });

    // Return wrapped component with error boundary and retry logic
    const WrappedComponent: ComponentType<any> = (props) => {
      const [state, setState] = useState<LazyComponentState>({
        isLoaded: this.loadedComponents.has(componentName),
        isLoading: false,
        error: null,
        retryCount: 0
      });

      const retry = useCallback(() => {
        if (state.retryCount < retryCount) {
          lazyLoadingMonitor.recordRetry(componentName);
          setState(prev => ({
            ...prev,
            error: null,
            retryCount: prev.retryCount + 1
          }));
        }
      }, [state.retryCount]);

      const ErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
        useEffect(() => {
          const handleError = (event: ErrorEvent) => {
            if (event.error) {
              setState(prev => ({ ...prev, error: event.error }));
            }
          };

          window.addEventListener('error', handleError);
          return () => window.removeEventListener('error', handleError);
        }, []);

        if (state.error && errorFallback) {
          const ErrorComponent = errorFallback;
          return <ErrorComponent error={state.error} retry={retry} />;
        }

        return <>{children}</>;
      };

      return (
        <ErrorBoundary>
          <Suspense fallback={fallback}>
            <LazyComponent {...props} />
          </Suspense>
        </ErrorBoundary>
      );
    };

    WrappedComponent.displayName = `LazyLoaded(${componentName})`;
    return WrappedComponent;
  }

  // Intersection Observer based lazy loading
  static createIntersectionLazyComponent(
    importFn: () => Promise<{ default: ComponentType<any> }>,
    componentName: string,
    options: LazyLoadOptions = {}
  ): ComponentType<any> {
    const {
      threshold = 0.1,
      rootMargin = '50px',
      fallback = <DefaultLoadingFallback />,
      ...restOptions
    } = options;

    const LazyComponent = this.createLazyComponent(importFn, componentName, restOptions);

    const IntersectionLazyComponent: ComponentType<any> = (props) => {
      const [isVisible, setIsVisible] = useState(false);
      const [hasLoaded, setHasLoaded] = useState(false);
      const elementRef = useRef<HTMLDivElement>(null);

      useEffect(() => {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting && !hasLoaded) {
              setIsVisible(true);
              setHasLoaded(true);
              observer.disconnect();
            }
          },
          { threshold, rootMargin }
        );

        if (elementRef.current) {
          observer.observe(elementRef.current);
        }

        return () => observer.disconnect();
      }, [hasLoaded]);

      return (
        <div ref={elementRef} className={props.className}>
          {isVisible ? <LazyComponent {...props} /> : fallback}
        </div>
      );
    };

    IntersectionLazyComponent.displayName = `IntersectionLazy(${componentName})`;
    return IntersectionLazyComponent;
  }

  // Preload component based on priority
  static preloadComponent(
    importFn: () => Promise<any>,
    componentName: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): void {
    if (this.loadedComponents.has(componentName) || this.preloadQueue.has(componentName)) {
      return;
    }

    this.preloadQueue.set(componentName, importFn);

    const delay = priority === 'high' ? 0 : priority === 'medium' ? 100 : 1000;

    setTimeout(() => {
      if (!this.loadedComponents.has(componentName)) {
        importFn()
          .then(() => {
            this.loadedComponents.add(componentName);
            this.preloadQueue.delete(componentName);
          })
          .catch(() => {
            this.preloadQueue.delete(componentName);
          });
      }
    }, delay);
  }

  // Preload based on user interaction patterns
  static preloadOnHover(
    importFn: () => Promise<any>,
    componentName: string
  ): (element: HTMLElement) => () => void {
    return (element: HTMLElement) => {
      let preloaded = false;

      const handleMouseEnter = () => {
        if (!preloaded) {
          this.preloadComponent(importFn, componentName, 'high');
          preloaded = true;
        }
      };

      element.addEventListener('mouseenter', handleMouseEnter, { once: true });

      return () => {
        element.removeEventListener('mouseenter', handleMouseEnter);
      };
    };
  }

  // Preload based on route prediction
  static preloadForRoute(
    route: string,
    components: Array<{ importFn: () => Promise<any>; name: string }>
  ): void {
    // Simple route-based preloading
    const isCurrentRoute = window.location.pathname === route;
    if (isCurrentRoute) {
      components.forEach(({ importFn, name }) => {
        this.preloadComponent(importFn, name, 'medium');
      });
    }
  }

  // Get loading statistics
  static getStats() {
    return {
      loadedComponents: Array.from(this.loadedComponents),
      preloadQueue: Array.from(this.preloadQueue.keys()),
      activeLoads: Array.from(this.loadingPromises.keys()),
      monitor: lazyLoadingMonitor.getOverallStats()
    };
  }

  // Clear cache and reset state
  static reset(): void {
    this.loadedComponents.clear();
    this.preloadQueue.clear();
    this.loadingPromises.clear();
  }
}

// Higher-order component for lazy loading with performance monitoring
export function withLazyLoading(
  importFn: () => Promise<{ default: ComponentType<any> }>,
  componentName: string,
  options?: LazyLoadOptions
) {
  return LazyComponentLoader.createLazyComponent(importFn, componentName, options);
}

// Hook for lazy loading state
export function useLazyLoadingStats() {
  const [stats, setStats] = useState(LazyComponentLoader.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(LazyComponentLoader.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}

// Progressive loading context
interface ProgressiveLoadingContextType {
  priority: 'low' | 'medium' | 'high';
  loadingStrategy: 'immediate' | 'intersection' | 'hover' | 'route';
  isSlowConnection: boolean;
  isLowEndDevice: boolean;
}

export const ProgressiveLoadingContext = React.createContext<ProgressiveLoadingContextType>({
  priority: 'medium',
  loadingStrategy: 'intersection',
  isSlowConnection: false,
  isLowEndDevice: false
});

// Hook to determine optimal loading strategy
export function useLoadingStrategy(): ProgressiveLoadingContextType {
  const [context, setContext] = useState<ProgressiveLoadingContextType>({
    priority: 'medium',
    loadingStrategy: 'intersection',
    isSlowConnection: false,
    isLowEndDevice: false
  });

  useEffect(() => {
    // Detect slow connection
    const connection = (navigator as any).connection;
    const isSlowConnection = connection ? 
      connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g' : false;

    // Detect low-end device
    const isLowEndDevice = navigator.hardwareConcurrency <= 2 || 
                          /Android [4-6]|iPhone [5-8]/.test(navigator.userAgent);

    // Determine strategy based on device capabilities
    let strategy: 'immediate' | 'intersection' | 'hover' | 'route' = 'intersection';
    let priority: 'low' | 'medium' | 'high' = 'medium';

    if (isSlowConnection || isLowEndDevice) {
      strategy = 'hover'; // More conservative loading
      priority = 'low';
    } else if (!isSlowConnection && !isLowEndDevice) {
      strategy = 'intersection'; // Standard loading
      priority = 'high';
    }

    setContext({
      priority,
      loadingStrategy: strategy,
      isSlowConnection,
      isLowEndDevice
    });
  }, []);

  return context;
}

export default LazyComponentLoader; 