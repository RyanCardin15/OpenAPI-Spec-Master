import { useMemo, useCallback, useState, useEffect } from 'react';
import { EndpointData, FilterState, GroupingState } from '../types/openapi';
import { useWorkerManager } from '../utils/worker-manager';

const WORKER_THRESHOLD = 100;

export function useAdvancedSearchWithWorkers(
  endpoints: EndpointData[], 
  filters: FilterState,
  grouping: GroupingState
) {
  const workerManager = useWorkerManager();
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState<{ progress: number; message: string } | null>(null);

  const shouldUseWorkers = useMemo(() => {
    return endpoints.length >= WORKER_THRESHOLD;
  }, [endpoints.length]);

  const performFastSearch = useCallback((searchQuery: string): EndpointData[] => {
    if (!searchQuery.trim()) return endpoints;
    
    const query = searchQuery.toLowerCase();
    return endpoints.filter(endpoint => {
      return (
        endpoint.path.toLowerCase().includes(query) ||
        endpoint.summary?.toLowerCase().includes(query) ||
        endpoint.description?.toLowerCase().includes(query) ||
        endpoint.tags.some(tag => tag.toLowerCase().includes(query)) ||
        endpoint.businessContext?.toLowerCase().includes(query)
      );
    });
  }, [endpoints]);

  const performWorkerSearch = useCallback(async (searchQuery: string): Promise<EndpointData[]> => {
    if (!searchQuery.trim()) return endpoints;
    
    setIsSearching(true);
    setSearchProgress({ progress: 0, message: 'Initializing search...' });
    
    try {
      const results = await workerManager.fuzzySearch(
        endpoints,
        searchQuery,
        {
          threshold: 0.4,
          keys: ['path', 'summary', 'description', 'tags', 'businessContext'],
          maxResults: 1000
        },
        (progress: number, message?: string) => {
          setSearchProgress({ progress, message: message || 'Searching...' });
        }
      );
      
      return results;
    } finally {
      setIsSearching(false);
      setSearchProgress(null);
    }
  }, [endpoints, workerManager.fuzzySearch]);

  const performFastFilter = useCallback((baseEndpoints: EndpointData[]): EndpointData[] => {
    let result = baseEndpoints;

    if (filters.methods.length > 0) {
      result = result.filter(endpoint => filters.methods.includes(endpoint.method));
    }

    if (filters.tags.length > 0) {
      result = result.filter(endpoint =>
        endpoint.tags.some(tag => filters.tags.includes(tag))
      );
    }

    if (filters.statusCodes.length > 0) {
      result = result.filter(endpoint =>
        Object.keys(endpoint.responses).some(code => filters.statusCodes.includes(code))
      );
    }

    if (filters.deprecated !== null) {
      result = result.filter(endpoint => endpoint.deprecated === filters.deprecated);
    }

    if (filters.complexity.length > 0) {
      result = result.filter(endpoint =>
        endpoint.complexity && filters.complexity.includes(endpoint.complexity)
      );
    }

    if (filters.pathPattern.trim()) {
      const pattern = filters.pathPattern.toLowerCase();
      result = result.filter(endpoint =>
        endpoint.path.toLowerCase().includes(pattern)
      );
    }

    return result;
  }, [
    filters.methods,
    filters.tags,
    filters.statusCodes,
    filters.deprecated,
    filters.complexity,
    filters.pathPattern
  ]);

  const [filteredEndpoints, setFilteredEndpoints] = useState<EndpointData[]>([]);
  const [groupedEndpoints, setGroupedEndpoints] = useState<{ [key: string]: EndpointData[] }>({});

  const processData = useCallback(async () => {
    try {
      let searchResults: EndpointData[];
      if (shouldUseWorkers && filters.search.trim()) {
        searchResults = await performWorkerSearch(filters.search);
      } else {
        searchResults = performFastSearch(filters.search);
      }

      const filteredResults = performFastFilter(searchResults);
      
      // Simple grouping
      const groups: { [key: string]: EndpointData[] } = {};
      if (grouping.groupBy === 'none') {
        groups['All Endpoints'] = filteredResults;
      } else {
        filteredResults.forEach(endpoint => {
          let groupKey = 'Other';
          switch (grouping.groupBy) {
            case 'tag':
              groupKey = endpoint.tags.length > 0 ? endpoint.tags[0] : 'Untagged';
              break;
            case 'method':
              groupKey = endpoint.method;
              break;
            case 'path':
              const pathSegments = endpoint.path.split('/').filter(Boolean);
              groupKey = pathSegments.length > 0 ? `/${pathSegments[0]}` : '/';
              break;
          }
          
          if (!groups[groupKey]) groups[groupKey] = [];
          groups[groupKey].push(endpoint);
        });
      }

      setFilteredEndpoints(filteredResults);
      setGroupedEndpoints(groups);
    } catch (error) {
      console.error('Error processing search data:', error);
      const searchResults = performFastSearch(filters.search);
      const filteredResults = performFastFilter(searchResults);
      
      setFilteredEndpoints(filteredResults);
      setGroupedEndpoints({ 'All Endpoints': filteredResults });
    }
  }, [
    shouldUseWorkers,
    filters.search,
    grouping.groupBy,
    performWorkerSearch,
    performFastSearch,
    performFastFilter
  ]);

  useEffect(() => {
    processData();
  }, [processData]);

  return {
    filteredEndpoints,
    groupedEndpoints,
    totalFiltered: filteredEndpoints.length,
    isSearching,
    searchProgress,
    shouldUseWorkers
  };
} 