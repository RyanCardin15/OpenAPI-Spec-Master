# 🚀 OpenAPI Spec Master

[![Version](https://img.shields.io/visual-studio-marketplace/v/RyanCardin.openapi-spec-explorer)](https://marketplace.visualstudio.com/items?itemName=RyanCardin.openapi-spec-explorer)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/RyanCardin.openapi-spec-explorer)](https://marketplace.visualstudio.com/items?itemName=RyanCardin.openapi-spec-explorer)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/RyanCardin.openapi-spec-explorer)](https://marketplace.visualstudio.com/items?itemName=RyanCardin.openapi-spec-explorer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **The ultimate VS Code extension for OpenAPI/Swagger specification analysis, validation, and code generation.**

Transform your API development workflow with professional-grade tools for OpenAPI specifications. Built for developers who demand excellence in API design and documentation.

## ✨ **Why Choose OpenAPI Spec Master?**

- 🎯 **Professional Grade**: Enterprise-ready with advanced performance optimizations
- ⚡ **Lightning Fast**: Optimized for large specifications with intelligent caching
- 🔍 **Deep Analysis**: Comprehensive validation, analytics, and insights
- 🛠️ **Multi-Language**: Generate code in TypeScript, JavaScript, Python, cURL, and more
- 📊 **Rich Visualizations**: Interactive tree views, dependency graphs, and analytics dashboards
- 🎨 **Modern UI**: Beautiful, VS Code-native interface with dark/light theme support

---

## 🎬 **Quick Demo**

![OpenAPI Spec Master Demo](assets/demo.gif)

*Experience the power of professional API specification management directly in VS Code*

---

## 🔥 **Key Features**

### 🔍 **Intelligent Analysis Engine**
- **Smart Detection**: Automatically recognizes OpenAPI 3.0+ and Swagger 2.0 files
- **Real-time Validation**: Instant feedback with VS Code's native diagnostic system
- **Advanced Analytics**: Deep insights into API structure, complexity, and patterns
- **Security Analysis**: Identify authentication gaps and security vulnerabilities

### 🌳 **Rich Interactive Views**
- **Enhanced Spec Explorer**: Modern web-based interface with advanced search and filtering
- **Endpoint Browser**: Organize and explore API endpoints by tags, methods, or complexity
- **Schema Explorer**: Navigate complex data models with property details and relationships
- **Analytics Dashboard**: Visual metrics showing method distribution and API health

### 🚀 **Professional Code Generation**
- **Multi-Language Support**: TypeScript, JavaScript, Python, cURL, and more
- **Smart Type Generation**: Auto-generate TypeScript interfaces from OpenAPI schemas
- **Realistic Mock Data**: Create test data that matches your schema constraints
- **Export Flexibility**: Multiple formats including Markdown, JSON, and HTML documentation

### ⚡ **Performance Optimized**
- **Intelligent Caching**: Fast search and filtering for specifications with 1000+ endpoints
- **Lazy Loading**: Efficient memory usage for large datasets
- **Real-time Monitoring**: Performance metrics displayed in VS Code status bar
- **Debounced Operations**: Smooth user experience with optimized response times

### 🛡️ **Advanced Validation**
- **Design Best Practices**: Check for REST API design standards
- **Documentation Coverage**: Identify missing descriptions and examples
- **Schema Optimization**: Detect unused components and circular dependencies
- **Compliance Checking**: Ensure adherence to OpenAPI specification standards

---

## 📦 **Installation**

### VS Code Marketplace
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for **"OpenAPI Spec Master"**
4. Click **Install**

### Command Line
```bash
code --install-extension RyanCardin.openapi-spec-explorer
```

### Manual Installation
1. Download the latest `.vsix` file from [Releases](https://github.com/RyanCardin15/Spec-Master/releases)
2. Install via VS Code: `Extensions > ... > Install from VSIX`

---

## 🚀 **Quick Start Guide**

### 1. **Load Your First Specification**
```json
// Open any OpenAPI file (JSON/YAML)
{
  "openapi": "3.0.0",
  "info": {
    "title": "My API",
    "version": "1.0.0"
  }
  // ... your spec content
}
```

### 2. **Access the Extension**
- **Sidebar**: Click the OpenAPI icon in the Activity Bar
- **Command Palette**: `Ctrl+Shift+P` → "OpenAPI Spec Master"
- **Right-click**: On any OpenAPI file → "Load OpenAPI Specification"

### 3. **Explore Your API**
- Browse endpoints in the **Spec Manager**
- Use **Enhanced View** for advanced search and filtering
- Generate code examples with one click
- Export documentation in multiple formats

---

## ⚙️ **Configuration**

Customize the extension to match your workflow:

```json
{
  "openapi-explorer.autoValidate": true,
  "openapi-explorer.defaultLanguage": "typescript",
  "openapi-explorer.showInlineHints": true,
  "openapi-explorer.enableDiagnostics": true,
  "openapi-enhanced.performance.enableCaching": true,
  "openapi-enhanced.performance.enableMonitoring": true,
  "openapi-enhanced.performance.cacheSize": 50
}
```

### **Available Settings**

| Setting | Default | Description |
|---------|---------|-------------|
| `autoValidate` | `true` | Automatically validate specs when opened |
| `defaultLanguage` | `typescript` | Default language for code generation |
| `showInlineHints` | `true` | Show inline hints and suggestions |
| `enableDiagnostics` | `true` | Enable VS Code diagnostic messages |
| `enableCaching` | `true` | Enable performance caching |
| `enableMonitoring` | `true` | Show performance metrics in status bar |

---

## 🎯 **Use Cases**

### 👨‍💻 **API Development**
- Validate specifications during development
- Generate client SDKs and documentation
- Ensure consistency across teams
- Track API evolution over time

### 📚 **Documentation & Review**
- Browse complex APIs with ease
- Generate beautiful documentation
- Review API design decisions
- Share specifications with stakeholders

### 🧪 **Testing & Integration**
- Create realistic mock data
- Generate test scenarios
- Validate request/response examples
- Integration testing preparation

### 🔧 **Maintenance & Optimization**
- Identify deprecated endpoints
- Analyze API complexity metrics
- Optimize schema definitions
- Detect breaking changes

---

## 🛠️ **Commands Reference**

| Command | Shortcut | Description |
|---------|----------|-------------|
| Load Specification | - | Load OpenAPI spec from file or URL |
| Validate API Design | - | Run comprehensive validation checks |
| Generate Code Examples | - | Create multi-language code samples |
| Show Analytics | - | Display detailed API metrics |
| Open Enhanced View | - | Launch the advanced web interface |
| Export Documentation | - | Export in various formats |
| Search Endpoints | `Ctrl+Shift+F` | Find specific API endpoints |
| Filter by Method | - | Quick HTTP method filtering |
| Generate TypeScript Types | - | Create type definitions |
| Show Performance Report | - | View performance analytics |

---

## 🔗 **Integration & Compatibility**

Works seamlessly with your favorite tools:

- **🔌 REST Client**: Use generated examples directly
- **⚡ Thunder Client**: Import OpenAPI specs
- **📮 Postman**: Export collections
- **🌐 Insomnia**: Export workspace
- **📊 Git**: Track API changes over time
- **🐳 Docker**: Container-ready specifications

### **Supported File Types**
- OpenAPI 3.0+ (JSON/YAML)
- Swagger 2.0 (JSON/YAML) - auto-converted
- Custom extensions: `.openapi.*`, `.swagger.*`

---

## 📊 **Performance Benchmarks**

| Specification Size | Load Time | Search Response | Memory Usage |
|--------------------|-----------|-----------------|--------------|
| Small (< 50 endpoints) | < 100ms | < 10ms | < 5MB |
| Medium (50-200 endpoints) | < 300ms | < 20ms | < 15MB |
| Large (200-500 endpoints) | < 800ms | < 50ms | < 30MB |
| Enterprise (500+ endpoints) | < 2s | < 100ms | < 50MB |

*Benchmarks performed on VS Code 1.84+ with 8GB RAM*

---

## 🤝 **Contributing**

We welcome contributions from the community! Whether it's bug reports, feature requests, or code contributions, every bit helps make OpenAPI Spec Master better.

### **How to Contribute**
1. 🍴 **Fork** the repository
2. 🌟 **Create** a feature branch
3. ✨ **Make** your changes
4. 🧪 **Test** thoroughly
5. 📝 **Submit** a pull request

### **Development Setup**
```bash
git clone https://github.com/RyanCardin15/Spec-Master.git
cd Spec-Master/extension
npm install
npm run compile
```

---

## 📈 **Roadmap**

- [ ] **AI-Powered Suggestions**: Smart API design recommendations
- [ ] **Team Collaboration**: Real-time spec sharing and commenting
- [ ] **API Versioning**: Visual diff and migration tools
- [ ] **Custom Templates**: User-defined code generation templates
- [ ] **Cloud Integration**: Direct integration with API gateways
- [ ] **Security Scanner**: Advanced security vulnerability detection

---

## 💬 **Support & Community**

- 📖 **[Documentation](https://github.com/RyanCardin15/Spec-Master/wiki)** - Comprehensive guides and tutorials
- 🐛 **[Issues](https://github.com/RyanCardin15/Spec-Master/issues)** - Report bugs and request features
- 💡 **[Discussions](https://github.com/RyanCardin15/Spec-Master/discussions)** - Community Q&A and ideas
- 📧 **[Email](mailto:ryan@specmaster.dev)** - Direct support for enterprise users

---

## 📄 **License**

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 **Acknowledgments**

Special thanks to:
- The OpenAPI Initiative for maintaining the specification
- The VS Code team for the excellent extension API
- Our community of contributors and users

---

**Made with ❤️ by developers, for developers**

*Transform your API development experience today with OpenAPI Spec Master!*