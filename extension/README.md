# OpenAPI Explorer for VS Code

A comprehensive Visual Studio Code extension that brings advanced OpenAPI specification analysis, validation, and code generation directly into your development environment.

## Features

### 🔍 **Intelligent OpenAPI Analysis**
- **Automatic Detection**: Recognizes OpenAPI/Swagger files in your workspace
- **Smart Parsing**: Supports OpenAPI 3.0+ and Swagger 2.0 (auto-converted)
- **Real-time Validation**: Instant feedback on API design issues
- **Comprehensive Analytics**: Detailed insights into your API structure

### 🌳 **Rich Tree Views**
- **Endpoints Explorer**: Browse all API endpoints organized by tags
- **Schema Browser**: Explore data models with property details
- **Analytics Dashboard**: Visual metrics and distributions

### 🛡️ **Advanced Validation**
- **Design Validation**: Check for REST best practices
- **Security Analysis**: Identify authentication gaps
- **Documentation Coverage**: Find missing descriptions
- **Schema Optimization**: Detect unused components

### 🚀 **Code Generation**
- **Multi-language Support**: Generate examples in TypeScript, JavaScript, Python, cURL
- **TypeScript Types**: Auto-generate interfaces from schemas
- **Mock Data**: Create realistic test data
- **Documentation Export**: Markdown, JSON, and summary formats

### 💡 **Developer Experience**
- **Context Menus**: Right-click actions on OpenAPI files
- **Command Palette**: Quick access to all features
- **Inline Diagnostics**: VS Code native error/warning indicators
- **Customizable Settings**: Tailor the extension to your workflow

## Quick Start

1. **Install the Extension**
   ```
   ext install openapi-explorer
   ```

2. **Open an OpenAPI File**
   - Open any `.json`, `.yaml`, or `.yml` file containing an OpenAPI specification
   - Right-click and select "Load OpenAPI Specification"

3. **Explore Your API**
   - Use the OpenAPI Explorer sidebar to browse endpoints and schemas
   - Run validation checks from the Command Palette
   - Generate code examples for any endpoint

## Commands

| Command | Description |
|---------|-------------|
| `OpenAPI Explorer: Load Specification` | Load an OpenAPI spec from file |
| `OpenAPI Explorer: Validate API Design` | Run comprehensive validation |
| `OpenAPI Explorer: Generate Code Examples` | Create code samples |
| `OpenAPI Explorer: Show Analytics` | Display API metrics |
| `OpenAPI Explorer: Search Endpoints` | Find specific endpoints |
| `OpenAPI Explorer: Generate TypeScript Types` | Create type definitions |
| `OpenAPI Explorer: Generate Mock Data` | Create test data |
| `OpenAPI Explorer: Export Documentation` | Export in various formats |

## Configuration

```json
{
  "openapi-explorer.autoValidate": true,
  "openapi-explorer.defaultLanguage": "typescript",
  "openapi-explorer.showInlineHints": true,
  "openapi-explorer.enableDiagnostics": true
}
```

## Supported File Types

- OpenAPI 3.0+ (JSON/YAML)
- Swagger 2.0 (JSON/YAML) - automatically converted
- Files with `.openapi.*` or `.swagger.*` extensions
- Any JSON/YAML file containing OpenAPI content

## Use Cases

### 🏗️ **API Development**
- Validate your OpenAPI specs during development
- Generate client code for testing
- Ensure consistent documentation

### 📚 **API Documentation**
- Browse complex APIs visually
- Export documentation in multiple formats
- Identify documentation gaps

### 🔧 **API Maintenance**
- Find deprecated endpoints
- Analyze API complexity
- Optimize schema definitions

### 🧪 **Testing & Mocking**
- Generate realistic mock data
- Create test scenarios
- Validate request/response examples

## Integration

This extension works seamlessly with:
- **REST Client**: Use generated examples directly
- **Thunder Client**: Import OpenAPI specs
- **Postman**: Export collections
- **Git**: Track API changes over time

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📖 [Documentation](https://github.com/openapi-explorer/vscode-extension/wiki)
- 🐛 [Report Issues](https://github.com/openapi-explorer/vscode-extension/issues)
- 💡 [Feature Requests](https://github.com/openapi-explorer/vscode-extension/discussions)

---

**Made with ❤️ for the API development community**