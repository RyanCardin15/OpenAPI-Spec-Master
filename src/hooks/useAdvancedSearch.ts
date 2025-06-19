import { useMemo } from 'react';
import Fuse from 'fuse.js';
import { EndpointData, FilterState, GroupingState } from '../types/openapi';

export function useAdvancedSearch(
  endpoints: EndpointData[], 
  filters: FilterState,
  grouping: GroupingState
) {
  const fuse = useMemo(() => {
    return new Fuse(endpoints, {
      keys: [
        { name: 'path', weight: 0.3 },
        { name: 'summary', weight: 0.3 },
        { name: 'description', weight: 0.2 },
        { name: 'tags', weight: 0.1 },
        { name: 'businessContext', weight: 0.1 }
      ],
      threshold: 0.4,
      includeScore: true
    });
  }, [endpoints]);

  const filteredEndpoints = useMemo(() => {
    let result = endpoints;

    // Apply search filter
    if (filters.search.trim()) {
      const searchResults = fuse.search(filters.search);
      result = searchResults.map(item => item.item);
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

    return result;
  }, [endpoints, filters, fuse]);

  const sortedEndpoints = useMemo(() => {
    const sorted = [...filteredEndpoints].sort((a, b) => {
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

    return sorted;
  }, [filteredEndpoints, grouping]);

  const groupedEndpoints = useMemo(() => {
    if (grouping.groupBy === 'none') {
      return { 'All Endpoints': sortedEndpoints };
    }

    const groups: { [key: string]: EndpointData[] } = {};

    sortedEndpoints.forEach(endpoint => {
      let groupKey = 'Other';

      switch (grouping.groupBy) {
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
  }, [sortedEndpoints, grouping]);

  return {
    filteredEndpoints: sortedEndpoints,
    groupedEndpoints,
    totalFiltered: sortedEndpoints.length
  };
}