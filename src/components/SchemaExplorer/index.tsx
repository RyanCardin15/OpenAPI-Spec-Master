import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  Database, 
  Search, 
  Code, 
  GitBranch, 
  Eye, 
  Copy, 
  CheckCircle, 
  ChevronDown, 
  ChevronRight,
  ChevronLeft,
  Hash,
  Type,
  FileText,
  Shuffle,
  Download,
  Filter,
  SortAsc,
  SortDesc,
  X,
  ArrowUpDown,
  Network,
  List,
  Edit3,
  Save,
  AlertTriangle,
  Info,
  TrendingUp,
  Zap,
  BookOpen,
  Settings,
  RefreshCw,
  Share2,
  Star,
  Tag,
  Clock,
  BarChart3,
  Layers,
  GitCompare,
  Brain,
  Wand2,
  FileCheck,
  PlusCircle,
  MinusCircle,
  RotateCcw,
  Maximize2,
  Minimize2,
  ExternalLink,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import { OpenAPISpec } from '../../types/openapi';
import { DependencyTreeVisualization } from '../DependencyTreeVisualization';
import { useVirtualScroll } from '../../hooks/useVirtualScroll';
import {
  SchemaExplorerProps,
  PropertyResult,
  SchemaMetrics,
  ValidationIssue,
  TabType,
  ViewMode,
} from './types';
import { isSchemaReference, resolveSchemaReference } from './utils';
import { useSchemaData } from './hooks/useSchemaData';
import { useSchemaValidation } from './hooks/useSchemaValidation';
import { useSchemaActions } from './hooks/useSchemaActions';
import { Header } from './components/Header';
import { OverviewTab } from './tabs/OverviewTab';
import { ExplorerTab } from './tabs/ExplorerTab';
import { ValidationTab } from './tabs/ValidationTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';
import { DocsTab } from './tabs/DocsTab';
import { RelationshipsTab } from './tabs/RelationshipsTab';
import { TestingTab } from './tabs/TestingTab';

