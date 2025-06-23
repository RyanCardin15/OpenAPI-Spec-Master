import { EnhancedEndpointData, EnhancedSchema, FilterState, GroupingState, SearchOptions } from '../types/enhanced-spec';
import { globalCache, globalPerformanceMonitor, memoize } from './performance-cache';
import { LazyLoader, createOptimizedLoader } from './lazy-loader';

export class EnhancedSearch {
  private endpoints: EnhancedEndpointData[] = [];
  private schemas: EnhancedSchema[] = [];
  private endpointLoader?: LazyLoader<EnhancedEndpointData>;
  private schemaLoader?: LazyLoader<EnhancedSchema>;
  
  // Memoized expensive operations will be initialized in constructor

  constructor(endpoints: EnhancedEndpointData[] = [], schemas: EnhancedSchema[] = []) {
    this.endpoints = endpoints;
    this.schemas = schemas;
  }

  updateData(endpoints: EnhancedEndpointData[], schemas: EnhancedSchema[]) {
    const endTimer = globalPerformanceMonitor.startTiming('updateData');
    
    this.endpoints = endpoints;
    this.schemas = schemas;
    
    // Create lazy loaders for large datasets
    if (endpoints.length > 100) {
      this.endpointLoader = createOptimizedLoader(endpoints, {
        pageSize: 50,
        preloadPages: 2,
        maxCacheSize: 10
      });
    }
    
    if (schemas.length > 50) {
      this.schemaLoader = createOptimizedLoader(schemas, {
        pageSize: 25,
        preloadPages: 2,
        maxCacheSize: 8
      });
    }
    
    // Invalidate caches when data changes
    globalCache.invalidateAll();
    
    endTimer();
  }

  searchEndpoints(filters: FilterState, grouping: GroupingState, searchOptions: SearchOptions = {
    fuzzy: true,
    caseSensitive: false,
    includeDescription: true,
    includeTags: true,
    includeParameters: true,
    includeResponseBodies: true,
    includeRequestBodies: true,
    includeTestCases: true,
    includeBusinessContext: true,
    searchDepth: 'deep'
  }) {
    const endTimer = globalPerformanceMonitor.startTiming('searchEndpoints');
    
    // Check cache first
    const cachedResults = globalCache.getSearchResults(filters, grouping, searchOptions);
    if (cachedResults) {
      endTimer();
      return cachedResults;
    }
    
    let result = [...this.endpoints];

    // Apply search filter
    if (filters.search.trim()) {
      result = this.applyTextSearch(result, filters.search, searchOptions);
    }

    // Apply response body search filter
    if (filters.responseBodySearch?.trim()) {
      result = this.applyResponseBodySearch(result, filters.responseBodySearch, searchOptions);
    }

    // Apply method filter
    if (filters.methods.length > 0) {
      result = result.filter(endpoint => filters.methods.includes(endpoint.method));
    }

    // Apply tag filter
    if (filters.tags.length > 0) {
      result = result.filter(endpoint => endpoint.tags.some(tag => filters.tags.includes(tag)));
    }

    // Apply status code filter
    if (filters.statusCodes.length > 0) {
      result = result.filter(endpoint =>
        Object.keys(endpoint.responses).some(code => 
          filters.statusCodes.includes(code)
        )
      );
    }

    // Apply deprecated filter
    if (filters.deprecated !== null) {
      result = result.filter(endpoint => endpoint.deprecated === filters.deprecated);
    }

    // Apply complexity filter
    if (filters.complexity.length > 0) {
      result = result.filter(endpoint => endpoint.complexity && filters.complexity.includes(endpoint.complexity));
    }

    // Apply security filter
    if (filters.security.length > 0) {
      result = result.filter(endpoint => {
        if (filters.security.includes('none')) {
          return !endpoint.security || endpoint.security.length === 0;
        }
        return endpoint.security?.some(sec => 
          Object.keys(sec).some(key => filters.security.includes(key))
        );
      });
    }

    // Apply path pattern filter
    if (filters.pathPattern.trim()) {
      const pattern = filters.pathPattern.toLowerCase();
      result = result.filter(endpoint =>
        endpoint.path.toLowerCase().includes(pattern)
      );
    }

    // Apply parameters filter
    if (filters.hasParameters !== null) {
      result = result.filter(endpoint => filters.hasParameters ? endpoint.parameters.length > 0 : endpoint.parameters.length === 0);
    }

    // Apply request body filter
    if (filters.hasRequestBody !== null) {
      result = result.filter(endpoint => endpoint.hasRequestBody === filters.hasRequestBody);
    }

    // Apply response time filter
    if (filters.responseTime.length > 0) {
      result = result.filter(endpoint => endpoint.estimatedResponseTime && filters.responseTime.includes(endpoint.estimatedResponseTime));
    }



    // Apply test cases filter
    if (filters.hasTestCases !== null) {
      result = result.filter(endpoint => filters.hasTestCases ? (endpoint.testCases && endpoint.testCases.length > 0) : (!endpoint.testCases || endpoint.testCases.length === 0));
    }

    // Apply examples filter
    if (filters.hasExamples !== null) {
      const hasExamples = (endpoint: EnhancedEndpointData) => {
        return (endpoint.sampleRequestBodies && endpoint.sampleRequestBodies.length > 0) || 
               (endpoint.sampleResponses && Object.keys(endpoint.sampleResponses).length > 0);
      };
      result = result.filter(endpoint => filters.hasExamples ? hasExamples(endpoint) : !hasExamples(endpoint));
    }

    // Apply breaking changes filter
    if (filters.breaking !== null) {
      result = result.filter(endpoint => filters.breaking ? (endpoint.changeHistory?.some(change => change.breaking)) : (!endpoint.changeHistory?.some(change => change.breaking)));
    }

    // Apply sorting
    result = this.applySorting(result, grouping);

    // Cache the results
    globalCache.setSearchResults(filters, grouping, searchOptions, result);
    
    endTimer();
    return result;
  }

