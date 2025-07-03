import { useCallback, useRef, useEffect } from 'react';

// Cache entry interface
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  dependencies?: string[];
}

// Cache configuration
interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  maxMemoryUsage: number; // in bytes
  enablePersistence: boolean;
  compressionEnabled: boolean;
  cleanupInterval: number;
}

// Cache statistics
interface CacheStats {
  hitCount: number;
  missCount: number;
  hitRate: number;
  totalEntries: number;
  memoryUsage: number;
  cacheSize: number;
  oldestEntry: number;
  averageAccessTime: number;
}

// Cache strategy enum
export enum CacheStrategy {
  LRU = 'lru', // Least Recently Used
  LFU = 'lfu', // Least Frequently Used
  TTL = 'ttl', // Time To Live based
  ADAPTIVE = 'adaptive' // Smart adaptive strategy
}

// Enhanced cache manager class
export class AdvancedCacheManager {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private strategy: CacheStrategy;
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;
  private compressionWorker?: Worker;

  constructor(
    config: Partial<CacheConfig> = {},
    strategy: CacheStrategy = CacheStrategy.ADAPTIVE
  ) {
    this.config = {
      maxSize: 1000,
      defaultTTL: 300000, // 5 minutes
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
      enablePersistence: false,
      compressionEnabled: true,
      cleanupInterval: 30000, // 30 seconds
      ...config,
    };

    this.strategy = strategy;
    this.stats = {
      hitCount: 0,
      missCount: 0,
      hitRate: 0,
      totalEntries: 0,
      memoryUsage: 0,
      cacheSize: 0,
      oldestEntry: 0,
      averageAccessTime: 0,
    };

    this.startCleanupTimer();
    this.initializeCompressionWorker();
  }

  // Set cache entry with options
  set<T>(
    key: string,
    data: T,
    options: {
      ttl?: number;
      dependencies?: string[];
      compress?: boolean;
      priority?: number;
    } = {}
  ): void {
    const {
      ttl = this.config.defaultTTL,
      dependencies = [],
      compress = this.config.compressionEnabled,
      priority = 1,
    } = options;

    const now = Date.now();
    const size = this.calculateSize(data);

    // Check memory limits before adding
    if (this.stats.memoryUsage + size > this.config.maxMemoryUsage) {
      this.evictEntries(size);
    }

    // Check size limits
    if (this.cache.size >= this.config.maxSize) {
      this.evictByStrategy();
    }

    const entry: CacheEntry<T> = {
      data: compress ? this.compress(data) : data,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now,
      size,
      dependencies,
    };

    this.cache.set(key, entry);
    this.updateStats();
  }

