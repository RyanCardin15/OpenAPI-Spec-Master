# OpenAPI Explorer with MCP Integration

A powerful OpenAPI specification visualizer with advanced filtering, analytics, and AI-powered insights. Now includes Model Context Protocol (MCP) server integration for seamless AI client connectivity.

## Features

### 🔍 Advanced Analysis
- **Smart Filtering**: Multi-dimensional filtering by methods, tags, complexity, security, and more
- **Intelligent Grouping**: Organize endpoints by tags, methods, complexity, or path patterns
- **Analytics Dashboard**: Comprehensive API analytics with distribution charts and insights
- **AI Suggestions**: Context-aware recommendations for API improvements

### 🤖 MCP Server Integration
- **AI Client Connectivity**: Connect to Claude Desktop, Cursor, and other MCP-compatible clients
- **8 Powerful Tools**: Load specs, search endpoints, generate code, validate design, and more
- **Multi-language Code Generation**: Generate examples in cURL, JavaScript, Python, TypeScript
- **Real-time Analysis**: Get instant API insights through your AI conversations

### 📊 Visualization & Export
- **Multiple View Modes**: List, grid, compact, and table layouts
- **Export Options**: JSON, PDF, CSV, and Markdown formats
- **Dark/Light Theme**: Beautiful UI with theme switching
- **Responsive Design**: Works perfectly on desktop and mobile

## Quick Start

### Web Application
1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open your browser and load an OpenAPI specification

### MCP Server Setup

#### 1. Build the MCP Server
```bash
npm install
npm run mcp:build
```

#### 2. Configure Claude Desktop
Add to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "openapi-explorer": {
      "command": "node",
      "args": ["path/to/your/openapi-explorer/dist/mcp/server.js"],
      "env": {}
    }
  }
}
```

#### 3. Configure Cursor (Alternative)
Add to your Cursor settings:

```json
{
  "mcp": {
    "servers": {
      "openapi-explorer": {
        "command": "node",
        "args": ["path/to/your/openapi-explorer/dist/mcp/server.js"]
      }
    }
  }
}
```

#### 4. Test the Connection
```bash
node dist/mcp/server.js
```

## MCP Tools Available

### Core Functions
- `load_openapi_spec` - Load and parse OpenAPI specifications
- `get_api_overview` - Get comprehensive API overview and statistics
- `search_endpoints` - Search and filter endpoints with advanced criteria
- `get_endpoint_details` - Get detailed information about specific endpoints

### Advanced Features
- `generate_code_examples` - Generate code examples in multiple languages
- `get_api_analytics` - Comprehensive API analytics and insights
- `validate_api_design` - API design validation with recommendations
- `export_documentation` - Export documentation in various formats

## Usage Examples with AI Clients

Once connected to Claude Desktop or Cursor, you can use prompts like:

- "Load this OpenAPI spec and give me an overview: [paste spec]"
- "Search for all POST endpoints in the user management section"
- "Generate a Python example for the GET /users/{id} endpoint"
- "Analyze the API design and suggest improvements"
- "Export the documentation in markdown format"

## Supported Formats

- **OpenAPI 3.0+** (JSON/YAML)
- **Swagger 2.0** (JSON/YAML) - automatically converted
- **URL Loading** - Direct import from API endpoints
- **File Upload** - Drag & drop or file picker
- **Text Paste** - Direct specification pasting

## Development

### Project Structure
```
src/
├── components/          # React components
├── utils/              # Utility functions
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
└── mcp/               # MCP server implementation
    └── server.ts      # Main MCP server
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run mcp:build` - Build MCP server
- `npm run mcp:dev` - Run MCP server in development

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- 📖 Check the in-app MCP instructions for detailed setup
- 🐛 Report issues on GitHub
- 💡 Request features through GitHub issues