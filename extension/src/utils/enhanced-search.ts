import { EnhancedEndpointData, EnhancedSchema, FilterState, GroupingState, SearchOptions } from '../types/enhanced-spec';

export class EnhancedSearch {
  private endpoints: EnhancedEndpointData[] = [];
  private schemas: EnhancedSchema[] = [];

  constructor(endpoints: EnhancedEndpointData[] = [], schemas: EnhancedSchema[] = []) {
    this.endpoints = endpoints;
    this.schemas = schemas;
  }

  updateData(endpoints: EnhancedEndpointData[], schemas: EnhancedSchema[]) {
    this.endpoints = endpoints;
    this.schemas = schemas;
  }

  searchEndpoints(filters: FilterState, grouping: GroupingState, searchOptions: SearchOptions = {
    fuzzy: true,
    caseSensitive: false,
    includeDescription: true,
    includeTags: true,
    includeParameters: true
  }) {
    let result = [...this.endpoints];

    // Apply search filter
    if (filters.search.trim()) {
      result = this.applyTextSearch(result, filters.search, searchOptions);
    }

    // Apply method filter
    if (filters.methods.length > 0) {
      result = result.filter(endpoint => 
        filters.methods.includes(endpoint.method)
      );
    }

    // Apply tag filter
    if (filters.tags.length > 0) {
      result = result.filter(endpoint =>
        endpoint.tags.some(tag => filters.tags.includes(tag))
      );
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
      result = result.filter(endpoint => 
        endpoint.deprecated === filters.deprecated
      );
    }

    // Apply complexity filter
    if (filters.complexity.length > 0) {
      result = result.filter(endpoint =>
        endpoint.complexity && filters.complexity.includes(endpoint.complexity)
      );
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
      result = result.filter(endpoint => {
        const hasParams = endpoint.parameters.length > 0 || endpoint.hasPathParams || endpoint.hasQueryParams;
        return hasParams === filters.hasParameters;
      });
    }

    // Apply request body filter
    if (filters.hasRequestBody !== null) {
      result = result.filter(endpoint => {
        const hasBody = !!endpoint.requestBody || endpoint.hasRequestBody;
        return hasBody === filters.hasRequestBody;
      });
    }

    // Apply response time filter
    if (filters.responseTime.length > 0) {
      result = result.filter(endpoint =>
        endpoint.estimatedResponseTime && filters.responseTime.includes(endpoint.estimatedResponseTime)
      );
    }

    // Apply sorting
    result = this.applySorting(result, grouping);

    return result;
  }

  searchSchemas(searchTerm: string, searchOptions: SearchOptions = {
    fuzzy: true,
    caseSensitive: false,
    includeDescription: true,
    includeTags: false,
    includeParameters: false
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
    if (groupBy === 'none') {
      return { 'All Endpoints': endpoints };
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
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(endpoint);
    });

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

      if (options.fuzzy) {
        return this.fuzzyMatch(path, term) ||
               this.fuzzyMatch(summary, term) ||
               (options.includeDescription && this.fuzzyMatch(description, term)) ||
               (options.includeTags && tags.some(tag => this.fuzzyMatch(tag, term))) ||
               (options.includeParameters && parameterNames.some(param => this.fuzzyMatch(param, term)));
      } else {
        return path.includes(term) ||
               summary.includes(term) ||
               (options.includeDescription && description.includes(term)) ||
               (options.includeTags && tags.some(tag => tag.includes(term))) ||
               (options.includeParameters && parameterNames.some(param => param.includes(term)));
      }
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
} 