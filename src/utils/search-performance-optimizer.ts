import { EndpointData, FilterState } from '../types/openapi';

interface SearchIndex {
  path: Map<string, EndpointData[]>;
  method: Map<string, EndpointData[]>;
  tags: Map<string, EndpointData[]>;
  summary: Map<string, EndpointData[]>;
  description: Map<string, EndpointData[]>;
  operationId: Map<string, EndpointData[]>;
}

interface SearchResult {
  endpoints: EndpointData[];
  searchTime: number;
  totalResults: number;
  searchId: string;
  fromCache: boolean;
}

interface SearchCache {
  [key: string]: {
    result: SearchResult;
    timestamp: number;
    accessCount: number;
  };
}

interface SearchPerformanceMetrics {
  totalSearches: number;
  cacheHitRate: number;
  averageSearchTime: number;
  indexBuildTime: number;
  lastIndexUpdate: number;
}

interface ProgressiveSearchOptions {
  batchSize: number;
  maxBatches: number;
  prioritizeByMethod: boolean;
  prioritizeByTag: boolean;
}

export class SearchPerformanceOptimizer {
  private searchIndex: SearchIndex;
  private searchCache: SearchCache = {};
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private searchMetrics: SearchPerformanceMetrics;
  private lastEndpointsHash = '';
  private progressiveSearchControllers = new Map<string, AbortController>();

  constructor() {
    this.searchIndex = {
      path: new Map(),
      method: new Map(),
      tags: new Map(),
      summary: new Map(),
      description: new Map(),
      operationId: new Map()
    };

    this.searchMetrics = {
      totalSearches: 0,
      cacheHitRate: 0,
      averageSearchTime: 0,
      indexBuildTime: 0,
      lastIndexUpdate: 0
    };
  }

  // Build search index for fast lookups
  buildSearchIndex(endpoints: EndpointData[]): void {
    const startTime = performance.now();
    
    // Create hash of endpoints to check if rebuild is needed
    const endpointsHash = this.createEndpointsHash(endpoints);
    if (endpointsHash === this.lastEndpointsHash) {
      return; // No need to rebuild
    }

    // Clear existing index
    this.clearIndex();

    // Build new index
    endpoints.forEach(endpoint => {
      // Index by path segments
      const pathSegments = endpoint.path.toLowerCase().split('/').filter(Boolean);
      pathSegments.forEach(segment => {
        if (!this.searchIndex.path.has(segment)) {
          this.searchIndex.path.set(segment, []);
        }
        this.searchIndex.path.get(segment)!.push(endpoint);
      });

      // Index by method
      const method = endpoint.method.toLowerCase();
      if (!this.searchIndex.method.has(method)) {
        this.searchIndex.method.set(method, []);
      }
      this.searchIndex.method.get(method)!.push(endpoint);

      // Index by tags
      endpoint.tags.forEach(tag => {
        const normalizedTag = tag.toLowerCase();
        if (!this.searchIndex.tags.has(normalizedTag)) {
          this.searchIndex.tags.set(normalizedTag, []);
        }
        this.searchIndex.tags.get(normalizedTag)!.push(endpoint);
      });

      // Index by summary words
      if (endpoint.summary) {
        const summaryWords = this.extractWords(endpoint.summary);
        summaryWords.forEach(word => {
          if (!this.searchIndex.summary.has(word)) {
            this.searchIndex.summary.set(word, []);
          }
          this.searchIndex.summary.get(word)!.push(endpoint);
        });
      }

      // Index by description words
      if (endpoint.description) {
        const descriptionWords = this.extractWords(endpoint.description);
        descriptionWords.forEach(word => {
          if (!this.searchIndex.description.has(word)) {
            this.searchIndex.description.set(word, []);
          }
          this.searchIndex.description.get(word)!.push(endpoint);
        });
      }

      // Index by operation ID
      if (endpoint.operationId) {
        const operationId = endpoint.operationId.toLowerCase();
        if (!this.searchIndex.operationId.has(operationId)) {
          this.searchIndex.operationId.set(operationId, []);
        }
        this.searchIndex.operationId.get(operationId)!.push(endpoint);
      }
    });

    const buildTime = performance.now() - startTime;
    this.searchMetrics.indexBuildTime = buildTime;
    this.searchMetrics.lastIndexUpdate = Date.now();
    this.lastEndpointsHash = endpointsHash;

    console.log(`Search index built in ${buildTime.toFixed(2)}ms for ${endpoints.length} endpoints`);
  }

