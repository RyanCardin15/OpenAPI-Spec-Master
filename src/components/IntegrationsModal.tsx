import React, { useState } from 'react';
import { 
  X, 
  Cpu, 
  Code, 
  Globe, 
  Copy, 
  CheckCircle, 
  ExternalLink,
  Terminal,
  Zap,
  Download,
  Settings,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'mcp' | 'vscode' | 'webapp'>('mcp');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['quick-start']));

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  if (!isOpen) return null;

  const tabs = [
    {
      id: 'mcp',
      label: 'MCP Server',
      icon: Cpu,
      description: 'AI Client Integration'
    },
    {
      id: 'vscode',
      label: 'VS Code Extension',
      icon: Code,
      description: 'Developer Environment'
    },
    {
      id: 'webapp',
      label: 'Web Application',
      icon: Globe,
      description: 'Browser Interface'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                OpenAPI Explorer Ecosystem
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                One powerful engine, three ways to explore APIs
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
        <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex-1 flex items-center justify-center gap-3 px-6 py-4 font-medium transition-colors
                  ${isActive 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">{tab.label}</div>
                  <div className="text-xs opacity-75">{tab.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* MCP Server Tab */}
          {activeTab === 'mcp' && (
            <div className="p-6">
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Hero Section */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6">
                    <Cpu className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    🤖 AI-Powered API Analysis
                  </h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    Connect this OpenAPI Explorer to Claude Desktop, Cursor, or other AI clients via Model Context Protocol (MCP). 
                    Get instant API insights through natural conversation.
                  </p>
                </div>

                {/* Quick Start */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                  <button
                    onClick={() => toggleSection('quick-start')}
                    className="w-full flex items-center justify-between"
                  >
                    <h4 className="text-lg font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      🚀 Quick Start (Recommended)
                    </h4>
                    {expandedSections.has('quick-start') ? (
                      <ChevronDown className="h-5 w-5 text-green-600" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-green-600" />
                    )}
                  </button>
                  
                  {expandedSections.has('quick-start') && (
                    <div className="mt-4 space-y-4">
                      <p className="text-green-800 dark:text-green-200">
                        Get started instantly with NPX - no installation required!
                      </p>
                      
                      <div className="bg-gray-900 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-green-400 text-sm font-medium">1. Start MCP Server</span>
                          <button
                            onClick={() => copyToClipboard('npx openapi-spec-master@latest mcp', 'mcp-start')}
                            className="p-1 hover:bg-gray-800 rounded transition-colors"
                          >
                            {copiedText === 'mcp-start' ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <Copy className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                        <code className="text-green-400 text-sm">npx openapi-spec-master@latest mcp</code>
                      </div>

                      <div className="bg-gray-900 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-blue-400 text-sm font-medium">2. Configure Claude Desktop</span>
                          <button
                            onClick={() => copyToClipboard(`{
  "mcpServers": {
    "openapi-spec-master": {
      "command": "npx",
      "args": ["openapi-spec-master@latest", "mcp"]
    }
  }
}`, 'claude-config')}
                            className="p-1 hover:bg-gray-800 rounded transition-colors"
                          >
                            {copiedText === 'claude-config' ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <Copy className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                        <pre className="text-blue-400 text-sm overflow-x-auto">
{`{
  "mcpServers": {
    "openapi-spec-master": {
      "command": "npx",
      "args": ["openapi-spec-master@latest", "mcp"]
    }
  }
}`}
                        </pre>
                      </div>

                      <div className="text-sm text-green-700 dark:text-green-300">
                        <strong>Config file location:</strong> <code>~/Library/Application Support/Claude/claude_desktop_config.json</code> (macOS)
                      </div>
                    </div>
                  )}
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Terminal className="h-5 w-5 text-blue-600" />
                      16 Powerful Tools
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li>• Load & analyze OpenAPI specs</li>
                      <li>• Search endpoints with advanced filters</li>
                      <li>• Generate code examples in multiple languages</li>
                      <li>• Validate API design & security</li>
                      <li>• Export comprehensive documentation</li>
                    </ul>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-purple-600" />
                      AI Conversations
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li>• "Load this OpenAPI spec and analyze it"</li>
                      <li>• "Find all POST endpoints for user management"</li>
                      <li>• "Generate Python examples for authentication"</li>
                      <li>• "Validate this API design"</li>
                      <li>• "Export documentation in markdown"</li>
                    </ul>
                  </div>
                </div>

                {/* HTTP Transport Option */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    HTTP Transport (Advanced)
                  </h4>
                  <p className="text-blue-800 dark:text-blue-200 text-sm mb-4">
                    For custom integrations and direct API access with streaming support.
                  </p>
                  
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-400 text-sm font-medium">Start HTTP Server</span>
                      <button
                        onClick={() => copyToClipboard('npx openapi-spec-master@latest mcp --http --port 3001', 'http-start')}
                        className="p-1 hover:bg-gray-800 rounded transition-colors"
                      >
                        {copiedText === 'http-start' ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <code className="text-blue-400 text-sm">npx openapi-spec-master@latest mcp --http --port 3001</code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VS Code Extension Tab */}
          {activeTab === 'vscode' && (
            <div className="p-6">
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Hero Section */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl mb-6">
                    <Code className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    🧩 OpenAPI Spec Explorer for VS Code
                  </h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    Bring the same powerful OpenAPI analysis engine directly into your development environment. 
                    Explore APIs without leaving your editor.
                  </p>
                </div>

                {/* Installation */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-4 flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Installation
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-900 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-purple-400 text-sm font-medium">Install from VS Code Marketplace</span>
                        <button
                          onClick={() => copyToClipboard('ext install openapi-spec-explorer', 'vscode-install')}
                          className="p-1 hover:bg-gray-800 rounded transition-colors"
                        >
                          {copiedText === 'vscode-install' ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      <code className="text-purple-400 text-sm">ext install openapi-spec-explorer</code>
                    </div>

                    <p className="text-purple-800 dark:text-purple-200 text-sm">
                      Or search for "OpenAPI Spec Explorer" in the VS Code Extensions marketplace.
                    </p>
                  </div>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Code className="h-5 w-5 text-purple-600" />
                      Core Features
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li>• Rich tree views for endpoints & schemas</li>
                      <li>• Advanced search with fuzzy matching</li>
                      <li>• Code generation in multiple languages</li>
                      <li>• Real-time validation & diagnostics</li>
                      <li>• TypeScript type generation</li>
                    </ul>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-indigo-600" />
                      Enhanced Features
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li>• Performance optimized for large specs</li>
                      <li>• Smart filtering by complexity & security</li>
                      <li>• Interactive dependency visualization</li>
                      <li>• Mock data generation</li>
                      <li>• Comprehensive analytics dashboard</li>
                    </ul>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Settings className="h-5 w-5 text-green-600" />
                      Developer Experience
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li>• Context menu integration</li>
                      <li>• Command palette support</li>
                      <li>• Inline hints & suggestions</li>
                      <li>• Dark/light theme support</li>
                      <li>• Keyboard shortcuts</li>
                    </ul>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Terminal className="h-5 w-5 text-orange-600" />
                      Performance
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li>• Multi-level caching system</li>
                      <li>• Lazy loading for large datasets</li>
                      <li>• Real-time performance monitoring</li>
                      <li>• Memory optimization</li>
                      <li>• Background processing</li>
                    </ul>
                  </div>
                </div>

                {/* Getting Started */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                    🚀 Getting Started
                  </h4>
                  <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                      <span>Install the extension from the VS Code marketplace</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                      <span>Open any OpenAPI specification file (.json, .yaml, .yml)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                      <span>Right-click and select "Load OpenAPI Specification"</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                      <span>Explore endpoints, generate code, and analyze your API!</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Web Application Tab */}
          {activeTab === 'webapp' && (
            <div className="p-6">
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Hero Section */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl mb-6">
                    <Globe className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    🌐 Web Application
                  </h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    You're currently using the web application! This browser-based interface provides 
                    a beautiful, intuitive way to explore and analyze OpenAPI specifications.
                  </p>
                </div>

                {/* Current Features */}
                <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    What You're Experiencing Right Now
                  </h4>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-green-800 dark:text-green-200 mb-2">Visual Interface</h5>
                      <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
                        <li>• Beautiful, responsive design</li>
                        <li>• Dark/light theme support</li>
                        <li>• Advanced filtering & grouping</li>
                        <li>• Interactive endpoint cards</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-green-800 dark:text-green-200 mb-2">Powerful Features</h5>
                      <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
                        <li>• Real-time analytics dashboard</li>
                        <li>• Code generation & export</li>
                        <li>• Schema exploration tools</li>
                        <li>• Validation & recommendations</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Deployment Options */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Globe className="h-5 w-5 text-blue-600" />
                      Public Deployment
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Access this application from anywhere via the public deployment.
                    </p>
                    <a
                      href="https://openapi-explorer.netlify.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <ExternalLink className="h-4 w-4" />
                      openapi-explorer.netlify.app
                    </a>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Terminal className="h-5 w-5 text-purple-600" />
                      Local Development
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Run the web application locally for development or customization.
                    </p>
                    <div className="bg-gray-900 rounded-lg p-3">
                      <code className="text-purple-400 text-sm">npx openapi-spec-master@latest web</code>
                    </div>
                  </div>
                </div>

                {/* Sharing & Collaboration */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    Sharing & Collaboration
                  </h4>
                  <p className="text-blue-800 dark:text-blue-200 text-sm mb-4">
                    The web application is perfect for sharing API analysis with team members, stakeholders, 
                    or anyone who needs to understand your API without technical setup.
                  </p>
                  <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                    <li>• Share URLs with loaded specifications</li>
                    <li>• Export documentation in multiple formats</li>
                    <li>• No installation required for viewers</li>
                    <li>• Works on any device with a web browser</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};