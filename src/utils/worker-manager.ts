import type { ParseWorkerMessage, ParseWorkerResponse } from '../workers/openapi-parser.worker';
import type { SearchWorkerMessage, SearchWorkerResponse } from '../workers/search.worker';

// Import workers using Vite's worker import syntax
import OpenAPIParserWorker from '../workers/openapi-parser.worker?worker';
import SearchWorker from '../workers/search.worker?worker';

// Base worker interface
export interface WorkerTask {
  id: string;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  onProgress?: (progress: number, message?: string) => void;
}

// Worker manager for handling web worker communication
export class WorkerManager {
  private workers: Map<string, Worker> = new Map();
  private tasks: Map<string, WorkerTask> = new Map();
  private workerPool: Map<string, Worker[]> = new Map();
  
  constructor(private config: {
    maxWorkers?: number;
    timeout?: number;
    enablePooling?: boolean;
  } = {}) {
    this.config = {
      maxWorkers: 4,
      timeout: 30000,
      enablePooling: true,
      ...config
    };
  }

  // Initialize a worker type
  async initializeWorker(type: 'parser' | 'search', url?: string): Promise<void> {
    try {
      let worker: Worker;
      
      // Use the imported worker classes
      switch (type) {
        case 'parser':
          worker = new OpenAPIParserWorker();
          break;
        case 'search':
          worker = new SearchWorker();
          break;
        default:
          throw new Error(`Unknown worker type: ${type}`);
      }
      
      worker.addEventListener('message', (event) => {
        this.handleWorkerMessage(event.data);
      });
      
      worker.addEventListener('error', (event) => {
        console.error(`Worker error (${type}):`, event);
        this.handleWorkerError(type, event.error || new Error('Worker error'));
      });

      this.workers.set(type, worker);

      // Initialize worker pool if enabled
      if (this.config.enablePooling) {
        const pool: Worker[] = [];
        for (let i = 0; i < (this.config.maxWorkers || 4) - 1; i++) {
          let poolWorker: Worker;
          switch (type) {
            case 'parser':
              poolWorker = new OpenAPIParserWorker();
              break;
            case 'search':
              poolWorker = new SearchWorker();
              break;
            default:
              continue;
          }
          
          poolWorker.addEventListener('message', (event) => {
            this.handleWorkerMessage(event.data);
          });
          poolWorker.addEventListener('error', (event) => {
            console.error(`Pool worker error (${type}):`, event);
          });
          pool.push(poolWorker);
        }
        this.workerPool.set(type, pool);
      }
    } catch (error) {
      console.error(`Failed to initialize ${type} worker:`, error);
      throw error;
    }
  }

  // Get an available worker (with pooling support)
  private getAvailableWorker(type: string): Worker | null {
    const mainWorker = this.workers.get(type);
    if (mainWorker) return mainWorker;

    if (this.config.enablePooling) {
      const pool = this.workerPool.get(type);
      if (pool && pool.length > 0) {
        return pool.shift() || null;
      }
    }

    return null;
  }

  // Return worker to pool
  private returnWorkerToPool(type: string, worker: Worker): void {
    if (this.config.enablePooling) {
      const pool = this.workerPool.get(type);
      if (pool && pool.length < (this.config.maxWorkers || 4) - 1) {
        pool.push(worker);
      }
    }
  }

  // Send message to worker with promise-based interface
  private sendMessage<TMessage, TResponse>(
    workerType: string,
    message: TMessage,
    onProgress?: (progress: number, message?: string) => void
  ): Promise<TResponse> {
    return new Promise((resolve, reject) => {
      const worker = this.getAvailableWorker(workerType);
      if (!worker) {
        reject(new Error(`No available ${workerType} worker`));
        return;
      }

      const taskId = (message as any).id || this.generateTaskId();
      const messageWithId = { ...message, id: taskId };

      // Store task for response handling
      this.tasks.set(taskId, {
        id: taskId,
        resolve: (value: any) => {
          this.tasks.delete(taskId);
          this.returnWorkerToPool(workerType, worker);
          resolve(value);
        },
        reject: (reason: any) => {
          this.tasks.delete(taskId);
          this.returnWorkerToPool(workerType, worker);
          reject(reason);
        },
        onProgress
      });

      // Set timeout
      if (this.config.timeout) {
        setTimeout(() => {
          if (this.tasks.has(taskId)) {
            this.tasks.get(taskId)?.reject(new Error('Worker task timeout'));
          }
        }, this.config.timeout);
      }

      worker.postMessage(messageWithId);
    });
  }

