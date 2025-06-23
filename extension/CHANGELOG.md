# 📋 Changelog

All notable changes to the **OpenAPI Spec Master** extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---
## [1.1.0] - 2024-12-20

### 🚀 **Enhanced Type Generation & User Experience**

### ✨ **Added**
- **Copy URL/Path Feature**: Right-click context menu option to copy spec URLs or file paths to clipboard
- **Enhanced Type Generation**: Improved TypeScript type generation that focuses on actual schema types instead of wrapper interfaces
- **Better Status Indicators**: Fixed spec loading status indicators to properly show "loaded" state

### 🔧 **Improved**
- **Type Generation Quality**: Now generates clean, useful TypeScript interfaces for actual data types (e.g., `EndpointTypeDto`) instead of confusing response wrapper interfaces
- **Status Management**: Spec status indicators now accurately reflect the loading state and persist correctly across VS Code sessions
- **User Experience**: Added convenient copy functionality for easy sharing of spec URLs and file paths

### 🐛 **Fixed**
- Fixed type generation showing `ResponseCode200: EndpointTypeDto[]` instead of the actual `EndpointTypeDto` interface
- Fixed status indicators always showing "not loaded" even when specs were successfully loaded
- Improved status persistence when opening previously loaded specifications

### 🛠️ **Technical Improvements**
- Enhanced `_generateTypeScriptTypes` method to extract and generate actual schema types
- Added `_collectSchemaReferences` helper method for better type discovery
- Improved `loadSpecContent` method to ensure proper status updates
- Added new `copySpecUrl` command with clipboard integration

---

## [1.0.9] - 2024-12-19

## [1.0.0] - 2024-12-20

### 🎉 Initial Release

Professional VS Code extension for OpenAPI/Swagger specification analysis, validation, and code generation.

### ✨ Features
- **🔍 Intelligent Analysis**: Smart OpenAPI file detection and parsing
- **🛡️ Advanced Validation**: Real-time validation with VS Code diagnostics
- **🚀 Code Generation**: Multi-language support (TypeScript, JavaScript, Python, cURL)
- **📊 Rich Analytics**: Comprehensive API insights and metrics
- **🌳 Interactive Views**: Enhanced spec explorer with search and filtering
- **⚡ Performance Optimized**: Fast search and caching for large specifications
- **🎨 Professional UI**: Modern interface with VS Code theme integration

### 🛠️ Capabilities
- OpenAPI 3.0+ and Swagger 2.0 support
- TypeScript type generation from schemas
- Mock data generation
- Documentation export (Markdown, JSON, HTML)
- Security analysis and compliance checking
- Dependency visualization
- Performance monitoring

### 🔧 Technical
- Built with TypeScript for reliability
- Modular architecture for extensibility
- Comprehensive error handling
- VS Code native integration
- Optimized for enterprise-scale APIs

---

## 🎯 **Coming Soon**

### v2.1.0 - AI Integration
- AI-powered API design suggestions
- Intelligent schema recommendations
- Automated documentation generation

### v2.2.0 - Team Collaboration
- Real-time specification sharing
- Collaborative editing and commenting
- Team workspace management

### v2.3.0 - Advanced Security
- Comprehensive security scanning
- Vulnerability assessment and reporting
- Compliance checking for industry standards

---

*For more information about upcoming features, see our [Roadmap](https://github.com/RyanCardin15/Spec-Master/projects).*