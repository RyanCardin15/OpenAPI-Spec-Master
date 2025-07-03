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
import { OpenAPISpec } from '../types/openapi';
import { DependencyTreeVisualization } from './DependencyTreeVisualization';
import { useVirtualScroll } from '../hooks/useVirtualScroll';

interface SchemaExplorerProps {
  spec: OpenAPISpec | null;
  isOpen: boolean;
  onClose: () => void;
}

interface PropertyResult {
  schema: string;
  property: string;
  type: string;
  path: string;
  required: boolean;
  description?: string;
  format?: string;
  enum?: any[];
  example?: any;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
}

interface SchemaMetrics {
  complexity: number;
  depth: number;
  propertyCount: number;
  requiredCount: number;
  dependencyCount: number;
  circularRefs: boolean;
  lastModified?: string;
  usage: number;
}

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  path: string;
  suggestion?: string;
}

type TabType = 'overview' | 'explorer' | 'comparison' | 'validation' | 'analytics' | 'editor' | 'docs' | 'relationships' | 'testing';
type ViewMode = 'card' | 'table' | 'tree' | 'graph';

// Helper function to check if a schema is a reference
const isSchemaReference = (schema: any): schema is { $ref: string } => {
  return schema && typeof schema === 'object' && '$ref' in schema;
};

// Helper function to resolve schema reference
const resolveSchemaReference = (schema: any, schemas: Record<string, any>): any => {
  if (isSchemaReference(schema)) {
    const refName = schema.$ref.replace('#/components/schemas/', '');
    return schemas[refName] || schema;
  }
  return schema;
};

