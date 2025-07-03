import React, { forwardRef, useImperativeHandle, useMemo } from 'react';
import { useVirtualScroll, VirtualScrollOptions, VirtualScrollItem } from '../hooks/useVirtualScroll';

export interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number | ((index: number) => number);
  renderItem: (item: VirtualScrollItem<T>, isScrolling: boolean) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  overscan?: number;
  threshold?: number;
  enableSmoothScrolling?: boolean;
  scrollDebounceMs?: number;
  memoryOptimization?: boolean;
  onScroll?: (scrollTop: number, scrollProgress: number) => void;
  onScrollStart?: () => void;
  onScrollEnd?: () => void;
  estimatedItemSize?: number;
  getItemKey?: (item: T, index: number) => string | number;
  placeholder?: React.ReactNode;
  emptyState?: React.ReactNode;
  loadingState?: React.ReactNode;
  isLoading?: boolean;
}

export interface VirtualListRef {
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  scrollToTop: (behavior?: ScrollBehavior) => void;
  getScrollProgress: () => number;
  getVisibleRange: () => { start: number; end: number };
}

function VirtualListComponent<T>(
  props: VirtualListProps<T>,
  ref: React.Ref<VirtualListRef>
) {
  const {
    items,
    height,
    itemHeight,
    renderItem,
    className = '',
    style = {},
    overscan = 5,
    threshold = 0.1,
    enableSmoothScrolling = true,
    scrollDebounceMs = 16,
    memoryOptimization = true,
    onScroll,
    onScrollStart,
    onScrollEnd,
    getItemKey,
    placeholder,
    emptyState,
    loadingState,
    isLoading = false,
  } = props;

  // Virtual scroll options
  const virtualScrollOptions: VirtualScrollOptions = useMemo(() => ({
    itemHeight,
    containerHeight: height,
    overscan,
    threshold,
    enableSmoothScrolling,
    scrollDebounceMs,
    memoryOptimization,
  }), [itemHeight, height, overscan, threshold, enableSmoothScrolling, scrollDebounceMs, memoryOptimization]);

  // Use the enhanced virtual scroll hook
  const {
    scrollElementRef,
    containerStyle,
    visibleItems,
    totalHeight,
    scrollToIndex,
    scrollToTop,
    getItemHeight,
    isScrolling,
    scrollProgress,
  } = useVirtualScroll(items, virtualScrollOptions);

  // Track scrolling state for callbacks
  React.useEffect(() => {
    if (isScrolling && onScrollStart) {
      onScrollStart();
    } else if (!isScrolling && onScrollEnd) {
      onScrollEnd();
    }
  }, [isScrolling, onScrollStart, onScrollEnd]);

  // Call onScroll callback when scroll position changes
  React.useEffect(() => {
    if (onScroll) {
      onScroll(scrollElementRef.current?.scrollTop || 0, scrollProgress);
    }
  }, [scrollProgress, onScroll]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    scrollToIndex,
    scrollToTop,
    getScrollProgress: () => scrollProgress,
    getVisibleRange: () => ({
      start: visibleItems.length > 0 ? visibleItems[0].index : 0,
      end: visibleItems.length > 0 ? visibleItems[visibleItems.length - 1].index : 0,
    }),
  }), [scrollToIndex, scrollToTop, scrollProgress, visibleItems]);

  // Default key generator
  const defaultGetItemKey = React.useCallback((item: T, index: number) => {
    if (getItemKey) {
      return getItemKey(item, index);
    }
    
    // Try to use item's id property if available
    if (item && typeof item === 'object' && 'id' in item) {
      return (item as any).id;
    }
    
    // Fallback to index
    return index;
  }, [getItemKey]);

  // Handle empty states
  if (isLoading && loadingState) {
    return (
      <div 
        className={`virtual-list-loading ${className}`}
        style={{ ...style, height }}
      >
        {loadingState}
      </div>
    );
  }

  if (items.length === 0 && emptyState) {
    return (
      <div 
        className={`virtual-list-empty ${className}`}
        style={{ ...style, height }}
      >
        {emptyState}
      </div>
    );
  }

  // Enhanced scroll handler for virtual scrolling
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    // Custom scroll handling if needed
    const scrollTop = e.currentTarget.scrollTop;
    const maxScrollTop = totalHeight - height;
    const progress = maxScrollTop > 0 ? Math.min(1, scrollTop / maxScrollTop) : 0;
    
    if (onScroll) {
      onScroll(scrollTop, progress);
    }
  }, [onScroll, totalHeight, height]);

  // Container classes for styling
  const containerClasses = `virtual-list-container ${className} ${isScrolling ? 'virtual-list-scrolling' : ''}`.trim();

  // Enhanced container styles
  const enhancedContainerStyle: React.CSSProperties = {
    ...containerStyle,
    ...style,
    // CSS containment for better performance
    contain: memoryOptimization ? 'strict' : 'layout style paint',
    // Optimize scrolling performance
    scrollBehavior: enableSmoothScrolling ? 'smooth' : 'auto',
    // Hardware acceleration hints
    transform: 'translateZ(0)',
    willChange: 'scroll-position',
    // Better mobile scrolling
    WebkitOverflowScrolling: 'touch',
  };

  return (
    <div
      ref={scrollElementRef}
      className={containerClasses}
      style={enhancedContainerStyle}
      onScroll={handleScroll}
      data-testid="virtual-list"
      role="grid"
      aria-rowcount={items.length}
    >
      {/* Virtual spacer for total height */}
      <div 
        style={{ 
          height: totalHeight, 
          position: 'relative',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        {/* Visible items container */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            pointerEvents: 'auto',
          }}
        >
          {visibleItems.map((virtualItem) => (
            <div
              key={defaultGetItemKey(virtualItem.data, virtualItem.index)}
              style={{
                position: 'absolute',
                top: virtualItem.offset,
                left: 0,
                right: 0,
                height: virtualItem.height,
                // Improve rendering performance
                willChange: isScrolling ? 'transform' : 'auto',
                contain: 'layout style paint',
              }}
              role="gridcell"
              aria-rowindex={virtualItem.index + 1}
            >
              {renderItem(virtualItem, isScrolling)}
            </div>
          ))}
        </div>
      </div>
      
      {/* Scroll progress indicator (optional) */}
      {scrollProgress > 0 && scrollProgress < 1 && (
        <div
          className="virtual-list-scroll-indicator"
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 4,
            height: 40,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 2,
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: '100%',
              height: `${scrollProgress * 100}%`,
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderRadius: 'inherit',
              transition: 'height 0.1s ease-out',
            }}
          />
        </div>
      )}

      {/* Placeholder for items being rendered */}
      {placeholder && isScrolling && (
        <div
          className="virtual-list-placeholder"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 999,
          }}
        >
          {placeholder}
        </div>
      )}
    </div>
  );
}

