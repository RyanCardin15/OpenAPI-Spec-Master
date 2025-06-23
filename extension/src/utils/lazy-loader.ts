export interface LazyLoadOptions {
  pageSize: number;
  preloadPages: number;
  threshold: number; // When to start loading next page (percentage)
  maxCacheSize: number;
}

export interface LazyLoadPage<T> {
  pageIndex: number;
  items: T[];
  isLoading: boolean;
  isLoaded: boolean;
  error?: string;
  timestamp: number;
}

export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan: number; // Number of items to render outside visible area
}

export interface VirtualScrollState {
  startIndex: number;
  endIndex: number;
  visibleItems: any[];
  totalHeight: number;
  scrollTop: number;
}

export class LazyLoader<T> {
  private pages = new Map<number, LazyLoadPage<T>>();
  private loadingPromises = new Map<number, Promise<T[]>>();
  private dataSource: (page: number, pageSize: number) => Promise<T[]>;
  private options: LazyLoadOptions;
  private totalItems: number = 0;
  private listeners = new Set<(pages: Map<number, LazyLoadPage<T>>) => void>();

  constructor(
    dataSource: (page: number, pageSize: number) => Promise<T[]>,
    options: Partial<LazyLoadOptions> = {}
  ) {
    this.dataSource = dataSource;
    this.options = {
      pageSize: 50,
      preloadPages: 2,
      threshold: 0.8,
      maxCacheSize: 10,
      ...options
    };
  }

  async loadPage(pageIndex: number): Promise<LazyLoadPage<T>> {
    // Check if already loaded or loading
    const existingPage = this.pages.get(pageIndex);
    if (existingPage?.isLoaded) {
      return existingPage;
    }

    if (this.loadingPromises.has(pageIndex)) {
      await this.loadingPromises.get(pageIndex);
      return this.pages.get(pageIndex)!;
    }

    // Mark as loading
    const loadingPage: LazyLoadPage<T> = {
      pageIndex,
      items: [],
      isLoading: true,
      isLoaded: false,
      timestamp: Date.now()
    };
    this.pages.set(pageIndex, loadingPage);
    this.notifyListeners();

    // Start loading
    const loadPromise = this.dataSource(pageIndex, this.options.pageSize)
      .then(items => {
        const loadedPage: LazyLoadPage<T> = {
          pageIndex,
          items,
          isLoading: false,
          isLoaded: true,
          timestamp: Date.now()
        };
        this.pages.set(pageIndex, loadedPage);
        this.cleanupOldPages();
        this.notifyListeners();
        return items;
      })
      .catch(error => {
        const errorPage: LazyLoadPage<T> = {
          pageIndex,
          items: [],
          isLoading: false,
          isLoaded: false,
          error: error.message,
          timestamp: Date.now()
        };
        this.pages.set(pageIndex, errorPage);
        this.notifyListeners();
        throw error;
      })
      .finally(() => {
        this.loadingPromises.delete(pageIndex);
      });

    this.loadingPromises.set(pageIndex, loadPromise);
    await loadPromise;
    return this.pages.get(pageIndex)!;
  }

  async loadRange(startIndex: number, endIndex: number): Promise<T[]> {
    const startPage = Math.floor(startIndex / this.options.pageSize);
    const endPage = Math.floor(endIndex / this.options.pageSize);
    
    const loadPromises: Promise<LazyLoadPage<T>>[] = [];
    
    for (let pageIndex = startPage; pageIndex <= endPage; pageIndex++) {
      loadPromises.push(this.loadPage(pageIndex));
    }

    await Promise.all(loadPromises);

    // Collect items from loaded pages
    const items: T[] = [];
    for (let pageIndex = startPage; pageIndex <= endPage; pageIndex++) {
      const page = this.pages.get(pageIndex);
      if (page?.isLoaded) {
        const pageStartIndex = pageIndex * this.options.pageSize;
        const pageEndIndex = pageStartIndex + this.options.pageSize;
        
        // Calculate which items from this page we need
        const itemStartIndex = Math.max(0, startIndex - pageStartIndex);
        const itemEndIndex = Math.min(this.options.pageSize, endIndex - pageStartIndex + 1);
        
        items.push(...page.items.slice(itemStartIndex, itemEndIndex));
      }
    }

    return items;
  }

  async preloadAround(centerIndex: number): Promise<void> {
    const centerPage = Math.floor(centerIndex / this.options.pageSize);
    const startPage = Math.max(0, centerPage - this.options.preloadPages);
    const endPage = centerPage + this.options.preloadPages;

    const loadPromises: Promise<LazyLoadPage<T>>[] = [];
    
    for (let pageIndex = startPage; pageIndex <= endPage; pageIndex++) {
      if (!this.pages.has(pageIndex) || !this.pages.get(pageIndex)?.isLoaded) {
        loadPromises.push(this.loadPage(pageIndex));
      }
    }

    await Promise.allSettled(loadPromises);
  }

  getItem(index: number): T | null {
    const pageIndex = Math.floor(index / this.options.pageSize);
    const itemIndex = index % this.options.pageSize;
    const page = this.pages.get(pageIndex);
    
    if (page?.isLoaded && page.items[itemIndex]) {
      return page.items[itemIndex];
    }
    
    return null;
  }

  isItemLoaded(index: number): boolean {
    const pageIndex = Math.floor(index / this.options.pageSize);
    const page = this.pages.get(pageIndex);
    return page?.isLoaded || false;
  }

