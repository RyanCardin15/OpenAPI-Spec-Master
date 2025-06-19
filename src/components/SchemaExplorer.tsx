import React, { useState } from 'react';
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
  Download
} from 'lucide-react';
import { OpenAPISpec } from '../types/openapi';

interface SchemaExplorerProps {
  spec: OpenAPISpec;
  isOpen: boolean;
  onClose: () => void;
}

export const SchemaExplorer: React.FC<SchemaExplorerProps> = ({ spec, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'schemas' | 'dependencies' | 'properties' | 'mock'>('schemas');
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const schemas = spec.components?.schemas || {};
  const schemaNames = Object.keys(schemas);

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
        return schema.example || 'sample string';
      case 'number':
      case 'integer':
        return schema.example || 42;
      case 'boolean':
        return schema.example !== undefined ? schema.example : true;
      default:
        return schema.example || null;
    }
  };

  const findSchemaDependencies = (schemaName: string): string[] => {
    const dependencies = new Set<string>();
    const schema = schemas[schemaName];
    
    const findRefs = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      
      if (obj.$ref && typeof obj.$ref === 'string') {
        const refName = obj.$ref.replace('#/components/schemas/', '');
        if (refName !== schemaName) {
          dependencies.add(refName);
        }
      }
      
      Object.values(obj).forEach(value => {
        if (typeof value === 'object') {
          findRefs(value);
        }
      });
    };
    
    findRefs(schema);
    return Array.from(dependencies);
  };

  const searchProperties = (query: string): Array<{schema: string, property: string, type: string, path: string}> => {
    const results: Array<{schema: string, property: string, type: string, path: string}> = [];
    
    const searchInSchema = (schemaName: string, schema: any, path = '') => {
      if (!schema || typeof schema !== 'object') return;
      
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
          const currentPath = path ? `${path}.${propName}` : propName;
          
          if (propName.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              schema: schemaName,
              property: propName,
              type: propSchema.type || 'unknown',
              path: currentPath
            });
          }
          
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Schema Explorer
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Explore schemas, dependencies, and generate mock data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Eye className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 px-6 py-3 font-medium transition-colors
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
              <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                <div className="p-4">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search schemas..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    {filteredSchemas.map(schemaName => (
                      <button
                        key={schemaName}
                        onClick={() => setSelectedSchema(schemaName)}
                        className={`
                          w-full text-left p-3 rounded-lg transition-colors
                          ${selectedSchema === schemaName 
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <Type className="h-4 w-4" />
                          <span className="font-medium">{schemaName}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Schema Details */}
              <div className="flex-1 overflow-y-auto">
                {selectedSchema ? (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
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
                    
                    <div className="bg-gray-900 rounded-lg p-4">
                      <pre className="text-green-400 text-sm overflow-x-auto">
                        <code>{JSON.stringify(schemas[selectedSchema], null, 2)}</code>
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a schema to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dependencies Tab */}
          {activeTab === 'dependencies' && (
            <div className="p-6 overflow-y-auto">
              <div className="space-y-6">
                {schemaNames.map(schemaName => {
                  const dependencies = findSchemaDependencies(schemaName);
                  const isExpanded = expandedSchemas.has(schemaName);
                  
                  return (
                    <div key={schemaName} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                      <button
                        onClick={() => toggleSchema(schemaName)}
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
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                          {dependencies.length} dependencies
                        </span>
                      </button>
                      
                      {isExpanded && (
                        <div className="px-4 pb-4">
                          {dependencies.length > 0 ? (
                            <div className="space-y-2">
                              {dependencies.map(dep => (
                                <div key={dep} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                  <Hash className="h-4 w-4 text-gray-500" />
                                  <span className="text-gray-700 dark:text-gray-300">{dep}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-sm">No dependencies found</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Property Search Tab */}
          {activeTab === 'properties' && (
            <div className="p-6 overflow-y-auto">
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for properties across all schemas..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {searchQuery && (
                <div className="space-y-4">
                  {searchProperties(searchQuery).map((result, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-gray-900 dark:text-white">{result.property}</span>
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                            {result.type}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Schema:</span> {result.schema}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Path:</span> {result.path}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mock Data Tab */}
          {activeTab === 'mock' && (
            <div className="h-full flex">
              {/* Schema List */}
              <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                <div className="p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4">Select Schema for Mock Data</h4>
                  <div className="space-y-2">
                    {schemaNames.map(schemaName => (
                      <button
                        key={schemaName}
                        onClick={() => setSelectedSchema(schemaName)}
                        className={`
                          w-full text-left p-3 rounded-lg transition-colors
                          ${selectedSchema === schemaName 
                            ? 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <Shuffle className="h-4 w-4" />
                          <span className="font-medium">{schemaName}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mock Data Display */}
              <div className="flex-1 overflow-y-auto">
                {selectedSchema ? (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
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
                    
                    <div className="bg-gray-900 rounded-lg p-4">
                      <pre className="text-green-400 text-sm overflow-x-auto">
                        <code>{JSON.stringify(generateMockData(schemas[selectedSchema]), null, 2)}</code>
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <Shuffle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a schema to generate mock data</p>
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