  // Optimized search with caching and indexing
  async search(
    query: string,
    endpoints: EndpointData[],
    filters: FilterState,
    options?: {
      maxResults?: number;
      progressive?: boolean;
      progressiveOptions?: ProgressiveSearchOptions;
    }
  ): Promise<SearchResult> {
    const startTime = performance.now();
    const searchId = this.generateSearchId(query, filters);

    // Check cache first
    const cached = this.getCachedResult(searchId);
    if (cached) {
      return {
        ...cached.result,
        searchTime: performance.now() - startTime
      };
    }

    // Ensure index is built
    this.buildSearchIndex(endpoints);

    let results: EndpointData[];

    if (options?.progressive) {
      results = await this.progressiveSearch(query, endpoints, filters, options.progressiveOptions);
    } else {
      results = await this.performOptimizedSearch(query, endpoints, filters);
    }

    // Apply result limit
    if (options?.maxResults) {
      results = results.slice(0, options.maxResults);
    }

    const searchTime = performance.now() - startTime;
    const searchResult: SearchResult = {
      endpoints: results,
      searchTime,
      totalResults: results.length,
      searchId,
      fromCache: false
    };

    // Cache the result
    this.cacheResult(searchId, searchResult);

    // Update metrics
    this.updateSearchMetrics(searchTime, false);

    return searchResult;
  }

