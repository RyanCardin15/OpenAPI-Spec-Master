# OpenAPI Explorer with MCP Integration

A powerful OpenAPI specification visualizer with advanced filtering, analytics, and AI-powered insights. Now includes Model Context Protocol (MCP) server integration with both stdio and HTTP transport options for seamless AI client connectivity.

## Features

### 🔍 Advanced Analysis
- **Smart Filtering**: Multi-dimensional filtering by methods, tags, complexity, security, and more
- **Intelligent Grouping**: Organize endpoints by tags, methods, complexity, or path patterns
- **Analytics Dashboard**: Comprehensive API analytics with distribution charts and insights
- **AI Suggestions**: Context-aware recommendations for API improvements

### 🤖 MCP Server Integration
- **Dual Transport Support**: Both stdio and HTTP transport options
- **AI Client Connectivity**: Connect to Claude Desktop, Cursor, and other MCP-compatible clients
- **8 Powerful Tools**: Load specs, search endpoints, generate code, validate design, and more
- **Multi-language Code Generation**: Generate examples in cURL, JavaScript, Python, TypeScript
- **Real-time Analysis**: Get instant API insights through your AI conversations
- **Streaming Support**: Server-sent events for real-time updates (HTTP transport)

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

#### 1. Build the MCP Servers
```bash
npm install
npm run mcp:build      # Build stdio server
npm run mcp:http:build # Build HTTP server
```

#### 2. Choose Your Transport

##### Option A: Stdio Transport (Recommended)
Best for Claude Desktop and standard MCP clients.

**Configure Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):
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

##### Option B: HTTP Transport (Advanced)
Provides RESTful API access and streaming capabilities.

**Configure Claude Desktop for HTTP:**
```json
{
  "mcpServers": {
    "openapi-explorer-http": {
      "command": "node",
      "args": ["path/to/your/openapi-explorer/dist/mcp/http-server.js"],
      "env": {
        "PORT": "3001"
      }
    }
  }
}
```

**Or run HTTP server standalone:**
```bash
node dist/mcp/http-server.js
# Server runs on http://localhost:3001
```

#### 3. Test the Connection

**Test Stdio Server:**
```bash
node dist/mcp/server.js
```

**Test HTTP Server:**
```bash
node dist/mcp/http-server.js
# Check health: curl http://localhost:3001/health
```

## HTTP Transport Features

The HTTP transport provides additional capabilities beyond the standard MCP protocol:

### RESTful API Endpoints
- `GET /health` - Server health check
- `POST /mcp/tools/list` - List available MCP tools
- `POST /mcp/tools/call` - Execute an MCP tool
- `GET /mcp/stream` - Server-sent events stream
- `POST /mcp/execute` - Execute tool with optional streaming
- `GET /api/info` - Get loaded API information
- `GET /api/endpoints` - Search endpoints directly
- `GET /docs` - API documentation

### Streaming Support
```bash
# Real-time updates via Server-Sent Events
curl -N http://localhost:3001/mcp/stream

# Streaming tool execution
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{"tool": "get_api_overview", "args": {}, "stream": true}'
```

### Direct API Access
```bash
# Load OpenAPI spec
curl -X POST http://localhost:3001/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "load_openapi_spec",
    "arguments": {
      "source": "https://petstore.swagger.io/v2/swagger.json",
      "sourceType": "url"
    }
  }'

# Search endpoints
curl "http://localhost:3001/api/endpoints?query=user&method=GET&limit=10"
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
└── mcp/               # MCP server implementations
    ├── server.ts      # Stdio transport server
    └── http-server.ts # HTTP transport server
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run mcp:build` - Build stdio MCP server
- `npm run mcp:http:build` - Build HTTP MCP server
- `npm run mcp:dev` - Run stdio MCP server in development
- `npm run mcp:http` - Run HTTP MCP server in development

## Transport Comparison

| Feature | Stdio Transport | HTTP Transport |
|---------|----------------|----------------|
| **Latency** | Lower | Higher |
| **Setup** | Simple | Moderate |
| **Streaming** | No | Yes (SSE) |
| **Direct Access** | No | Yes (REST API) |
| **MCP Standard** | ✅ | ✅ |
| **Custom Integration** | Limited | Full |
| **Debugging** | Harder | Easier |

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
- 🌐 HTTP API documentation at `/docs` endpoint