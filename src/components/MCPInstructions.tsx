import React from 'react';
import { X, Copy, CheckCircle, Terminal, Settings, Zap, Code, FileText, Globe, Server, ChevronDown, ChevronUp, Search, BarChart3, Shield, Download, Wrench, Eye, Package, Database, GitBranch, CheckSquare, Key, Shuffle, Trash2, TrendingUp } from 'lucide-react';

interface MCPInstructionsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MCPInstructions: React.FC<MCPInstructionsProps> = ({ isOpen, onClose }) => {
  const [copiedText, setCopiedText] = React.useState<string | null>(null);
  const [isConnectSectionOpen, setIsConnectSectionOpen] = React.useState(false);
  const [isVSCodeSectionOpen, setIsVSCodeSectionOpen] = React.useState(false);

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

  const claudeConfigNpx = `{
  "mcpServers": {
    "openapi-explorer": {
      "command": "npx",
      "args": ["openapi-explorer", "mcp"]
    }
  }
}`;

  const claudeConfigNpxHttp = `{
  "mcpServers": {
    "openapi-explorer-http": {
      "command": "npx",
      "args": ["openapi-explorer", "mcp", "--http", "--port", "3001"]
    }
  }
}`;

  const claudeConfig = `{
  "mcpServers": {
    "openapi-explorer": {
      "command": "node",
      "args": ["path/to/your/openapi-explorer/dist/mcp/server.js"],
      "env": {}
    }
  }
}`;

  const claudeHttpConfig = `{
  "mcpServers": {
    "openapi-explorer-http": {
      "command": "node",
      "args": ["path/to/your/openapi-explorer/dist/mcp/http-server.js"],
      "env": {
        "PORT": "3001"
      }
    }
  }
}`;

  const npxCommands = `# Quick start - no installation needed!
npx openapi-explorer mcp

# HTTP transport with custom port
npx openapi-explorer mcp --http --port 3001

# Show setup instructions
npx openapi-explorer setup

# Start web interface (development mode)
npx openapi-explorer web`;

  const installCommands = `# Option 1: Use npx (recommended - no installation needed)
npx openapi-explorer mcp

# Option 2: Install globally
npm install -g openapi-explorer
openapi-explorer mcp

# Option 3: Clone and build from source
git clone <repository-url>
cd openapi-explorer
npm install
npm run build:all`;

  const testCommands = `# Test with npx (easiest)
npx openapi-explorer mcp

# Test HTTP server
npx openapi-explorer mcp --http

# Check if it's working
curl http://localhost:3001/health  # (for HTTP mode)`;

  const httpExamples = `# Health check
curl http://localhost:3001/health

# List available tools
curl -X POST http://localhost:3001/mcp/tools/list

# Load an OpenAPI spec
curl -X POST http://localhost:3001/mcp/tools/call \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "load_openapi_spec",
    "arguments": {
      "source": "https://petstore.swagger.io/v2/swagger.json",
      "sourceType": "url"
    }
  }'

# Search endpoints
curl -X POST http://localhost:3001/mcp/tools/call \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "search_endpoints",
    "arguments": {
      "query": "user",
      "methods": ["GET", "POST"]
    }
  }'`;

  const streamingExample = `# Server-sent events stream
curl -N http://localhost:3001/mcp/stream

# Streaming tool execution
curl -X POST http://localhost:3001/mcp/execute \\
  -H "Content-Type: application/json" \\
  -d '{
    "tool": "get_api_overview",
    "args": {},
    "stream": true
  }'`;

