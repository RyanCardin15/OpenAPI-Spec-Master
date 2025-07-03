import React from 'react';

// Type declarations for browser APIs
declare global {
  interface Window {
    gc?: () => void;
  }
}

interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
}

interface MemoryOptimizationConfig {
  maxMemoryUsagePercent: number;
  cleanupThreshold: number;
  monitoringInterval: number;
  enableAutomaticCleanup: boolean;
  enableObjectPooling: boolean;
}

interface MemoryLeak {
  type: string;
  count: number;
  size: number;
  firstDetected: number;
  lastDetected: number;
}

interface OptimizationStrategy {
  name: string;
  description: string;
  execute: () => Promise<void>;
  priority: number;
  estimatedMemorySaved: number; // in bytes
}

// Simple object pool for memory-efficient object reuse
class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;

  constructor(factory: () => T, reset: (obj: T) => void, maxSize: number = 100) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(obj);
      this.pool.push(obj);
    }
  }

  clear(): void {
    this.pool.length = 0;
  }

  getStats() {
    return {
      poolSize: this.pool.length,
      maxSize: this.maxSize,
      utilizationPercent: (this.pool.length / this.maxSize) * 100
    };
  }
}

// Memory-efficient event emitter with automatic cleanup
class MemoryOptimizedEventEmitter {
  private listeners = new Map<string, Set<Function>>();
  private listenerRefs = new Map<Function, { lastUsed: number; id: string }>();

