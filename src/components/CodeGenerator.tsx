import React, { useState, useMemo } from 'react';
import { 
  Code, 
  Copy, 
  CheckCircle, 
  Download, 
  Eye, 
  Type,
  Shuffle,
  FileText,
  X,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Tag
} from 'lucide-react';
import { EndpointData, OpenAPISpec } from '../types/openapi';

interface CodeGeneratorProps {
  spec: OpenAPISpec | null;
  endpoints: EndpointData[];
  isOpen: boolean;
  onClose: () => void;
}

interface TypeDefinition {
  name: string;
  type: string;
  properties: number;
  required: number;
  description?: string;
}

export const CodeGenerator: React.FC<CodeGeneratorProps> = ({ 
  spec, 
  endpoints, 
  isOpen, 
  onClose 
}) => {
  // Early return BEFORE any hooks
  if (!isOpen || !spec) return null;

  const [activeTab, setActiveTab] = useState<'examples' | 'types' | 'mock' | 'docs'>('examples');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'curl' | 'javascript' | 'python' | 'typescript'>('curl');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  // TypeScript types filtering and sorting with collapsible state
  const [typeSearch, setTypeSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [typeSortBy, setTypeSortBy] = useState<'name' | 'properties' | 'required'>('name');
  const [typeSortOrder, setTypeSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  
  // Mock data collapsible state
  const [expandedMockSchemas, setExpandedMockSchemas] = useState<Set<string>>(new Set());
  
  // Endpoint filtering with tag support
  const [endpointSearch, setEndpointSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const generateCodeExample = (endpoint: EndpointData, language: string): string => {
    switch (language) {
      case 'curl':
        return generateCurlExample(endpoint);
      case 'javascript':
        return generateJavaScriptExample(endpoint);
      case 'python':
        return generatePythonExample(endpoint);
      case 'typescript':
        return generateTypeScriptExample(endpoint);
      default:
        return '';
    }
  };

  const generateCurlExample = (endpoint: EndpointData): string => {
    const method = endpoint.method.toLowerCase();
    let curl = `curl -X ${endpoint.method} "${endpoint.path}"`;
    
    // Add headers
    const headers = [];
    if (endpoint.parameters?.some(p => p.in === 'header')) {
      headers.push('"Content-Type: application/json"');
    }
    
    if (endpoint.security && endpoint.security.length > 0) {
      headers.push('"Authorization: Bearer YOUR_TOKEN"');
    }
    
    if (headers.length > 0) {
      curl += ` \\\n  -H ${headers.join(' \\\n  -H ')}`;
    }
    
    // Add query parameters example
    const queryParams = endpoint.parameters?.filter(p => p.in === 'query');
    if (queryParams && queryParams.length > 0) {
      const params = queryParams.map(p => `${p.name}=example_value`).join('&');
      curl = curl.replace(endpoint.path, `${endpoint.path}?${params}`);
    }
    
    // Add request body
    if (endpoint.requestBody && (method === 'post' || method === 'put' || method === 'patch')) {
      const mockBody = generateMockRequestBody(endpoint);
      curl += ` \\\n  -d '${JSON.stringify(mockBody, null, 2)}'`;
    }
    
    return curl;
  };

  const generateJavaScriptExample = (endpoint: EndpointData): string => {
    const hasBody = endpoint.requestBody && ['post', 'put', 'patch'].includes(endpoint.method.toLowerCase());
    const hasAuth = endpoint.security && endpoint.security.length > 0;
    const queryParams = endpoint.parameters?.filter(p => p.in === 'query');
    
    let code = '';
    
    // Add query parameters handling
    if (queryParams && queryParams.length > 0) {
      code += `// Query parameters\n`;
      code += `const params = new URLSearchParams({\n`;
      queryParams.forEach(param => {
        code += `  ${param.name}: 'example_value', // ${param.description || 'No description'}\n`;
      });
      code += `});\n\n`;
    }
    
    code += `const response = await fetch('${endpoint.path}${queryParams && queryParams.length > 0 ? '?' + '${params}' : ''}', {\n`;
    code += `  method: '${endpoint.method}',\n`;
    code += `  headers: {\n`;
    code += `    'Content-Type': 'application/json',`;
    
    if (hasAuth) {
      code += `\n    'Authorization': 'Bearer YOUR_TOKEN',`;
    }
    
    code += `\n  },`;
    
    if (hasBody) {
      const mockBody = generateMockRequestBody(endpoint);
      code += `\n  body: JSON.stringify(${JSON.stringify(mockBody, null, 4).replace(/^/gm, '    ')}),`;
    }
    
    code += `\n});\n\n`;
    code += `if (!response.ok) {\n`;
    code += `  throw new Error(\`HTTP error! status: \${response.status}\`);\n`;
    code += `}\n\n`;
    code += `const data = await response.json();\n`;
    code += `console.log(data);`;
    
    return code;
  };

  const generatePythonExample = (endpoint: EndpointData): string => {
    const hasBody = endpoint.requestBody && ['post', 'put', 'patch'].includes(endpoint.method.toLowerCase());
    const hasAuth = endpoint.security && endpoint.security.length > 0;
    const queryParams = endpoint.parameters?.filter(p => p.in === 'query');
    
    let code = `import requests\nimport json\n\n`;
    
    code += `url = "${endpoint.path}"\n`;
    
    // Headers
    code += `headers = {\n`;
    code += `    "Content-Type": "application/json"`;
    if (hasAuth) {
      code += `,\n    "Authorization": "Bearer YOUR_TOKEN"`;
    }
    code += `\n}\n\n`;
    
    // Query parameters
    if (queryParams && queryParams.length > 0) {
      code += `params = {\n`;
      queryParams.forEach(param => {
        code += `    "${param.name}": "example_value",  # ${param.description || 'No description'}\n`;
      });
      code += `}\n\n`;
    }
    
    // Request body
    if (hasBody) {
      const mockBody = generateMockRequestBody(endpoint);
      code += `data = ${JSON.stringify(mockBody, null, 4).replace(/^/gm, '')}\n\n`;
    }
    
    // Make request
    code += `response = requests.${endpoint.method.toLowerCase()}(\n`;
    code += `    url,\n`;
    code += `    headers=headers,\n`;
    if (queryParams && queryParams.length > 0) {
      code += `    params=params,\n`;
    }
    if (hasBody) {
      code += `    json=data\n`;
    }
    code += `)\n\n`;
    
    code += `if response.status_code == 200:\n`;
    code += `    result = response.json()\n`;
    code += `    print(json.dumps(result, indent=2))\n`;
    code += `else:\n`;
    code += `    print(f"Error: {response.status_code} - {response.text}")`;
    
    return code;
  };

  const generateTypeScriptExample = (endpoint: EndpointData): string => {
    const hasBody = endpoint.requestBody && ['post', 'put', 'patch'].includes(endpoint.method.toLowerCase());
    const hasAuth = endpoint.security && endpoint.security.length > 0;
    const queryParams = endpoint.parameters?.filter(p => p.in === 'query');
    
    let code = `// Type definitions\n`;
    code += `interface ApiResponse {\n`;
    code += `  // Define your response type based on the API schema\n`;
    code += `  [key: string]: any;\n`;
    code += `}\n\n`;
    
    if (hasBody) {
      code += `interface RequestData {\n`;
      code += `  // Define your request data type based on the API schema\n`;
      code += `  [key: string]: any;\n`;
      code += `}\n\n`;
    }
    
    if (queryParams && queryParams.length > 0) {
      code += `interface QueryParams {\n`;
      queryParams.forEach(param => {
        const optional = param.required ? '' : '?';
        code += `  ${param.name}${optional}: string; // ${param.description || 'No description'}\n`;
      });
      code += `}\n\n`;
      
      code += `const params: QueryParams = {\n`;
      queryParams.forEach(param => {
        if (param.required) {
          code += `  ${param.name}: 'example_value',\n`;
        }
      });
      code += `};\n\n`;
      
      code += `const queryString = new URLSearchParams(params as any).toString();\n\n`;
    }
    
    code += `const response = await fetch('${endpoint.path}${queryParams && queryParams.length > 0 ? '?' + '${queryString}' : ''}', {\n`;
    code += `  method: '${endpoint.method}',\n`;
    code += `  headers: {\n`;
    code += `    'Content-Type': 'application/json',`;
    
    if (hasAuth) {
      code += `\n    'Authorization': 'Bearer YOUR_TOKEN',`;
    }
    
    code += `\n  },`;
    
    if (hasBody) {
      const mockBody = generateMockRequestBody(endpoint);
      code += `\n  body: JSON.stringify(${JSON.stringify(mockBody, null, 4).replace(/^/gm, '    ')} as RequestData),`;
    }
    
    code += `\n});\n\n`;
    code += `if (!response.ok) {\n`;
    code += `  throw new Error(\`HTTP error! status: \${response.status}\`);\n`;
    code += `}\n\n`;
    code += `const data: ApiResponse = await response.json();\n`;
    code += `console.log(data);`;
    
    return code;
  };

  const generateMockRequestBody = (endpoint: EndpointData): any => {
    // Enhanced mock data generation based on endpoint context
    const pathSegments = endpoint.path.split('/').filter(Boolean);
    const resourceName = pathSegments[pathSegments.length - 1];
    
    if (endpoint.method === 'POST') {
      return {
        name: `New ${resourceName}`,
        description: `A sample ${resourceName} description`,
        active: true,
        createdAt: new Date().toISOString()
      };
    } else if (endpoint.method === 'PUT' || endpoint.method === 'PATCH') {
      return {
        id: 123,
        name: `Updated ${resourceName}`,
        description: `Updated ${resourceName} description`,
        active: true,
        updatedAt: new Date().toISOString()
      };
    }
    
    return {
      example: "data",
      id: 123,
      name: "Sample Item",
      active: true
    };
  };

  const generateTypeScriptTypes = (): string => {
    const schemas = spec.components?.schemas || {};
    let types = `// Generated TypeScript types from OpenAPI specification\n`;
    types += `// Generated on ${new Date().toISOString()}\n\n`;
    
    Object.entries(schemas).forEach(([name, schema]: [string, any]) => {
      types += `export interface ${name} {\n`;
      
      if (schema.description) {
        types += `  /** ${schema.description} */\n`;
      }
      
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
          const isRequired = schema.required?.includes(propName);
          const propType = getTypeScriptType(propSchema);
          
          if (propSchema.description) {
            types += `  /** ${propSchema.description} */\n`;
          }
          
          types += `  ${propName}${isRequired ? '' : '?'}: ${propType};\n`;
        });
      }
      
      types += '}\n\n';
    });
    
    // Add utility types
    types += `// Utility types\n`;
    types += `export type ApiResponse<T> = {\n`;
    types += `  data: T;\n`;
    types += `  message?: string;\n`;
    types += `  success: boolean;\n`;
    types += `};\n\n`;
    
    types += `export type PaginatedResponse<T> = {\n`;
    types += `  data: T[];\n`;
    types += `  total: number;\n`;
    types += `  page: number;\n`;
    types += `  limit: number;\n`;
    types += `};\n`;
    
    return types;
  };

  const getTypeScriptType = (schema: any): string => {
    if (schema.$ref) {
      return schema.$ref.replace('#/components/schemas/', '');
    }
    
    switch (schema.type) {
      case 'string':
        if (schema.enum) {
          return schema.enum.map((val: string) => `'${val}'`).join(' | ');
        }
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return `${getTypeScriptType(schema.items)}[]`;
      case 'object':
        if (schema.additionalProperties) {
          return `{ [key: string]: ${getTypeScriptType(schema.additionalProperties)} }`;
        }
        return 'object';
      default:
        return 'any';
    }
  };

  const generateMockDataFile = (): string => {
    const schemas = spec.components?.schemas || {};
    let mockData = `// Generated mock data for testing\n`;
    mockData += `// Generated on ${new Date().toISOString()}\n\n`;
    
    Object.entries(schemas).forEach(([name, schema]: [string, any]) => {
      mockData += `export const mock${name} = ${JSON.stringify(generateSchemaExample(schema), null, 2)};\n\n`;
    });
    
    // Add mock factory functions
    mockData += `// Mock factory functions\n`;
    Object.keys(schemas).forEach(name => {
      mockData += `export const create${name}Mock = (overrides: Partial<${name}> = {}): ${name} => ({\n`;
      mockData += `  ...mock${name},\n`;
      mockData += `  ...overrides\n`;
      mockData += `});\n\n`;
    });
    
    return mockData;
  };

  const generateSchemaExample = (schema: any): any => {
    if (schema.type === 'object' && schema.properties) {
      const example: any = {};
      Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
        example[propName] = generatePropertyExample(propSchema, propName);
      });
      return example;
    }
    return generatePropertyExample(schema);
  };

  const generatePropertyExample = (schema: any, propName?: string): any => {
    if (schema.example !== undefined) return schema.example;
    if (schema.enum) return schema.enum[0];
    
    switch (schema.type) {
      case 'string':
        if (schema.format === 'email') return 'user@example.com';
        if (schema.format === 'date') return '2024-01-01';
        if (schema.format === 'date-time') return new Date().toISOString();
        if (schema.format === 'uuid') return '123e4567-e89b-12d3-a456-426614174000';
        if (propName?.toLowerCase().includes('name')) return 'Sample Name';
        if (propName?.toLowerCase().includes('description')) return 'Sample description';
        return 'sample string';
      case 'number':
      case 'integer':
        if (propName?.toLowerCase().includes('id')) return Math.floor(Math.random() * 1000) + 1;
        if (propName?.toLowerCase().includes('price')) return 99.99;
        return Math.floor(Math.random() * 100);
      case 'boolean':
        return Math.random() > 0.5;
      case 'array':
        return [generatePropertyExample(schema.items)];
      default:
        return null;
    }
  };

  const generateDocumentation = (): string => {
    let docs = `# ${spec.info.title} API Documentation\n\n`;
    docs += `**Version:** ${spec.info.version}\n`;
    docs += `**Generated:** ${new Date().toISOString()}\n\n`;
    
    if (spec.info.description) {
      docs += `## Description\n\n${spec.info.description}\n\n`;
    }
    
    if (spec.servers && spec.servers.length > 0) {
      docs += `## Base URLs\n\n`;
      spec.servers.forEach(server => {
        docs += `- ${server.url}`;
        if (server.description) docs += ` - ${server.description}`;
        docs += '\n';
      });
      docs += '\n';
    }
    
    docs += `## Endpoints\n\n`;
    
    // Group endpoints by tags
    const endpointsByTag: { [tag: string]: EndpointData[] } = {};
    endpoints.forEach(endpoint => {
      if (endpoint.tags.length === 0) {
        if (!endpointsByTag['Untagged']) endpointsByTag['Untagged'] = [];
        endpointsByTag['Untagged'].push(endpoint);
      } else {
        endpoint.tags.forEach(tag => {
          if (!endpointsByTag[tag]) endpointsByTag[tag] = [];
          endpointsByTag[tag].push(endpoint);
        });
      }
    });
    
    Object.entries(endpointsByTag).forEach(([tag, tagEndpoints]) => {
      docs += `### ${tag}\n\n`;
      
      tagEndpoints.forEach(endpoint => {
        docs += `#### ${endpoint.method} ${endpoint.path}\n\n`;
        
        if (endpoint.summary) {
          docs += `**Summary:** ${endpoint.summary}\n\n`;
        }
        
        if (endpoint.description) {
          docs += `**Description:** ${endpoint.description}\n\n`;
        }
        
        if (endpoint.deprecated) {
          docs += `> ⚠️ **This endpoint is deprecated**\n\n`;
        }
        
        if (endpoint.parameters.length > 0) {
          docs += `**Parameters:**\n\n`;
          docs += `| Name | In | Type | Required | Description |\n`;
          docs += `|------|----|----- |----------|-------------|\n`;
          endpoint.parameters.forEach(param => {
            docs += `| ${param.name} | ${param.in} | ${param.schema?.type || 'N/A'} | ${param.required ? 'Yes' : 'No'} | ${param.description || 'N/A'} |\n`;
          });
          docs += '\n';
        }
        
        docs += `**Responses:**\n\n`;
        docs += `| Status Code | Description |\n`;
        docs += `|-------------|-------------|\n`;
        Object.entries(endpoint.responses).forEach(([code, response]) => {
          docs += `| ${code} | ${response.description} |\n`;
        });
        docs += '\n';
        
        docs += `**Example:**\n\n`;
        docs += '```bash\n';
        docs += generateCurlExample(endpoint);
        docs += '\n```\n\n';
        docs += '---\n\n';
      });
    });
    
    return docs;
  };

  // Type definitions for filtering
  const typeDefinitions = useMemo((): TypeDefinition[] => {
    const schemas = spec.components?.schemas || {};
    return Object.entries(schemas).map(([name, schema]: [string, any]) => ({
      name,
      type: schema.type || 'object',
      properties: schema.properties ? Object.keys(schema.properties).length : 0,
      required: schema.required ? schema.required.length : 0,
      description: schema.description
    }));
  }, [spec]);

  const filteredAndSortedTypes = useMemo(() => {
    let filtered = typeDefinitions;

    // Apply search filter
    if (typeSearch) {
      const query = typeSearch.toLowerCase();
      filtered = filtered.filter(type => 
        type.name.toLowerCase().includes(query) ||
        type.description?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(type => type.type === typeFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (typeSortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'properties':
          comparison = a.properties - b.properties;
          break;
        case 'required':
          comparison = a.required - b.required;
          break;
      }
      
      return typeSortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [typeDefinitions, typeSearch, typeFilter, typeSortBy, typeSortOrder]);

  const filteredEndpoints = useMemo(() => {
    let filtered = endpoints;

    if (endpointSearch) {
      const query = endpointSearch.toLowerCase();
      filtered = filtered.filter(ep => 
        ep.path.toLowerCase().includes(query) ||
        ep.summary?.toLowerCase().includes(query) ||
        ep.method.toLowerCase().includes(query)
      );
    }

    if (methodFilter !== 'all') {
      filtered = filtered.filter(ep => ep.method === methodFilter);
    }

    if (tagFilter !== 'all') {
      filtered = filtered.filter(ep => 
        tagFilter === 'untagged' 
          ? ep.tags.length === 0 
          : ep.tags.includes(tagFilter)
      );
    }

    return filtered;
  }, [endpoints, endpointSearch, methodFilter, tagFilter]);

  const availableMethods = useMemo(() => {
    const methods = new Set(endpoints.map(ep => ep.method));
    return Array.from(methods).sort();
  }, [endpoints]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    endpoints.forEach(ep => ep.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [endpoints]);

  const availableTypes = useMemo(() => {
    const types = new Set(typeDefinitions.map(type => type.type));
    return Array.from(types).sort();
  }, [typeDefinitions]);

  const tabs = [
    { id: 'examples', label: 'Code Examples', icon: Code },
    { id: 'types', label: 'TypeScript Types', icon: Type },
    { id: 'mock', label: 'Mock Data', icon: Shuffle },
    { id: 'docs', label: 'Documentation', icon: FileText }
  ];

  const languages = [
    { id: 'curl', label: 'cURL' },
    { id: 'javascript', label: 'JavaScript' },
    { id: 'python', label: 'Python' },
    { id: 'typescript', label: 'TypeScript' }
  ];

  const selectedEndpointData = endpoints.find(ep => 
    selectedEndpoint === `${ep.method}_${ep.path}`
  );

  const toggleTypeSort = (field: 'name' | 'properties' | 'required') => {
    if (typeSortBy === field) {
      setTypeSortOrder(typeSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setTypeSortBy(field);
      setTypeSortOrder('asc');
    }
  };

  const getTypeSortIcon = (field: 'name' | 'properties' | 'required') => {
    if (typeSortBy !== field) return <ArrowUpDown className="h-4 w-4" />;
    return typeSortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />;
  };

  const toggleTypeExpansion = (typeName: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(typeName)) {
      newExpanded.delete(typeName);
    } else {
      newExpanded.add(typeName);
    }
    setExpandedTypes(newExpanded);
  };

  const toggleMockSchemaExpansion = (schemaName: string) => {
    const newExpanded = new Set(expandedMockSchemas);
    if (newExpanded.has(schemaName)) {
      newExpanded.delete(schemaName);
    } else {
      newExpanded.add(schemaName);
    }
    setExpandedMockSchemas(newExpanded);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
              <Code className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Code Generator
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate code examples, types, and documentation for {endpoints.length} endpoints
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
          {/* Code Examples Tab */}
          {activeTab === 'examples' && (
            <div className="h-full flex">
              {/* Endpoint List */}
              <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={endpointSearch}
                        onChange={(e) => setEndpointSearch(e.target.value)}
                        placeholder="Search endpoints..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={methodFilter}
                        onChange={(e) => setMethodFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="all">All Methods</option>
                        {availableMethods.map(method => (
                          <option key={method} value={method}>{method}</option>
                        ))}
                      </select>
                      <select
                        value={tagFilter}
                        onChange={(e) => setTagFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="all">All Tags</option>
                        <option value="untagged">Untagged</option>
                        {availableTags.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </select>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Filter className="h-3 w-3" />
                      {filteredEndpoints.length} of {endpoints.length} endpoints
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-2">
                    {filteredEndpoints.map(endpoint => {
                      const endpointId = `${endpoint.method}_${endpoint.path}`;
                      return (
                        <button
                          key={endpointId}
                          onClick={() => setSelectedEndpoint(endpointId)}
                          className={`
                            w-full text-left p-3 rounded-lg transition-colors
                            ${selectedEndpoint === endpointId 
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-700' 
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }
                          `}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              endpoint.method === 'GET' ? 'bg-green-500 text-white' :
                              endpoint.method === 'POST' ? 'bg-blue-500 text-white' :
                              endpoint.method === 'PUT' ? 'bg-orange-500 text-white' :
                              endpoint.method === 'PATCH' ? 'bg-yellow-500 text-white' :
                              endpoint.method === 'DELETE' ? 'bg-red-500 text-white' :
                              'bg-gray-500 text-white'
                            }`}>
                              {endpoint.method}
                            </span>
                          </div>
                          <div className="text-sm font-mono truncate">{endpoint.path}</div>
                          {endpoint.summary && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                              {endpoint.summary}
                            </div>
                          )}
                          {endpoint.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {endpoint.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded">
                                  <Tag className="h-2.5 w-2.5" />
                                  {tag}
                                </span>
                              ))}
                              {endpoint.tags.length > 2 && (
                                <span className="text-xs text-gray-500">+{endpoint.tags.length - 2}</span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Code Display */}
              <div className="flex-1 flex flex-col">
                {selectedEndpointData ? (
                  <>
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {selectedEndpointData.method} {selectedEndpointData.path}
                        </h3>
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value as any)}
                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            {languages.map(lang => (
                              <option key={lang.id} value={lang.id}>
                                {lang.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => copyToClipboard(
                              generateCodeExample(selectedEndpointData, selectedLanguage), 
                              `${selectedLanguage}-example`
                            )}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                          >
                            {copiedText === `${selectedLanguage}-example` ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                            Copy
                          </button>
                        </div>
                      </div>
                      {selectedEndpointData.summary && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                          {selectedEndpointData.summary}
                        </p>
                      )}
                      {selectedEndpointData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {selectedEndpointData.tags.map(tag => (
                            <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                              <Tag className="h-3 w-3" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="bg-gray-900 rounded-lg p-4">
                        <pre className="text-green-400 text-sm overflow-x-auto">
                          <code>{generateCodeExample(selectedEndpointData, selectedLanguage)}</code>
                        </pre>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <Code className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Select an endpoint to generate code examples</p>
                      <p className="text-sm">Choose from {filteredEndpoints.length} available endpoints</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TypeScript Types Tab */}
          {activeTab === 'types' && (
            <div className="h-full flex flex-col">
              {/* Filters */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={typeSearch}
                      onChange={(e) => setTypeSearch(e.target.value)}
                      placeholder="Search types..."
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
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleTypeSort('name')}
                      className="flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm"
                    >
                      Name {getTypeSortIcon('name')}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      {filteredAndSortedTypes.length} types
                    </div>
                    <button
                      onClick={() => copyToClipboard(generateTypeScriptTypes(), 'typescript-types')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                    >
                      {copiedText === 'typescript-types' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      Copy All
                    </button>
                  </div>
                </div>
              </div>

              {/* Types List - Collapsible */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {filteredAndSortedTypes.map((type, index) => {
                    const isExpanded = expandedTypes.has(type.name);
                    const schema = spec.components?.schemas?.[type.name];
                    
                    return (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleTypeExpansion(type.name)}
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-500" />
                            )}
                            <Type className="h-5 w-5 text-blue-600" />
                            <span className="font-mono font-medium text-gray-900 dark:text-white">{type.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs rounded font-medium">
                              {type.properties} props
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs rounded font-medium">
                              {type.required} required
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (schema) {
                                  const typeCode = `export interface ${type.name} {\n${
                                    schema.properties ? Object.entries(schema.properties).map(([propName, propSchema]: [string, any]) => {
                                      const isRequired = schema.required?.includes(propName);
                                      const propType = getTypeScriptType(propSchema);
                                      return `  ${propName}${isRequired ? '' : '?'}: ${propType};`;
                                    }).join('\n') : ''
                                  }\n}`;
                                  copyToClipboard(typeCode, `type-${type.name}`);
                                }
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors text-sm"
                            >
                              {copiedText === `type-${type.name}` ? (
                                <CheckCircle className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              Copy
                            </button>
                          </div>
                        </button>
                        
                        {isExpanded && schema && (
                          <div className="px-4 pb-4 bg-gray-50 dark:bg-gray-700/50">
                            {type.description && (
                              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                                {type.description}
                              </p>
                            )}
                            <div className="bg-gray-900 rounded-lg p-4">
                              <pre className="text-green-400 text-sm overflow-x-auto">
                                <code>{`export interface ${type.name} {\n${
                                  schema.properties ? Object.entries(schema.properties).map(([propName, propSchema]: [string, any]) => {
                                    const isRequired = schema.required?.includes(propName);
                                    const propType = getTypeScriptType(propSchema);
                                    let line = `  ${propName}${isRequired ? '' : '?'}: ${propType};`;
                                    if (propSchema.description) {
                                      line = `  /** ${propSchema.description} */\n  ${propName}${isRequired ? '' : '?'}: ${propType};`;
                                    }
                                    return line;
                                  }).join('\n') : ''
                                }\n}`}</code>
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {filteredAndSortedTypes.length === 0 && (
                    <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                      <div className="text-center">
                        <Type className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No types found</p>
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
            <div className="h-full flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Mock Data for Testing
                  </h3>
                  <button
                    onClick={() => copyToClipboard(generateMockDataFile(), 'mock-data')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                  >
                    {copiedText === 'mock-data' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Copy All Mock Data
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {Object.keys(spec.components?.schemas || {}).map(schemaName => {
                    const isExpanded = expandedMockSchemas.has(schemaName);
                    const mockData = generateSchemaExample(spec.components?.schemas?.[schemaName]);
                    
                    return (
                      <div key={schemaName} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleMockSchemaExpansion(schemaName)}
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-500" />
                            )}
                            <Shuffle className="h-5 w-5 text-green-600" />
                            <span className="font-mono font-medium text-gray-900 dark:text-white">{schemaName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs rounded font-medium">
                              Mock Data
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(JSON.stringify(mockData, null, 2), `mock-${schemaName}`);
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded transition-colors text-sm"
                            >
                              {copiedText === `mock-${schemaName}` ? (
                                <CheckCircle className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              Copy
                            </button>
                          </div>
                        </button>
                        
                        {isExpanded && (
                          <div className="px-4 pb-4 bg-gray-50 dark:bg-gray-700/50">
                            <div className="bg-gray-900 rounded-lg p-4">
                              <pre className="text-green-400 text-sm overflow-x-auto">
                                <code>{JSON.stringify(mockData, null, 2)}</code>
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {Object.keys(spec.components?.schemas || {}).length === 0 && (
                    <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                      <div className="text-center">
                        <Shuffle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No schemas found</p>
                        <p className="text-sm">No schemas available for mock data generation</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Documentation Tab */}
          {activeTab === 'docs' && (
            <div className="h-full flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Generated Documentation
                  </h3>
                  <button
                    onClick={() => copyToClipboard(generateDocumentation(), 'documentation')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                  >
                    {copiedText === 'documentation' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Copy Docs
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-gray-900 rounded-lg p-4">
                  <pre className="text-green-400 text-sm overflow-x-auto">
                    <code>{generateDocumentation()}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};