// Export the component with proper typing
export const VirtualList = forwardRef(VirtualListComponent) as <T>(
  props: VirtualListProps<T> & { ref?: React.Ref<VirtualListRef> }
) => ReturnType<typeof VirtualListComponent>;

// Additional utility components for common use cases

interface VirtualListItemProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  isScrolling?: boolean;
}

export const VirtualListItem: React.FC<VirtualListItemProps> = ({
  children,
  className = '',
  style = {},
  isScrolling = false,
}) => {
  const itemStyle: React.CSSProperties = {
    ...style,
    width: '100%',
    // Optimize rendering during scrolling
    ...(isScrolling && {
      pointerEvents: 'none',
      userSelect: 'none',
    }),
  };

  return (
    <div className={`virtual-list-item ${className}`} style={itemStyle}>
      {children}
    </div>
  );
};

// Loading skeleton component
interface VirtualListSkeletonProps {
  count?: number;
  itemHeight?: number;
  className?: string;
}

export const VirtualListSkeleton: React.FC<VirtualListSkeletonProps> = ({
  count = 10,
  itemHeight = 60,
  className = '',
}) => {
  return (
    <div className={`virtual-list-skeleton ${className}`}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="virtual-list-skeleton-item"
          style={{
            height: itemHeight,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            borderRadius: 4,
            marginBottom: 8,
            animation: `virtual-list-skeleton-pulse 1.5s ease-in-out ${index * 0.1}s infinite alternate`,
          }}
        />
      ))}
      <style>
        {`
          @keyframes virtual-list-skeleton-pulse {
            0% { opacity: 0.6; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}; 