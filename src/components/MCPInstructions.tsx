import React from 'react';
import { X, Copy, CheckCircle, Terminal, Settings, Zap, Code, FileText, Globe, Server, ChevronDown, ChevronUp, Search, BarChart3, Shield, Download, Wrench, Eye } from 'lucide-react';

interface MCPInstructionsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MCPInstructions: React.FC<MCPInstructionsProps> = ({ isOpen, onClose }) => {
  const [copiedText, setCopiedText] = React.useState<string | null>(null);
  const [isConnectSectionOpen, setIsConnectSectionOpen] = React.useState(false);

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

  const cursorConfig = `{
  "mcp": {
    "servers": {
      "openapi-explorer": {
        "command": "node",
        "args": ["path/to/your/openapi-explorer/dist/mcp/server.js"]
      }
    }
  }
}`;

  const installCommands = `# Clone or download the OpenAPI Explorer project
git clone <repository-url>
cd openapi-explorer

# Install dependencies
npm install

# Build both MCP servers
npm run mcp:build
npm run mcp:http:build

# Servers will be available at:
# - dist/mcp/server.js (stdio transport)
# - dist/mcp/http-server.js (HTTP transport)`;

  const testStdioCommand = `# Test the stdio MCP server
node dist/mcp/server.js`;

  const testHttpCommand = `# Test the HTTP MCP server
node dist/mcp/http-server.js

# Or with custom port
PORT=3002 node dist/mcp/http-server.js`;

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
      category: 'advanced',
      color: 'indigo',
      features: ['cURL', 'JavaScript', 'Python', 'TypeScript']
    },
    {
      name: 'get_api_analytics',
      title: 'API Analytics',
      description: 'Comprehensive analytics and insights about the API',
      icon: BarChart3,
      category: 'advanced',
      color: 'pink',
      features: ['Distributions', 'Complexity analysis', 'Security coverage']
    },
    {
      name: 'validate_api_design',
      title: 'Design Validation',
      description: 'Analyze API design and provide improvement recommendations',
      icon: Shield,
      category: 'advanced',
      color: 'emerald',
      features: ['Security validation', 'Documentation check', 'Best practices']
    },
    {
      name: 'export_documentation',
      title: 'Export Documentation',
      description: 'Export API documentation in various formats',
      icon: Download,
      category: 'advanced',
      color: 'red',
      features: ['Markdown', 'JSON', 'Summary', 'Code examples']
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
      red: 'bg-red-500 text-white'
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
      red: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
    };
    return colors[color as keyof typeof colors] || 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/20';
  };

  const coreTools = mcpTools.filter(tool => tool.category === 'core');
  const advancedTools = mcpTools.filter(tool => tool.category === 'advanced');

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
                  8 powerful tools for comprehensive OpenAPI analysis and exploration
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

            {/* Advanced Tools */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Advanced Features</h4>
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded-full font-medium">
                  {advancedTools.length} tools
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {advancedTools.map((tool) => {
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
                    <p className="text-sm text-gray-600 dark:text-gray-400">All 8 tools available once connected</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">8</div>
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
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <li>• "Load this OpenAPI spec and give me an overview: [paste spec]"</li>
                  <li>• "Search for all POST endpoints in the user management section"</li>
                  <li>• "Generate a Python example for the GET /users/&#123;id&#125; endpoint"</li>
                  <li>• "Analyze the API design and suggest improvements"</li>
                  <li>• "Export the documentation in markdown format"</li>
                </ul>
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
                {/* Installation */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    Step 1: Install & Build
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
                    Step 2: Configure Claude Desktop
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Choose between stdio (recommended) or HTTP transport:
                  </p>
                  
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
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Option A: Stdio Transport (Recommended)</h5>
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
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Option B: HTTP Transport</h5>
                      <div className="bg-gray-900 rounded-lg p-4 relative">
                        <button
                          onClick={() => copyToClipboard(claudeHttpConfig, 'claude-http')}
                          className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded transition-colors"
                        >
                          {copiedText === 'claude-http' ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        <pre className="text-green-400 text-sm overflow-x-auto">
                          <code>{claudeHttpConfig}</code>
                        </pre>
                      </div>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                        <strong>Important:</strong> Replace <code>path/to/your/openapi-explorer</code> with the actual path to your OpenAPI Explorer installation.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Testing */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Step 3: Test the Connection
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Test Stdio Server:</h5>
                      <div className="bg-gray-900 rounded-lg p-4 relative">
                        <button
                          onClick={() => copyToClipboard(testStdioCommand, 'test-stdio')}
                          className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded transition-colors"
                        >
                          {copiedText === 'test-stdio' ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        <pre className="text-green-400 text-sm overflow-x-auto">
                          <code>{testStdioCommand}</code>
                        </pre>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Test HTTP Server:</h5>
                      <div className="bg-gray-900 rounded-lg p-4 relative">
                        <button
                          onClick={() => copyToClipboard(testHttpCommand, 'test-http')}
                          className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded transition-colors"
                        >
                          {copiedText === 'test-http' ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        <pre className="text-green-400 text-sm overflow-x-auto">
                          <code>{testHttpCommand}</code>
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
                  <li>• <strong>Path not found:</strong> Ensure the server.js path is correct in your config</li>
                  <li>• <strong>Permission denied:</strong> Make sure Node.js has execution permissions</li>
                  <li>• <strong>Module not found:</strong> Run <code>npm install</code> in the project directory</li>
                  <li>• <strong>Port in use:</strong> Change the PORT environment variable for HTTP server</li>
                  <li>• <strong>Server not responding:</strong> Check that the build completed successfully</li>
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