  // Handle worker messages
  private handleWorkerMessage(response: any): void {
    const { id, type, payload, progress } = response;
    const task = this.tasks.get(id);
    
    if (!task) return;

    switch (type) {
      case 'success':
        task.resolve(payload);
        break;
      case 'error':
        task.reject(new Error(payload.error || 'Worker error'));
        break;
      case 'progress':
        if (task.onProgress) {
          task.onProgress(progress || 0, payload?.message);
        }
        break;
    }
  }

  // Handle worker errors
  private handleWorkerError(workerType: string, error: Error): void {
    // Reject all pending tasks for this worker type
    for (const [taskId, task] of this.tasks.entries()) {
      task.reject(error);
    }
    this.tasks.clear();
  }

  // Generate unique task ID
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // OpenAPI Parser methods
  async parseOpenAPISpec(
    spec: any,
    options?: {
      validateSpec?: boolean;
      extractMetadata?: boolean;
      optimizeMemory?: boolean;
    },
    onProgress?: (progress: number, message?: string) => void
  ): Promise<any> {
    if (!this.workers.has('parser')) {
      await this.initializeWorker('parser');
    }

    const message: ParseWorkerMessage = {
      type: 'parse',
      payload: { spec, options },
      id: this.generateTaskId()
    };

    return this.sendMessage<ParseWorkerMessage, any>('parser', message, onProgress);
  }

  async parseOpenAPIContent(
    content: string,
    options?: {
      validateSpec?: boolean;
      extractMetadata?: boolean;
      optimizeMemory?: boolean;
    },
    onProgress?: (progress: number, message?: string) => void
  ): Promise<any> {
    if (!this.workers.has('parser')) {
      await this.initializeWorker('parser');
    }

    const message: ParseWorkerMessage = {
      type: 'parse',
      payload: { content, options },
      id: this.generateTaskId()
    };

    return this.sendMessage<ParseWorkerMessage, any>('parser', message, onProgress);
  }

  async validateOpenAPISpec(spec: any): Promise<{ valid: boolean; errors: string[] }> {
    if (!this.workers.has('parser')) {
      await this.initializeWorker('parser');
    }

    const message: ParseWorkerMessage = {
      type: 'validate',
      payload: { spec },
      id: this.generateTaskId()
    };

    return this.sendMessage<ParseWorkerMessage, any>('parser', message);
  }

  async extractEndpoints(spec: any): Promise<any[]> {
    if (!this.workers.has('parser')) {
      await this.initializeWorker('parser');
    }

    const message: ParseWorkerMessage = {
      type: 'extract-endpoints',
      payload: { spec },
      id: this.generateTaskId()
    };

    const result = await this.sendMessage<ParseWorkerMessage, any>('parser', message);
    return result.endpoints || [];
  }

  async extractSchemas(spec: any): Promise<any[]> {
    if (!this.workers.has('parser')) {
      await this.initializeWorker('parser');
    }

    const message: ParseWorkerMessage = {
      type: 'extract-schemas',
      payload: { spec },
      id: this.generateTaskId()
    };

    const result = await this.sendMessage<ParseWorkerMessage, any>('parser', message);
    return result.schemas || [];
  }

  // Search methods
  async fuzzySearch(
    data: any[],
    query: string,
    options?: {
      threshold?: number;
      keys?: string[];
      includeScore?: boolean;
      includeMatches?: boolean;
      maxResults?: number;
    },
    onProgress?: (progress: number, message?: string) => void
  ): Promise<any[]> {
    if (!this.workers.has('search')) {
      await this.initializeWorker('search');
    }

    const message: SearchWorkerMessage = {
      type: 'fuzzy-search',
      payload: { data, query, options },
      id: this.generateTaskId()
    };

    const result = await this.sendMessage<SearchWorkerMessage, any>('search', message, onProgress);
    return result.results || [];
  }

  async filterData(
    data: any[],
    filters: { [key: string]: any },
    onProgress?: (progress: number, message?: string) => void
  ): Promise<any[]> {
    if (!this.workers.has('search')) {
      await this.initializeWorker('search');
    }

    const message: SearchWorkerMessage = {
      type: 'filter',
      payload: { data, options: { filters } },
      id: this.generateTaskId()
    };

    const result = await this.sendMessage<SearchWorkerMessage, any>('search', message, onProgress);
    return result.results || [];
  }

