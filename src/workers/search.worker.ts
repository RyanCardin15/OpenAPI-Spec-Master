export interface SearchWorkerMessage {
  type: 'fuzzy-search' | 'filter' | 'sort' | 'group' | 'analyze';
  payload: {
    data?: any[];
    query?: string;
    options?: {
      threshold?: number;
      keys?: string[];
      includeScore?: boolean;
      includeMatches?: boolean;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      groupBy?: string;
      filters?: { [key: string]: any };
      maxResults?: number;
    };
  };
  id: string;
}

export interface SearchWorkerResponse {
  type: 'success' | 'error' | 'progress';
  payload: any;
  id: string;
  progress?: number;
}

// Simple fuzzy search implementation
class FuzzySearch {
  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[a.length][b.length];
  }

  private getNestedValue(obj: any, path: string): string {
    return path.split('.').reduce((current, key) => current?.[key], obj) || '';
  }

  search(data: any[], query: string, options: any = {}): any[] {
    const {
      threshold = 0.6,
      keys = ['name', 'title', 'description'],
      includeScore = false,
      includeMatches = false,
      maxResults = 100
    } = options;

    if (!query.trim()) return data.slice(0, maxResults);

    const queryLower = query.toLowerCase();
    const results: any[] = [];

    for (const item of data) {
      let bestScore = 0;
      let bestMatches: any[] = [];

      for (const key of keys) {
        const value = this.getNestedValue(item, key);
        if (!value) continue;

        const valueLower = value.toLowerCase();
        
        // Exact match
        if (valueLower.includes(queryLower)) {
          bestScore = Math.max(bestScore, 1);
          if (includeMatches) {
            bestMatches.push({ key, value, type: 'exact' });
          }
          continue;
        }

        // Fuzzy match
        const distance = this.levenshteinDistance(queryLower, valueLower);
        const maxLength = Math.max(queryLower.length, valueLower.length);
        const score = 1 - (distance / maxLength);

        if (score > bestScore) {
          bestScore = score;
          if (includeMatches) {
            bestMatches = [{ key, value, score, type: 'fuzzy' }];
          }
        }
      }

      if (bestScore >= threshold) {
        const result: any = includeScore ? { item, score: bestScore } : item;
        if (includeMatches) {
          result.matches = bestMatches;
        }
        results.push(result);
      }
    }

    // Sort by score
    results.sort((a, b) => {
      const scoreA = includeScore ? a.score : 1;
      const scoreB = includeScore ? b.score : 1;
      return scoreB - scoreA;
    });

    return results.slice(0, maxResults);
  }
}

class SearchWorker {
  private fuzzySearch = new FuzzySearch();

  private filterData(data: any[], filters: { [key: string]: any }): any[] {
    return data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        const itemValue = this.getNestedValue(item, key);
        
        if (Array.isArray(value)) {
          return value.includes(itemValue);
        }
        
        if (typeof value === 'string' && typeof itemValue === 'string') {
          return itemValue.toLowerCase().includes(value.toLowerCase());
        }
        
        return itemValue === value;
      });
    });
  }

  private sortData(data: any[], sortBy: string, sortOrder: 'asc' | 'desc' = 'asc'): any[] {
    return [...data].sort((a, b) => {
      const aValue = this.getNestedValue(a, sortBy);
      const bValue = this.getNestedValue(b, sortBy);

      if (aValue === bValue) return 0;
      
      const comparison = aValue < bValue ? -1 : 1;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  private groupData(data: any[], groupBy: string): { [key: string]: any[] } {
    return data.reduce((groups, item) => {
      const key = this.getNestedValue(item, groupBy) || 'Other';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as { [key: string]: any[] });
  }

  private analyzeData(data: any[]): any {
    const analysis: any = {
      totalItems: data.length,
      types: {},
      patterns: {},
      statistics: {}
    };

    // Basic type analysis
    for (const item of data) {
      for (const [key, value] of Object.entries(item)) {
        const type = typeof value;
        if (!analysis.types[key]) {
          analysis.types[key] = {};
        }
        analysis.types[key][type] = (analysis.types[key][type] || 0) + 1;
      }
    }

    // Find common patterns
    const commonKeys = Object.keys(analysis.types);
    analysis.patterns.commonKeys = commonKeys;
    analysis.patterns.keyCount = commonKeys.length;

    return analysis;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  async processMessage(message: SearchWorkerMessage): Promise<SearchWorkerResponse> {
    const { type, payload, id } = message;

    try {
      switch (type) {
        case 'fuzzy-search': {
          const { data, query, options = {} } = payload;
          
          self.postMessage({
            type: 'progress',
            payload: { message: 'Performing fuzzy search...' },
            id,
            progress: 50
          });

          const results = this.fuzzySearch.search(data || [], query || '', options);

          return {
            type: 'success',
            payload: { results, total: results.length },
            id
          };
        }

        case 'filter': {
          const { data, options = {} } = payload;
          const { filters = {} } = options;

          self.postMessage({
            type: 'progress',
            payload: { message: 'Filtering data...' },
            id,
            progress: 50
          });

          const results = this.filterData(data || [], filters);

          return {
            type: 'success',
            payload: { results, total: results.length },
            id
          };
        }

        case 'sort': {
          const { data, options = {} } = payload;
          const { sortBy, sortOrder = 'asc' } = options;

          if (!sortBy) {
            throw new Error('sortBy option is required for sort operation');
          }

          self.postMessage({
            type: 'progress',
            payload: { message: 'Sorting data...' },
            id,
            progress: 50
          });

          const results = this.sortData(data || [], sortBy, sortOrder);

          return {
            type: 'success',
            payload: { results, total: results.length },
            id
          };
        }

        case 'group': {
          const { data, options = {} } = payload;
          const { groupBy } = options;

          if (!groupBy) {
            throw new Error('groupBy option is required for group operation');
          }

          self.postMessage({
            type: 'progress',
            payload: { message: 'Grouping data...' },
            id,
            progress: 50
          });

          const results = this.groupData(data || [], groupBy);

          return {
            type: 'success',
            payload: { results, groups: Object.keys(results).length },
            id
          };
        }

        case 'analyze': {
          const { data } = payload;

          self.postMessage({
            type: 'progress',
            payload: { message: 'Analyzing data...' },
            id,
            progress: 50
          });

          const results = this.analyzeData(data || []);

          return {
            type: 'success',
            payload: results,
            id
          };
        }

        default:
          throw new Error(`Unknown message type: ${type}`);
      }
    } catch (error) {
      return {
        type: 'error',
        payload: {
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          stack: error instanceof Error ? error.stack : undefined
        },
        id
      };
    }
  }
}

// Worker instance
const searchWorker = new SearchWorker();

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent<SearchWorkerMessage>) => {
  const response = await searchWorker.processMessage(event.data);
  self.postMessage(response);
});

// Export for TypeScript
export {}; 