import React, { useState } from 'react';
import { 
  Code, 
  Copy, 
  CheckCircle, 
  Download, 
  Eye, 
  Type,
  Shuffle,
  FileText
} from 'lucide-react';
import { EndpointData, OpenAPISpec } from '../types/openapi';

interface CodeGeneratorProps {
  spec: OpenAPISpec;
  endpoints: EndpointData[];
  isOpen: boolean;
  onClose: () => void;
}

export const CodeGenerator: React.FC<CodeGeneratorProps> = ({ 
  spec, 
  endpoints, 
  isOpen, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'examples' | 'types' | 'mock' | 'docs'>('examples');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'curl' | 'javascript' | 'python' | 'typescript'>('curl');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

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
    
    if (endpoint.parameters?.some(p => p.in === 'header')) {
      curl += ` \\\n  -H "Content-Type: application/json"`;
    }
    
    if (endpoint.security && endpoint.security.length > 0) {
      curl += ` \\\n  -H "Authorization: Bearer YOUR_TOKEN"`;
    }
    
    if (endpoint.requestBody && (method === 'post' || method === 'put' || method === 'patch')) {
      curl += ` \\\n  -d '${JSON.stringify(generateMockRequestBody(endpoint), null, 2)}'`;
    }
    
    return curl;
  };

  const generateJavaScriptExample = (endpoint: EndpointData): string => {
    const hasBody = endpoint.requestBody && ['post', 'put', 'patch'].includes(endpoint.method.toLowerCase());
    const hasAuth = endpoint.security && endpoint.security.length > 0;
    
    return `const response = await fetch('${endpoint.path}', {
  method: '${endpoint.method}',
  headers: {
    'Content-Type': 'application/json',${hasAuth ? `
    'Authorization': 'Bearer YOUR_TOKEN',` : ''}
  },${hasBody ? `
  body: JSON.stringify(${JSON.stringify(generateMockRequestBody(endpoint), null, 4).replace(/^/gm, '    ')}),` : ''}
});

if (!response.ok) {
  throw new Error(\`HTTP error! status: \${response.status}\`);
}

const data = await response.json();
console.log(data);`;
  };

  const generatePythonExample = (endpoint: EndpointData): string => {
    const hasBody = endpoint.requestBody && ['post', 'put', 'patch'].includes(endpoint.method.toLowerCase());
    const hasAuth = endpoint.security && endpoint.security.length > 0;
    
    return `import requests
import json

url = "${endpoint.path}"
headers = {
    "Content-Type": "application/json"${hasAuth ? `,
    "Authorization": "Bearer YOUR_TOKEN"` : ''}
}

${hasBody ? `data = ${JSON.stringify(generateMockRequestBody(endpoint), null, 4)}

response = requests.${endpoint.method.toLowerCase()}(url, headers=headers, json=data)` : `response = requests.${endpoint.method.toLowerCase()}(url, headers=headers)`}

if response.status_code == 200:
    result = response.json()
    print(json.dumps(result, indent=2))
else:
    print(f"Error: {response.status_code} - {response.text}")`;
  };

  const generateTypeScriptExample = (endpoint: EndpointData): string => {
    const hasBody = endpoint.requestBody && ['post', 'put', 'patch'].includes(endpoint.method.toLowerCase());
    const hasAuth = endpoint.security && endpoint.security.length > 0;
    
    return `interface ApiResponse {
  // Define your response type based on the API schema
  [key: string]: any;
}

${hasBody ? `interface RequestData {
  // Define your request data type based on the API schema
  [key: string]: any;
}

` : ''}const response = await fetch('${endpoint.path}', {
  method: '${endpoint.method}',
  headers: {
    'Content-Type': 'application/json',${hasAuth ? `
    'Authorization': 'Bearer YOUR_TOKEN',` : ''}
  },${hasBody ? `
  body: JSON.stringify(${JSON.stringify(generateMockRequestBody(endpoint), null, 4).replace(/^/gm, '    ')} as RequestData),` : ''}
});

if (!response.ok) {
  throw new Error(\`HTTP error! status: \${response.status}\`);
}

const data: ApiResponse = await response.json();
console.log(data);`;
  };

  const generateMockRequestBody = (endpoint: EndpointData): any => {
    // Simplified mock data generation
    return {
      "example": "data",
      "id": 123,
      "name": "Sample Item",
      "active": true
    };
  };

  const generateTypeScriptTypes = (): string => {
    const schemas = spec.components?.schemas || {};
    let types = '// Generated TypeScript types from OpenAPI specification\n\n';
    
    Object.entries(schemas).forEach(([name, schema]: [string, any]) => {
      types += `export interface ${name} {\n`;
      
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
          const isRequired = schema.required?.includes(propName);
          const propType = getTypeScriptType(propSchema);
          types += `  ${propName}${isRequired ? '' : '?'}: ${propType};\n`;
        });
      }
      
      types += '}\n\n';
    });
    
    return types;
  };

  const getTypeScriptType = (schema: any): string => {
    if (schema.$ref) {
      return schema.$ref.replace('#/components/schemas/', '');
    }
    
    switch (schema.type) {
      case 'string':
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return `${getTypeScriptType(schema.items)}[]`;
      case 'object':
        return 'object';
      default:
        return 'any';
    }
  };

  const generateMockDataFile = (): string => {
    const schemas = spec.components?.schemas || {};
    let mockData = '// Generated mock data for testing\n\n';
    
    Object.entries(schemas).forEach(([name, schema]: [string, any]) => {
      mockData += `export const mock${name} = ${JSON.stringify(generateSchemaExample(schema), null, 2)};\n\n`;
    });
    
    return mockData;
  };

  const generateSchemaExample = (schema: any): any => {
    if (schema.type === 'object' && schema.properties) {
      const example: any = {};
      Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
        example[propName] = generatePropertyExample(propSchema);
      });
      return example;
    }
    return generatePropertyExample(schema);
  };

  const generatePropertyExample = (schema: any): any => {
    switch (schema.type) {
      case 'string':
        return schema.example || 'sample string';
      case 'number':
      case 'integer':
        return schema.example || 42;
      case 'boolean':
        return schema.example !== undefined ? schema.example : true;
      case 'array':
        return [generatePropertyExample(schema.items)];
      default:
        return null;
    }
  };

  const generateDocumentation = (): string => {
    let docs = `# ${spec.info.title} API Documentation\n\n`;
    docs += `Version: ${spec.info.version}\n\n`;
    
    if (spec.info.description) {
      docs += `${spec.info.description}\n\n`;
    }
    
    docs += '## Endpoints\n\n';
    
    endpoints.forEach(endpoint => {
      docs += `### ${endpoint.method} ${endpoint.path}\n\n`;
      
      if (endpoint.summary) {
        docs += `**Summary:** ${endpoint.summary}\n\n`;
      }
      
      if (endpoint.description) {
        docs += `**Description:** ${endpoint.description}\n\n`;
      }
      
      if (endpoint.parameters.length > 0) {
        docs += '**Parameters:**\n\n';
        docs += '| Name | In | Type | Required | Description |\n';
        docs += '|------|----|----- |----------|-------------|\n';
        endpoint.parameters.forEach(param => {
          docs += `| ${param.name} | ${param.in} | ${param.schema?.type || 'N/A'} | ${param.required ? 'Yes' : 'No'} | ${param.description || 'N/A'} |\n`;
        });
        docs += '\n';
      }
      
      docs += '**Example:**\n\n';
      docs += '```bash\n';
      docs += generateCurlExample(endpoint);
      docs += '\n```\n\n';
      docs += '---\n\n';
    });
    
    return docs;
  };

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Code className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Code Generator
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate code examples, types, and documentation
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
          {/* Code Examples Tab */}
          {activeTab === 'examples' && (
            <div className="h-full flex">
              {/* Endpoint List */}
              <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                <div className="p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4">Select Endpoint</h4>
                  <div className="space-y-2">
                    {endpoints.map(endpoint => {
                      const endpointId = `${endpoint.method}_${endpoint.path}`;
                      return (
                        <button
                          key={endpointId}
                          onClick={() => setSelectedEndpoint(endpointId)}
                          className={`
                            w-full text-left p-3 rounded-lg transition-colors
                            ${selectedEndpoint === endpointId 
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' 
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }
                          `}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              endpoint.method === 'GET' ? 'bg-green-500 text-white' :
                              endpoint.method === 'POST' ? 'bg-blue-500 text-white' :
                              endpoint.method === 'PUT' ? 'bg-orange-500 text-white' :
                              endpoint.method === 'DELETE' ? 'bg-red-500 text-white' :
                              'bg-gray-500 text-white'
                            }`}>
                              {endpoint.method}
                            </span>
                          </div>
                          <div className="text-sm font-mono">{endpoint.path}</div>
                          {endpoint.summary && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {endpoint.summary}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Code Display */}
              <div className="flex-1 overflow-y-auto">
                {selectedEndpointData ? (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
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
                    
                    <div className="bg-gray-900 rounded-lg p-4">
                      <pre className="text-green-400 text-sm overflow-x-auto">
                        <code>{generateCodeExample(selectedEndpointData, selectedLanguage)}</code>
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select an endpoint to generate code examples</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TypeScript Types Tab */}
          {activeTab === 'types' && (
            <div className="p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  TypeScript Interface Definitions
                </h3>
                <button
                  onClick={() => copyToClipboard(generateTypeScriptTypes(), 'typescript-types')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                >
                  {copiedText === 'typescript-types' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copy Types
                </button>
              </div>
              
              <div className="bg-gray-900 rounded-lg p-4">
                <pre className="text-green-400 text-sm overflow-x-auto">
                  <code>{generateTypeScriptTypes()}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Mock Data Tab */}
          {activeTab === 'mock' && (
            <div className="p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
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
                  Copy Mock Data
                </button>
              </div>
              
              <div className="bg-gray-900 rounded-lg p-4">
                <pre className="text-green-400 text-sm overflow-x-auto">
                  <code>{generateMockDataFile()}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Documentation Tab */}
          {activeTab === 'docs' && (
            <div className="p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
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
              
              <div className="bg-gray-900 rounded-lg p-4">
                <pre className="text-green-400 text-sm overflow-x-auto">
                  <code>{generateDocumentation()}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};