export const SchemaExplorer: React.FC<SchemaExplorerProps> = ({ spec, isOpen, onClose }) => {
  // Core state
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
  const [selectedSchemas, setSelectedSchemas] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  
  // Advanced search and filtering
  const [propertySearch, setPropertySearch] = useState('');
  const [semanticSearch, setSemanticSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [complexityFilter, setComplexityFilter] = useState<string>('all');
  const [requiredFilter, setRequiredFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'complexity' | 'usage' | 'dependencies'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // UI state
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Editor state
  const [editingSchema, setEditingSchema] = useState<string | null>(null);
  const [editedCode, setEditedCode] = useState('');
  const [localSpec, setLocalSpec] = useState<OpenAPISpec | null>(spec);

  const AdvancedFilterControls = () => (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-600"
        >
          <option value="name">Sort by Name</option>
          <option value="complexity">Sort by Complexity</option>
          <option value="usage">Sort by Usage</option>
          <option value="dependencies">Sort by Dependencies</option>
        </select>
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  // Performance state
  const searchRef = useRef<HTMLInputElement>(null);
  const virtualizationEnabled = useMemo(() => {
    const schemas = spec?.components?.schemas || {};
    return Object.keys(schemas).length > 100;
  }, [spec]);

  const schemas = useMemo(() => {
    if (!localSpec) return {};
    // Support both OpenAPI 3.0+ and Swagger 2.0
    if (localSpec.components?.schemas) {
      return localSpec.components.schemas;
    }
    if ((localSpec as any).definitions) {
      return (localSpec as any).definitions;
    }
    return {};
  }, [localSpec]);

  const schemaNames = useMemo(() => Object.keys(schemas), [schemas]);

  // Enhanced dependency analysis - moved before schemaMetrics
  const findSchemaDependencies = useMemo(() => {
    const dependencyMap = new Map<string, string[]>();
    
    const findRefs = (obj: any, visited = new Set<string>()): string[] => {
      if (!obj || typeof obj !== 'object') return [];
      
      const refs: string[] = [];
      
      if (obj.$ref && typeof obj.$ref === 'string') {
        const refName = obj.$ref.replace('#/components/schemas/', '');
        if (schemas[refName] && !visited.has(refName)) {
          refs.push(refName);
        }
        return refs;
      }
      
      Object.values(obj).forEach(value => {
        if (typeof value === 'object') {
          refs.push(...findRefs(value, visited));
        }
      });
      
      return [...new Set(refs)];
    };
    
    Object.entries(schemas).forEach(([schemaName, schema]) => {
      const deps = findRefs(schema);
      dependencyMap.set(schemaName, deps);
    });
    
    return dependencyMap;
  }, [schemas]);

  // Enhanced schema analysis with metrics - now uses findSchemaDependencies
  const schemaMetrics = useMemo((): Map<string, SchemaMetrics> => {
    const metrics = new Map<string, SchemaMetrics>();
    
    const calculateMetrics = (schemaName: string, schema: any): SchemaMetrics => {
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
    };
    
    Object.entries(schemas).forEach(([name, schema]) => {
      metrics.set(name, calculateMetrics(name, schema));
    });
    
    return metrics;
  }, [schemas, findSchemaDependencies]);

  // Enhanced property search with semantic capabilities
  const searchProperties = useMemo((): PropertyResult[] => {
    const results: PropertyResult[] = [];
    
    const searchInSchema = (schemaName: string, schema: any, path = '') => {
      if (!schema || typeof schema !== 'object') return;
      
      const resolvedSchema = resolveSchemaReference(schema, schemas);
      
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
  }, [schemas]);

  // Enhanced filtering and sorting
  const filteredAndSortedSchemas = useMemo(() => {
    let filtered = schemaNames;

    // Apply search filters
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(name => {
        const schema = schemas[name];
        const resolvedSchema = resolveSchemaReference(schema, schemas);
        
        return name.toLowerCase().includes(query) ||
               resolvedSchema.title?.toLowerCase().includes(query) ||
               resolvedSchema.description?.toLowerCase().includes(query) ||
               (resolvedSchema.properties && Object.keys(resolvedSchema.properties).some(prop => 
                 prop.toLowerCase().includes(query)
               ));
      });
    }

    // Apply complexity filter
    if (complexityFilter !== 'all') {
      filtered = filtered.filter(name => {
        const metrics = schemaMetrics.get(name);
        if (!metrics) return false;
        
        switch (complexityFilter) {
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
      
      switch (sortBy) {
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
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [schemaNames, searchQuery, complexityFilter, sortBy, sortOrder, schemaMetrics, schemas]);

  const {
    scrollElementRef,
    visibleItems: visibleSchemas,
    totalHeight,
  } = useVirtualScroll(filteredAndSortedSchemas, {
    itemHeight: 84, // Approximate height of a schema item (p-3 + gap-2 etc)
    containerHeight: 600, // This should be the height of the scrollable container
    overscan: 5,
  });

  // Enhanced validation with detailed reporting
  const validateSingleSchema = useCallback((schemaName: string, schema: any): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const resolvedSchema = resolveSchemaReference(schema, schemas);
    const metrics = schemaMetrics.get(schemaName);
    
    // Missing title
    if (!resolvedSchema.title) {
      issues.push({
        severity: 'warning',
        message: 'Schema is missing a title',
        path: `${schemaName}`,
        suggestion: 'Add a descriptive title for better API documentation'
      });
    }
    
    // Missing description
    if (!resolvedSchema.description) {
      issues.push({
        severity: 'warning',
        message: 'Schema is missing a description',
        path: `${schemaName}`,
        suggestion: 'Add a comprehensive description explaining the purpose and usage'
      });
    }
    
    // Check for circular dependencies
    if (metrics?.circularRefs) {
      issues.push({
        severity: 'error',
        message: 'Circular dependency detected',
        path: `${schemaName}`,
        suggestion: 'Refactor to remove circular references by using composition or inheritance'
      });
    }
    
    // High complexity warning
    if (metrics && metrics.complexity > 100) {
      issues.push({
        severity: 'warning',
        message: `High complexity score (${metrics.complexity})`,
        path: `${schemaName}`,
        suggestion: 'Consider breaking down into smaller, more focused schemas'
      });
    }
    
    // Too many properties
    if (metrics && metrics.propertyCount > 30) {
      issues.push({
        severity: 'warning',
        message: `Large number of properties (${metrics.propertyCount})`,
        path: `${schemaName}`,
        suggestion: 'Consider grouping related properties into nested objects'
      });
    }
    
    // Deep nesting
    if (metrics && metrics.depth > 5) {
      issues.push({
        severity: 'warning',
        message: `Deep nesting detected (${metrics.depth} levels)`,
        path: `${schemaName}`,
        suggestion: 'Consider flattening the structure or using references'
      });
    }
    
    // Validate properties
    if (resolvedSchema.properties) {
      Object.entries(resolvedSchema.properties).forEach(([propName, propSchema]: [string, any]) => {
        const resolvedProp = resolveSchemaReference(propSchema, schemas);
        
        // Missing property description
        if (!resolvedProp.description) {
          issues.push({
            severity: 'info',
            message: `Property '${propName}' is missing a description`,
            path: `${schemaName}.${propName}`,
            suggestion: 'Add a description explaining the property purpose and expected values'
          });
        }
        
        // String without maxLength
        if (resolvedProp.type === 'string' && !resolvedProp.maxLength && !resolvedProp.enum && !resolvedProp.format) {
          issues.push({
            severity: 'warning',
            message: `String property '${propName}' has no length constraints`,
            path: `${schemaName}.${propName}`,
            suggestion: 'Add maxLength constraint to prevent potential issues'
          });
        }
        
        // Number without constraints
        if ((resolvedProp.type === 'number' || resolvedProp.type === 'integer') && 
            resolvedProp.minimum === undefined && resolvedProp.maximum === undefined) {
          issues.push({
            severity: 'info',
            message: `Numeric property '${propName}' has no range constraints`,
            path: `${schemaName}.${propName}`,
            suggestion: 'Consider adding minimum/maximum constraints for better validation'
          });
        }
        
        // Array without items definition
        if (resolvedProp.type === 'array' && !resolvedProp.items) {
          issues.push({
            severity: 'error',
            message: `Array property '${propName}' is missing items definition`,
            path: `${schemaName}.${propName}`,
            suggestion: 'Define the type/schema for array items'
          });
        }
        
        // Deprecated without replacement
        if (resolvedProp.deprecated && !resolvedProp.description?.includes('use')) {
          issues.push({
            severity: 'warning',
            message: `Deprecated property '${propName}' has no replacement guidance`,
            path: `${schemaName}.${propName}`,
            suggestion: 'Include guidance on what to use instead in the description'
          });
        }
      });
    }
    
    // Check for required fields
    if (resolvedSchema.required && resolvedSchema.required.length === 0) {
      issues.push({
        severity: 'info',
        message: 'Schema has no required fields',
        path: `${schemaName}`,
        suggestion: 'Consider marking essential fields as required for better validation'
      });
    }
    
    // Check for additionalProperties
    if (resolvedSchema.additionalProperties === undefined && resolvedSchema.type === 'object') {
      issues.push({
        severity: 'info',
        message: 'additionalProperties not explicitly defined',
        path: `${schemaName}`,
        suggestion: 'Explicitly set additionalProperties to true or false for clarity'
      });
    }
    
    return issues;
  }, [schemas, schemaMetrics]);

  // Get validation summary statistics
  const getValidationSummary = useCallback(() => {
    const allIssues = Object.entries(schemas).flatMap(([name, schema]) => 
      validateSingleSchema(name, schema)
    );
    
    const summary = {
      total: allIssues.length,
      errors: allIssues.filter(issue => issue.severity === 'error').length,
      warnings: allIssues.filter(issue => issue.severity === 'warning').length,
      info: allIssues.filter(issue => issue.severity === 'info').length,
      schemasWithIssues: new Set(allIssues.map(issue => issue.path.split('.')[0])).size,
      totalSchemas: Object.keys(schemas).length
    };
    
    return summary;
  }, [schemas, validateSingleSchema]);

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
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const toggleSchemaSelection = (schemaName: string) => {
    const newSelection = new Set(selectedSchemas);
    if (newSelection.has(schemaName)) {
      newSelection.delete(schemaName);
    } else {
      newSelection.add(schemaName);
    }
    setSelectedSchemas(newSelection);
  };

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
    { id: 'comparison', label: 'Compare', icon: GitCompare, description: 'Compare multiple schemas' },
    { id: 'validation', label: 'Validation', icon: FileCheck, description: 'Validate schemas and find issues' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Schema metrics and insights' },
    { id: 'relationships', label: 'Relations', icon: Network, description: 'Dependency visualization' },
    { id: 'editor', label: 'Editor', icon: Edit3, description: 'Edit schemas inline' },
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
    
    if (isAiSearchEnabled && searchQuery) {
      results = performSemanticSearch(searchQuery, results);
    }
    
    return results;
  }, [searchProperties, searchQuery, isAiSearchEnabled, performSemanticSearch]);

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

  if (!isOpen || !spec) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-0 md:p-4 ${isMaximized ? 'p-0' : ''}`}>
      <div className={`bg-white dark:bg-gray-800 md:rounded-xl shadow-2xl flex flex-col ${
        isMaximized ? 'w-full h-full rounded-none' : 'w-full h-full md:w-full md:max-w-7xl md:h-[95vh]'
      }`}>
        {/* Enhanced Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="relative">
              <div className="p-3 bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700 rounded-xl shadow-lg">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                Advanced Schema Explorer
              </h2>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                {schemaNames.length} schemas • {searchProperties.length} properties • 
                {Array.from(selectedSchemas).length} selected
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="hidden md:block p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? (
                <Minimize2 className="h-5 w-5 text-gray-500" />
              ) : (
                <Maximize2 className="h-5 w-5 text-gray-500" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Enhanced Tab Navigation */}
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

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="h-full p-6 overflow-y-auto">
              <div className="max-w-6xl mx-auto space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{schemaNames.length}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Schemas</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                        <Type className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{searchProperties.length}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Properties</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <GitBranch className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {Array.from(findSchemaDependencies.values()).reduce((acc, deps) => acc + deps.length, 0)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Dependencies</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {getValidationSummary().total}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Issues Found</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Schemas by Complexity */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Most Complex Schemas
                  </h3>
                  <div className="space-y-3">
                    {Array.from(schemaMetrics.entries())
                      .sort(([,a], [,b]) => b.complexity - a.complexity)
                      .slice(0, 5)
                      .map(([name, metrics]) => (
                        <div key={name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Type className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-gray-900 dark:text-white">{name}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span>Complexity: {metrics.complexity}</span>
                            <span>Props: {metrics.propertyCount}</span>
                            <span>Deps: {metrics.dependencyCount}</span>
                            <button
                              onClick={() => {
                                setSelectedSchema(name);
                                setActiveTab('explorer');
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs"
                            >
                              Explore
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Explorer Tab - Enhanced */}
          {activeTab === 'explorer' && (
            <div className="h-full flex flex-col md:flex-row">
              {/* Enhanced Sidebar */}
              <div className={`w-full md:w-80 border-r-0 md:border-r border-gray-200 dark:border-gray-700 flex-col bg-white dark:bg-gray-800 ${selectedSchema ? 'hidden md:flex' : 'flex'}`}>
                {/* Search and Filters */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
                  {/* Enhanced Search with AI */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder={isAiSearchEnabled ? "Try: 'Find user authentication fields' or 'Show required properties'" : "Search properties..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    {/* AI Search Toggle */}
                    <button
                      onClick={() => setIsAiSearchEnabled(!isAiSearchEnabled)}
                      className={`px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                        isAiSearchEnabled 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                      title={isAiSearchEnabled ? 'Disable AI Search' : 'Enable AI Search'}
                    >
                      <Brain className="h-4 w-4" />
                      <span className="text-sm font-medium">AI</span>
                    </button>
                  </div>

                  {/* AI Search Suggestions */}
                  {isAiSearchEnabled && !searchQuery && (
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center gap-2 mb-3">
                        <Wand2 className="h-4 w-4 text-blue-600" />
                        <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          AI Search Suggestions
                        </h5>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {aiSearchSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => setSearchQuery(suggestion)}
                            className="text-left px-3 py-2 text-sm bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors border border-blue-200 dark:border-blue-600"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Search Results Info */}
                  {isAiSearchEnabled && searchQuery && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-green-600" />
                        <p className="text-sm text-green-800 dark:text-green-200">
                          AI semantic search active - finding related properties using intelligent matching
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Search Results Count */}
                  <div className="flex items-center justify-between mb-4">
                                         <p className="text-sm text-gray-600 dark:text-gray-400">
                       {isAiSearchEnabled ? enhancedSearchProperties.length : searchProperties.length} properties found
                      {searchQuery && (
                        <span className="ml-1">
                          for "{searchQuery}"
                        </span>
                      )}
                    </p>
                    
                    {/* Search Mode Indicator */}
                    <div className="flex items-center gap-2 text-xs">
                      {isAiSearchEnabled ? (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex items-center gap-1">
                          <Brain className="h-3 w-3" />
                          Semantic Search
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full flex items-center gap-1">
                          <Search className="h-3 w-3" />
                          Basic Search
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Quick Filters */}
                  <div className="flex gap-2">
                    <select
                      value={complexityFilter}
                      onChange={(e) => setComplexityFilter(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="all">All Complexity</option>
                      <option value="low">Low (≤10)</option>
                      <option value="medium">Medium (11-50)</option>
                      <option value="high">High (&gt;50)</option>
                    </select>
                    
                    <button
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className={`px-3 py-2 rounded-lg border transition-colors ${showAdvancedFilters 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Filter className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {/* Advanced Filters */}
                  {showAdvancedFilters && (
                    <div className="hidden md:block space-y-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <AdvancedFilterControls />
                    </div>
                  )}
                </div>
                
                {/* Schema List */}
                <div 
                  ref={scrollElementRef}
                  className="flex-1 overflow-y-auto"
                >
                  <div style={{ height: totalHeight, position: 'relative' }} className="p-4">
                    {visibleSchemas.map(({ data: schemaName, offset }) => {
                      const metrics = schemaMetrics.get(schemaName);
                      const isSelected = selectedSchema === schemaName;
                      const isMultiSelected = selectedSchemas.has(schemaName);
                      
                      return (
                        <div
                          key={schemaName}
                          style={{
                            position: 'absolute',
                            top: `${offset}px`,
                            left: '1rem',
                            right: '1rem',
                            height: '76px' // itemHeight - padding
                          }}
                          className={`group p-3 rounded-lg border transition-all cursor-pointer bg-white dark:bg-gray-800 ${
                            isSelected 
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' 
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div 
                              className="flex-1"
                              onClick={() => setSelectedSchema(schemaName)}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Type className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                <span className="font-medium text-gray-900 dark:text-white truncate">
                                  {schemaName}
                                </span>
                                {metrics?.circularRefs && (
                                  <span title="Circular dependency">
                                    <AlertTriangle className="h-3 w-3 text-orange-500" />
                                  </span>
                                )}
                              </div>
                              
                              {metrics && (
                                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                  <span>C: {metrics.complexity}</span>
                                  <span>P: {metrics.propertyCount}</span>
                                  <span>D: {metrics.dependencyCount}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSchemaSelection(schemaName);
                                }}
                                className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
                                  isMultiSelected ? 'text-blue-600' : 'text-gray-400'
                                }`}
                                title="Add to comparison"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Schema Details */}
              <div className={`flex-1 flex flex-col bg-white dark:bg-gray-800 ${selectedSchema ? 'flex' : 'hidden md:flex'}`}>
                {selectedSchema ? (
                  <>
                    {/* Schema Header */}
                    <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setSelectedSchema(null)}
                            className="block md:hidden p-2 -ml-2 text-gray-600 dark:text-gray-400"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                            {selectedSchema}
                          </h3>
                          {schemaMetrics.get(selectedSchema)?.circularRefs && (
                            <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs rounded-full">
                              Circular Ref
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(schemas[selectedSchema], null, 2), selectedSchema)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                          >
                            {copiedText === selectedSchema ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                            Copy Schema
                          </button>
                          
                          <button
                            onClick={() => setEditingSchema(selectedSchema)}
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                          >
                            <Edit3 className="h-4 w-4" />
                            Edit
                          </button>
                        </div>
                      </div>
                      
                      {/* Schema Metrics */}
                      {(() => {
                        const metrics = schemaMetrics.get(selectedSchema);
                        if (!metrics) return null;
                        
                        return (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <p className="text-lg md:text-2xl font-bold text-blue-600">{metrics.complexity}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">Complexity</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <p className="text-lg md:text-2xl font-bold text-green-600">{metrics.propertyCount}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">Properties</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <p className="text-lg md:text-2xl font-bold text-purple-600">{metrics.dependencyCount}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">Dependencies</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <p className="text-lg md:text-2xl font-bold text-orange-600">{metrics.depth}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">Max Depth</p>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* AI Insights */}
                      {(() => {
                        const insights = generateAIInsights(selectedSchema);
                        if (insights.length === 0) return null;
                        
                        return (
                          <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                            <div className="flex items-center gap-2 mb-2">
                              <Brain className="h-4 w-4 text-purple-600" />
                              <span className="text-sm font-medium text-purple-900 dark:text-purple-300">AI Insights</span>
                            </div>
                            <ul className="space-y-1">
                              {insights.map((insight, index) => (
                                <li key={index} className="text-sm text-purple-800 dark:text-purple-300 flex items-start gap-2">
                                  <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  {insight}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* Schema Content */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6">
                      <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-green-400 text-sm">
                          <code>{JSON.stringify(schemas[selectedSchema], null, 2)}</code>
                        </pre>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center text-gray-500 dark:text-gray-400 p-4">
                    <div>
                      <Database className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Select a schema to explore</p>
                      <p className="text-sm">Choose from {schemaNames.length} available schemas</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comparison Tab - Enhanced */}
          {activeTab === 'comparison' && (
            <div className="h-full p-6 overflow-y-auto">
              <div className="max-w-7xl mx-auto space-y-6">
                {/* Schema Selection */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <GitCompare className="h-5 w-5 text-blue-600" />
                      Schema Comparison
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedSchemas.size} schemas selected
                      </span>
                      {selectedSchemas.size > 1 && (
                        <button
                          onClick={() => setSelectedSchemas(new Set())}
                          className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {selectedSchemas.size === 0 ? (
                    <div className="text-center py-8">
                      <GitCompare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400 mb-2">No schemas selected for comparison</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        Use the Explorer tab to select schemas, or click the schema names below:
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4 justify-center">
                        {schemaNames.slice(0, 8).map(name => (
                          <button
                            key={name}
                            onClick={() => toggleSchemaSelection(name)}
                            className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : selectedSchemas.size === 1 ? (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400 mb-2">Only one schema selected</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        Select at least 2 schemas to compare differences
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Compatibility Matrix */}
                      {selectedSchemas.size > 2 && (
                        <div>
                          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                            Compatibility Matrix
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
                              <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white">Schema</th>
                                  {Array.from(selectedSchemas).map(name => (
                                    <th key={name} className="px-4 py-2 text-center text-sm font-medium text-gray-900 dark:text-white truncate max-w-24">
                                      {name}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {Array.from(selectedSchemas).map(schema1 => (
                                  <tr key={schema1}>
                                    <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white truncate max-w-32">
                                      {schema1}
                                    </td>
                                    {Array.from(selectedSchemas).map(schema2 => {
                                      if (schema1 === schema2) {
                                        return (
                                          <td key={schema2} className="px-4 py-2 text-center">
                                            <span className="text-gray-400">-</span>
                                          </td>
                                        );
                                      }
                                      
                                      const score = calculateCompatibilityScore(schema1, schema2);
                                      const colorClass = score >= 80 ? 'text-green-600 bg-green-100 dark:bg-green-900' :
                                                        score >= 60 ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900' :
                                                        'text-red-600 bg-red-100 dark:bg-red-900';
                                      
                                      return (
                                        <td key={schema2} className="px-4 py-2 text-center">
                                          <span className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
                                            {score}%
                                          </span>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      
                      {/* Side-by-Side Comparison */}
                      <div>
                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                          Schema Details Comparison
                        </h4>
                        <div className="overflow-x-auto pb-4">
                          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedSchemas.size}, 1fr)`, minWidth: `${Math.max(2, selectedSchemas.size) * 280}px` }}>
                            {compareSchemas(Array.from(selectedSchemas)).map((comparison, index) => (
                              <div key={comparison.name} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                {/* Schema Header */}
                                <div className="mb-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Type className="h-4 w-4 text-blue-600" />
                                    <h5 className="font-semibold text-gray-900 dark:text-white truncate">
                                      {comparison.name}
                                    </h5>
                                    {index === 0 && (
                                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                                        Base
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Metrics */}
                                  {comparison.metrics && (
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div className="text-gray-600 dark:text-gray-400">
                                        Complexity: <span className="font-medium text-gray-900 dark:text-white">{comparison.metrics.complexity}</span>
                                      </div>
                                      <div className="text-gray-600 dark:text-gray-400">
                                        Properties: <span className="font-medium text-gray-900 dark:text-white">{comparison.metrics.propertyCount}</span>
                                      </div>
                                      <div className="text-gray-600 dark:text-gray-400">
                                        Required: <span className="font-medium text-gray-900 dark:text-white">{comparison.metrics.requiredCount}</span>
                                      </div>
                                      <div className="text-gray-600 dark:text-gray-400">
                                        Deps: <span className="font-medium text-gray-900 dark:text-white">{comparison.metrics.dependencyCount}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Differences */}
                                {comparison.differences.length > 0 && (
                                  <div className="mb-4">
                                    <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                      Differences from Base:
                                    </h6>
                                    <ul className="space-y-1">
                                      {comparison.differences.map((diff, i) => (
                                        <li key={i} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
                                          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                          {diff}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {/* Properties Sample */}
                                <div>
                                  <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                    Properties ({comparison.properties.length}):
                                  </h6>
                                  <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {comparison.properties.slice(0, 10).map(prop => (
                                      <div key={prop.property} className="flex items-center justify-between text-xs">
                                        <span className={`truncate ${prop.required ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                          {prop.property}
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                                          {prop.type}
                                        </span>
                                      </div>
                                    ))}
                                    {comparison.properties.length > 10 && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                                        +{comparison.properties.length - 10} more...
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Validation Tab - Enhanced */}
          {activeTab === 'validation' && (
            <div className="h-full p-6 overflow-y-auto">
              <div className="max-w-6xl mx-auto space-y-6">
                {/* Validation Summary */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-blue-600" />
                    Schema Validation Report
                  </h3>
                  
                  {(() => {
                    const summary = getValidationSummary();
                    const healthScore = Math.round(
                      ((summary.totalSchemas - summary.schemasWithIssues) / summary.totalSchemas) * 100
                    );
                    
                    return (
                      <>
                        {/* Health Score */}
                        <div className="flex items-center gap-4 mb-6">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                {healthScore}%
                              </span>
                              <span className="text-lg text-gray-600 dark:text-gray-400">
                                Schema Health Score
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                              <div 
                                className={`h-3 rounded-full transition-all ${
                                  healthScore >= 90 ? 'bg-green-500' :
                                  healthScore >= 70 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${healthScore}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {summary.totalSchemas - summary.schemasWithIssues} of {summary.totalSchemas} schemas clean
                            </p>
                          </div>
                        </div>
                        
                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                            <AlertTriangle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-red-600">{summary.errors}</p>
                            <p className="text-sm text-red-600 dark:text-red-400">Errors</p>
                          </div>
                          
                          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                            <AlertTriangle className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-yellow-600">{summary.warnings}</p>
                            <p className="text-sm text-yellow-600 dark:text-yellow-400">Warnings</p>
                          </div>
                          
                          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                            <Info className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-blue-600">{summary.info}</p>
                            <p className="text-sm text-blue-600 dark:text-blue-400">Info</p>
                          </div>
                          
                          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                            <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-green-600">{summary.totalSchemas - summary.schemasWithIssues}</p>
                            <p className="text-sm text-green-600 dark:text-green-400">Clean</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                
                {/* Issues by Schema */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                    Issues by Schema
                  </h4>
                  
                  <div className="space-y-4">
                    {Object.entries(schemas).map(([schemaName, schema]) => {
                      const schemaIssues = validateSingleSchema(schemaName, schema);
                      const errorCount = schemaIssues.filter(i => i.severity === 'error').length;
                      const warningCount = schemaIssues.filter(i => i.severity === 'warning').length;
                      const infoCount = schemaIssues.filter(i => i.severity === 'info').length;
                      
                      return (
                        <div key={schemaName} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Type className="h-4 w-4 text-blue-600" />
                              <h5 className="font-medium text-gray-900 dark:text-white">
                                {schemaName}
                              </h5>
                              {schemaIssues.length === 0 && (
                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                                  ✓ Clean
                                </span>
                              )}
                            </div>
                            
                            {schemaIssues.length > 0 && (
                              <div className="flex items-center gap-2 text-sm">
                                {errorCount > 0 && (
                                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded-full">
                                    {errorCount} errors
                                  </span>
                                )}
                                {warningCount > 0 && (
                                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded-full">
                                    {warningCount} warnings
                                  </span>
                                )}
                                {infoCount > 0 && (
                                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                                    {infoCount} info
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {schemaIssues.length > 0 && (
                            <div className="space-y-2">
                              {schemaIssues.map((issue, index) => (
                                <div 
                                  key={index} 
                                  className={`p-3 rounded-lg border-l-4 ${
                                    issue.severity === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-400' :
                                    issue.severity === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400' :
                                    'bg-blue-50 dark:bg-blue-900/20 border-blue-400'
                                  }`}
                                >
                                  <div className="flex items-start gap-2">
                                    {issue.severity === 'error' ? (
                                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                    ) : issue.severity === 'warning' ? (
                                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                    ) : (
                                      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                    )}
                                    <div className="flex-1">
                                      <p className={`text-sm font-medium ${
                                        issue.severity === 'error' ? 'text-red-800 dark:text-red-200' :
                                        issue.severity === 'warning' ? 'text-yellow-800 dark:text-yellow-200' :
                                        'text-blue-800 dark:text-blue-200'
                                      }`}>
                                        {issue.message}
                                      </p>
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                        Path: {issue.path}
                                      </p>
                                      {issue.suggestion && (
                                        <p className={`text-xs mt-2 ${
                                          issue.severity === 'error' ? 'text-red-700 dark:text-red-300' :
                                          issue.severity === 'warning' ? 'text-yellow-700 dark:text-yellow-300' :
                                          'text-blue-700 dark:text-blue-300'
                                        }`}>
                                          💡 {issue.suggestion}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab - Enhanced */}
          {activeTab === 'analytics' && (
            <div className="h-full p-6 overflow-y-auto">
              <div className="max-w-7xl mx-auto space-y-6">
                {(() => {
                  const analytics = getAnalyticsData();
                  
                  return (
                    <>
                      {/* Overview Metrics */}
                      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-blue-600" />
                          Schema Analytics Dashboard
                        </h3>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <Database className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-blue-600">{analytics.overview.totalSchemas}</p>
                            <p className="text-sm text-blue-600 dark:text-blue-400">Total Schemas</p>
                          </div>
                          
                          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-green-600">{analytics.overview.averageComplexity}</p>
                            <p className="text-sm text-green-600 dark:text-green-400">Avg Complexity</p>
                          </div>
                          
                          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <Type className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-purple-600">{analytics.overview.totalProperties}</p>
                            <p className="text-sm text-purple-600 dark:text-purple-400">Total Properties</p>
                          </div>
                          
                          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <Network className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-orange-600">{analytics.overview.totalDependencies}</p>
                            <p className="text-sm text-orange-600 dark:text-orange-400">Dependencies</p>
                          </div>
                          
                          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <AlertTriangle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-red-600">{analytics.overview.circularRefs}</p>
                            <p className="text-sm text-red-600 dark:text-red-400">Circular Refs</p>
                          </div>
                          
                          <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                            <Star className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-indigo-600">{analytics.health.score}%</p>
                            <p className="text-sm text-indigo-600 dark:text-indigo-400">Health Score</p>
                          </div>
                        </div>
                      </div>

                      {/* Complexity Analysis */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Complexity Distribution */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                            Complexity Distribution
                          </h4>
                          
                          <div className="space-y-4">
                            {Object.entries(analytics.complexity.distribution).map(([level, count]) => {
                              const percentage = Math.round((count / analytics.overview.totalSchemas) * 100);
                              const colorMap = {
                                low: { bg: 'bg-green-500', text: 'text-green-600', label: 'Low (≤10)' },
                                medium: { bg: 'bg-yellow-500', text: 'text-yellow-600', label: 'Medium (11-50)' },
                                high: { bg: 'bg-orange-500', text: 'text-orange-600', label: 'High (51-100)' },
                                extreme: { bg: 'bg-red-500', text: 'text-red-600', label: 'Extreme (>100)' }
                              };
                              const colors = colorMap[level as keyof typeof colorMap];
                              
                              return (
                                <div key={level} className="flex items-center gap-3">
                                  <div className="w-16 text-sm font-medium text-gray-900 dark:text-white">
                                    {colors.label}
                                  </div>
                                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                    <div 
                                      className={`h-3 rounded-full ${colors.bg} transition-all`}
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  <div className="w-12 text-sm text-right">
                                    <span className={`font-medium ${colors.text}`}>{count}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Most Complex Schemas */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                            Most Complex Schemas
                          </h4>
                          
                          <div className="space-y-3">
                            {analytics.complexity.trend.slice(0, 8).map((item, index) => (
                              <div key={item.name} className="flex items-center gap-3">
                                <div className="w-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                                  #{index + 1}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                      {item.name}
                                    </span>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      {item.complexity}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full transition-all ${
                                        item.complexity > 100 ? 'bg-red-500' :
                                        item.complexity > 50 ? 'bg-orange-500' :
                                        item.complexity > 10 ? 'bg-yellow-500' :
                                        'bg-green-500'
                                      }`}
                                      style={{ width: `${Math.min(100, (item.complexity / 120) * 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Property Analysis */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Property Type Distribution */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                            Property Type Distribution
                          </h4>
                          
                          <div className="space-y-3">
                            {Array.from(analytics.properties.typeDistribution.entries())
                              .sort(([,a], [,b]) => b - a)
                              .slice(0, 8)
                              .map(([type, count]) => {
                                const percentage = Math.round((count / analytics.overview.totalProperties) * 100);
                                
                                return (
                                  <div key={type} className="flex items-center gap-3">
                                    <div className="w-16 text-sm font-medium text-gray-900 dark:text-white capitalize">
                                      {type}
                                    </div>
                                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                      <div 
                                        className="h-3 rounded-full bg-blue-500 transition-all"
                                        style={{ width: `${percentage}%` }}
                                      ></div>
                                    </div>
                                    <div className="w-12 text-sm text-right">
                                      <span className="font-medium text-blue-600">{count}</span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>

                        {/* Dependency Analysis */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                            Most Referenced Schemas
                          </h4>
                          
                          <div className="space-y-3">
                            {Array.from(analytics.dependencies.mostDepended.entries())
                              .sort(([,a], [,b]) => b - a)
                              .slice(0, 8)
                              .map(([schema, count], index) => (
                                <div key={schema} className="flex items-center gap-3">
                                  <div className="w-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                                    #{index + 1}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {schema.length > 20 ? schema.substring(0, 17) + '...' : schema}
                                      </span>
                                      <span className="text-sm text-purple-600 dark:text-purple-400">
                                        {count} refs
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-medium">{analytics.dependencies.isolatedSchemas}</span> schemas have no dependencies
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Health & Recommendations */}
                      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <Lightbulb className="h-5 w-5 text-yellow-500" />
                          Health Analysis & Recommendations
                        </h4>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Health Score Breakdown */}
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                              Health Score Breakdown
                            </h5>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Overall Health</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        analytics.health.score >= 90 ? 'bg-green-500' :
                                        analytics.health.score >= 70 ? 'bg-yellow-500' :
                                        'bg-red-500'
                                      }`}
                                      style={{ width: `${analytics.health.score}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {analytics.health.score}%
                                  </span>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-red-600">Errors:</span>
                                  <span className="font-medium">{analytics.health.issues.errors}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-yellow-600">Warnings:</span>
                                  <span className="font-medium">{analytics.health.issues.warnings}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-blue-600">Info:</span>
                                  <span className="font-medium">{analytics.health.issues.info}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-green-600">Clean:</span>
                                  <span className="font-medium">{analytics.health.issues.totalSchemas - analytics.health.issues.schemasWithIssues}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Recommendations */}
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                              Recommendations
                            </h5>
                            {analytics.health.recommendations.length > 0 ? (
                              <div className="space-y-2">
                                {analytics.health.recommendations.map((rec, index) => (
                                  <div key={index} className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                                    <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                      {rec}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <p className="text-sm text-green-800 dark:text-green-200">
                                  Your schemas are in excellent shape! No major issues detected.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Editor Tab */}
          {activeTab === 'editor' && (
            <div className="h-full p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
              {editingSchema ? (
                <div className="h-full flex flex-col max-w-4xl mx-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Edit3 className="h-5 w-5 text-blue-600" />
                      Editing: <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{editingSchema}</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingSchema(null);
                          setEditedCode('');
                        }}
                        className="px-4 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveChanges}
                        className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save Changes
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 bg-gray-900 rounded-lg p-4 shadow-inner overflow-hidden">
                    <textarea
                      value={editedCode}
                      onChange={(e) => setEditedCode(e.target.value)}
                      className="w-full h-full bg-transparent text-green-400 font-mono text-sm border-none focus:ring-0 resize-none outline-none"
                      spellCheck="false"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    Note: Changes are saved locally and will be lost upon closing the modal.
                  </p>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <Edit3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400 mb-2">No schema selected for editing</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      Select a schema from the Explorer tab and click 'Edit' to make changes.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Docs Tab */}
          {activeTab === 'docs' && (
            <div className="h-full p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      Documentation Generator
                    </h3>
                    {selectedSchema && (
                      <button
                        onClick={() => {
                          const doc = generateMarkdownDoc(selectedSchema);
                          const blob = new Blob([doc], { type: 'text/markdown' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${selectedSchema}-docs.md`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export Markdown
                      </button>
                    )}
                  </div>

                  {!selectedSchema ? (
                    <div className="text-center py-8">
                      <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400 mb-2">No schema selected</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        Select a schema from the Explorer tab to generate its documentation.
                      </p>
                    </div>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      <pre className="whitespace-pre-wrap font-sans">{generateMarkdownDoc(selectedSchema)}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Relationships Tab */}
          {activeTab === 'relationships' && (
            <div className="h-full p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
              <div className="max-w-7xl mx-auto">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Network className="h-5 w-5 text-blue-600" />
                    Schema Relationship Graph
                  </h3>
                  <div className="h-[80vh] md:h-[600px] w-full bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
                    <DependencyTreeVisualization schemas={schemas} dependencyMap={findSchemaDependencies} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Testing Tab */}
          {activeTab === 'testing' && (
            <div className="h-full p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Zap className="h-5 w-5 text-blue-600" />
                      Schema Testing Tools
                    </h3>
                  </div>

                  {!selectedSchema ? (
                    <div className="text-center py-8">
                      <Zap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400 mb-2">No schema selected</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        Select a schema from the Explorer tab to generate sample data.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-gray-800 dark:text-gray-200">
                          Testing schema: <span className="font-semibold text-blue-600">{selectedSchema}</span>
                        </p>
                        <button
                          onClick={() => {
                            const data = generateSampleData(selectedSchema);
                            copyToClipboard(JSON.stringify(data, null, 2), `${selectedSchema}-sample`);
                          }}
                          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Export Sample
                        </button>
                      </div>

                      <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-gray-900 rounded-lg border border-gray-700">
                        <h4 className="text-white">Generated Sample Data</h4>
                        <pre className="text-green-400">
                          <code>{JSON.stringify(generateSampleData(selectedSchema), null, 2)}</code>
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Additional tabs would be implemented here... */}
          {activeTab !== 'overview' && activeTab !== 'explorer' && activeTab !== 'comparison' && activeTab !== 'validation' && activeTab !== 'analytics' && activeTab !== 'editor' && activeTab !== 'docs' && activeTab !== 'relationships' && activeTab !== 'testing' && (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Wand2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium">Coming Soon</p>
                <p className="text-sm">{tabs.find(t => t.id === activeTab)?.description}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Sheet for Advanced Filters */}
      {showAdvancedFilters && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-30 z-50 flex items-end" onClick={() => setShowAdvancedFilters(false)}>
          <div className="w-full bg-white dark:bg-gray-800 rounded-t-2xl p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold">Advanced Filters</h4>
              <button onClick={() => setShowAdvancedFilters(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <AdvancedFilterControls />
              <button 
                onClick={() => setShowAdvancedFilters(false)} 
                className="w-full bg-blue-600 text-white py-2 rounded-lg"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};