  on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(callback);
    this.listenerRefs.set(callback, { 
      lastUsed: Date.now(), 
      id: `${event}_${Math.random().toString(36).substr(2, 9)}` 
    });

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
      this.listenerRefs.delete(callback);
    };
  }

  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return;

    eventListeners.forEach(callback => {
      try {
        callback(...args);
        // Update last used timestamp
        const ref = this.listenerRefs.get(callback);
        if (ref) {
          ref.lastUsed = Date.now();
        }
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    // Remove old unused listeners
    this.listenerRefs.forEach((ref, callback) => {
      if (now - ref.lastUsed > maxAge) {
        this.listeners.forEach(eventSet => {
          eventSet.delete(callback);
        });
        this.listenerRefs.delete(callback);
      }
    });
  }

  getStats() {
    let totalListeners = 0;
    this.listeners.forEach(set => {
      totalListeners += set.size;
    });

    return { 
      totalListeners, 
      totalEvents: this.listeners.size,
      activeRefs: this.listenerRefs.size
    };
  }
}

// Reference tracking for manual cleanup
class ReferenceTracker {
  private trackedObjects = new Map<string, { obj: any; timestamp: number; size: number }>();

  track<T>(obj: T, identifier: string): T {
    const size = this.estimateObjectSize(obj);
    this.trackedObjects.set(identifier, {
      obj,
      timestamp: Date.now(),
      size
    });
    return obj;
  }

  untrack(identifier: string): void {
    this.trackedObjects.delete(identifier);
  }

  cleanup(maxAge: number = 5 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    this.trackedObjects.forEach((ref, id) => {
      if (now - ref.timestamp > maxAge) {
        this.trackedObjects.delete(id);
        cleaned++;
      }
    });

    return cleaned;
  }

  private estimateObjectSize(obj: any): number {
    try {
      return JSON.stringify(obj).length * 2; // Rough estimate
    } catch {
      return 100; // Default estimate for non-serializable objects
    }
  }

  getStats() {
    let totalSize = 0;
    this.trackedObjects.forEach(ref => {
      totalSize += ref.size;
    });

    return {
      trackedCount: this.trackedObjects.size,
      estimatedSize: totalSize
    };
  }
}

export class MemoryOptimizer {
  private config: MemoryOptimizationConfig;
  private monitoringActive = false;
  private memoryHistory: MemoryStats[] = [];
  private leakDetector = new Map<string, MemoryLeak>();
  private optimizationStrategies: OptimizationStrategy[] = [];
  private objectPools = new Map<string, ObjectPool<any>>();
  private eventEmitter = new MemoryOptimizedEventEmitter();
  private referenceTracker = new ReferenceTracker();
  private performanceObserver?: PerformanceObserver;
  private lastCleanup = 0;
  private cleanupInProgress = false;

  constructor(config: Partial<MemoryOptimizationConfig> = {}) {
    this.config = {
      maxMemoryUsagePercent: 75,
      cleanupThreshold: 50, // MB
      monitoringInterval: 5000, // 5 seconds
      enableAutomaticCleanup: true,
      enableObjectPooling: true,
      ...config
    };

    this.initializeOptimizationStrategies();
    this.setupPerformanceObserver();
  }

  private initializeOptimizationStrategies(): void {
    this.optimizationStrategies = [
      {
        name: 'Garbage Collection',
        description: 'Force garbage collection if available',
        priority: 1,
        estimatedMemorySaved: 10 * 1024 * 1024, // 10MB
        execute: async () => {
          if ('gc' in window && typeof window.gc === 'function') {
            window.gc();
          }
        }
      },
      {
        name: 'Clear Object Pools',
        description: 'Clear all object pools to release unused objects',
        priority: 2,
        estimatedMemorySaved: 5 * 1024 * 1024, // 5MB
        execute: async () => {
          this.objectPools.forEach(pool => pool.clear());
        }
      },
      {
        name: 'Cleanup Event Listeners',
        description: 'Remove old event listeners',
        priority: 3,
        estimatedMemorySaved: 2 * 1024 * 1024, // 2MB
        execute: async () => {
          this.eventEmitter.cleanup();
        }
      },
      {
        name: 'Clear Reference Tracker',
        description: 'Remove old tracked references',
        priority: 4,
        estimatedMemorySaved: 3 * 1024 * 1024, // 3MB
        execute: async () => {
          this.referenceTracker.cleanup();
        }
      },
      {
        name: 'Clear Memory History',
        description: 'Reduce memory history to last 10 entries',
        priority: 5,
        estimatedMemorySaved: 1 * 1024 * 1024, // 1MB
        execute: async () => {
          if (this.memoryHistory.length > 10) {
            this.memoryHistory = this.memoryHistory.slice(-10);
          }
        }
      },
      {
        name: 'Clear Performance Entries',
        description: 'Clear browser performance entries',
        priority: 6,
        estimatedMemorySaved: 2 * 1024 * 1024, // 2MB
        execute: async () => {
          if (performance.clearMarks) {
            performance.clearMarks();
          }
          if (performance.clearMeasures) {
            performance.clearMeasures();
          }
          if (performance.clearResourceTimings) {
            performance.clearResourceTimings();
          }
        }
      },
      {
        name: 'Clear DOM Cache',
        description: 'Clear cached DOM queries and references',
        priority: 7,
        estimatedMemorySaved: 1 * 1024 * 1024, // 1MB
        execute: async () => {
          // Clear any cached DOM element references
          const cachedElements = document.querySelectorAll('[data-cached]');
          cachedElements.forEach(el => {
            el.removeAttribute('data-cached');
          });
        }
      }
    ];
  }

  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        const longTasks = list.getEntries().filter(entry => entry.duration > 50);
        if (longTasks.length > 0) {
          this.detectPotentialMemoryLeaks(longTasks);
        }
      });

      try {
        this.performanceObserver.observe({ entryTypes: ['longtask', 'measure'] });
      } catch (error) {
        console.warn('Performance observer not fully supported:', error);
      }
    }
  }

  startMonitoring(): void {
    if (this.monitoringActive) return;

    this.monitoringActive = true;
    this.scheduleNextCheck();
    this.eventEmitter.emit('monitoring:started');
  }

  stopMonitoring(): void {
    this.monitoringActive = false;
    this.eventEmitter.emit('monitoring:stopped');
  }

  private scheduleNextCheck(): void {
    if (!this.monitoringActive) return;

    setTimeout(() => {
      this.checkMemoryUsage();
      this.scheduleNextCheck();
    }, this.config.monitoringInterval);
  }

  private async checkMemoryUsage(): Promise<void> {
    const stats = this.getMemoryStats();
    if (!stats) return;

    this.memoryHistory.push(stats);

    // Emit memory update event
    this.eventEmitter.emit('memory:update', stats);

    // Check if cleanup is needed
    if (this.shouldTriggerCleanup(stats)) {
      await this.performOptimization();
    }

    // Check for memory leaks
    this.detectMemoryLeaks();
  }

  private shouldTriggerCleanup(stats: MemoryStats): boolean {
    return (
      stats.usagePercentage > this.config.maxMemoryUsagePercent ||
      stats.usedJSHeapSize > this.config.cleanupThreshold * 1024 * 1024
    ) && this.config.enableAutomaticCleanup && !this.cleanupInProgress;
  }

  async performOptimization(forceAll = false): Promise<{ strategiesExecuted: number; memorySaved: number }> {
    if (this.cleanupInProgress) {
      return { strategiesExecuted: 0, memorySaved: 0 };
    }

    this.cleanupInProgress = true;
    this.lastCleanup = Date.now();

    const beforeStats = this.getMemoryStats();
    let strategiesExecuted = 0;
    let totalEstimatedSaved = 0;

    try {
      this.eventEmitter.emit('optimization:started');

      // Sort strategies by priority
      const sortedStrategies = [...this.optimizationStrategies].sort(
        (a, b) => a.priority - b.priority
      );

      for (const strategy of sortedStrategies) {
        try {
          await strategy.execute();
          strategiesExecuted++;
          totalEstimatedSaved += strategy.estimatedMemorySaved;

          // Check if we've freed enough memory (unless forcing all)
          if (!forceAll) {
            const currentStats = this.getMemoryStats();
            if (currentStats && currentStats.usagePercentage < this.config.maxMemoryUsagePercent * 0.8) {
              break;
            }
          }

          // Yield control to prevent blocking
          await new Promise(resolve => setTimeout(resolve, 10));
        } catch (error) {
          console.error(`Memory optimization strategy "${strategy.name}" failed:`, error);
        }
      }

      const afterStats = this.getMemoryStats();
      const actualMemorySaved = beforeStats && afterStats 
        ? beforeStats.usedJSHeapSize - afterStats.usedJSHeapSize 
        : 0;

      this.eventEmitter.emit('optimization:completed', {
        strategiesExecuted,
        estimatedMemorySaved: totalEstimatedSaved,
        actualMemorySaved
      });

      return { strategiesExecuted, memorySaved: actualMemorySaved };
    } finally {
      this.cleanupInProgress = false;
    }
  }

  private detectMemoryLeaks(): void {
    if (this.memoryHistory.length < 5) return;

    const recent = this.memoryHistory.slice(-5);
    const isIncreasing = recent.every((stats, index) => 
      index === 0 || stats.usedJSHeapSize >= recent[index - 1].usedJSHeapSize
    );

    if (isIncreasing) {
      const growth = recent[recent.length - 1].usedJSHeapSize - recent[0].usedJSHeapSize;
      const growthRate = growth / (recent.length - 1);

      if (growthRate > 5 * 1024 * 1024) { // 5MB per check
        this.recordMemoryLeak('continuous-growth', growth);
      }
    }
  }

  private detectPotentialMemoryLeaks(longTasks: PerformanceEntry[]): void {
    const totalDuration = longTasks.reduce((sum, task) => sum + task.duration, 0);
    if (totalDuration > 200) { // More than 200ms of long tasks
      this.recordMemoryLeak('long-tasks', totalDuration);
    }
  }

  private recordMemoryLeak(type: string, size: number): void {
    const now = Date.now();
    const existing = this.leakDetector.get(type);

    if (existing) {
      existing.count++;
      existing.size += size;
      existing.lastDetected = now;
    } else {
      this.leakDetector.set(type, {
        type,
        count: 1,
        size,
        firstDetected: now,
        lastDetected: now
      });
    }

    this.eventEmitter.emit('leak:detected', { type, size });
  }

  getMemoryStats(): MemoryStats | null {
    if (!('memory' in performance)) {
      return null;
    }

    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    };
  }

  getMemoryHistory(): MemoryStats[] {
    return [...this.memoryHistory];
  }

  getMemoryLeaks(): MemoryLeak[] {
    return Array.from(this.leakDetector.values());
  }

  createObjectPool<T>(
    name: string,
    factory: () => T,
    reset: (obj: T) => void,
    maxSize = 100
  ): ObjectPool<T> {
    const pool = new ObjectPool(factory, reset, maxSize);
    this.objectPools.set(name, pool);
    return pool;
  }

  trackObject<T>(obj: T, identifier: string): T {
    return this.referenceTracker.track(obj, identifier);
  }

  untrackObject(identifier: string): void {
    this.referenceTracker.untrack(identifier);
  }

  onMemoryUpdate(callback: (stats: MemoryStats) => void): () => void {
    return this.eventEmitter.on('memory:update', callback);
  }

  onOptimization(callback: (result: any) => void): () => void {
    return this.eventEmitter.on('optimization:completed', callback);
  }

  onMemoryLeak(callback: (leak: any) => void): () => void {
    return this.eventEmitter.on('leak:detected', callback);
  }

  getOptimizationRecommendations(): string[] {
    const stats = this.getMemoryStats();
    const recommendations: string[] = [];

    if (!stats) {
      recommendations.push('Memory monitoring not available in this browser');
      return recommendations;
    }

    if (stats.usagePercentage > 80) {
      recommendations.push('Memory usage is very high. Consider reducing data size or enabling automatic cleanup.');
    }

    if (stats.usagePercentage > 60) {
      recommendations.push('Consider using object pooling for frequently created objects.');
    }

    const recentLeaks = this.getMemoryLeaks().filter(
      leak => Date.now() - leak.lastDetected < 60000 // Last minute
    );

    if (recentLeaks.length > 0) {
      recommendations.push(`${recentLeaks.length} potential memory leak(s) detected. Review object references and event listeners.`);
    }

    if (this.memoryHistory.length > 5) {
      const trend = this.memoryHistory.slice(-5);
      const avgGrowth = trend.reduce((sum, stats, index) => {
        if (index === 0) return 0;
        return sum + (stats.usedJSHeapSize - trend[index - 1].usedJSHeapSize);
      }, 0) / (trend.length - 1);

      if (avgGrowth > 2 * 1024 * 1024) { // 2MB average growth
        recommendations.push('Memory usage is growing consistently. Review for potential leaks.');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Memory usage looks healthy!');
    }

    return recommendations;
  }

  getDetailedStats() {
    return {
      memory: this.getMemoryStats(),
      objectPools: Object.fromEntries(
        Array.from(this.objectPools.entries()).map(([name, pool]) => [name, pool.getStats()])
      ),
      referenceTracker: this.referenceTracker.getStats(),
      eventEmitter: this.eventEmitter.getStats(),
      leaks: this.getMemoryLeaks(),
      lastCleanup: this.lastCleanup,
      monitoringActive: this.monitoringActive,
      recommendations: this.getOptimizationRecommendations()
    };
  }

  destroy(): void {
    this.stopMonitoring();
    this.objectPools.clear();
    this.performanceObserver?.disconnect();
    this.eventEmitter.cleanup();
    this.referenceTracker.cleanup();
  }
}

