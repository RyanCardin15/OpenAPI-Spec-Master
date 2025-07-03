import { useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { EndpointData, FilterState, GroupingState } from '../types/openapi';
import { useAdvancedCache, globalCaches, cacheKeys } from '../utils/cache-manager';

export function useAdvancedSearch(
  endpoints: EndpointData[], 
  filters: FilterState,
  grouping: GroupingState
) {
  // Initialize caching for different data types
  const searchCache = useAdvancedCache('search');
  const filterCache = useAdvancedCache('filter');
  const groupingCache = useAdvancedCache('grouping');

  // Memoized Fuse instance with cache invalidation
  const fuse = useMemo(() => {
    // Clear search cache when endpoints change
    searchCache.clear();
    
    return new Fuse(endpoints, {
      keys: [
        { name: 'path', weight: 0.3 },
        { name: 'summary', weight: 0.3 },
        { name: 'description', weight: 0.2 },
        { name: 'tags', weight: 0.1 },
        { name: 'businessContext', weight: 0.1 }
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true // Include match information for better caching
    });
  }, [endpoints, searchCache]);

  // Cached search function
  const performSearch = useCallback((searchQuery: string): EndpointData[] => {
    if (!searchQuery.trim()) return endpoints;
    
    const cacheKey = cacheKeys.search(searchQuery, {});
    
    // Check cache first
    const cached = searchCache.get<EndpointData[]>(cacheKey);
    if (cached) return cached;
    
    // Perform search
    const searchResults = fuse.search(searchQuery);
    const result = searchResults.map(item => item.item);
    
    // Cache results with dependencies
    searchCache.set(cacheKey, result, {
      ttl: 300000, // 5 minutes
      dependencies: ['endpoints']
    });
    
    return result;
  }, [endpoints, fuse, searchCache]);

  // Cached filtering function
  const applyFilters = useCallback((baseEndpoints: EndpointData[]): EndpointData[] => {
    // Create cache key from filters
    const filterKey = cacheKeys.filter(baseEndpoints, filters);
    
    // Check cache first
    const cached = filterCache.get<EndpointData[]>(filterKey);
    if (cached) return cached;
    
    // Start with base endpoints
    let result = baseEndpoints;

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

    // Cache the filtered results
    filterCache.set(filterKey, result, {
      ttl: 600000, // 10 minutes
      dependencies: ['endpoints', 'filters']
    });

    return result;
  }, [filters, filterCache]);

  const filteredEndpoints = useMemo(() => {
    // Invalidate caches when endpoints change
    if (endpoints.length > 0) {
      filterCache.invalidate('endpoints');
      groupingCache.invalidate('endpoints');
    }

    // First apply search, then apply filters
    const searchResults = performSearch(filters.search);
    return applyFilters(searchResults);
  }, [endpoints, filters, performSearch, applyFilters, filterCache, groupingCache]);

  // Cached sorting function
  const sortEndpoints = useCallback((endpointsToSort: EndpointData[]): EndpointData[] => {
    const sortKey = `sort:${grouping.sortBy}:${grouping.sortOrder}:${endpointsToSort.length}`;
    
    // Check cache first
    const cached = groupingCache.get<EndpointData[]>(sortKey);
    if (cached) return cached;

    const sorted = [...endpointsToSort].sort((a, b) => {
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

    // Cache sorted results
    groupingCache.set(sortKey, sorted, {
      ttl: 300000, // 5 minutes
      dependencies: ['sorting', 'endpoints']
    });

    return sorted;
  }, [grouping, groupingCache]);

  const sortedEndpoints = useMemo(() => {
    return sortEndpoints(filteredEndpoints);
  }, [filteredEndpoints, sortEndpoints]);

  // Cached grouping function  
  const groupEndpoints = useCallback((endpointsToGroup: EndpointData[]): { [key: string]: EndpointData[] } => {
    const groupKey = `group:${grouping.groupBy}:${endpointsToGroup.length}`;
    
    // Check cache first
    const cached = groupingCache.get<{ [key: string]: EndpointData[] }>(groupKey);
    if (cached) return cached;

    if (grouping.groupBy === 'none') {
      const result = { 'All Endpoints': endpointsToGroup };
      groupingCache.set(groupKey, result, {
        ttl: 300000, // 5 minutes
        dependencies: ['grouping', 'endpoints']
      });
      return result;
    }

    const groups: { [key: string]: EndpointData[] } = {};

    endpointsToGroup.forEach(endpoint => {
      let groupKeyName = 'Other';

      switch (grouping.groupBy) {
        case 'tag':
          if (endpoint.tags.length > 0) {
            endpoint.tags.forEach(tag => {
              if (!groups[tag]) groups[tag] = [];
              groups[tag].push(endpoint);
            });
            return;
          }
          groupKeyName = 'Untagged';
          break;
        case 'method':
          groupKeyName = endpoint.method;
          break;
        case 'path':
          const pathSegments = endpoint.path.split('/').filter(Boolean);
          groupKeyName = pathSegments.length > 0 ? `/${pathSegments[0]}` : '/';
          break;
        case 'complexity':
          groupKeyName = endpoint.complexity ? endpoint.complexity.charAt(0).toUpperCase() + endpoint.complexity.slice(1) : 'Unknown';
          break;
        case 'security':
          if (endpoint.security && endpoint.security.length > 0) {
            const securityTypes = endpoint.security.flatMap(sec => Object.keys(sec));
            groupKeyName = securityTypes.length > 0 ? securityTypes[0] : 'None';
          } else {
            groupKeyName = 'None';
          }
          break;
      }

      if (!groups[groupKeyName]) groups[groupKeyName] = [];
      groups[groupKeyName].push(endpoint);
    });

    // Cache grouped results
    groupingCache.set(groupKey, groups, {
      ttl: 300000, // 5 minutes
      dependencies: ['grouping', 'endpoints']
    });

    return groups;
  }, [grouping, groupingCache]);

  const groupedEndpoints = useMemo(() => {
    return groupEndpoints(sortedEndpoints);
  }, [sortedEndpoints, groupEndpoints]);

  return {
    filteredEndpoints: sortedEndpoints,
    groupedEndpoints,
    totalFiltered: sortedEndpoints.length
  };
}