  searchSchemas(searchTerm: string, searchOptions: SearchOptions = {
    fuzzy: true,
    caseSensitive: false,
    includeDescription: true,
    includeTags: false,
    includeParameters: false,
    includeResponseBodies: false,
    includeRequestBodies: false,
    includeTestCases: false,
    includeBusinessContext: true,
    searchDepth: 'deep'
  }) {
    if (!searchTerm.trim()) {
      return this.schemas;
    }

    const term = searchOptions.caseSensitive ? searchTerm : searchTerm.toLowerCase();
    
    return this.schemas.filter(schema => {
      const name = searchOptions.caseSensitive ? schema.name : schema.name.toLowerCase();
      const description = searchOptions.caseSensitive ? (schema.description || '') : (schema.description || '').toLowerCase();
      
      if (searchOptions.fuzzy) {
        return this.fuzzyMatch(name, term) || 
               (searchOptions.includeDescription && this.fuzzyMatch(description, term));
      } else {
        return name.includes(term) || 
               (searchOptions.includeDescription && description.includes(term));
      }
    });
  }

  groupEndpoints(endpoints: EnhancedEndpointData[], groupBy: GroupingState['groupBy']) {
    const endTimer = globalPerformanceMonitor.startTiming('groupEndpoints');
    
    // Check cache first
    const cachedResults = globalCache.getGroupedResults(endpoints, groupBy);
    if (cachedResults) {
      endTimer();
      return cachedResults;
    }
    
    if (groupBy === 'none') {
      const result = { 'All Endpoints': endpoints };
      globalCache.setGroupedResults(endpoints, groupBy, result);
      endTimer();
      return result;
    }

    const groups: { [key: string]: EnhancedEndpointData[] } = {};

    endpoints.forEach(endpoint => {
      let groupKey = 'Other';

      switch (groupBy) {
        case 'tag':
          if (endpoint.tags.length > 0) {
            endpoint.tags.forEach(tag => {
              if (!groups[tag]) groups[tag] = [];
              groups[tag].push(endpoint);
            });
            return;
          }
          groupKey = 'Untagged';
          break;
        case 'method':
          groupKey = endpoint.method;
          break;
        case 'path':
          const pathSegments = endpoint.path.split('/').filter(Boolean);
          groupKey = pathSegments.length > 0 ? `/${pathSegments[0]}` : '/';
          break;
        case 'complexity':
          groupKey = endpoint.complexity ? endpoint.complexity.charAt(0).toUpperCase() + endpoint.complexity.slice(1) : 'Unknown';
          break;
        case 'security':
          if (endpoint.security && endpoint.security.length > 0) {
            const securityTypes = endpoint.security.flatMap(sec => Object.keys(sec));
            groupKey = securityTypes.length > 0 ? securityTypes[0] : 'None';
          } else {
            groupKey = 'None';
          }
          break;
        case 'domain':
          if (endpoint.businessContext) {
            // Extract domain from business context
            const words = endpoint.businessContext.toLowerCase().split(/\s+/);
            const domains = ['user', 'auth', 'payment', 'order', 'product', 'admin', 'notification'];
            const foundDomain = domains.find(domain => words.some(word => word.includes(domain)));
            groupKey = foundDomain ? foundDomain.charAt(0).toUpperCase() + foundDomain.slice(1) : 'General';
          } else {
            groupKey = 'Unknown';
          }
          break;
        case 'status':
          if (endpoint.deprecated) {
            groupKey = 'Deprecated';
          } else if (endpoint.changeHistory?.some(change => change.breaking)) {
            groupKey = 'Breaking Changes';
          } else if (endpoint.testCases && endpoint.testCases.length > 0) {
            groupKey = 'Tested';
          } else {
            groupKey = 'Active';
          }
          break;
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(endpoint);
    });

    // Cache the results
    globalCache.setGroupedResults(endpoints, groupBy, groups);
    
    endTimer();
    return groups;
  }

  private applyTextSearch(endpoints: EnhancedEndpointData[], searchTerm: string, options: SearchOptions): EnhancedEndpointData[] {
    const term = options.caseSensitive ? searchTerm : searchTerm.toLowerCase();
    
    return endpoints.filter(endpoint => {
      const path = options.caseSensitive ? endpoint.path : endpoint.path.toLowerCase();
      const summary = options.caseSensitive ? (endpoint.summary || '') : (endpoint.summary || '').toLowerCase();
      const description = options.caseSensitive ? (endpoint.description || '') : (endpoint.description || '').toLowerCase();
      const tags = endpoint.tags.map(tag => options.caseSensitive ? tag : tag.toLowerCase());
      const parameterNames = endpoint.parameters.map(p => options.caseSensitive ? p.name : p.name.toLowerCase());
      const businessContext = options.caseSensitive ? (endpoint.businessContext || '') : (endpoint.businessContext || '').toLowerCase();
      const operationId = options.caseSensitive ? (endpoint.operationId || '') : (endpoint.operationId || '').toLowerCase();

      // Basic search fields
      let matches = false;
      
      if (options.fuzzy) {
        matches = this.fuzzyMatch(path, term) ||
                 this.fuzzyMatch(summary, term) ||
                 this.fuzzyMatch(operationId, term) ||
                 (options.includeDescription && this.fuzzyMatch(description, term)) ||
                 (options.includeTags && tags.some(tag => this.fuzzyMatch(tag, term))) ||
                 (options.includeParameters && parameterNames.some(param => this.fuzzyMatch(param, term))) ||
                 (options.includeBusinessContext && this.fuzzyMatch(businessContext, term));
      } else {
        matches = path.includes(term) ||
                 summary.includes(term) ||
                 operationId.includes(term) ||
                 (options.includeDescription && description.includes(term)) ||
                 (options.includeTags && tags.some(tag => tag.includes(term))) ||
                 (options.includeParameters && parameterNames.some(param => param.includes(term))) ||
                 (options.includeBusinessContext && businessContext.includes(term));
      }

      // Extended search for comprehensive mode
      if (!matches && options.searchDepth === 'comprehensive') {
        // Search in request body
        if (options.includeRequestBodies && endpoint.requestBody) {
          const requestBodyStr = JSON.stringify(endpoint.requestBody).toLowerCase();
          matches = options.fuzzy ? this.fuzzyMatch(requestBodyStr, term) : requestBodyStr.includes(term);
        }

        // Search in test cases
        if (!matches && options.includeTestCases && endpoint.testCases) {
          endpoint.testCases.forEach(testCase => {
            const testStr = `${testCase.name} ${testCase.description || ''}`.toLowerCase();
            if (options.fuzzy ? this.fuzzyMatch(testStr, term) : testStr.includes(term)) {
              matches = true;
            }
          });
        }

        // Search in AI suggestions
        if (!matches && endpoint.aiSuggestions) {
          endpoint.aiSuggestions.forEach(suggestion => {
            const suggestionStr = suggestion.toLowerCase();
            if (options.fuzzy ? this.fuzzyMatch(suggestionStr, term) : suggestionStr.includes(term)) {
              matches = true;
            }
          });
        }
      }

      return matches;
    });
  }

  private applyResponseBodySearch(endpoints: EnhancedEndpointData[], searchTerm: string, options: SearchOptions): EnhancedEndpointData[] {
    const term = options.caseSensitive ? searchTerm : searchTerm.toLowerCase();
    
    return endpoints.filter(endpoint => {
      // Search in response body content
      if (endpoint.responseBodyContent) {
        const responseContent = options.caseSensitive ? endpoint.responseBodyContent : endpoint.responseBodyContent.toLowerCase();
        if (options.fuzzy ? this.fuzzyMatch(responseContent, term) : responseContent.includes(term)) {
          return true;
        }
      }

      // Search in response schemas
      if (endpoint.responseBodySchemas) {
        for (const [statusCode, schema] of Object.entries(endpoint.responseBodySchemas)) {
          const schemaStr = JSON.stringify(schema).toLowerCase();
          if (options.fuzzy ? this.fuzzyMatch(schemaStr, term) : schemaStr.includes(term)) {
            return true;
          }
        }
      }

      // Search in sample responses
      if (endpoint.sampleResponses) {
        for (const [statusCode, response] of Object.entries(endpoint.sampleResponses)) {
          const responseStr = JSON.stringify(response).toLowerCase();
          if (options.fuzzy ? this.fuzzyMatch(responseStr, term) : responseStr.includes(term)) {
            return true;
          }
        }
      }

      // Search in response descriptions and content types
      if (endpoint.responses) {
        for (const [statusCode, response] of Object.entries(endpoint.responses)) {
          const responseStr = JSON.stringify(response).toLowerCase();
          if (options.fuzzy ? this.fuzzyMatch(responseStr, term) : responseStr.includes(term)) {
            return true;
          }
        }
      }

      return false;
    });
  }

  private applySorting(endpoints: EnhancedEndpointData[], grouping: GroupingState): EnhancedEndpointData[] {
    return [...endpoints].sort((a, b) => {
      let comparison = 0;
      
      switch (grouping.sortBy) {
        case 'path':
          comparison = a.path.localeCompare(b.path);
          break;
        case 'method':
          comparison = a.method.localeCompare(b.method);
          break;
        case 'summary':
          comparison = (a.summary || '').localeCompare(b.summary || '');
          break;
        case 'complexity':
          const complexityOrder = { low: 1, medium: 2, high: 3 };
          comparison = (complexityOrder[a.complexity || 'low'] || 1) - (complexityOrder[b.complexity || 'low'] || 1);
          break;
        case 'responseTime':
          const timeOrder = { fast: 1, medium: 2, slow: 3 };
          comparison = (timeOrder[a.estimatedResponseTime || 'medium'] || 2) - (timeOrder[b.estimatedResponseTime || 'medium'] || 2);
          break;
        case 'lastModified':
          const aDate = a.changeHistory?.[0]?.date || '1970-01-01';
          const bDate = b.changeHistory?.[0]?.date || '1970-01-01';
          comparison = new Date(aDate).getTime() - new Date(bDate).getTime();
          break;
        case 'usage':
          const aUsage = a.performanceMetrics?.successRate || 0;
          const bUsage = b.performanceMetrics?.successRate || 0;
          comparison = aUsage - bUsage;
          break;
        default:
          comparison = a.path.localeCompare(b.path);
      }
      
      return grouping.sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  private fuzzyMatch(text: string, pattern: string): boolean {
    if (!pattern) return true;
    if (!text) return false;
    
    const textLower = text.toLowerCase();
    const patternLower = pattern.toLowerCase();
    
    // Simple fuzzy matching - check if all characters in pattern exist in order in text
    let patternIndex = 0;
    for (let i = 0; i < textLower.length && patternIndex < patternLower.length; i++) {
      if (textLower[i] === patternLower[patternIndex]) {
        patternIndex++;
      }
    }
    
    return patternIndex === patternLower.length;
  }

  getAvailableTags(): string[] {
    const tags = new Set<string>();
    this.endpoints.forEach(endpoint => {
      endpoint.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }

  getAvailableMethods(): string[] {
    const methods = new Set<string>();
    this.endpoints.forEach(endpoint => {
      methods.add(endpoint.method);
    });
    return Array.from(methods).sort();
  }

  getAvailableStatusCodes(): string[] {
    const codes = new Set<string>();
    this.endpoints.forEach(endpoint => {
      Object.keys(endpoint.responses).forEach(code => codes.add(code));
    });
    return Array.from(codes).sort();
  }

  getSecuritySchemes(): string[] {
    const schemes = new Set<string>();
    this.endpoints.forEach(endpoint => {
      endpoint.security?.forEach(sec => {
        Object.keys(sec).forEach(key => schemes.add(key));
      });
    });
    return Array.from(schemes).sort();
  }



  // New utility methods for enhanced search
  searchByComplexity(complexity: 'low' | 'medium' | 'high'): EnhancedEndpointData[] {
    return this.endpoints.filter(endpoint => endpoint.complexity === complexity);
  }

  searchByPerformance(threshold: number): EnhancedEndpointData[] {
    return this.endpoints.filter(endpoint => 
      endpoint.performanceMetrics?.averageResponseTime && 
      endpoint.performanceMetrics.averageResponseTime <= threshold
    );
  }

  searchByTestCoverage(): { tested: EnhancedEndpointData[], untested: EnhancedEndpointData[] } {
    const tested = this.endpoints.filter(endpoint => endpoint.testCases && endpoint.testCases.length > 0);
    const untested = this.endpoints.filter(endpoint => !endpoint.testCases || endpoint.testCases.length === 0);
    return { tested, untested };
  }

  searchRelatedEndpoints(endpointId: string): EnhancedEndpointData[] {
    const endpoint = this.endpoints.find(e => e.id === endpointId);
    if (!endpoint || !endpoint.relatedEndpoints) {
      return [];
    }
    
    return this.endpoints.filter(e => endpoint.relatedEndpoints!.includes(e.id));
  }
} 