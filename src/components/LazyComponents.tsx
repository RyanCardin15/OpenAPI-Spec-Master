import React, { lazy, Suspense, ComponentType } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

// Loading skeleton components for different component types
const AnalyticsLoadingSkeleton = () => (
  <div className="animate-pulse p-6">
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
      ))}
    </div>
    <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
  </div>
);

const ExportLoadingSkeleton = () => (
  <div className="animate-pulse p-6">
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        </div>
      ))}
    </div>
    <div className="mt-6 h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
  </div>
);

const SchemaExplorerLoadingSkeleton = () => (
  <div className="animate-pulse p-6">
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
    <div className="space-y-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  </div>
);

const CodeGeneratorLoadingSkeleton = () => (
  <div className="animate-pulse p-6">
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
    <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
  </div>
);

const ValidationCenterLoadingSkeleton = () => (
  <div className="animate-pulse p-6">
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      ))}
    </div>
  </div>
);

// Error fallback component
const LazyLoadErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      Failed to load component
    </h3>
    <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">
      {error.message || 'The component could not be loaded. Please try again.'}
    </p>
    <button
      onClick={retry}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
    >
      Try Again
    </button>
  </div>
);

// Performance monitoring for lazy loading
class LazyLoadPerformance {
  private static metrics = new Map<string, {
    loadTime: number;
    errorCount: number;
    loadCount: number;
  }>();

  static recordLoad(componentName: string, loadTime: number) {
    const existing = this.metrics.get(componentName) || {
      loadTime: 0,
      errorCount: 0,
      loadCount: 0
    };

    this.metrics.set(componentName, {
      loadTime: (existing.loadTime * existing.loadCount + loadTime) / (existing.loadCount + 1),
      errorCount: existing.errorCount,
      loadCount: existing.loadCount + 1
    });
  }

  static recordError(componentName: string) {
    const existing = this.metrics.get(componentName) || {
      loadTime: 0,
      errorCount: 0,
      loadCount: 0
    };

    this.metrics.set(componentName, {
      ...existing,
      errorCount: existing.errorCount + 1
    });
  }

  static getStats() {
    return Object.fromEntries(this.metrics.entries());
  }
}

// Higher-order component for lazy loading with error boundary
function withLazyLoading(
  importFn: () => Promise<{ default: ComponentType<any> }>,
  componentName: string,
  LoadingSkeleton: ComponentType = () => <div className="animate-pulse p-6"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div></div>
) {
  // Create the lazy component
  const LazyComponent = lazy(() => {
    const startTime = performance.now();
    return importFn()
      .then(module => {
        const loadTime = performance.now() - startTime;
        LazyLoadPerformance.recordLoad(componentName, loadTime);
        return module;
      })
      .catch(error => {
        LazyLoadPerformance.recordError(componentName);
        throw error;
      });
  });

  // Error boundary wrapper
  class LazyLoadErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error: Error | null }
  > {
    constructor(props: { children: React.ReactNode }) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error) {
      LazyLoadPerformance.recordError(componentName);
    }

    retry = () => {
      this.setState({ hasError: false, error: null });
    };

    render() {
      if (this.state.hasError) {
        return <LazyLoadErrorFallback error={this.state.error!} retry={this.retry} />;
      }

      return this.props.children;
    }
  }

  // Return the wrapped component
  return React.forwardRef<any, any>((props, ref) => (
    <LazyLoadErrorBoundary>
      <Suspense fallback={<LoadingSkeleton />}>
        <LazyComponent {...props} ref={ref} />
      </Suspense>
    </LazyLoadErrorBoundary>
  ));
}

// Lazy-loaded heavy components
export const LazyAnalyticsDashboard = withLazyLoading(
  () => import('./AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })),
  'AnalyticsDashboard',
  AnalyticsLoadingSkeleton
);

export const LazyExportModal = withLazyLoading(
  () => import('./ExportModal').then(m => ({ default: m.ExportModal })),
  'ExportModal',
  ExportLoadingSkeleton
);

export const LazySchemaExplorer = withLazyLoading(
  () => import('./SchemaExplorer').then(m => ({ default: m.SchemaExplorer })),
  'SchemaExplorer',
  SchemaExplorerLoadingSkeleton
);

export const LazyCodeGenerator = withLazyLoading(
  () => import('./CodeGenerator').then(m => ({ default: m.CodeGenerator })),
  'CodeGenerator',
  CodeGeneratorLoadingSkeleton
);

export const LazyValidationCenter = withLazyLoading(
  () => import('./ValidationCenter').then(m => ({ default: m.ValidationCenter })),
  'ValidationCenter',
  ValidationCenterLoadingSkeleton
);

// Intersection Observer based lazy loading
export class IntersectionLazyLoader extends React.Component<{
  children: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  fallback?: React.ReactNode;
  className?: string;
}, {
  isVisible: boolean;
}> {
  private elementRef = React.createRef<HTMLDivElement>();
  private observer: IntersectionObserver | null = null;

  constructor(props: any) {
    super(props);
    this.state = { isVisible: false };
  }

  componentDidMount() {
    const { threshold = 0.1, rootMargin = '50px' } = this.props;
    
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.setState({ isVisible: true });
          if (this.observer) {
            this.observer.disconnect();
          }
        }
      },
      { threshold, rootMargin }
    );

    if (this.elementRef.current) {
      this.observer.observe(this.elementRef.current);
    }
  }

  componentWillUnmount() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  render() {
    const { children, fallback, className } = this.props;
    const { isVisible } = this.state;

    return (
      <div ref={this.elementRef} className={className}>
        {isVisible ? children : fallback || <div className="h-32" />}
      </div>
    );
  }
}

// Hook for preloading components on hover
export const usePreloadOnHover = (
  preloadFn: () => Promise<any>,
  enabled: boolean = true
) => {
  const handleMouseEnter = React.useCallback(() => {
    if (enabled) {
      preloadFn().catch(() => {
        // Silently fail - component will load when needed
      });
    }
  }, [preloadFn, enabled]);

  return { onMouseEnter: handleMouseEnter };
};

// Hook for getting lazy loading statistics
export const useLazyLoadingStats = () => {
  const [stats, setStats] = React.useState(LazyLoadPerformance.getStats());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStats(LazyLoadPerformance.getStats());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return stats;
};

// Progressive loading strategy based on device capabilities
export const useProgressiveLoadingStrategy = () => {
  const [strategy, setStrategy] = React.useState<{
    useIntersectionObserver: boolean;
    preloadComponents: boolean;
    priority: 'low' | 'medium' | 'high';
  }>({
    useIntersectionObserver: true,
    preloadComponents: true,
    priority: 'medium'
  });

  React.useEffect(() => {
    // Detect device capabilities
    const isSlowDevice = navigator.hardwareConcurrency <= 2;
    const connection = (navigator as any).connection;
    const isSlowConnection = connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g';

    if (isSlowDevice || isSlowConnection) {
      setStrategy({
        useIntersectionObserver: true,
        preloadComponents: false,
        priority: 'low'
      });
    } else {
      setStrategy({
        useIntersectionObserver: false,
        preloadComponents: true,
        priority: 'high'
      });
    }
  }, []);

  return strategy;
};

export default {
  LazyAnalyticsDashboard,
  LazyExportModal,
  LazySchemaExplorer,
  LazyCodeGenerator,
  LazyValidationCenter,
  IntersectionLazyLoader,
  usePreloadOnHover,
  useLazyLoadingStats,
  useProgressiveLoadingStrategy
}; 