  // Get cache entry with automatic TTL checking
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.missCount++;
      this.updateStats();
      return null;
    }

    const now = Date.now();

    // Check TTL expiration
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.missCount++;
      this.updateStats();
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;

    this.stats.hitCount++;
    this.updateStats();

    // Decompress if needed
    return this.isCompressed(entry.data) ? this.decompress(entry.data) : entry.data;
  }

  // Check if key exists and is valid
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.updateStats();
      return false;
    }

    return true;
  }

  // Delete specific cache entry
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateStats();
    }
    return deleted;
  }

  // Clear entire cache
  clear(): void {
    this.cache.clear();
    this.updateStats();
  }

  // Invalidate entries by dependency
  invalidateByDependency(dependency: string): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.dependencies?.includes(dependency)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.updateStats();
  }

  // Invalidate entries by pattern
  invalidateByPattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.updateStats();
  }

  // Get cache statistics
  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Manual cleanup expired entries
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    this.updateStats();
    return removedCount;
  }

  // Optimize cache based on usage patterns
  optimize(): void {
    switch (this.strategy) {
      case CacheStrategy.ADAPTIVE:
        this.adaptiveOptimization();
        break;
      case CacheStrategy.LRU:
        this.lruOptimization();
        break;
      case CacheStrategy.LFU:
        this.lfuOptimization();
        break;
      case CacheStrategy.TTL:
        this.ttlOptimization();
        break;
    }
  }

  // Export cache data for analysis
  export(): any {
    const entries: { [key: string]: any } = {};
    
    for (const [key, entry] of this.cache.entries()) {
      entries[key] = {
        timestamp: entry.timestamp,
        ttl: entry.ttl,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed,
        size: entry.size,
        dependencies: entry.dependencies,
      };
    }

    return {
      entries,
      stats: this.stats,
      config: this.config,
      strategy: this.strategy,
    };
  }

  // Import cache data
  import(data: any): void {
    this.clear();
    
    for (const [key, entryData] of Object.entries(data.entries)) {
      const entry = entryData as any;
      this.cache.set(key, {
        data: entry.data,
        timestamp: entry.timestamp,
        ttl: entry.ttl,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed,
        size: entry.size,
        dependencies: entry.dependencies,
      });
    }

    this.updateStats();
  }

  // Destroy cache manager
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
    }
    
    this.clear();
  }

  // Private methods

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
      this.optimize();
    }, this.config.cleanupInterval);
  }

  private initializeCompressionWorker(): void {
    if (!this.config.compressionEnabled || typeof Worker === 'undefined') {
      return;
    }

    // Create compression worker for large data
    try {
      const workerCode = `
        self.onmessage = function(e) {
          const { type, data, id } = e.data;
          
          if (type === 'compress') {
            try {
              const compressed = JSON.stringify(data);
              self.postMessage({ type: 'compressed', data: compressed, id });
            } catch (error) {
              self.postMessage({ type: 'error', error: error.message, id });
            }
          } else if (type === 'decompress') {
            try {
              const decompressed = JSON.parse(data);
              self.postMessage({ type: 'decompressed', data: decompressed, id });
            } catch (error) {
              self.postMessage({ type: 'error', error: error.message, id });
            }
          }
        };
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.compressionWorker = new Worker(URL.createObjectURL(blob));
    } catch (error) {
      console.warn('Failed to create compression worker:', error);
    }
  }

  private calculateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return JSON.stringify(data).length * 2; // Approximate size
    }
  }

  private compress(data: any): any {
    // Simple compression for now - could be enhanced with actual compression
    return {
      __compressed: true,
      data: JSON.stringify(data),
    };
  }

  private decompress(data: any): any {
    if (this.isCompressed(data)) {
      return JSON.parse(data.data);
    }
    return data;
  }

  private isCompressed(data: any): boolean {
    return data && typeof data === 'object' && data.__compressed === true;
  }

  private evictEntries(requiredSize: number): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by strategy for eviction
    entries.sort((a, b) => {
      switch (this.strategy) {
        case CacheStrategy.LRU:
          return a[1].lastAccessed - b[1].lastAccessed;
        case CacheStrategy.LFU:
          return a[1].accessCount - b[1].accessCount;
        case CacheStrategy.TTL:
          return (a[1].timestamp + a[1].ttl) - (b[1].timestamp + b[1].ttl);
        default:
          return this.adaptiveScore(a[1]) - this.adaptiveScore(b[1]);
      }
    });

    let freedSize = 0;
    let index = 0;
    
    while (freedSize < requiredSize && index < entries.length) {
      const [key, entry] = entries[index];
      freedSize += entry.size;
      this.cache.delete(key);
      index++;
    }
  }

  private evictByStrategy(): void {
    if (this.cache.size === 0) return;

    const entries = Array.from(this.cache.entries());
    let victimKey: string;

    switch (this.strategy) {
      case CacheStrategy.LRU:
        victimKey = entries.reduce((oldest, current) => 
          current[1].lastAccessed < oldest[1].lastAccessed ? current : oldest
        )[0];
        break;
        
      case CacheStrategy.LFU:
        victimKey = entries.reduce((least, current) => 
          current[1].accessCount < least[1].accessCount ? current : least
        )[0];
        break;
        
      case CacheStrategy.TTL:
        victimKey = entries.reduce((earliest, current) => {
          const currentExpiry = current[1].timestamp + current[1].ttl;
          const earliestExpiry = earliest[1].timestamp + earliest[1].ttl;
          return currentExpiry < earliestExpiry ? current : earliest;
        })[0];
        break;
        
      default:
        victimKey = entries.reduce((lowest, current) => 
          this.adaptiveScore(current[1]) < this.adaptiveScore(lowest[1]) ? current : lowest
        )[0];
    }

    this.cache.delete(victimKey);
  }

  private adaptiveScore(entry: CacheEntry): number {
    const now = Date.now();
    const age = now - entry.timestamp;
    const timeSinceAccess = now - entry.lastAccessed;
    const remaining = entry.ttl - age;
    
    // Lower score = higher priority for eviction
    return (entry.accessCount / Math.max(1, age)) * 
           (remaining / entry.ttl) * 
           (1 / Math.max(1, timeSinceAccess));
  }

  private adaptiveOptimization(): void {
    // Analyze patterns and adjust TTL and priorities
    const entries = Array.from(this.cache.values());
    const avgAccessCount = entries.reduce((sum, e) => sum + e.accessCount, 0) / entries.length;
    
    // Extend TTL for frequently accessed items
    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount > avgAccessCount * 1.5) {
        entry.ttl = Math.min(entry.ttl * 1.2, this.config.defaultTTL * 3);
      }
    }
  }

  private lruOptimization(): void {
    // LRU-specific optimizations
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastAccessed > entry.ttl * 0.8) {
        // Reduce TTL for items not accessed recently
        entry.ttl = Math.max(entry.ttl * 0.8, this.config.defaultTTL * 0.1);
      }
    }
  }

  private lfuOptimization(): void {
    // LFU-specific optimizations
    const entries = Array.from(this.cache.values());
    const maxAccess = Math.max(...entries.map(e => e.accessCount));
    
    for (const [key, entry] of this.cache.entries()) {
      const accessRatio = entry.accessCount / Math.max(1, maxAccess);
      if (accessRatio > 0.8) {
        // Extend TTL for highly accessed items
        entry.ttl = Math.min(entry.ttl * 1.5, this.config.defaultTTL * 5);
      }
    }
  }

  private ttlOptimization(): void {
    // TTL-specific optimizations - already handled in basic TTL logic
    this.cleanup();
  }

  private updateStats(): void {
    const entries = Array.from(this.cache.values());
    
    this.stats.totalEntries = this.cache.size;
    this.stats.hitRate = this.stats.hitCount / Math.max(1, this.stats.hitCount + this.stats.missCount);
    this.stats.memoryUsage = entries.reduce((sum, entry) => sum + entry.size, 0);
    this.stats.cacheSize = this.cache.size;
    this.stats.oldestEntry = entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0;
    this.stats.averageAccessTime = entries.length > 0 
      ? entries.reduce((sum, e) => sum + e.accessCount, 0) / entries.length 
      : 0;
  }
}

// React hook for cache management
export function useAdvancedCache(
  name: string,
  config?: Partial<CacheConfig>,
  strategy?: CacheStrategy
) {
  const cacheRef = useRef<AdvancedCacheManager>();

  // Initialize cache manager
  if (!cacheRef.current) {
    cacheRef.current = new AdvancedCacheManager(config, strategy);
  }

  const cache = cacheRef.current;

  // Memoized cache operations
  const set = useCallback(<T>(key: string, data: T, options?: any) => {
    cache.set(`${name}:${key}`, data, options);
  }, [cache, name]);

  const get = useCallback(<T>(key: string): T | null => {
    return cache.get<T>(`${name}:${key}`);
  }, [cache, name]);

  const has = useCallback((key: string): boolean => {
    return cache.has(`${name}:${key}`);
  }, [cache, name]);

  const remove = useCallback((key: string): boolean => {
    return cache.delete(`${name}:${key}`);
  }, [cache, name]);

  const clear = useCallback(() => {
    cache.invalidateByPattern(new RegExp(`^${name}:`));
  }, [cache, name]);

  const invalidate = useCallback((dependency: string) => {
    cache.invalidateByDependency(dependency);
  }, [cache]);

  const stats = useCallback(() => {
    return cache.getStats();
  }, [cache]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't destroy the cache, just clean up this hook
      // The cache persists across component unmounts
    };
  }, []);

  return {
    set,
    get,
    has,
    remove,
    clear,
    invalidate,
    stats,
    cache: cacheRef.current,
  };
}

// Global cache instances for common use cases
export const globalCaches = {
  search: new AdvancedCacheManager({ maxSize: 500, defaultTTL: 300000 }, CacheStrategy.LRU),
  filters: new AdvancedCacheManager({ maxSize: 200, defaultTTL: 600000 }, CacheStrategy.ADAPTIVE),
  analytics: new AdvancedCacheManager({ maxSize: 100, defaultTTL: 900000 }, CacheStrategy.TTL),
  schemas: new AdvancedCacheManager({ maxSize: 300, defaultTTL: 1800000 }, CacheStrategy.LFU),
};

// Cache key generators
export const cacheKeys = {
  search: (query: string, filters: any) => `search:${query}:${JSON.stringify(filters)}`,
  filter: (endpoints: any[], filters: any) => `filter:${filters.methods.join(',')}:${filters.tags.join(',')}`,
  analytics: (endpoints: any[]) => `analytics:${endpoints.length}:${Date.now().toString().slice(0, -5)}`, // 5-minute buckets
  schema: (schemaName: string) => `schema:${schemaName}`,
};

export default AdvancedCacheManager; 