  const mcpTools = [
    {
      name: 'load_openapi_spec',
      title: 'Load OpenAPI Spec',
      description: 'Load and parse OpenAPI specifications from text, URL, or file content',
      icon: FileText,
      category: 'core',
      color: 'blue',
      features: ['JSON/YAML support', 'URL loading', 'Swagger 2.0 conversion']
    },
    {
      name: 'get_api_overview',
      title: 'API Overview',
      description: 'Get comprehensive overview including statistics and analytics',
      icon: Eye,
      category: 'core',
      color: 'green',
      features: ['Basic info', 'Statistics', 'Method distribution']
    },
    {
      name: 'search_endpoints',
      title: 'Search Endpoints',
      description: 'Search and filter API endpoints with advanced criteria',
      icon: Search,
      category: 'core',
      color: 'purple',
      features: ['Text search', 'Method filtering', 'Tag filtering', 'Complexity filtering']
    },
    {
      name: 'get_endpoint_details',
      title: 'Endpoint Details',
      description: 'Get detailed information about specific endpoints',
      icon: Wrench,
      category: 'core',
      color: 'orange',
      features: ['Parameters', 'Responses', 'Security info', 'Business context']
    },
    {
      name: 'generate_code_examples',
      title: 'Code Examples',
      description: 'Generate code examples in multiple programming languages',
      icon: Code,
      category: 'development',
      color: 'indigo',
      features: ['cURL', 'JavaScript', 'Python', 'TypeScript']
    },
    {
      name: 'get_api_analytics',
      title: 'API Analytics',
      description: 'Comprehensive analytics and insights about the API',
      icon: BarChart3,
      category: 'analysis',
      color: 'pink',
      features: ['Distributions', 'Complexity analysis', 'Security coverage']
    },
    {
      name: 'validate_api_design',
      title: 'Design Validation',
      description: 'Analyze API design and provide improvement recommendations',
      icon: Shield,
      category: 'analysis',
      color: 'emerald',
      features: ['Security validation', 'Documentation check', 'Best practices']
    },
    {
      name: 'export_documentation',
      title: 'Export Documentation',
      description: 'Export API documentation in various formats',
      icon: Download,
      category: 'documentation',
      color: 'red',
      features: ['Markdown', 'JSON', 'Summary', 'Code examples']
    },
    {
      name: 'search_request_body_properties',
      title: 'Search Properties',
      description: 'Deep search through request body schemas for specific properties and patterns',
      icon: Database,
      category: 'analysis',
      color: 'cyan',
      features: ['Property search', 'Type filtering', 'Regex patterns', 'Nested traversal']
    },
    {
      name: 'generate_typescript_types',
      title: 'TypeScript Types',
      description: 'Generate TypeScript interfaces and types from OpenAPI schemas',
      icon: Code,
      category: 'development',
      color: 'blue',
      features: ['Interface generation', 'Validation decorators', 'Request/response types', 'Export formats']
    },
    {
      name: 'find_schema_dependencies',
      title: 'Schema Dependencies',
      description: 'Trace and analyze schema references and dependencies throughout the API',
      icon: GitBranch,
      category: 'analysis',
      color: 'violet',
      features: ['Dependency trees', 'Circular detection', 'Impact analysis', 'Reference mapping']
    },
    {
      name: 'validate_request_examples',
      title: 'Validate Examples',
      description: 'Validate that request/response examples match their schemas',
      icon: CheckSquare,
      category: 'validation',
      color: 'green',
      features: ['Schema validation', 'Type checking', 'Constraint validation', 'Strict mode']
    },
    {
      name: 'extract_auth_patterns',
      title: 'Auth Patterns',
      description: 'Analyze and extract authentication and authorization patterns across the API',
      icon: Key,
      category: 'security',
      color: 'amber',
      features: ['Security schemes', 'OAuth analysis', 'Scope mapping', 'Recommendations']
    },
    {
      name: 'generate_mock_data',
      title: 'Mock Data Generator',
      description: 'Generate realistic mock data based on OpenAPI schemas',
      icon: Shuffle,
      category: 'development',
      color: 'teal',
      features: ['Realistic data', 'Context-aware', 'Multiple formats', 'Constraint-based']
    },
    {
      name: 'find_unused_schemas',
      title: 'Unused Schemas',
      description: 'Identify schemas that are defined but never referenced in the API',
      icon: Trash2,
      category: 'optimization',
      color: 'rose',
      features: ['Reference analysis', 'Cleanup suggestions', 'Usage percentage', 'Indirect refs']
    },
    {
      name: 'analyze_schema_evolution',
      title: 'Schema Evolution',
      description: 'Analyze how schemas might evolve and suggest versioning strategies',
      icon: TrendingUp,
      category: 'planning',
      color: 'purple',
      features: ['Breaking change risk', 'Extensibility assessment', 'Versioning strategy', 'Evolution recommendations']
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-500 text-white',
      green: 'bg-green-500 text-white',
      purple: 'bg-purple-500 text-white',
      orange: 'bg-orange-500 text-white',
      indigo: 'bg-indigo-500 text-white',
      pink: 'bg-pink-500 text-white',
      emerald: 'bg-emerald-500 text-white',
      red: 'bg-red-500 text-white',
      cyan: 'bg-cyan-500 text-white',
      violet: 'bg-violet-500 text-white',
      amber: 'bg-amber-500 text-white',
      teal: 'bg-teal-500 text-white',
      rose: 'bg-rose-500 text-white'
    };
    return colors[color as keyof typeof colors] || 'bg-gray-500 text-white';
  };

