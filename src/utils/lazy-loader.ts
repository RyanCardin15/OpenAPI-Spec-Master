import React, { useEffect, useState, useRef, useCallback } from 'react';

export interface LazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  debounceDelay?: number;
  preloadOnMobile?: boolean;
}

export const useLazyLoad = (options: LazyLoadOptions = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '100px',
    debounceDelay = 100,
    preloadOnMobile = true
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Check if device is mobile for preloading logic
  const isMobile = useCallback(() => {
    return window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  // Debounced visibility handler
  const handleVisibilityChange = useCallback(
    debounce((entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting) {
        setIsVisible(true);
        setHasLoaded(true);
        // Disconnect observer after first load for performance
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      }
    }, debounceDelay),
    [debounceDelay]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // On mobile, optionally preload content for better UX
    if (preloadOnMobile && isMobile()) {
      setIsVisible(true);
      setHasLoaded(true);
      return;
    }

    // Use intersection observer for efficient lazy loading
    if ('IntersectionObserver' in window) {
      observerRef.current = new IntersectionObserver(handleVisibilityChange, {
        threshold,
        rootMargin
      });
      observerRef.current.observe(element);
    } else {
      // Fallback for older browsers
      setIsVisible(true);
      setHasLoaded(true);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, rootMargin, handleVisibilityChange, preloadOnMobile, isMobile]);

  return { elementRef, isVisible, hasLoaded };
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Hook for lazy loading images with mobile optimization
export const useLazyImage = (src: string, placeholder?: string) => {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const { elementRef, isVisible } = useLazyLoad();

  useEffect(() => {
    if (!isVisible || isLoaded || isError) return;

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };
    img.onerror = () => {
      setIsError(true);
    };
    img.src = src;
  }, [src, isVisible, isLoaded, isError]);

  return { elementRef, imageSrc, isLoaded, isError };
};

// Virtual scrolling hook for large lists
export const useVirtualScroll = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    items.length - 1
  );

  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(items.length - 1, visibleEnd + overscan);

  const visibleItems = items.slice(startIndex, endIndex + 1);

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    scrollElementRef,
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex,
    endIndex
  };
};

// Performance monitoring hook for mobile
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    memoryUsage: 0,
    renderTime: 0,
    isSlowDevice: false
  });

  useEffect(() => {
    // Check device performance capabilities
    const checkDevicePerformance = () => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
      const renderer = debugInfo ? gl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
      
      // Simple heuristic for slow devices
      const isSlowDevice = /Adreno 3[0-3][0-9]|Mali-4[0-9][0-9]|PowerVR SGX/.test(renderer || '') ||
                          navigator.hardwareConcurrency <= 2;
      
      return isSlowDevice;
    };

    // Monitor memory usage if available
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit,
          isSlowDevice: checkDevicePerformance()
        }));
      }
    };

    // Measure render time
    const measureRenderTime = () => {
      const startTime = performance.now();
      requestAnimationFrame(() => {
        const endTime = performance.now();
        setMetrics(prev => ({
          ...prev,
          renderTime: endTime - startTime
        }));
      });
    };

    updateMemoryUsage();
    measureRenderTime();

    const interval = setInterval(updateMemoryUsage, 5000);
    return () => clearInterval(interval);
  }, []);

  return metrics;
};

// Preload critical resources
export const preloadCriticalResources = () => {
  const preloadResource = (url: string, as: string) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = as;
    document.head.appendChild(link);
  };

  // Preload critical fonts
  preloadResource('/fonts/inter-var.woff2', 'font');
  
  // Preload critical images based on viewport
  if (window.innerWidth < 768) {
    // Mobile-specific preloads
    preloadResource('/images/mobile-hero.webp', 'image');
  } else {
    // Desktop-specific preloads
    preloadResource('/images/desktop-hero.webp', 'image');
  }
};

// Bundle splitting utility
export const loadComponentAsync = <T extends Record<string, any>>(
  importFn: () => Promise<T>,
  fallback?: React.ReactElement
) => {
  const LazyComponent = React.lazy(importFn);
  
  if (fallback) {
    return React.forwardRef<any, any>((props, ref) => (
      <React.Suspense fallback={fallback}>
        <LazyComponent {...props} ref={ref} />
      </React.Suspense>
    ));
  }
  
  return LazyComponent;
}; 