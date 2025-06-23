export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
  size?: number;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private maxAge: number;
  private totalHits = 0;
  private totalMisses = 0;

  constructor(maxSize = 100, maxAgeMs = 5 * 60 * 1000) { // 5 minutes default
    this.maxSize = maxSize;
    this.maxAge = maxAgeMs;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.totalMisses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      this.totalMisses++;
      return null;
    }

    // Update access time and hit count
    entry.timestamp = Date.now();
    entry.hits++;
    this.totalHits++;

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: string, value: T, estimatedSize?: number): void {
    // Remove oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
      size: estimatedSize
    });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && (Date.now() - entry.timestamp <= this.maxAge);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.totalHits = 0;
    this.totalMisses = 0;
  }

  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const memoryUsage = entries.reduce((sum, entry) => sum + (entry.size || 0), 0);
    const timestamps = entries.map(e => e.timestamp);

    return {
      totalEntries: this.cache.size,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      hitRate: this.totalHits / (this.totalHits + this.totalMisses) || 0,
      memoryUsage,
      oldestEntry: timestamps.length ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length ? Math.max(...timestamps) : 0
    };
  }

  // Get keys sorted by usage (most used first)
  getKeysByUsage(): string[] {
    return Array.from(this.cache.entries())
      .sort(([, a], [, b]) => b.hits - a.hits)
      .map(([key]) => key);
  }

  // Cleanup expired entries
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }
}

export class SearchResultCache {
  private searchCache = new LRUCache<any[]>(50, 2 * 60 * 1000); // 2 minutes for search results
  private filterCache = new LRUCache<any[]>(30, 3 * 60 * 1000); // 3 minutes for filtered results
  private groupCache = new LRUCache<any>(20, 5 * 60 * 1000); // 5 minutes for grouped results

  private generateSearchKey(filters: any, grouping: any, searchOptions: any): string {
    return JSON.stringify({ filters, grouping, searchOptions });
  }

  private generateFilterKey(filters: any): string {
    return JSON.stringify(filters);
  }

  private generateGroupKey(endpoints: any[], groupBy: string): string {
    // Use endpoint IDs and groupBy for key to avoid storing large arrays in key
    const endpointIds = endpoints.map(e => e.id).sort().join(',');
    return `${groupBy}:${this.hashString(endpointIds)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  getSearchResults(filters: any, grouping: any, searchOptions: any): any[] | null {
    const key = this.generateSearchKey(filters, grouping, searchOptions);
    return this.searchCache.get(key);
  }

  setSearchResults(filters: any, grouping: any, searchOptions: any, results: any[]): void {
    const key = this.generateSearchKey(filters, grouping, searchOptions);
    const estimatedSize = JSON.stringify(results).length;
    this.searchCache.set(key, results, estimatedSize);
  }

  getFilteredResults(filters: any): any[] | null {
    const key = this.generateFilterKey(filters);
    return this.filterCache.get(key);
  }

  setFilteredResults(filters: any, results: any[]): void {
    const key = this.generateFilterKey(filters);
    const estimatedSize = JSON.stringify(results).length;
    this.filterCache.set(key, results, estimatedSize);
  }

  getGroupedResults(endpoints: any[], groupBy: string): any | null {
    const key = this.generateGroupKey(endpoints, groupBy);
    return this.groupCache.get(key);
  }

  setGroupedResults(endpoints: any[], groupBy: string, results: any): void {
    const key = this.generateGroupKey(endpoints, groupBy);
    const estimatedSize = JSON.stringify(results).length;
    this.groupCache.set(key, results, estimatedSize);
  }

  invalidateAll(): void {
    this.searchCache.clear();
    this.filterCache.clear();
    this.groupCache.clear();
  }

  invalidateSearchCache(): void {
    this.searchCache.clear();
  }

  getCacheStats() {
    return {
      search: this.searchCache.getStats(),
      filter: this.filterCache.getStats(),
      group: this.groupCache.getStats()
    };
  }

  cleanup(): void {
    this.searchCache.cleanup();
    this.filterCache.cleanup();
    this.groupCache.cleanup();
  }
}

export class Debouncer {
  private timeouts = new Map<string, NodeJS.Timeout>();

  debounce<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      // Clear existing timeout
      const existingTimeout = this.timeouts.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout
      const timeout = setTimeout(() => {
        func(...args);
        this.timeouts.delete(key);
      }, delay);

      this.timeouts.set(key, timeout);
    };
  }

  cancel(key: string): void {
    const timeout = this.timeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(key);
    }
  }

  cancelAll(): void {
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
  }

  hasPending(key: string): boolean {
    return this.timeouts.has(key);
  }

  getPendingCount(): number {
    return this.timeouts.size;
  }
}

export class MemoizedFunction<T extends (...args: any[]) => any> {
  private cache = new LRUCache<ReturnType<T>>(100, 10 * 60 * 1000); // 10 minutes
  private func: T;

  constructor(func: T, maxCacheSize = 100, maxAgeMs = 10 * 60 * 1000) {
    this.func = func;
    this.cache = new LRUCache<ReturnType<T>>(maxCacheSize, maxAgeMs);
  }

  call(...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);
    
    const cached = this.cache.get(key);
    if (cached !== null) {
      return cached;
    }

    const result = this.func(...args);
    this.cache.set(key, result);
    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats() {
    return this.cache.getStats();
  }
}

export function memoize<T extends (...args: any[]) => any>(
  func: T,
  maxCacheSize = 100,
  maxAgeMs = 10 * 60 * 1000
): (...args: Parameters<T>) => ReturnType<T> {
  const memoized = new MemoizedFunction(func, maxCacheSize, maxAgeMs);
  return (...args: Parameters<T>) => memoized.call(...args);
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private measurements = new Map<string, number[]>();

  startTiming(key: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMeasurement(key, duration);
      return duration;
    };
  }

  recordMeasurement(key: string, duration: number): void {
    if (!this.measurements.has(key)) {
      this.measurements.set(key, []);
    }
    
    const measurements = this.measurements.get(key)!;
    measurements.push(duration);
    
    // Keep only last 100 measurements
    if (measurements.length > 100) {
      measurements.shift();
    }
  }

  getStats(key: string) {
    const measurements = this.measurements.get(key) || [];
    if (measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = measurements.reduce((a, b) => a + b, 0);

    return {
      count: measurements.length,
      average: sum / measurements.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  getAllStats() {
    const stats: { [key: string]: any } = {};
    for (const key of this.measurements.keys()) {
      stats[key] = this.getStats(key);
    }
    return stats;
  }

  clear(key?: string): void {
    if (key) {
      this.measurements.delete(key);
    } else {
      this.measurements.clear();
    }
  }
}

// Singleton instances for global use
export const globalCache = new SearchResultCache();
export const globalDebouncer = new Debouncer();
export const globalPerformanceMonitor = new PerformanceMonitor(); 