interface FilterState {
  searchQuery: string;
  propertySearch: string;
  semanticSearch: string;
  type: string;
  complexity: string;
  propertyType: string[];
  required: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export const SchemaExplorer: React.FC<SchemaExplorerProps> = ({ spec, allSpecs = [], isOpen, onClose }) => {
  // Core state
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  
  // Filter and search state
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    propertySearch: '',
    semanticSearch: '',
    type: 'all',
    complexity: 'all',
    propertyType: [],
    required: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  
  // UI state
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [isMaximized, setIsMaximized] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Editor state
  const [editingSchema, setEditingSchema] = useState<string | null>(null);
  const [editedCode, setEditedCode] = useState('');
  const [localSpec, setLocalSpec] = useState<OpenAPISpec | null>(spec);

  const showCompareTab = allSpecs && allSpecs.length > 1;

  const { schemas, schemaNames, findSchemaDependencies } = useSchemaData(localSpec);
  const {
    copiedText,
    selectedSchemas,
    copyToClipboard,
    toggleSchemaSelection,
    setSelectedSchemas,
  } = useSchemaActions();

  const handleSelectSchema = useCallback((schemaName: string) => {
    setSelectedSchema(schemaName);
    setActiveTab('explorer');
  }, []);

  const containerClasses = `fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-0 md:p-4 ${isMaximized ? 'p-0' : ''}`;
  const modalClasses = `bg-white dark:bg-gray-800 md:rounded-xl shadow-2xl flex flex-col ${
    isMaximized ? 'w-full h-full rounded-none' : 'w-full h-full md:w-full md:max-w-7xl md:h-[95vh]'
  }`;

  const AdvancedFilterControls = () => (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select
          value={filters.sortBy}
          onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
          className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-600"
        >
          <option value="name">Sort by Name</option>
          <option value="complexity">Sort by Complexity</option>
          <option value="usage">Sort by Usage</option>
          <option value="dependencies">Sort by Dependencies</option>
        </select>
        <button
          onClick={() => setFilters({ ...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          {filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  // Performance state
  const searchRef = useRef<HTMLInputElement>(null);
  const virtualizationEnabled = useMemo(() => {
    return schemaNames.length > 100;
  }, [schemaNames]);

  const calculateMetrics = useCallback((schemaName: string, schema: any): SchemaMetrics => {
      const resolvedSchema = resolveSchemaReference(schema, schemas);
      
      const calculateComplexity = (obj: any, depth = 0): { complexity: number; maxDepth: number; propCount: number } => {
        if (!obj || typeof obj !== 'object' || depth > 10) return { complexity: 0, maxDepth: depth, propCount: 0 };
        
        let complexity = 0;
        let maxDepth = depth;
        let propCount = 0;
        
        if (obj.properties) {
          propCount = Object.keys(obj.properties).length;
          complexity += propCount;
          
          Object.values(obj.properties).forEach((prop: any) => {
            const resolvedProp = resolveSchemaReference(prop, schemas);
            const result = calculateComplexity(resolvedProp, depth + 1);
            complexity += result.complexity;
            maxDepth = Math.max(maxDepth, result.maxDepth);
            propCount += result.propCount;
          });
        }
        
        if (obj.items) {
          const resolvedItems = resolveSchemaReference(obj.items, schemas);
          const result = calculateComplexity(resolvedItems, depth + 1);
          complexity += result.complexity;
          maxDepth = Math.max(maxDepth, result.maxDepth);
          propCount += result.propCount;
        }
        
        if (obj.allOf || obj.oneOf || obj.anyOf) {
          complexity += 5; // Polymorphism adds complexity
        }
        
        return { complexity, maxDepth, propCount };
      };
      
      const { complexity, maxDepth, propCount } = calculateComplexity(resolvedSchema);
      const requiredCount = resolvedSchema.required?.length || 0;
      const dependencies = findSchemaDependencies.get(schemaName)?.length || 0;
      
      // Detect circular references
      const visited = new Set<string>();
      const checkCircular = (currentSchema: string): boolean => {
        if (visited.has(currentSchema)) return true;
        visited.add(currentSchema);
        
        const deps = findSchemaDependencies.get(currentSchema) || [];
        return deps.some(dep => checkCircular(dep));
      };
      
      return {
        complexity,
        depth: maxDepth,
        propertyCount: propCount,
        requiredCount,
        dependencyCount: dependencies,
        circularRefs: checkCircular(schemaName),
        usage: Math.floor(Math.random() * 100), // Mock usage data
        lastModified: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      };
  }, [schemas, findSchemaDependencies]);

  // Enhanced schema analysis with metrics - now uses findSchemaDependencies
  const schemaMetrics = useMemo((): Map<string, SchemaMetrics> => {
    const metrics = new Map<string, SchemaMetrics>();
    
    Object.entries(schemas).forEach(([name, schema]) => {
      metrics.set(name, calculateMetrics(name, schema));
    });
    
    return metrics;
  }, [schemas, calculateMetrics]);

  const { validateSingleSchema, getValidationSummary } = useSchemaValidation(localSpec, schemas, schemaMetrics);

  // Enhanced property search with semantic capabilities
  const searchProperties = useMemo((): PropertyResult[] => {
    const results: PropertyResult[] = [];
    
    const searchInSchema = (schemaName: string, schema: any, path = '') => {
      if (!schema || typeof schema !== 'object') return;
      
      const resolvedSchema = resolveSchemaReference(schema, schemas);
      
      if (
        filters.propertyType.length > 0 &&
        !filters.propertyType.includes(resolvedSchema.type)
      ) {
        return;
      }
      
      if (resolvedSchema.properties) {
        Object.entries(resolvedSchema.properties).forEach(([propName, propSchema]: [string, any]) => {
          const currentPath = path ? `${path}.${propName}` : propName;
          const isRequired = resolvedSchema.required?.includes(propName) || false;
          const resolvedProp = resolveSchemaReference(propSchema, schemas);
          
          results.push({
            schema: schemaName,
            property: propName,
            type: resolvedProp.type || 'unknown',
            path: currentPath,
            required: isRequired,
            description: resolvedProp.description,
            format: resolvedProp.format,
            enum: resolvedProp.enum,
            example: resolvedProp.example,
            deprecated: resolvedProp.deprecated,
            readOnly: resolvedProp.readOnly,
            writeOnly: resolvedProp.writeOnly
          });
          
          // Recursively search nested objects
          if (resolvedProp.type === 'object' || resolvedProp.properties) {
            searchInSchema(schemaName, resolvedProp, currentPath);
          }
        });
      }
    };
    
    Object.entries(schemas).forEach(([schemaName, schema]) => {
      searchInSchema(schemaName, schema);
    });
    
    return results;
  }, [schemas, filters.propertyType]);

  // This is a complex memo that filters and sorts schemas based on multiple criteria
  const filteredAndSortedSchemas = useMemo(() => {
    let filtered = [...schemaNames];

    // Apply search filters
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(name => {
        const schema = schemas[name];
        if (!schema) return false;
        
        return (
          name.toLowerCase().includes(query) ||
          (schema.title && schema.title.toLowerCase().includes(query)) ||
          (schema.description && schema.description.toLowerCase().includes(query))
        );
      });
    }

    // Apply complexity filter
    if (filters.complexity !== 'all') {
      filtered = filtered.filter(name => {
        const metrics = schemaMetrics.get(name);
        if (!metrics) return false;
        
        switch (filters.complexity) {
          case 'low': return metrics.complexity <= 10;
          case 'medium': return metrics.complexity > 10 && metrics.complexity <= 50;
          case 'high': return metrics.complexity > 50;
          default: return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const metricsA = schemaMetrics.get(a);
      const metricsB = schemaMetrics.get(b);
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'name':
          comparison = a.localeCompare(b);
          break;
        case 'complexity':
          comparison = (metricsA?.complexity || 0) - (metricsB?.complexity || 0);
          break;
        case 'usage':
          comparison = (metricsA?.usage || 0) - (metricsB?.usage || 0);
          break;
        case 'dependencies':
          comparison = (metricsA?.dependencyCount || 0) - (metricsB?.dependencyCount || 0);
          break;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [schemaNames, filters.searchQuery, filters.complexity, filters.sortBy, filters.sortOrder, schemaMetrics, schemas]);

  const {
    scrollElementRef,
    visibleItems: visibleSchemas,
    totalHeight,
  } = useVirtualScroll(filteredAndSortedSchemas, {
    itemHeight: 84, // Approximate height of a schema item (p-3 + gap-2 etc)
    containerHeight: 600, // This should be the height of the scrollable container
    overscan: 5,
  });

  // AI-powered insights
  const generateAIInsights = useCallback((schemaName: string) => {
    const schema = schemas[schemaName];
    const resolvedSchema = resolveSchemaReference(schema, schemas);
    const metrics = schemaMetrics.get(schemaName);
    const insights: string[] = [];
    
    if (metrics?.complexity && metrics.complexity > 50) {
      insights.push("Consider breaking this schema into smaller, more focused schemas for better maintainability");
    }
    
    if (metrics?.circularRefs) {
      insights.push("Circular dependencies detected - consider using references or restructuring");
    }
    
    if (metrics?.propertyCount && metrics.propertyCount > 20) {
      insights.push("Large number of properties - consider grouping related fields into nested objects");
    }
    
    if (!resolvedSchema.description) {
      insights.push("Adding a comprehensive description would improve API documentation");
    }
    
    return insights;
  }, [schemas, schemaMetrics]);

  // Schema comparison functionality
  const compareSchemas = useCallback((schemaNames: string[]) => {
    const comparisons: Array<{
      name: string;
      schema: any;
      metrics: SchemaMetrics | undefined;
      properties: PropertyResult[];
      differences: string[];
    }> = [];

    schemaNames.forEach(name => {
      const schema = schemas[name];
      const resolvedSchema = resolveSchemaReference(schema, schemas);
      const metrics = schemaMetrics.get(name);
      const properties = searchProperties.filter(prop => prop.schema === name);
      
      // Find differences compared to first schema
      const differences: string[] = [];
      if (comparisons.length > 0) {
        const baseSchema = comparisons[0];
        
        // Compare property counts
        if (properties.length !== baseSchema.properties.length) {
          differences.push(`Property count differs: ${properties.length} vs ${baseSchema.properties.length}`);
        }
        
        // Compare complexity
        if (metrics && baseSchema.metrics) {
          if (Math.abs(metrics.complexity - baseSchema.metrics.complexity) > 10) {
            differences.push(`Complexity differs significantly: ${metrics.complexity} vs ${baseSchema.metrics.complexity}`);
          }
        }
        
        // Compare required fields
        const requiredFields = properties.filter(p => p.required).map(p => p.property);
        const baseRequiredFields = baseSchema.properties.filter(p => p.required).map(p => p.property);
        const missingRequired = baseRequiredFields.filter(f => !requiredFields.includes(f));
        const extraRequired = requiredFields.filter(f => !baseRequiredFields.includes(f));
        
        if (missingRequired.length > 0) {
          differences.push(`Missing required fields: ${missingRequired.join(', ')}`);
        }
        if (extraRequired.length > 0) {
          differences.push(`Extra required fields: ${extraRequired.join(', ')}`);
        }
        
        // Compare property types
        const typeDifferences = properties.filter(prop => {
          const baseProp = baseSchema.properties.find(bp => bp.property === prop.property);
          return baseProp && baseProp.type !== prop.type;
        });
        
        if (typeDifferences.length > 0) {
          differences.push(`Type differences in: ${typeDifferences.map(d => d.property).join(', ')}`);
        }
      }
      
      comparisons.push({
        name,
        schema: resolvedSchema,
        metrics,
        properties,
        differences
      });
    });

    return comparisons;
  }, [schemas, schemaMetrics, searchProperties]);

  // Generate compatibility score between schemas
  const calculateCompatibilityScore = useCallback((schema1: string, schema2: string): number => {
    const props1 = searchProperties.filter(p => p.schema === schema1);
    const props2 = searchProperties.filter(p => p.schema === schema2);
    
    const props1Names = new Set(props1.map(p => p.property));
    const props2Names = new Set(props2.map(p => p.property));
    
    const intersection = [...props1Names].filter(name => props2Names.has(name));
    const union = new Set([...props1Names, ...props2Names]);
    
    const jaccard = intersection.length / union.size;
    
    // Check type compatibility for common properties
    let typeMatches = 0;
    intersection.forEach(propName => {
      const prop1 = props1.find(p => p.property === propName);
      const prop2 = props2.find(p => p.property === propName);
      if (prop1 && prop2 && prop1.type === prop2.type) {
        typeMatches++;
      }
    });
    
    const typeCompatibility = intersection.length > 0 ? typeMatches / intersection.length : 1;
    
    return Math.round((jaccard * 0.6 + typeCompatibility * 0.4) * 100);
  }, [searchProperties]);

  // Utility functions

  const generateMockData = useCallback((schema: any): any => {
    if (!schema || typeof schema !== 'object') return null;

    const resolvedSchema = resolveSchemaReference(schema, schemas);

    switch (resolvedSchema.type) {
      case 'object':
        const obj: any = {};
        if (resolvedSchema.properties) {
          Object.entries(resolvedSchema.properties).forEach(([key, prop]: [string, any]) => {
            const resolvedProp = resolveSchemaReference(prop, schemas);
            if (!resolvedProp.writeOnly) {
              obj[key] = generateMockData(resolvedProp);
            }
          });
        }
        return obj;
      case 'array':
        const items = resolvedSchema.items ? resolveSchemaReference(resolvedSchema.items, schemas) : null;
        return items ? [generateMockData(items), generateMockData(items)] : [];
      case 'string':
        if (resolvedSchema.format === 'email') return 'user@example.com';
        if (resolvedSchema.format === 'date') return '2024-01-01';
        if (resolvedSchema.format === 'date-time') return '2024-01-01T00:00:00Z';
        if (resolvedSchema.format === 'uuid') return '123e4567-e89b-12d3-a456-426614174000';
        if (resolvedSchema.format === 'uri') return 'https://api.example.com';
        if (resolvedSchema.enum) return resolvedSchema.enum[Math.floor(Math.random() * resolvedSchema.enum.length)];
        return resolvedSchema.example || `sample_${resolvedSchema.format || 'string'}`;
      case 'number':
      case 'integer':
        if (resolvedSchema.minimum !== undefined && resolvedSchema.maximum !== undefined) {
          return Math.floor(Math.random() * (resolvedSchema.maximum - resolvedSchema.minimum + 1)) + resolvedSchema.minimum;
        }
        return resolvedSchema.example || Math.floor(Math.random() * 100);
      case 'boolean':
        return resolvedSchema.example !== undefined ? resolvedSchema.example : Math.random() > 0.5;
      default:
        return resolvedSchema.example || null;
    }
  }, [schemas]);

  // Tab definitions with enhanced features
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Database, description: 'Schema summary and quick stats' },
    { id: 'explorer', label: 'Explorer', icon: Search, description: 'Browse and search schemas' },
    { id: 'validation', label: 'Validation', icon: FileCheck, description: 'Validate schemas and find issues' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Schema metrics and insights' },
    { id: 'relationships', label: 'Relations', icon: Network, description: 'Dependency visualization' },
    { id: 'docs', label: 'Docs', icon: BookOpen, description: 'Generate documentation' },
    { id: 'testing', label: 'Testing', icon: Zap, description: 'Test and mock data generation' }
  ];

  // Analytics dashboard data
  const getAnalyticsData = useCallback(() => {
    const analytics = {
      overview: {
        totalSchemas: schemaNames.length,
        averageComplexity: 0,
        totalProperties: 0,
        totalDependencies: 0,
        circularRefs: 0,
        deprecatedSchemas: 0
      },
      complexity: {
        distribution: { low: 0, medium: 0, high: 0, extreme: 0 },
        trend: Array.from(schemaMetrics.entries()).map(([name, metrics]) => ({
          name: name.length > 15 ? name.substring(0, 12) + '...' : name,
          complexity: metrics.complexity,
          properties: metrics.propertyCount
        })).sort((a, b) => b.complexity - a.complexity).slice(0, 10)
      },
      properties: {
        averagePerSchema: 0,
        distribution: new Map<string, number>(),
        typeDistribution: new Map<string, number>()
      },
      dependencies: {
        mostDepended: new Map<string, number>(),
        mostDependencies: Array.from(schemaMetrics.entries())
          .sort(([,a], [,b]) => b.dependencyCount - a.dependencyCount)
          .slice(0, 5)
          .map(([name, metrics]) => ({ name, count: metrics.dependencyCount })),
        isolatedSchemas: 0
      },
      health: {
        score: 0,
        issues: getValidationSummary(),
        recommendations: [] as string[]
      }
    };

    // Calculate overview metrics
    const complexities = Array.from(schemaMetrics.values()).map(m => m.complexity);
    analytics.overview.averageComplexity = Math.round(
      complexities.reduce((a, b) => a + b, 0) / complexities.length
    );
    
    analytics.overview.totalProperties = Array.from(schemaMetrics.values())
      .reduce((acc, m) => acc + m.propertyCount, 0);
    
    analytics.overview.totalDependencies = Array.from(schemaMetrics.values())
      .reduce((acc, m) => acc + m.dependencyCount, 0);
    
    analytics.overview.circularRefs = Array.from(schemaMetrics.values())
      .filter(m => m.circularRefs).length;

    // Complexity distribution
    Array.from(schemaMetrics.values()).forEach(metrics => {
      if (metrics.complexity <= 10) analytics.complexity.distribution.low++;
      else if (metrics.complexity <= 50) analytics.complexity.distribution.medium++;
      else if (metrics.complexity <= 100) analytics.complexity.distribution.high++;
      else analytics.complexity.distribution.extreme++;
    });

    // Properties analytics
    analytics.properties.averagePerSchema = Math.round(
      analytics.overview.totalProperties / analytics.overview.totalSchemas
    );

    // Property type distribution
    searchProperties.forEach(prop => {
      const count = analytics.properties.typeDistribution.get(prop.type) || 0;
      analytics.properties.typeDistribution.set(prop.type, count + 1);
    });

    // Dependencies analytics
    Array.from(findSchemaDependencies.entries()).forEach(([schema, deps]) => {
      deps.forEach(dep => {
        const count = analytics.dependencies.mostDepended.get(dep) || 0;
        analytics.dependencies.mostDepended.set(dep, count + 1);
      });
    });

    analytics.dependencies.isolatedSchemas = Array.from(schemaMetrics.values())
      .filter(m => m.dependencyCount === 0).length;

    // Health score calculation
    const validationSummary = analytics.health.issues;
    const errorWeight = 3;
    const warningWeight = 1;
    const maxPossibleIssues = analytics.overview.totalSchemas * 5; // Assume max 5 issues per schema
    const weightedIssues = (validationSummary.errors * errorWeight) + (validationSummary.warnings * warningWeight);
    analytics.health.score = Math.max(0, Math.round(100 - (weightedIssues / maxPossibleIssues) * 100));

    // Generate recommendations
    if (analytics.complexity.distribution.extreme > 0) {
      analytics.health.recommendations.push(
        `${analytics.complexity.distribution.extreme} schemas have extremely high complexity (>100). Consider refactoring.`
      );
    }
    
    if (analytics.overview.circularRefs > 0) {
      analytics.health.recommendations.push(
        `${analytics.overview.circularRefs} schemas have circular dependencies. This can cause issues.`
      );
    }
    
    if (analytics.dependencies.isolatedSchemas > analytics.overview.totalSchemas * 0.3) {
      analytics.health.recommendations.push(
        `${analytics.dependencies.isolatedSchemas} schemas are isolated. Consider if they can be consolidated.`
      );
    }

    const avgPropsPerSchema = analytics.properties.averagePerSchema;
    if (avgPropsPerSchema > 25) {
      analytics.health.recommendations.push(
        `Average of ${avgPropsPerSchema} properties per schema is high. Consider splitting large schemas.`
      );
    }

    return analytics;
  }, [schemaNames, schemaMetrics, searchProperties, findSchemaDependencies, getValidationSummary]);

  // AI-powered semantic search
  const [isAiSearchEnabled, setIsAiSearchEnabled] = useState(false);
  const [aiSearchSuggestions, setAiSearchSuggestions] = useState<string[]>([]);
  
  // Enhanced semantic search with AI-like capabilities
  const performSemanticSearch = useCallback((query: string, properties: PropertyResult[]): PropertyResult[] => {
    if (!query.trim()) return properties;
    
    const searchTerms = query.toLowerCase().split(/\s+/);
    const synonyms: Record<string, string[]> = {
      'id': ['identifier', 'key', 'primary', 'unique'],
      'name': ['title', 'label', 'description'],
      'email': ['mail', 'address', 'contact'],
      'user': ['person', 'customer', 'account', 'profile'],
      'date': ['time', 'timestamp', 'created', 'updated'],
      'price': ['cost', 'amount', 'value', 'fee'],
      'status': ['state', 'condition', 'flag'],
      'url': ['link', 'address', 'endpoint'],
      'phone': ['mobile', 'telephone', 'contact'],
      'address': ['location', 'place', 'street'],
      'count': ['number', 'quantity', 'total'],
      'text': ['string', 'content', 'message'],
      'boolean': ['flag', 'switch', 'toggle'],
      'array': ['list', 'collection', 'items']
    };
    
    return properties.filter(prop => {
      const propText = `${prop.property} ${prop.type} ${prop.description || ''} ${prop.schema}`.toLowerCase();
      
      // Direct match
      if (searchTerms.some(term => propText.includes(term))) {
        return true;
      }
      
      // Semantic matching with synonyms
      return searchTerms.some(term => {
        const relatedTerms = synonyms[term] || [];
        return relatedTerms.some(synonym => propText.includes(synonym));
      });
    });
  }, []);

  // Generate AI search suggestions based on current schemas
  const generateSearchSuggestions = useCallback(() => {
    const suggestions = [
      'Find all user-related properties',
      'Show authentication fields',
      'List all required properties',
      'Find properties with validation',
      'Show all string properties without length limits',
      'Find deprecated fields',
      'List all array properties',
      'Show properties with default values',
      'Find all numeric constraints',
      'Show circular dependencies'
    ];
    
    // Add schema-specific suggestions
    const commonSchemas = schemaNames.slice(0, 3);
    commonSchemas.forEach(schema => {
      suggestions.push(`Explore ${schema} properties`);
    });
    
    setAiSearchSuggestions(suggestions.slice(0, 8));
  }, [schemaNames]);

  // Enhanced search with AI capabilities
  const enhancedSearchProperties = useMemo(() => {
    let results = searchProperties;
    
    if (isAiSearchEnabled && filters.searchQuery) {
      results = performSemanticSearch(filters.searchQuery, results);
    }
    
    return results;
  }, [searchProperties, filters.searchQuery, isAiSearchEnabled, performSemanticSearch]);

  // Initialize AI suggestions
  useEffect(() => {
    generateSearchSuggestions();
  }, [generateSearchSuggestions]);

  // Memoize spec content to prevent re-renders from object reference changes
  const specString = useMemo(() => JSON.stringify(spec), [spec]);

  useEffect(() => {
    if (specString && isOpen) {
      setLocalSpec(JSON.parse(specString));
    }
  }, [specString, isOpen]);
  
  useEffect(() => {
    if (editingSchema && schemas[editingSchema]) {
      setEditedCode(JSON.stringify(schemas[editingSchema], null, 2));
      setActiveTab('editor');
    }
  }, [editingSchema, schemas]);

  const handleSaveChanges = useCallback(() => {
    if (editingSchema && localSpec) {
      try {
        const updatedSchema = JSON.parse(editedCode);
        const newSpec = JSON.parse(JSON.stringify(localSpec));
        if (newSpec.components.schemas) {
          newSpec.components.schemas[editingSchema] = updatedSchema;
        }
        setLocalSpec(newSpec);
        alert(`Successfully updated ${editingSchema} locally. Changes will be lost when the modal is closed.`);
        setEditingSchema(null);
      } catch (error) {
        console.error("Invalid JSON format:", error);
        alert("Error: Invalid JSON format. Please check your code.");
      }
    }
  }, [editingSchema, editedCode, localSpec]);

  // Docs generation
  const generateMarkdownDoc = useCallback((schemaName: string): string => {
    const schema = schemas[schemaName];
    if (!schema) return `## Schema Not Found: ${schemaName}`;

    const resolvedSchema = resolveSchemaReference(schema, schemas);
    let doc = `# ${resolvedSchema.title || schemaName}\n\n`;
    if (resolvedSchema.description) {
      doc += `${resolvedSchema.description}\n\n`;
    }

    doc += `## Properties\n\n`;
    doc += `| Name | Type | Required | Description |\n`;
    doc += `|------|------|----------|-------------|\n`;

    const properties = resolvedSchema.properties || {};
    Object.entries(properties).forEach(([propName, propDetails]: [string, any]) => {
      const required = resolvedSchema.required?.includes(propName) ? 'Yes' : 'No';
      const description = propDetails.description || '';
      doc += `| \`${propName}\` | \`${propDetails.type}\` | ${required} | ${description.replace(/(\r\n|\n|\r)/gm, " ")} |\n`;
    });

    if (Object.keys(properties).length === 0) {
      doc += `| - | - | - | This schema has no defined properties. |\n`;
    }

    doc += `\n## Examples\n\n`;
    if (resolvedSchema.example) {
      doc += `\`\`\`json\n${JSON.stringify(resolvedSchema.example, null, 2)}\n\`\`\`\n`;
    } else {
      doc += `No examples provided.\n`;
    }

    const dependencies = findSchemaDependencies.get(schemaName) || [];
    if (dependencies.length > 0) {
      doc += `\n## Dependencies\n\nThis schema depends on the following schemas:\n\n`;
      dependencies.forEach(dep => {
        doc += `- \`${dep}\`\n`;
      });
    }

    return doc;
  }, [schemas, findSchemaDependencies]);

  // Testing tools
  const generateSampleData = useCallback((schemaName: string): any => {
    const schema = schemas[schemaName];
    if (!schema) return { error: `Schema Not Found: ${schemaName}` };

    const resolvedSchema = resolveSchemaReference(schema, schemas);
    const sample: any = {};
    const properties = resolvedSchema.properties || {};

    Object.entries(properties).forEach(([propName, propDetails]: [string, any]) => {
      const details = resolveSchemaReference(propDetails, schemas);
      
      if (details.example) {
        sample[propName] = details.example;
      } else if (details.default) {
        sample[propName] = details.default;
      } else if (details.enum && details.enum.length > 0) {
        sample[propName] = details.enum[0];
      } else {
        switch (details.type) {
          case 'string':
            if (details.format === 'date-time') sample[propName] = new Date().toISOString();
            else if (details.format === 'date') sample[propName] = new Date().toISOString().split('T')[0];
            else if (details.format === 'email') sample[propName] = 'user@example.com';
            else if (details.format === 'uuid') sample[propName] = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
            else sample[propName] = 'string';
            break;
          case 'number':
          case 'integer':
            sample[propName] = details.minimum !== undefined ? details.minimum : 0;
            break;
          case 'boolean':
            sample[propName] = true;
            break;
          case 'array':
            sample[propName] = [];
            break;
          case 'object':
            sample[propName] = {};
            break;
          default:
            sample[propName] = null;
        }
      }
    });

    return sample;
  }, [schemas]);

  const expandAll = () => setExpandedSchemas(new Set(schemaNames));
  const collapseAll = () => setExpandedSchemas(new Set());

  if (!isOpen || !spec) return null;

  return (
    <div className={containerClasses}>
      <div className={modalClasses}>
        <Header
          schemaCount={schemaNames.length}
          propertyCount={searchProperties.length}
          selectedSchemaCount={selectedSchemas.size}
          isMaximized={isMaximized}
          onToggleMaximize={() => setIsMaximized(!isMaximized)}
          onClose={onClose}
        />

        <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0 overflow-x-auto bg-gray-50 dark:bg-gray-700/50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`
                  group flex items-center gap-2 px-4 py-3 font-medium transition-all whitespace-nowrap relative
                  ${isActive 
                    ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 border-b-2 border-blue-600' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }
                `}
                title={tab.description}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                <span className="text-sm">{tab.label}</span>
                {isActive && (
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
          {activeTab === 'overview' && (
            <OverviewTab
              schemaNames={schemaNames}
              searchProperties={searchProperties}
              findSchemaDependencies={findSchemaDependencies}
              getValidationSummary={getValidationSummary}
              schemaMetrics={schemaMetrics}
              onSelectSchema={(schemaName) => {
                setSelectedSchema(schemaName);
                                setActiveTab('explorer');
                              }}
            />
          )}

          {activeTab === 'explorer' && (
            <ExplorerTab
              selectedSchema={selectedSchema}
              schemas={schemas}
              schemaMetrics={schemaMetrics}
              searchQuery={filters.searchQuery}
              setSearchQuery={(query) => setFilters(prev => ({...prev, searchQuery: query}))}
              isAiSearchEnabled={isAiSearchEnabled}
              setIsAiSearchEnabled={setIsAiSearchEnabled}
              aiSearchSuggestions={aiSearchSuggestions}
              enhancedSearchProperties={enhancedSearchProperties}
              searchProperties={searchProperties}
              complexityFilter={filters.complexity}
              setComplexityFilter={(value) => setFilters(prev => ({...prev, complexity: value}))}
              propertyTypeFilter={filters.propertyType}
              setPropertyTypeFilter={(value) => setFilters(prev => ({...prev, propertyType: value}))}
              showAdvancedFilters={showAdvancedFilters}
              setShowAdvancedFilters={setShowAdvancedFilters}
              AdvancedFilterControls={AdvancedFilterControls}
              scrollElementRef={scrollElementRef}
              totalHeight={totalHeight}
              visibleSchemas={visibleSchemas}
              selectedSchemas={selectedSchemas}
              setSelectedSchema={setSelectedSchema}
              toggleSchemaSelection={toggleSchemaSelection}
              copyToClipboard={copyToClipboard}
              copiedText={copiedText}
              setEditingSchema={setEditingSchema}
              generateAIInsights={generateAIInsights}
              schemaNames={schemaNames}
              expandAll={expandAll}
              collapseAll={collapseAll}
            />
          )}

          {activeTab === 'validation' && (() => {
            const allIssues = Object.entries(schemas).flatMap(([name, schema]) => 
              validateSingleSchema(name, schema)
            );
            const validationResults = {
              summary: getValidationSummary(),
              issues: allIssues,
            };
            return (
              <ValidationTab 
                validationResults={validationResults}
                onSelectSchema={handleSelectSchema}
                spec={localSpec}
              />
            );
          })()}
          
          {activeTab === 'analytics' && (() => {
            const analyticsData = getAnalyticsData();
            const validationSummary = getValidationSummary();
            const analytics = {
              summary: {
                totalSchemas: analyticsData.overview.totalSchemas,
                totalProperties: analyticsData.overview.totalProperties,
                avgComplexity: analyticsData.overview.averageComplexity,
                dependencyRatio: analyticsData.overview.totalDependencies / analyticsData.overview.totalSchemas
              },
              health: {
                score: analyticsData.health.score,
                issues: {
                  ...validationSummary
                },
                recommendations: analyticsData.health.recommendations
              }
            }
            return <AnalyticsTab analytics={analytics} />;
                  })()}

          {activeTab === 'docs' && (
            <DocsTab
              selectedSchema={selectedSchema}
              generateMarkdownDoc={generateMarkdownDoc}
            />
          )}

          {activeTab === 'relationships' && (
            <RelationshipsTab
              schemas={schemas}
              dependencyMap={findSchemaDependencies}
            />
          )}

          {activeTab === 'testing' && <TestingTab />}
                  </div>
                    </div>
    </div>
  );
};

export default SchemaExplorer;