  // Debounced search for real-time search inputs
  debouncedSearch(
    query: string,
    endpoints: EndpointData[],
    filters: FilterState,
    callback: (result: SearchResult) => void,
    debounceMs = 300,
    searchId = 'default'
  ): void {
    // Clear existing timer for this search ID
    const existingTimer = this.debounceTimers.get(searchId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(async () => {
      try {
        const result = await this.search(query, endpoints, filters);
        callback(result);
      } catch (error) {
        console.error('Debounced search error:', error);
      }
      this.debounceTimers.delete(searchId);
    }, debounceMs);

    this.debounceTimers.set(searchId, timer);
  }

  // Progressive search for large datasets
  private async progressiveSearch(
    query: string,
    endpoints: EndpointData[],
    filters: FilterState,
    options?: ProgressiveSearchOptions
  ): Promise<EndpointData[]> {
    const progressiveOptions: ProgressiveSearchOptions = {
      batchSize: 100,
      maxBatches: 10,
      prioritizeByMethod: true,
      prioritizeByTag: true,
      ...options
    };

    const searchId = this.generateSearchId(query, filters);
    
    // Cancel any existing progressive search
    const existingController = this.progressiveSearchControllers.get(searchId);
    if (existingController) {
      existingController.abort();
    }

    const controller = new AbortController();
    this.progressiveSearchControllers.set(searchId, controller);

    try {
      let allResults: EndpointData[] = [];
      let processed = 0;

      // Sort endpoints by priority if specified
      let sortedEndpoints = [...endpoints];
      if (progressiveOptions.prioritizeByMethod || progressiveOptions.prioritizeByTag) {
        sortedEndpoints = this.prioritizeEndpoints(endpoints, filters, progressiveOptions);
      }

      // Process in batches
      for (let batch = 0; batch < progressiveOptions.maxBatches && processed < sortedEndpoints.length; batch++) {
        if (controller.signal.aborted) {
          break;
        }

        const batchStart = processed;
        const batchEnd = Math.min(processed + progressiveOptions.batchSize, sortedEndpoints.length);
        const batchEndpoints = sortedEndpoints.slice(batchStart, batchEnd);

        const batchResults = await this.performOptimizedSearch(query, batchEndpoints, filters);
        allResults.push(...batchResults);

        processed = batchEnd;

        // Yield control to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      return allResults;
    } finally {
      this.progressiveSearchControllers.delete(searchId);
    }
  }

  // Core optimized search logic using index
  private async performOptimizedSearch(
    query: string,
    endpoints: EndpointData[],
    filters: FilterState
  ): Promise<EndpointData[]> {
    if (!query.trim()) {
      return this.applyFilters(endpoints, filters);
    }

    const queryLower = query.toLowerCase();
    const queryWords = this.extractWords(queryLower);
    
    // Use index for fast lookups
    const candidateResults = new Set<EndpointData>();

    // Search in indexed fields
    for (const word of queryWords) {
      // Search paths
      this.searchIndex.path.forEach((endpoints, pathSegment) => {
        if (pathSegment.includes(word)) {
          endpoints.forEach(ep => candidateResults.add(ep));
        }
      });

      // Search methods
      if (this.searchIndex.method.has(word)) {
        this.searchIndex.method.get(word)!.forEach(ep => candidateResults.add(ep));
      }

      // Search tags
      this.searchIndex.tags.forEach((endpoints, tag) => {
        if (tag.includes(word)) {
          endpoints.forEach(ep => candidateResults.add(ep));
        }
      });

      // Search summaries
      this.searchIndex.summary.forEach((endpoints, summaryWord) => {
        if (summaryWord.includes(word)) {
          endpoints.forEach(ep => candidateResults.add(ep));
        }
      });

      // Search descriptions
      this.searchIndex.description.forEach((endpoints, descWord) => {
        if (descWord.includes(word)) {
          endpoints.forEach(ep => candidateResults.add(ep));
        }
      });

      // Search operation IDs
      this.searchIndex.operationId.forEach((endpoints, opId) => {
        if (opId.includes(word)) {
          endpoints.forEach(ep => candidateResults.add(ep));
        }
      });
    }

    // Fallback to linear search for partial matches not caught by index
    if (candidateResults.size === 0) {
      for (const endpoint of endpoints) {
        if (this.matchesQuery(endpoint, queryLower)) {
          candidateResults.add(endpoint);
        }
      }
    }

    // Convert to array and apply additional filters
    const results = Array.from(candidateResults);
    return this.applyFilters(results, filters);
  }

  // Check if endpoint matches query (fallback method)
  private matchesQuery(endpoint: EndpointData, queryLower: string): boolean {
    const searchableText = [
      endpoint.path,
      endpoint.method,
      endpoint.summary,
      endpoint.description,
      endpoint.operationId,
      ...endpoint.tags
    ].join(' ').toLowerCase();

    return searchableText.includes(queryLower);
  }

  // Apply filters to search results
  private applyFilters(endpoints: EndpointData[], filters: FilterState): EndpointData[] {
    return endpoints.filter(endpoint => {
      // Method filter
      if (filters.methods.length > 0 && !filters.methods.includes(endpoint.method)) {
        return false;
      }

      // Tags filter
      if (filters.tags.length > 0 && !filters.tags.some(tag => endpoint.tags.includes(tag))) {
        return false;
      }

      // Status codes filter
      if (filters.statusCodes.length > 0) {
        const endpointStatusCodes = Object.keys(endpoint.responses);
        if (!filters.statusCodes.some(code => endpointStatusCodes.includes(code))) {
          return false;
        }
      }

      // Deprecated filter
      if (filters.deprecated !== null && endpoint.deprecated !== filters.deprecated) {
        return false;
      }

      // Complexity filter
      if (filters.complexity.length > 0 && !filters.complexity.includes(endpoint.complexity)) {
        return false;
      }

      // Security filter
      if (filters.security.length > 0) {
        const hasRequiredSecurity = filters.security.some(secType => {
          if (!endpoint.security) return secType === 'none';
          return endpoint.security.some(sec => Object.keys(sec).some(key => key.includes(secType)));
        });
        if (!hasRequiredSecurity) return false;
      }

      // Path pattern filter
      if (filters.pathPattern && !new RegExp(filters.pathPattern, 'i').test(endpoint.path)) {
        return false;
      }

      // Parameters filter
      if (filters.hasParameters !== null) {
        const hasParams = endpoint.parameters && endpoint.parameters.length > 0;
        if (hasParams !== filters.hasParameters) return false;
      }

      // Request body filter
      if (filters.hasRequestBody !== null) {
        const hasBody = !!endpoint.requestBody;
        if (hasBody !== filters.hasRequestBody) return false;
      }

      return true;
    });
  }

  // Prioritize endpoints for progressive search
  private prioritizeEndpoints(
    endpoints: EndpointData[],
    filters: FilterState,
    options: ProgressiveSearchOptions
  ): EndpointData[] {
    return [...endpoints].sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (options.prioritizeByMethod) {
        // Prioritize GET methods
        if (a.method === 'GET') scoreA += 10;
        if (b.method === 'GET') scoreB += 10;
        
        // Then POST
        if (a.method === 'POST') scoreA += 5;
        if (b.method === 'POST') scoreB += 5;
      }

      if (options.prioritizeByTag) {
        // Prioritize endpoints with filter tags
        if (filters.tags.length > 0) {
          const aTagMatches = a.tags.filter(tag => filters.tags.includes(tag)).length;
          const bTagMatches = b.tags.filter(tag => filters.tags.includes(tag)).length;
          scoreA += aTagMatches * 20;
          scoreB += bTagMatches * 20;
        }
      }

      return scoreB - scoreA;
    });
  }