  async sortData(
    data: any[],
    sortBy: string,
    sortOrder: 'asc' | 'desc' = 'asc',
    onProgress?: (progress: number, message?: string) => void
  ): Promise<any[]> {
    if (!this.workers.has('search')) {
      await this.initializeWorker('search');
    }

    const message: SearchWorkerMessage = {
      type: 'sort',
      payload: { data, options: { sortBy, sortOrder } },
      id: this.generateTaskId()
    };

    const result = await this.sendMessage<SearchWorkerMessage, any>('search', message, onProgress);
    return result.results || [];
  }

  async groupData(
    data: any[],
    groupBy: string,
    onProgress?: (progress: number, message?: string) => void
  ): Promise<{ [key: string]: any[] }> {
    if (!this.workers.has('search')) {
      await this.initializeWorker('search');
    }

    const message: SearchWorkerMessage = {
      type: 'group',
      payload: { data, options: { groupBy } },
      id: this.generateTaskId()
    };

    const result = await this.sendMessage<SearchWorkerMessage, any>('search', message, onProgress);
    return result.results || {};
  }

  async analyzeData(
    data: any[],
    onProgress?: (progress: number, message?: string) => void
  ): Promise<any> {
    if (!this.workers.has('search')) {
      await this.initializeWorker('search');
    }

    const message: SearchWorkerMessage = {
      type: 'analyze',
      payload: { data },
      id: this.generateTaskId()
    };

    return this.sendMessage<SearchWorkerMessage, any>('search', message, onProgress);
  }

  // Cleanup methods
  terminateWorker(type: string): void {
    const worker = this.workers.get(type);
    if (worker) {
      worker.terminate();
      this.workers.delete(type);
    }

    const pool = this.workerPool.get(type);
    if (pool) {
      pool.forEach(worker => worker.terminate());
      this.workerPool.delete(type);
    }

    // Reject any pending tasks
    for (const [taskId, task] of this.tasks.entries()) {
      task.reject(new Error(`Worker ${type} terminated`));
    }
  }

  terminateAllWorkers(): void {
    for (const type of this.workers.keys()) {
      this.terminateWorker(type);
    }
  }

  // Get worker status
  getWorkerStatus(): { [type: string]: { initialized: boolean; poolSize: number; pendingTasks: number } } {
    const status: any = {};
    
    for (const [type, worker] of this.workers.entries()) {
      const pool = this.workerPool.get(type) || [];
      status[type] = {
        initialized: !!worker,
        poolSize: pool.length,
        pendingTasks: Array.from(this.tasks.values()).length
      };
    }

    return status;
  }
}

// Global worker manager instance
export const globalWorkerManager = new WorkerManager({
  maxWorkers: navigator.hardwareConcurrency || 4,
  timeout: 30000,
  enablePooling: true
});

// Convenience functions
export const parseOpenAPISpec = (spec: any, options?: any, onProgress?: any) => 
  globalWorkerManager.parseOpenAPISpec(spec, options, onProgress);

export const parseOpenAPIContent = (content: string, options?: any, onProgress?: any) => 
  globalWorkerManager.parseOpenAPIContent(content, options, onProgress);

export const validateOpenAPISpec = (spec: any) => 
  globalWorkerManager.validateOpenAPISpec(spec);

export const extractEndpoints = (spec: any) => 
  globalWorkerManager.extractEndpoints(spec);

export const extractSchemas = (spec: any) => 
  globalWorkerManager.extractSchemas(spec);

export const fuzzySearch = (data: any[], query: string, options?: any, onProgress?: any) => 
  globalWorkerManager.fuzzySearch(data, query, options, onProgress);

export const filterData = (data: any[], filters: any, onProgress?: any) => 
  globalWorkerManager.filterData(data, filters, onProgress);

export const sortData = (data: any[], sortBy: string, sortOrder?: 'asc' | 'desc', onProgress?: any) => 
  globalWorkerManager.sortData(data, sortBy, sortOrder, onProgress);

export const groupData = (data: any[], groupBy: string, onProgress?: any) => 
  globalWorkerManager.groupData(data, groupBy, onProgress);

export const analyzeData = (data: any[], onProgress?: any) => 
  globalWorkerManager.analyzeData(data, onProgress);

// React hook for using workers
export function useWorkerManager() {
  return {
    workerManager: globalWorkerManager,
    parseOpenAPISpec,
    parseOpenAPIContent,
    validateOpenAPISpec,
    extractEndpoints,
    extractSchemas,
    fuzzySearch,
    filterData,
    sortData,
    groupData,
    analyzeData
  };
} 