  const getBorderColorClasses = (color: string) => {
    const colors = {
      blue: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20',
      green: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20',
      purple: 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20',
      orange: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20',
      indigo: 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20',
      pink: 'border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-900/20',
      emerald: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20',
      red: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
      cyan: 'border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/20',
      violet: 'border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20',
      amber: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20',
      teal: 'border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20',
      rose: 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20'
    };
    return colors[color as keyof typeof colors] || 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/20';
  };

  const coreTools = mcpTools.filter(tool => tool.category === 'core');
  const developmentTools = mcpTools.filter(tool => tool.category === 'development');
  const analysisTools = mcpTools.filter(tool => tool.category === 'analysis');
  const validationTools = mcpTools.filter(tool => tool.category === 'validation');
  const securityTools = mcpTools.filter(tool => tool.category === 'security');
  const optimizationTools = mcpTools.filter(tool => tool.category === 'optimization');
  const planningTools = mcpTools.filter(tool => tool.category === 'planning');
  const documentationTools = mcpTools.filter(tool => tool.category === 'documentation');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                MCP Server Integration
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Connect OpenAPI Explorer to your AI clients via Model Context Protocol
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

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* What is MCP */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              What is MCP?
            </h3>
            <p className="text-blue-800 dark:text-blue-200 mb-4">
              Model Context Protocol (MCP) allows AI clients like Claude Desktop and Cursor to connect to external tools and data sources. 
              This OpenAPI Explorer provides both stdio and HTTP transport options for maximum compatibility.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-blue-900/40 p-4 rounded-lg">
                <Code className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2" />
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">API Analysis</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">Load and analyze OpenAPI specs with AI assistance</p>
              </div>
              <div className="bg-white dark:bg-blue-900/40 p-4 rounded-lg">
                <Terminal className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2" />
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Code Generation</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">Generate code examples in multiple languages</p>
              </div>
              <div className="bg-white dark:bg-blue-900/40 p-4 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2" />
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Documentation</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">Export and validate API documentation</p>
              </div>
            </div>
          </div>