  // Cache management
  private generateSearchId(query: string, filters: FilterState): string {
    const filterHash = JSON.stringify(filters);
    return `${query}_${this.hashString(filterHash)}`;
  }

  private getCachedResult(searchId: string): SearchCache[string] | null {
    const cached = this.searchCache[searchId];
    if (!cached) return null;

    // Check if cache is still valid (1 minute TTL)
    const now = Date.now();
    if (now - cached.timestamp > 60000) {
      delete this.searchCache[searchId];
      return null;
    }

    // Update access count
    cached.accessCount++;
    return cached;
  }

  private cacheResult(searchId: string, result: SearchResult): void {
    // Clean old cache entries if cache is getting too large
    if (Object.keys(this.searchCache).length > 100) {
      this.cleanCache();
    }

    this.searchCache[searchId] = {
      result,
      timestamp: Date.now(),
      accessCount: 1
    };
  }

  private cleanCache(): void {
    const entries = Object.entries(this.searchCache);
    const now = Date.now();

    // Remove old entries
    const validEntries = entries.filter(([_, cached]) => 
      now - cached.timestamp <= 60000
    );

    // If still too many, keep only the most accessed
    if (validEntries.length > 50) {
      validEntries.sort(([, a], [, b]) => b.accessCount - a.accessCount);
      this.searchCache = Object.fromEntries(validEntries.slice(0, 50));
    } else {
      this.searchCache = Object.fromEntries(validEntries);
    }
  }

  // Utility methods
  private extractWords(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2); // Ignore very short words
  }

  private createEndpointsHash(endpoints: EndpointData[]): string {
    const hashInput = endpoints.map(ep => `${ep.method}${ep.path}`).sort().join('|');
    return this.hashString(hashInput);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private clearIndex(): void {
    this.searchIndex.path.clear();
    this.searchIndex.method.clear();
    this.searchIndex.tags.clear();
    this.searchIndex.summary.clear();
    this.searchIndex.description.clear();
    this.searchIndex.operationId.clear();
  }

  private updateSearchMetrics(searchTime: number, fromCache: boolean): void {
    this.searchMetrics.totalSearches++;
    
    // Update cache hit rate
    const cacheHits = fromCache ? 1 : 0;
    this.searchMetrics.cacheHitRate = 
      (this.searchMetrics.cacheHitRate * (this.searchMetrics.totalSearches - 1) + cacheHits) / 
      this.searchMetrics.totalSearches;

    // Update average search time
    this.searchMetrics.averageSearchTime = 
      (this.searchMetrics.averageSearchTime * (this.searchMetrics.totalSearches - 1) + searchTime) / 
      this.searchMetrics.totalSearches;
  }

  // Public API methods
  getSearchMetrics(): SearchPerformanceMetrics {
    return { ...this.searchMetrics };
  }

  clearCache(): void {
    this.searchCache = {};
  }

  clearDebounceTimers(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }

  cancelProgressiveSearches(): void {
    this.progressiveSearchControllers.forEach(controller => controller.abort());
    this.progressiveSearchControllers.clear();
  }

  getIndexStats() {
    return {
      pathEntries: this.searchIndex.path.size,
      methodEntries: this.searchIndex.method.size,
      tagEntries: this.searchIndex.tags.size,
      summaryEntries: this.searchIndex.summary.size,
      descriptionEntries: this.searchIndex.description.size,
      operationIdEntries: this.searchIndex.operationId.size,
      totalEntries: this.searchIndex.path.size + this.searchIndex.method.size + 
                   this.searchIndex.tags.size + this.searchIndex.summary.size + 
                   this.searchIndex.description.size + this.searchIndex.operationId.size
    };
  }

  getCacheStats() {
    return {
      totalEntries: Object.keys(this.searchCache).length,
      hitRate: this.searchMetrics.cacheHitRate,
      oldestEntry: Math.min(...Object.values(this.searchCache).map(c => c.timestamp)),
      mostAccessed: Math.max(...Object.values(this.searchCache).map(c => c.accessCount))
    };
  }

  destroy(): void {
    this.clearCache();
    this.clearDebounceTimers();
    this.cancelProgressiveSearches();
    this.clearIndex();
  }
}

// Singleton instance for global use
export const globalSearchOptimizer = new SearchPerformanceOptimizer();

export default SearchPerformanceOptimizer; 