  isItemLoading(index: number): boolean {
    const pageIndex = Math.floor(index / this.options.pageSize);
    const page = this.pages.get(pageIndex);
    return page?.isLoading || false;
  }

  private cleanupOldPages(): void {
    if (this.pages.size <= this.options.maxCacheSize) {
      return;
    }

    // Sort pages by timestamp (oldest first)
    const sortedPages = Array.from(this.pages.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    // Remove oldest pages
    const pagesToRemove = sortedPages.slice(0, this.pages.size - this.options.maxCacheSize);
    pagesToRemove.forEach(([pageIndex]) => {
      this.pages.delete(pageIndex);
    });
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.pages));
  }

  onUpdate(listener: (pages: Map<number, LazyLoadPage<T>>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear(): void {
    this.pages.clear();
    this.loadingPromises.clear();
    this.notifyListeners();
  }

  getLoadedItems(): T[] {
    const items: T[] = [];
    const sortedPages = Array.from(this.pages.entries())
      .filter(([, page]) => page.isLoaded)
      .sort(([a], [b]) => a - b);

    sortedPages.forEach(([, page]) => {
      items.push(...page.items);
    });

    return items;
  }

  getStats() {
    const loadedPages = Array.from(this.pages.values()).filter(p => p.isLoaded).length;
    const loadingPages = Array.from(this.pages.values()).filter(p => p.isLoading).length;
    const errorPages = Array.from(this.pages.values()).filter(p => p.error).length;

    return {
      totalPages: this.pages.size,
      loadedPages,
      loadingPages,
      errorPages,
      pendingRequests: this.loadingPromises.size,
      cacheHitRate: loadedPages / (loadedPages + this.loadingPromises.size) || 0
    };
  }
}

export class VirtualScrollManager {
  private options: VirtualScrollOptions;
  private totalItems: number = 0;

  constructor(options: VirtualScrollOptions) {
    this.options = options;
  }

  calculateVisibleRange(scrollTop: number, totalItems: number): VirtualScrollState {
    this.totalItems = totalItems;
    
    const containerHeight = this.options.containerHeight;
    const itemHeight = this.options.itemHeight;
    const overscan = this.options.overscan;

    // Calculate visible range
    const startIndex = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(startIndex + visibleCount, totalItems - 1);

    // Add overscan
    const overscanStart = Math.max(0, startIndex - overscan);
    const overscanEnd = Math.min(totalItems - 1, endIndex + overscan);

    return {
      startIndex: overscanStart,
      endIndex: overscanEnd,
      visibleItems: [], // Will be populated by the consumer
      totalHeight: totalItems * itemHeight,
      scrollTop
    };
  }

  getItemPosition(index: number): { top: number; height: number } {
    return {
      top: index * this.options.itemHeight,
      height: this.options.itemHeight
    };
  }

  updateOptions(options: Partial<VirtualScrollOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

// Utility for progressive loading with search
export class ProgressiveSearchLoader<T> {
  private lazyLoader: LazyLoader<T>;
  private searchFunction: (items: T[], query: string) => T[];
  private currentQuery: string = '';
  private filteredItems: T[] = [];
  private isSearching: boolean = false;

  constructor(
    dataSource: (page: number, pageSize: number) => Promise<T[]>,
    searchFunction: (items: T[], query: string) => T[],
    options: Partial<LazyLoadOptions> = {}
  ) {
    this.lazyLoader = new LazyLoader(dataSource, options);
    this.searchFunction = searchFunction;
  }

  async search(query: string, maxResults: number = 100): Promise<T[]> {
    this.currentQuery = query;
    this.isSearching = true;
    this.filteredItems = [];

    if (!query.trim()) {
      this.isSearching = false;
      return [];
    }

    const results: T[] = [];
    let pageIndex = 0;
    let foundCount = 0;

    while (foundCount < maxResults) {
      try {
        const page = await this.lazyLoader.loadPage(pageIndex);
        
        if (page.items.length === 0) {
          break; // No more data
        }

        const pageResults = this.searchFunction(page.items, query);
        results.push(...pageResults);
        foundCount += pageResults.length;

        // Check if query changed during loading
        if (this.currentQuery !== query) {
          break;
        }

        pageIndex++;
      } catch (error) {
        console.error(`Error loading page ${pageIndex}:`, error);
        break;
      }
    }

    this.filteredItems = results.slice(0, maxResults);
    this.isSearching = false;
    return this.filteredItems;
  }

  getSearchResults(): T[] {
    return this.filteredItems;
  }

  isLoading(): boolean {
    return this.isSearching;
  }

  getCurrentQuery(): string {
    return this.currentQuery;
  }

  clear(): void {
    this.lazyLoader.clear();
    this.filteredItems = [];
    this.currentQuery = '';
    this.isSearching = false;
  }
}

// Factory function for creating optimized data loaders
export function createOptimizedLoader<T>(
  data: T[],
  options: Partial<LazyLoadOptions> = {}
): LazyLoader<T> {
  const dataSource = async (page: number, pageSize: number): Promise<T[]> => {
    const startIndex = page * pageSize;
    const endIndex = Math.min(startIndex + pageSize, data.length);
    
    // Simulate async loading with small delay for large datasets
    if (data.length > 1000) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return data.slice(startIndex, endIndex);
  };

  return new LazyLoader(dataSource, options);
} 