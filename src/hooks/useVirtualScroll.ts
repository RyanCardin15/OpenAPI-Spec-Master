import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface VirtualScrollOptions {
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  overscan?: number;
  threshold?: number;
  enableSmoothScrolling?: boolean;
  scrollDebounceMs?: number;
  memoryOptimization?: boolean;
}

export interface VirtualScrollItem<T> {
  index: number;
  data: T;
  height: number;
  offset: number;
}

export interface VirtualScrollResult<T> {
  scrollElementRef: React.RefObject<HTMLDivElement>;
  containerStyle: React.CSSProperties;
  visibleItems: VirtualScrollItem<T>[];
  totalHeight: number;
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  scrollToTop: (behavior?: ScrollBehavior) => void;
  getItemHeight: (index: number) => number;
  isScrolling: boolean;
  scrollProgress: number;
}

// Debounce utility for scroll events
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Enhanced virtual scrolling hook
export function useVirtualScroll<T>(
  items: T[],
  options: VirtualScrollOptions
): VirtualScrollResult<T> {
  const {
    itemHeight,
    containerHeight,
    overscan = 5,
    threshold = 0.1,
    enableSmoothScrolling = true,
    scrollDebounceMs = 16,
    memoryOptimization = true,
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const lastScrollTime = useRef<number>(0);
  
  // Debounced scroll top for performance
  const debouncedScrollTop = useDebounce(scrollTop, scrollDebounceMs);

  // Memoized item height calculator
  const getItemHeight = useCallback((index: number): number => {
    if (typeof itemHeight === 'function') {
      return itemHeight(index);
    }
    return itemHeight;
  }, [itemHeight]);

  // Calculate cumulative heights for variable height items
  const itemOffsets = useMemo(() => {
    if (typeof itemHeight === 'number') {
      // Fast path for uniform heights
      return [];
    }

    const offsets: number[] = [];
    let totalOffset = 0;
    
    for (let i = 0; i < items.length; i++) {
      offsets[i] = totalOffset;
      totalOffset += getItemHeight(i);
    }
    
    return offsets;
  }, [items.length, getItemHeight, itemHeight]);

  // Calculate total height
  const totalHeight = useMemo(() => {
    if (typeof itemHeight === 'number') {
      return items.length * itemHeight;
    }
    
    if (itemOffsets.length > 0) {
      return itemOffsets[itemOffsets.length - 1] + getItemHeight(items.length - 1);
    }
    
    return items.length * (typeof itemHeight === 'function' ? getItemHeight(0) : itemHeight);
  }, [items.length, itemHeight, itemOffsets, getItemHeight]);

  // Binary search for variable height items
  const findStartIndex = useCallback((scrollTop: number): number => {
    if (typeof itemHeight === 'number') {
      return Math.floor(scrollTop / itemHeight);
    }

    if (itemOffsets.length === 0) return 0;

    let left = 0;
    let right = itemOffsets.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (itemOffsets[mid] < scrollTop) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    return Math.max(0, left - 1);
  }, [itemHeight, itemOffsets]);

  // Calculate visible range
  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    const scrollTopValue = debouncedScrollTop;
    const start = findStartIndex(scrollTopValue);
    
    let end = start;
    let currentHeight = 0;
    
    if (typeof itemHeight === 'number') {
      // Fast calculation for uniform heights
      end = Math.min(
        start + Math.ceil(containerHeight / itemHeight) + overscan,
        items.length - 1
      );
    } else {
      // Calculate end index for variable heights
      for (let i = start; i < items.length && currentHeight < containerHeight + overscan * getItemHeight(i); i++) {
        currentHeight += getItemHeight(i);
        end = i;
      }
    }

    const actualStartIndex = Math.max(0, start - overscan);
    const actualEndIndex = Math.min(items.length - 1, end + overscan);

    // Create visible items array
    const visible: VirtualScrollItem<T>[] = [];
    for (let i = actualStartIndex; i <= actualEndIndex; i++) {
      const height = getItemHeight(i);
      let offset: number;
      
      if (typeof itemHeight === 'number') {
        offset = i * itemHeight;
      } else {
        offset = itemOffsets[i] || 0;
      }

      visible.push({
        index: i,
        data: items[i],
        height,
        offset,
      });
    }

    return {
      startIndex: actualStartIndex,
      endIndex: actualEndIndex,
      visibleItems: visible,
    };
  }, [debouncedScrollTop, findStartIndex, containerHeight, overscan, items, getItemHeight, itemHeight, itemOffsets]);

  // Scroll progress calculation
  const scrollProgress = useMemo(() => {
    if (totalHeight <= containerHeight) return 0;
    return Math.min(1, debouncedScrollTop / (totalHeight - containerHeight));
  }, [debouncedScrollTop, totalHeight, containerHeight]);

  // Handle scroll events with performance optimization
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const currentTime = performance.now();
    const newScrollTop = e.currentTarget.scrollTop;
    
    // Throttle scroll updates for performance
    if (currentTime - lastScrollTime.current > scrollDebounceMs) {
      setScrollTop(newScrollTop);
      lastScrollTime.current = currentTime;
    }

    // Set scrolling state
    setIsScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set timeout to reset scrolling state
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, [scrollDebounceMs]);

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    if (!scrollElementRef.current) return;
    
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
    let scrollTop: number;
    
    if (typeof itemHeight === 'number') {
      scrollTop = clampedIndex * itemHeight;
    } else {
      scrollTop = itemOffsets[clampedIndex] || 0;
    }

    scrollElementRef.current.scrollTo({
      top: scrollTop,
      behavior: enableSmoothScrolling ? behavior : 'auto',
    });
  }, [items.length, itemHeight, itemOffsets, enableSmoothScrolling]);

  // Scroll to top
  const scrollToTop = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (!scrollElementRef.current) return;
    
    scrollElementRef.current.scrollTo({
      top: 0,
      behavior: enableSmoothScrolling ? behavior : 'auto',
    });
  }, [enableSmoothScrolling]);

  // Container styles for virtualization
  const containerStyle: React.CSSProperties = useMemo(() => ({
    height: containerHeight,
    overflow: 'auto',
    position: 'relative',
    ...(memoryOptimization && {
      contain: 'strict',
      willChange: 'scroll-position',
    }),
  }), [containerHeight, memoryOptimization]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Performance monitoring (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const itemCount = endIndex - startIndex + 1;
      const renderRatio = itemCount / items.length;
      
      if (renderRatio > 0.5 && items.length > 100) {
        console.warn(`Virtual scroll efficiency warning: rendering ${itemCount}/${items.length} items (${(renderRatio * 100).toFixed(1)}%)`);
      }
    }
  }, [startIndex, endIndex, items.length]);

  return {
    scrollElementRef,
    containerStyle,
    visibleItems,
    totalHeight,
    scrollToIndex,
    scrollToTop,
    getItemHeight,
    isScrolling,
    scrollProgress,
  };
} 