// Singleton instance for global memory optimization
export const globalMemoryOptimizer = new MemoryOptimizer({
  enableAutomaticCleanup: true,
  maxMemoryUsagePercent: 70,
  monitoringInterval: 10000 // 10 seconds
});

// React hook for memory optimization
export function useMemoryOptimization() {
  const [memoryStats, setMemoryStats] = React.useState<MemoryStats | null>(null);
  const [isOptimizing, setIsOptimizing] = React.useState(false);
  const [leaks, setLeaks] = React.useState<MemoryLeak[]>([]);

  React.useEffect(() => {
    globalMemoryOptimizer.startMonitoring();

    const unsubscribeMemory = globalMemoryOptimizer.onMemoryUpdate(setMemoryStats);
    const unsubscribeOptimization = globalMemoryOptimizer.onOptimization((result) => {
      setIsOptimizing(false);
    });
    const unsubscribeLeak = globalMemoryOptimizer.onMemoryLeak(() => {
      setLeaks(globalMemoryOptimizer.getMemoryLeaks());
    });

    return () => {
      unsubscribeMemory();
      unsubscribeOptimization();
      unsubscribeLeak();
    };
  }, []);

  const forceOptimization = React.useCallback(async () => {
    setIsOptimizing(true);
    await globalMemoryOptimizer.performOptimization(true);
  }, []);

  const createObjectPool = React.useCallback(<T>(
    name: string,
    factory: () => T,
    reset: (obj: T) => void,
    maxSize = 100
  ) => {
    return globalMemoryOptimizer.createObjectPool(name, factory, reset, maxSize);
  }, []);

  return {
    memoryStats,
    isOptimizing,
    leaks,
    forceOptimization,
    createObjectPool,
    getDetailedStats: () => globalMemoryOptimizer.getDetailedStats(),
    getRecommendations: () => globalMemoryOptimizer.getOptimizationRecommendations()
  };
}

export default MemoryOptimizer; 