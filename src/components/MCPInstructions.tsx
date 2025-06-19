import React from 'react';
import { X, Copy, CheckCircle, Terminal, Settings, Zap, Code, FileText } from 'lucide-react';

interface MCPInstructionsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MCPInstructions: React.FC<MCPInstructionsProps> = ({ isOpen, onClose }) => {
  const [copiedText, setCopiedText] = React.useState<string | null>(null);

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

# Build the MCP server
npm run mcp:build

# The server will be available at: dist/mcp/server.js`;

  const testCommand = `# Test the MCP server directly
node dist/mcp/server.js`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
          {/* Overview */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              What is MCP?
            </h3>
            <p className="text-blue-800 dark:text-blue-200 mb-4">
              Model Context Protocol (MCP) allows AI clients like Claude Desktop and Cursor to connect to external tools and data sources. 
              This OpenAPI Explorer MCP server provides powerful API analysis capabilities directly in your AI conversations.
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

          {/* Installation */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Step 1: Install & Build
            </h3>
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Step 2: Configure Claude Desktop
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Add this configuration to your Claude Desktop config file:
            </p>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Config file location:
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                  <li><strong>macOS:</strong> <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
                  <li><strong>Windows:</strong> <code>%APPDATA%\Claude\claude_desktop_config.json</code></li>
                </ul>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 relative">
                <button
                  onClick={() => copyToClipboard(claudeConfig, 'claude')}
                  className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded transition-colors"
                >
                  {copiedText === 'claude' ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                <pre className="text-green-400 text-sm overflow-x-auto">
                  <code>{claudeConfig}</code>
                </pre>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  <strong>Important:</strong> Replace <code>path/to/your/openapi-explorer</code> with the actual path to your OpenAPI Explorer installation.
                </p>
              </div>
            </div>
          </div>

          {/* Cursor Configuration */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Code className="h-5 w-5" />
              Alternative: Configure Cursor
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              For Cursor users, add this to your <code>.cursorrules</code> or settings:
            </p>
            <div className="bg-gray-900 rounded-lg p-4 relative">
              <button
                onClick={() => copyToClipboard(cursorConfig, 'cursor')}
                className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded transition-colors"
              >
                {copiedText === 'cursor' ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-400" />
                )}
              </button>
              <pre className="text-green-400 text-sm overflow-x-auto">
                <code>{cursorConfig}</code>
              </pre>
            </div>
          </div>

          {/* Testing */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Step 3: Test the Connection
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Test the MCP server before connecting to your AI client:
            </p>
            <div className="bg-gray-900 rounded-lg p-4 relative">
              <button
                onClick={() => copyToClipboard(testCommand, 'test')}
                className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded transition-colors"
              >
                {copiedText === 'test' ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-400" />
                )}
              </button>
              <pre className="text-green-400 text-sm overflow-x-auto">
                <code>{testCommand}</code>
              </pre>
            </div>
            <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-green-800 dark:text-green-200 text-sm">
                <strong>Success:</strong> If working correctly, the server will start and wait for MCP protocol messages. 
                Press Ctrl+C to stop the test.
              </p>
            </div>
          </div>

          {/* Available Tools */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Available MCP Tools
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Core Functions</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• <code>load_openapi_spec</code> - Load API specifications</li>
                  <li>• <code>get_api_overview</code> - Get comprehensive API overview</li>
                  <li>• <code>search_endpoints</code> - Search and filter endpoints</li>
                  <li>• <code>get_endpoint_details</code> - Detailed endpoint information</li>
                </ul>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Advanced Features</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• <code>generate_code_examples</code> - Multi-language code generation</li>
                  <li>• <code>get_api_analytics</code> - Comprehensive API analytics</li>
                  <li>• <code>validate_api_design</code> - Design validation & recommendations</li>
                  <li>• <code>export_documentation</code> - Export in various formats</li>
                </ul>
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
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};