          {/* VS Code Extension Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              onClick={() => setIsVSCodeSectionOpen(!isVSCodeSectionOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Code className="h-5 w-5 text-purple-600" />
                VS Code Extension
              </h3>
              {isVSCodeSectionOpen ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
            
            {isVSCodeSectionOpen && (
              <div className="px-4 pb-4 space-y-6">
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                      <Code className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
                        OpenAPI Spec Explorer for VS Code
                      </h4>
                      <p className="text-purple-800 dark:text-purple-200 mb-4">
                        The same powerful OpenAPI analysis engine is available as a VS Code extension, bringing advanced API exploration directly into your development environment.
                      </p>
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-white dark:bg-purple-900/40 p-4 rounded-lg">
                          <h5 className="font-medium text-purple-900 dark:text-purple-100 mb-2">Key Features</h5>
                          <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                            <li>• Advanced OpenAPI analysis and validation</li>
                            <li>• Rich tree views for endpoints and schemas</li>
                            <li>• Code generation in multiple languages</li>
                            <li>• TypeScript type generation</li>
                            <li>• Performance-optimized for large specs</li>
                          </ul>
                        </div>
                        <div className="bg-white dark:bg-purple-900/40 p-4 rounded-lg">
                          <h5 className="font-medium text-purple-900 dark:text-purple-100 mb-2">Installation</h5>
                          <p className="text-sm text-purple-700 dark:text-purple-300 mb-2">
                            Install directly from the VS Code Marketplace:
                          </p>
                          <code className="text-xs bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 p-2 rounded block">
                            ext install openapi-spec-explorer
                          </code>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-purple-900/40 p-4 rounded-lg">
                        <h5 className="font-medium text-purple-900 dark:text-purple-100 mb-2">Enhanced Features</h5>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-sm text-purple-700 dark:text-purple-300">Enhanced Spec View</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-sm text-purple-700 dark:text-purple-300">Advanced Search</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-sm text-purple-700 dark:text-purple-300">Smart Filtering</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-sm text-purple-700 dark:text-purple-300">Intelligent Grouping</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-sm text-purple-700 dark:text-purple-300">Rich Analytics</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-sm text-purple-700 dark:text-purple-300">Interactive UI</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <h5 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Eye className="h-4 w-4 text-purple-600" />
                      Integrated Experience
                    </h5>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      The VS Code extension provides a seamless experience for developers working with OpenAPI specifications directly in their editor.
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                      <li className="flex items-start gap-2">
                        <div className="w-5 h-5 flex items-center justify-center bg-purple-100 dark:bg-purple-900 rounded-full flex-shrink-0 mt-0.5">
                          <div className="w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full"></div>
                        </div>
                        <span>Context menus for OpenAPI files</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-5 h-5 flex items-center justify-center bg-purple-100 dark:bg-purple-900 rounded-full flex-shrink-0 mt-0.5">
                          <div className="w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full"></div>
                        </div>
                        <span>Command palette integration</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-5 h-5 flex items-center justify-center bg-purple-100 dark:bg-purple-900 rounded-full flex-shrink-0 mt-0.5">
                          <div className="w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full"></div>
                        </div>
                        <span>Inline diagnostics and validation</span>
                      </li>
                    </ul>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <h5 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-purple-600" />
                      Performance Optimizations
                    </h5>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      The extension includes advanced performance features for handling large API specifications.
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                      <li className="flex items-start gap-2">
                        <div className="w-5 h-5 flex items-center justify-center bg-purple-100 dark:bg-purple-900 rounded-full flex-shrink-0 mt-0.5">
                          <div className="w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full"></div>
                        </div>
                        <span>Multi-level caching system</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-5 h-5 flex items-center justify-center bg-purple-100 dark:bg-purple-900 rounded-full flex-shrink-0 mt-0.5">
                          <div className="w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full"></div>
                        </div>
                        <span>Intelligent debouncing</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-5 h-5 flex items-center justify-center bg-purple-100 dark:bg-purple-900 rounded-full flex-shrink-0 mt-0.5">
                          <div className="w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full"></div>
                        </div>
                        <span>Lazy loading & virtual scrolling</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-5 h-5 flex items-center justify-center bg-purple-100 dark:bg-purple-900 rounded-full flex-shrink-0 mt-0.5">
                          <div className="w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full"></div>
                        </div>
                        <span>Real-time performance monitoring</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    The VS Code extension, web application, and MCP server all share the same powerful OpenAPI analysis engine, 
                    providing a consistent experience across different environments. Choose the interface that best fits your workflow!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Available Tools - Enhanced */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Available MCP Tools
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  16 powerful tools for comprehensive OpenAPI analysis and exploration
                </p>
              </div>
            </div>

            {/* Core Tools */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Core Functions</h4>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full font-medium">
                  {coreTools.length} tools
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {coreTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <div
                      key={tool.name}
                      className={`border rounded-xl p-5 hover:shadow-lg transition-all duration-200 ${getBorderColorClasses(tool.color)}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${getColorClasses(tool.color)} shadow-sm`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-semibold text-gray-900 dark:text-white">
                              {tool.title}
                            </h5>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {tool.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {tool.features.map((feature, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded border border-gray-200 dark:border-gray-600"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <code className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              {tool.name}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Development Tools */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Development Tools</h4>
                <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-xs rounded-full font-medium">
                  {developmentTools.length} tools
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {developmentTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <div
                      key={tool.name}
                      className={`border rounded-xl p-5 hover:shadow-lg transition-all duration-200 ${getBorderColorClasses(tool.color)}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${getColorClasses(tool.color)} shadow-sm`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-semibold text-gray-900 dark:text-white">
                              {tool.title}
                            </h5>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {tool.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {tool.features.map((feature, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded border border-gray-200 dark:border-gray-600"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <code className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              {tool.name}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Analysis & Validation Tools */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Analysis & Validation</h4>
                <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 text-xs rounded-full font-medium">
                  {[...analysisTools, ...validationTools].length} tools
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {[...analysisTools, ...validationTools].map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <div
                      key={tool.name}
                      className={`border rounded-xl p-5 hover:shadow-lg transition-all duration-200 ${getBorderColorClasses(tool.color)}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${getColorClasses(tool.color)} shadow-sm`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-semibold text-gray-900 dark:text-white">
                              {tool.title}
                            </h5>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {tool.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {tool.features.map((feature, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded border border-gray-200 dark:border-gray-600"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <code className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              {tool.name}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Security & Optimization Tools */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Security & Optimization</h4>
                <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-xs rounded-full font-medium">
                  {[...securityTools, ...optimizationTools, ...planningTools].length} tools
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {[...securityTools, ...optimizationTools, ...planningTools].map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <div
                      key={tool.name}
                      className={`border rounded-xl p-5 hover:shadow-lg transition-all duration-200 ${getBorderColorClasses(tool.color)}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${getColorClasses(tool.color)} shadow-sm`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-semibold text-gray-900 dark:text-white">
                              {tool.title}
                            </h5>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {tool.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {tool.features.map((feature, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded border border-gray-200 dark:border-gray-600"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <code className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              {tool.name}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Documentation Tools */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Documentation</h4>
                <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded-full font-medium">
                  {documentationTools.length} tools
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {documentationTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <div
                      key={tool.name}
                      className={`border rounded-xl p-5 hover:shadow-lg transition-all duration-200 ${getBorderColorClasses(tool.color)}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${getColorClasses(tool.color)} shadow-sm`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-semibold text-gray-900 dark:text-white">
                              {tool.title}
                            </h5>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {tool.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {tool.features.map((feature, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded border border-gray-200 dark:border-gray-600"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <code className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              {tool.name}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tools Summary */}
            <div className="mt-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white">Ready to Use</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">All 16 tools available once connected</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">16</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">MCP Tools</div>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Examples */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Usage Examples
            </h3>
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Example Prompts for Claude/Cursor:</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Core Operations:</h5>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• "Load this OpenAPI spec and give me an overview: [paste spec]"</li>
                      <li>• "Search for all POST endpoints in the user management section"</li>
                      <li>• "Generate a Python example for the GET /users/&#123;id&#125; endpoint"</li>
                      <li>• "Export the documentation in markdown format"</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Advanced Analysis:</h5>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• "Find all properties named 'email' in request bodies"</li>
                      <li>• "Generate TypeScript types for all schemas"</li>
                      <li>• "Show me the schema dependencies for the User model"</li>
                      <li>• "Validate all examples against their schemas"</li>
                      <li>• "Analyze the authentication patterns used"</li>
                      <li>• "Generate mock data for the Product schema"</li>
                      <li>• "Find unused schemas in the API"</li>
                      <li>• "Analyze how the User schema might evolve"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transport Options */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Server className="h-5 w-5" />
              Transport Options
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Stdio Transport (Recommended)
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Direct process communication</li>
                  <li>• Lower latency</li>
                  <li>• Standard MCP protocol</li>
                  <li>• Best for Claude Desktop</li>
                </ul>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  HTTP Transport (Advanced)
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• RESTful API interface</li>
                  <li>• Server-sent events streaming</li>
                  <li>• Direct HTTP access</li>
                  <li>• Custom integrations</li>
                </ul>
              </div>
            </div>
          </div>

          {/* How to Connect (Collapsible) */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              onClick={() => setIsConnectSectionOpen(!isConnectSectionOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="h-5 w-5" />
                How to Connect
              </h3>
              {isConnectSectionOpen ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
            
            {isConnectSectionOpen && (
              <div className="px-4 pb-4 space-y-6">
                {/* Quick Start with npx */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <h4 className="text-md font-semibold text-green-900 dark:text-green-100">
                      ⚡ Quick Start (Recommended)
                    </h4>
                  </div>
                  <p className="text-green-800 dark:text-green-200 text-sm mb-3">
                    No installation needed! Use npx to run the MCP server directly:
                  </p>
                  <div className="bg-gray-900 rounded-lg p-4 relative">
                    <button
                      onClick={() => copyToClipboard(npxCommands, 'npx-commands')}
                      className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded transition-colors"
                    >
                      {copiedText === 'npx-commands' ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                    <pre className="text-green-400 text-sm overflow-x-auto">
                      <code>{npxCommands}</code>
                    </pre>
                  </div>
                </div>

                {/* Installation Options */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    Installation Options
                  </h4>
                  <div className="bg-gray-900 rounded-lg p-4 relative">
                    <button
                      onClick={() => copyToClipboard(installCommands, 'install')}
                      className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded transition-colors"
                    >
                      {copiedText === 'install' ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                    <pre className="text-green-400 text-sm overflow-x-auto">
                      <code>{installCommands}</code>
                    </pre>
                  </div>
                </div>

                {/* Claude Desktop Configuration */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Configure Claude Desktop
                  </h4>
                  
                  <div className="space-y-6">
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                        Config file location:
                      </h5>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                        <li><strong>macOS:</strong> <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
                        <li><strong>Windows:</strong> <code>%APPDATA%\Claude\claude_desktop_config.json</code></li>
                      </ul>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                        ⚡ Option A: Using npx (Recommended - No Installation)
                      </h5>
                      <div className="bg-gray-900 rounded-lg p-4 relative">
                        <button
                          onClick={() => copyToClipboard(claudeConfigNpx, 'claude-npx')}
                          className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded transition-colors"
                        >
                          {copiedText === 'claude-npx' ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        <pre className="text-green-400 text-sm overflow-x-auto">
                          <code>{claudeConfigNpx}</code>
                        </pre>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                        🌐 Option B: npx with HTTP Transport
                      </h5>
                      <div className="bg-gray-900 rounded-lg p-4 relative">
                        <button
                          onClick={() => copyToClipboard(claudeConfigNpxHttp, 'claude-npx-http')}
                          className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded transition-colors"
                        >
                          {copiedText === 'claude-npx-http' ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        <pre className="text-green-400 text-sm overflow-x-auto">
                          <code>{claudeConfigNpxHttp}</code>
                        </pre>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Option C: Local Installation (Advanced)</h5>
                      <div className="bg-gray-900 rounded-lg p-4 relative">
                        <button
                          onClick={() => copyToClipboard(claudeConfig, 'claude-stdio')}
                          className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded transition-colors"
                        >
                          {copiedText === 'claude-stdio' ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        <pre className="text-green-400 text-sm overflow-x-auto">
                          <code>{claudeConfig}</code>
                        </pre>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Replace <code>path/to/your/openapi-explorer</code> with the actual installation path.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Testing */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Test the Connection
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Quick Test:</h5>
                      <div className="bg-gray-900 rounded-lg p-4 relative">
                        <button
                          onClick={() => copyToClipboard(testCommands, 'test-commands')}
                          className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded transition-colors"
                        >
                          {copiedText === 'test-commands' ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        <pre className="text-green-400 text-sm overflow-x-auto">
                          <code>{testCommands}</code>
                        </pre>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-green-800 dark:text-green-200 text-sm">
                      <strong>Success:</strong> If working correctly, the servers will start and wait for connections. 
                      Press Ctrl+C to stop the test.
                    </p>
                  </div>
                </div>

                {/* HTTP API Examples */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    HTTP API Examples
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Basic HTTP Requests:</h5>
                      <div className="bg-gray-900 rounded-lg p-4 relative">
                        <button
                          onClick={() => copyToClipboard(httpExamples, 'http-examples')}
                          className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded transition-colors"
                        >
                          {copiedText === 'http-examples' ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        <pre className="text-green-400 text-sm overflow-x-auto">
                          <code>{httpExamples}</code>
                        </pre>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Streaming Examples:</h5>
                      <div className="bg-gray-900 rounded-lg p-4 relative">
                        <button
                          onClick={() => copyToClipboard(streamingExample, 'streaming')}
                          className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded transition-colors"
                        >
                          {copiedText === 'streaming' ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        <pre className="text-green-400 text-sm overflow-x-auto">
                          <code>{streamingExample}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Troubleshooting */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Troubleshooting
            </h3>
            <div className="space-y-3">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">Common Issues:</h4>
                <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                  <li>• <strong>npx command not found:</strong> Make sure Node.js and npm are installed</li>
                  <li>• <strong>Permission denied:</strong> Try running with administrator/sudo privileges</li>
                  <li>• <strong>Port in use:</strong> Change the port with <code>--port 3002</code> for HTTP mode</li>
                  <li>• <strong>Network issues:</strong> Check firewall settings for HTTP transport</li>
                  <li>• <strong>Claude not connecting:</strong> Restart Claude Desktop after config changes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Need help? Check the project documentation or create an issue on GitHub.
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};