import React, { useState, useMemo } from 'react';
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
  List
} from 'lucide-react';
import { OpenAPISpec } from '../types/openapi';

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
}

interface DependencyNode {
  name: string;
  dependencies: string[];
  level: number;
  expanded: boolean;
}

export const SchemaExplorer: React.FC<SchemaExplorerProps> = ({ spec, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'schemas' | 'dependencies' | 'properties' | 'mock'>('schemas');
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  // Dependencies tab state
  const [dependencyView, setDependencyView] = useState<'list' | 'tree'>('list');
  const [expandedDependencies, setExpandedDependencies] = useState<Set<string>>(new Set());
  const [nestedExpanded, setNestedExpanded] = useState<Set<string>>(new Set());
  
  // Advanced filtering and sorting for properties
  const [propertySearch, setPropertySearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [requiredFilter, setRequiredFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'property' | 'type' | 'schema'>('property');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Move all derived values and useMemo hooks before the early return
  const schemas = spec?.components?.schemas || {};
  const schemaNames = Object.keys(schemas);

  const searchProperties = useMemo((): PropertyResult[] => {
    const results: PropertyResult[] = [];
    
    const searchInSchema = (schemaName: string, schema: any, path = '') => {
      if (!schema || typeof schema !== 'object') return;
      
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
          const currentPath = path ? `${path}.${propName}` : propName;
          const isRequired = schema.required?.includes(propName) || false;
          
          results.push({
            schema: schemaName,
            property: propName,
            type: propSchema.type || 'unknown',
            path: currentPath,
            required: isRequired,
            description: propSchema.description
          });
          
          // Recursively search nested objects
          if (propSchema.type === 'object' || propSchema.properties) {
            searchInSchema(schemaName, propSchema, currentPath);
          }
        });
      }
    };
    
    Object.entries(schemas).forEach(([schemaName, schema]) => {
      searchInSchema(schemaName, schema);
    });
    
    return results;
  }, [schemas]);

  const filteredAndSortedProperties = useMemo(() => {
    let filtered = searchProperties;

    // Apply search filter
    if (propertySearch) {
      const query = propertySearch.toLowerCase();
      filtered = filtered.filter(prop => 
        prop.property.toLowerCase().includes(query) ||
        prop.schema.toLowerCase().includes(query) ||
        prop.type.toLowerCase().includes(query) ||
        prop.description?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(prop => prop.type === typeFilter);
    }

    // Apply required filter
    if (requiredFilter !== 'all') {
      filtered = filtered.filter(prop => 
        requiredFilter === 'required' ? prop.required : !prop.required
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'property':
          comparison = a.property.localeCompare(b.property);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'schema':
          comparison = a.schema.localeCompare(b.schema);
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [searchProperties, propertySearch, typeFilter, requiredFilter, sortBy, sortOrder]);

  const availableTypes = useMemo(() => {
    const types = new Set(searchProperties.map(prop => prop.type));
    return Array.from(types).sort();
  }, [searchProperties]);

  // Enhanced dependency analysis
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
    
    // Build dependency map
    Object.entries(schemas).forEach(([schemaName, schema]) => {
      const deps = findRefs(schema);
      dependencyMap.set(schemaName, deps);
    });
    
    return dependencyMap;
  }, [schemas]);

  const buildDependencyTree = useMemo(() => {
    const tree: { [key: string]: DependencyNode } = {};
    
    // Initialize all nodes
    schemaNames.forEach(name => {
      tree[name] = {
        name,
        dependencies: findSchemaDependencies.get(name) || [],
        level: 0,
        expanded: expandedDependencies.has(name)
      };
    });
    
    return tree;
  }, [schemaNames, findSchemaDependencies, expandedDependencies]);

  // Now the early return after all hooks
  if (!isOpen || !spec) return null;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const toggleSchema = (schemaName: string) => {
    const newExpanded = new Set(expandedSchemas);
    if (newExpanded.has(schemaName)) {
      newExpanded.delete(schemaName);
    } else {
      newExpanded.add(schemaName);
    }
    setExpandedSchemas(newExpanded);
  };

  const toggleDependency = (schemaName: string) => {
    const newExpanded = new Set(expandedDependencies);
    if (newExpanded.has(schemaName)) {
      newExpanded.delete(schemaName);
    } else {
      newExpanded.add(schemaName);
    }
    setExpandedDependencies(newExpanded);
  };

  const toggleNestedDependency = (path: string) => {
    const newExpanded = new Set(nestedExpanded);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setNestedExpanded(newExpanded);
  };

  const generateMockData = (schema: any): any => {
    if (!schema || typeof schema !== 'object') return null;

    if (schema.$ref) {
      const refName = schema.$ref.replace('#/components/schemas/', '');
      return generateMockData(schemas[refName]);
    }

    switch (schema.type) {
      case 'object':
        const obj: any = {};
        if (schema.properties) {
          Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
            obj[key] = generateMockData(prop);
          });
        }
        return obj;
      case 'array':
        return schema.items ? [generateMockData(schema.items)] : [];
      case 'string':
        if (schema.format === 'email') return 'user@example.com';
        if (schema.format === 'date') return '2024-01-01';
        if (schema.format === 'date-time') return '2024-01-01T00:00:00Z';
        if (schema.format === 'uuid') return '123e4567-e89b-12d3-a456-426614174000';
        if (schema.enum) return schema.enum[0];
        return schema.example || 'sample string';
      case 'number':
      case 'integer':
        return schema.example || Math.floor(Math.random() * 100);
      case 'boolean':
        return schema.example !== undefined ? schema.example : Math.random() > 0.5;
      default:
        return schema.example || null;
    }
  };

  const renderNestedDependencies = (schemaName: string, dependencies: string[], level = 0, visited = new Set<string>()): React.ReactNode => {
    if (visited.has(schemaName) || level > 3) {
      return (
        <div className={`ml-${(level + 1) * 4} text-gray-500 dark:text-gray-400 text-sm italic`}>
          {visited.has(schemaName) ? 'Circular reference detected' : 'Max depth reached'}
        </div>
      );
    }

    visited.add(schemaName);

    return dependencies.map(dep => {
      const depDependencies = findSchemaDependencies.get(dep) || [];
      const hasNestedDeps = depDependencies.length > 0;
      const nestedPath = `${schemaName}-${dep}-${level}`;
      const isNestedExpanded = nestedExpanded.has(nestedPath);

      return (
        <div key={nestedPath} className={`ml-${(level + 1) * 4} border-l border-gray-200 dark:border-gray-600 pl-3`}>
          <div className="flex items-center gap-2 py-1">
            {hasNestedDeps && (
              <button
                onClick={() => toggleNestedDependency(nestedPath)}
                className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                {isNestedExpanded ? (
                  <ChevronDown className="h-3 w-3 text-gray-500" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-gray-500" />
                )}
              </button>
            )}
            <Hash className="h-3 w-3 text-blue-500 flex-shrink-0" />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">{dep}</span>
            {hasNestedDeps && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({depDependencies.length} deps)
              </span>
            )}
          </div>
          
          {isNestedExpanded && hasNestedDeps && (
            <div className="mt-1">
              {renderNestedDependencies(dep, depDependencies, level + 1, new Set(visited))}
            </div>
          )}
        </div>
      );
    });
  };

  const renderDependencyTree = () => {
    const rootSchemas = schemaNames.filter(name => {
      // Find schemas that are not dependencies of others (potential roots)
      const isReferenced = Array.from(findSchemaDependencies.values()).some(deps => deps.includes(name));
      return !isReferenced || findSchemaDependencies.get(name)?.length === 0;
    });

    const renderTreeNode = (schemaName: string, level = 0, visited = new Set<string>()): React.ReactNode => {
      if (visited.has(schemaName) || level > 4) return null;
      
      visited.add(schemaName);
      const dependencies = findSchemaDependencies.get(schemaName) || [];
      const hasChildren = dependencies.length > 0;
      const isExpanded = expandedDependencies.has(schemaName);

      return (
        <div key={`${schemaName}-${level}`} className="relative">
          <div className={`flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded ${level > 0 ? 'ml-6' : ''}`}>
            {hasChildren && (
              <button
                onClick={() => toggleDependency(schemaName)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
            )}
            
            <div className={`w-3 h-3 rounded-full ${
              level === 0 ? 'bg-blue-500' :
              level === 1 ? 'bg-green-500' :
              level === 2 ? 'bg-yellow-500' :
              'bg-purple-500'
            }`} />
            
            <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
              {schemaName}
            </span>
            
            {hasChildren && (
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                {dependencies.length} deps
              </span>
            )}
          </div>
          
          {isExpanded && hasChildren && (
            <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-600 pl-2">
              {dependencies.map(dep => renderTreeNode(dep, level + 1, new Set(visited)))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-2">
        {rootSchemas.length > 0 ? (
          rootSchemas.map(schema => renderTreeNode(schema))
        ) : (
          // If no clear roots, show all schemas
          schemaNames.slice(0, 10).map(schema => renderTreeNode(schema))
        )}
      </div>
    );
  };

  const tabs = [
    { id: 'schemas', label: 'Schemas', icon: Database },
    { id: 'dependencies', label: 'Dependencies', icon: GitBranch },
    { id: 'properties', label: 'Property Search', icon: Search },
    { id: 'mock', label: 'Mock Data', icon: Shuffle }
  ];

  const filteredSchemas = schemaNames.filter(name => 
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSort = (field: 'property' | 'type' | 'schema') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: 'property' | 'type' | 'schema') => {
    if (sortBy !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Schema Explorer
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Explore {schemaNames.length} schemas, dependencies, and generate mock data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 px-6 py-3 font-medium transition-colors whitespace-nowrap
                  ${isActive 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Schemas Tab */}
          {activeTab === 'schemas' && (
            <div className="h-full flex">
              {/* Schema List */}
              <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search schemas..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-2">
                    {filteredSchemas.map(schemaName => (
                      <button
                        key={schemaName}
                        onClick={() => setSelectedSchema(schemaName)}
                        className={`
                          w-full text-left p-3 rounded-lg transition-colors
                          ${selectedSchema === schemaName 
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-700' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <Type className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium truncate">{schemaName}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Schema Details */}
              <div className="flex-1 flex flex-col">
                {selectedSchema ? (
                  <>
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {selectedSchema}
                        </h3>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(schemas[selectedSchema], null, 2), selectedSchema)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                        >
                          {copiedText === selectedSchema ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          Copy Schema
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="bg-gray-900 rounded-lg p-4">
                        <pre className="text-green-400 text-sm overflow-x-auto">
                          <code>{JSON.stringify(schemas[selectedSchema], null, 2)}</code>
                        </pre>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <Database className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Select a schema to view details</p>
                      <p className="text-sm">Choose from {schemaNames.length} available schemas</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Dependencies Tab */}
          {activeTab === 'dependencies' && (
            <div className="h-full flex flex-col">
              {/* View Toggle */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Schema Dependencies
                  </h3>
                  <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => setDependencyView('list')}
                      className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                        ${dependencyView === 'list'
                          ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }
                      `}
                    >
                      <List className="h-4 w-4" />
                      List View
                    </button>
                    <button
                      onClick={() => setDependencyView('tree')}
                      className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                        ${dependencyView === 'tree'
                          ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }
                      `}
                    >
                      <Network className="h-4 w-4" />
                      Tree View
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {dependencyView === 'list' ? (
                  // Enhanced List View with Nested Dependencies
                  <div className="space-y-4">
                    {schemaNames.map(schemaName => {
                      const dependencies = findSchemaDependencies.get(schemaName) || [];
                      const isExpanded = expandedDependencies.has(schemaName);
                      
                      return (
                        <div key={schemaName} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleDependency(schemaName)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-gray-500" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-gray-500" />
                              )}
                              <GitBranch className="h-5 w-5 text-blue-600" />
                              <span className="font-medium text-gray-900 dark:text-white">{schemaName}</span>
                            </div>
                            <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                              dependencies.length > 0 
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                              {dependencies.length} dependencies
                            </span>
                          </button>
                          
                          {isExpanded && (
                            <div className="px-4 pb-4 bg-gray-50 dark:bg-gray-700/50">
                              {dependencies.length > 0 ? (
                                <div className="space-y-2">
                                  {renderNestedDependencies(schemaName, dependencies)}
                                </div>
                              ) : (
                                <p className="text-gray-500 dark:text-gray-400 text-sm italic">No dependencies found</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Visual Tree View
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Dependency Tree Visualization
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Click on schema nodes to expand their dependencies. Colors indicate depth levels.
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                      {renderDependencyTree()}
                    </div>
                    
                    {/* Legend */}
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Legend:</h5>
                      <div className="flex flex-wrap gap-4 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="text-gray-600 dark:text-gray-400">Root Schemas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-gray-600 dark:text-gray-400">Level 1 Dependencies</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <span className="text-gray-600 dark:text-gray-400">Level 2 Dependencies</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                          <span className="text-gray-600 dark:text-gray-400">Level 3+ Dependencies</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Property Search Tab */}
          {activeTab === 'properties' && (
            <div className="h-full flex flex-col">
              {/* Filters */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={propertySearch}
                      onChange={(e) => setPropertySearch(e.target.value)}
                      placeholder="Search properties..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="all">All Types</option>
                    {availableTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  
                  <select
                    value={requiredFilter}
                    onChange={(e) => setRequiredFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="all">All Properties</option>
                    <option value="required">Required Only</option>
                    <option value="optional">Optional Only</option>
                  </select>
                  
                  <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    {filteredAndSortedProperties.length} of {searchProperties.length} properties
                  </div>
                </div>
              </div>

              {/* Results Table */}
              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-900 dark:text-white">
                          <button
                            onClick={() => toggleSort('property')}
                            className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                          >
                            Property
                            {getSortIcon('property')}
                          </button>
                        </th>
                        <th className="text-left p-4 font-medium text-gray-900 dark:text-white">
                          <button
                            onClick={() => toggleSort('type')}
                            className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                          >
                            Type
                            {getSortIcon('type')}
                          </button>
                        </th>
                        <th className="text-left p-4 font-medium text-gray-900 dark:text-white">
                          <button
                            onClick={() => toggleSort('schema')}
                            className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                          >
                            Schema
                            {getSortIcon('schema')}
                          </button>
                        </th>
                        <th className="text-left p-4 font-medium text-gray-900 dark:text-white">Path</th>
                        <th className="text-left p-4 font-medium text-gray-900 dark:text-white">Required</th>
                        <th className="text-left p-4 font-medium text-gray-900 dark:text-white">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredAndSortedProperties.map((result, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              <span className="font-medium text-gray-900 dark:text-white">{result.property}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 text-xs rounded font-medium ${
                              result.type === 'string' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              result.type === 'number' || result.type === 'integer' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              result.type === 'boolean' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                              result.type === 'array' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                              result.type === 'object' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              {result.type}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-700 dark:text-gray-300 font-mono text-sm">{result.schema}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-600 dark:text-gray-400 font-mono text-sm">{result.path}</span>
                          </td>
                          <td className="p-4">
                            {result.required ? (
                              <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs rounded font-medium">
                                Required
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 text-xs rounded font-medium">
                                Optional
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="text-gray-600 dark:text-gray-400 text-sm">
                              {result.description || 'No description'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filteredAndSortedProperties.length === 0 && (
                    <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                      <div className="text-center">
                        <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No properties found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mock Data Tab */}
          {activeTab === 'mock' && (
            <div className="h-full flex">
              {/* Schema List */}
              <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-gray-900 dark:text-white">Select Schema for Mock Data</h4>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-2">
                    {schemaNames.map(schemaName => (
                      <button
                        key={schemaName}
                        onClick={() => setSelectedSchema(schemaName)}
                        className={`
                          w-full text-left p-3 rounded-lg transition-colors
                          ${selectedSchema === schemaName 
                            ? 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 border border-green-200 dark:border-green-700' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <Shuffle className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium truncate">{schemaName}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mock Data Display */}
              <div className="flex-1 flex flex-col">
                {selectedSchema ? (
                  <>
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Mock Data: {selectedSchema}
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedSchema(selectedSchema)} // Regenerate
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                          >
                            <Shuffle className="h-4 w-4" />
                            Regenerate
                          </button>
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(generateMockData(schemas[selectedSchema]), null, 2), `mock-${selectedSchema}`)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                          >
                            {copiedText === `mock-${selectedSchema}` ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="bg-gray-900 rounded-lg p-4">
                        <pre className="text-green-400 text-sm overflow-x-auto">
                          <code>{JSON.stringify(generateMockData(schemas[selectedSchema]), null, 2)}</code>
                        </pre>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <Shuffle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Select a schema to generate mock data</p>
                      <p className="text-sm">Choose from {schemaNames.length} available schemas</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};