#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { OpenAPIParser } from '../utils/openapi-parser.js';
import { generateAnalytics } from '../utils/analytics.js';
import { EndpointData, OpenAPISpec } from '../types/openapi.js';

class OpenAPIExplorerMCPServer {
  private server: Server;
  private parser: OpenAPIParser;
  private currentSpec: OpenAPISpec | null = null;
  private currentEndpoints: EndpointData[] = [];

  constructor() {
    this.server = new Server(
      {
        name: 'openapi-explorer',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.parser = new OpenAPIParser();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'load_openapi_spec',
            description: 'Load and parse an OpenAPI specification from text, URL, or file content',
            inputSchema: {
              type: 'object',
              properties: {
                source: {
                  type: 'string',
                  description: 'The source of the OpenAPI spec (text content, URL, or file content)',
                },
                sourceType: {
                  type: 'string',
                  enum: ['text', 'url'],
                  description: 'Type of source: text (JSON/YAML content) or url',
                  default: 'text',
                },
              },
              required: ['source'],
            },
          },
          {
            name: 'get_api_overview',
            description: 'Get a comprehensive overview of the loaded API including basic info, statistics, and analytics',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'search_endpoints',
            description: 'Search and filter API endpoints with advanced criteria',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for endpoint paths, summaries, or descriptions',
                },
                methods: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by HTTP methods (GET, POST, PUT, DELETE, etc.)',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by endpoint tags',
                },
                complexity: {
                  type: 'array',
                  items: { type: 'string', enum: ['low', 'medium', 'high'] },
                  description: 'Filter by endpoint complexity level',
                },
                deprecated: {
                  type: 'boolean',
                  description: 'Filter by deprecation status',
                },
                hasParameters: {
                  type: 'boolean',
                  description: 'Filter endpoints that have parameters',
                },
                hasRequestBody: {
                  type: 'boolean',
                  description: 'Filter endpoints that require a request body',
                },
              },
            },
          },
          {
            name: 'get_endpoint_details',
            description: 'Get detailed information about a specific endpoint',
            inputSchema: {
              type: 'object',
              properties: {
                method: {
                  type: 'string',
                  description: 'HTTP method (GET, POST, etc.)',
                },
                path: {
                  type: 'string',
                  description: 'Endpoint path',
                },
              },
              required: ['method', 'path'],
            },
          },
          {
            name: 'generate_code_examples',
            description: 'Generate code examples for specific endpoints in various languages',
            inputSchema: {
              type: 'object',
              properties: {
                method: {
                  type: 'string',
                  description: 'HTTP method',
                },
                path: {
                  type: 'string',
                  description: 'Endpoint path',
                },
                language: {
                  type: 'string',
                  enum: ['curl', 'javascript', 'python', 'typescript'],
                  description: 'Programming language for the example',
                  default: 'curl',
                },
              },
              required: ['method', 'path'],
            },
          },
          {
            name: 'get_api_analytics',
            description: 'Get comprehensive analytics and insights about the API',
            inputSchema: {
              type: 'object',
              properties: {
                includeDistributions: {
                  type: 'boolean',
                  description: 'Include method, tag, and complexity distributions',
                  default: true,
                },
              },
            },
          },
          {
            name: 'validate_api_design',
            description: 'Analyze the API design and provide recommendations for improvements',
            inputSchema: {
              type: 'object',
              properties: {
                focus: {
                  type: 'string',
                  enum: ['security', 'performance', 'design', 'documentation', 'all'],
                  description: 'Focus area for validation',
                  default: 'all',
                },
              },
            },
          },
          {
            name: 'export_documentation',
            description: 'Export API documentation in various formats',
            inputSchema: {
              type: 'object',
              properties: {
                format: {
                  type: 'string',
                  enum: ['markdown', 'json', 'summary'],
                  description: 'Export format',
                  default: 'markdown',
                },
                includeExamples: {
                  type: 'boolean',
                  description: 'Include code examples in export',
                  default: true,
                },
                includeAnalytics: {
                  type: 'boolean',
                  description: 'Include analytics in export',
                  default: false,
                },
              },
            },
          },
        ] satisfies Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'load_openapi_spec':
            return await this.loadOpenAPISpec(args);
          case 'get_api_overview':
            return await this.getAPIOverview();
          case 'search_endpoints':
            return await this.searchEndpoints(args);
          case 'get_endpoint_details':
            return await this.getEndpointDetails(args);
          case 'generate_code_examples':
            return await this.generateCodeExamples(args);
          case 'get_api_analytics':
            return await this.getAPIAnalytics(args);
          case 'validate_api_design':
            return await this.validateAPIDesign(args);
          case 'export_documentation':
            return await this.exportDocumentation(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async loadOpenAPISpec(args: any) {
    const { source, sourceType = 'text' } = args;

    try {
      let spec: OpenAPISpec;
      
      if (sourceType === 'url') {
        spec = await this.parser.parseFromUrl(source);
      } else {
        spec = await this.parser.parseFromText(source);
      }

      this.currentSpec = spec;
      this.currentEndpoints = this.parser.extractEndpoints();

      const analytics = generateAnalytics(this.currentEndpoints);

      return {
        content: [
          {
            type: 'text',
            text: `✅ Successfully loaded OpenAPI specification!

**API Information:**
- Title: ${spec.info.title}
- Version: ${spec.info.version}
- Description: ${spec.info.description || 'No description provided'}
- OpenAPI Version: ${spec.openapi}

**Statistics:**
- Total Endpoints: ${this.currentEndpoints.length}
- HTTP Methods: ${Object.keys(analytics.methodDistribution).join(', ')}
- Tags: ${Object.keys(analytics.tagDistribution).length}
- Deprecated Endpoints: ${analytics.deprecatedCount}

The API specification has been loaded and is ready for exploration. You can now use other tools to search endpoints, get analytics, generate code examples, and more!`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to load OpenAPI spec: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getAPIOverview() {
    if (!this.currentSpec || !this.currentEndpoints.length) {
      throw new Error('No OpenAPI specification loaded. Please load a spec first using load_openapi_spec.');
    }

    const analytics = generateAnalytics(this.currentEndpoints);
    const tags = this.parser.getAllTags();
    const methods = this.parser.getAllMethods();

    return {
      content: [
        {
          type: 'text',
          text: `# ${this.currentSpec.info.title} - API Overview

## Basic Information
- **Version:** ${this.currentSpec.info.version}
- **OpenAPI Version:** ${this.currentSpec.openapi}
- **Description:** ${this.currentSpec.info.description || 'No description provided'}

## Statistics
- **Total Endpoints:** ${analytics.totalEndpoints}
- **Deprecated Endpoints:** ${analytics.deprecatedCount} (${((analytics.deprecatedCount / analytics.totalEndpoints) * 100).toFixed(1)}%)
- **Average Parameters per Endpoint:** ${analytics.averageParametersPerEndpoint.toFixed(1)}
- **Security Schemes:** ${analytics.securitySchemes.length}

## HTTP Methods Distribution
${Object.entries(analytics.methodDistribution)
  .map(([method, count]) => `- **${method}:** ${count} endpoints`)
  .join('\n')}

## Tags (${tags.length})
${tags.length > 0 ? tags.map(tag => `- ${tag}`).join('\n') : 'No tags defined'}

## Complexity Distribution
${Object.entries(analytics.complexityDistribution)
  .map(([complexity, count]) => `- **${complexity.charAt(0).toUpperCase() + complexity.slice(1)}:** ${count} endpoints`)
  .join('\n')}

## Top Response Codes
${Object.entries(analytics.responseCodeDistribution)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 5)
  .map(([code, count]) => `- **${code}:** ${count} endpoints`)
  .join('\n')}`,
        },
      ],
    };
  }

  private async searchEndpoints(args: any) {
    if (!this.currentEndpoints.length) {
      throw new Error('No OpenAPI specification loaded. Please load a spec first.');
    }

    const {
      query,
      methods,
      tags,
      complexity,
      deprecated,
      hasParameters,
      hasRequestBody,
    } = args;

    let filteredEndpoints = [...this.currentEndpoints];

    // Apply filters
    if (query) {
      const searchTerm = query.toLowerCase();
      filteredEndpoints = filteredEndpoints.filter(endpoint =>
        endpoint.path.toLowerCase().includes(searchTerm) ||
        endpoint.summary?.toLowerCase().includes(searchTerm) ||
        endpoint.description?.toLowerCase().includes(searchTerm) ||
        endpoint.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    if (methods && methods.length > 0) {
      filteredEndpoints = filteredEndpoints.filter(endpoint =>
        methods.includes(endpoint.method)
      );
    }

    if (tags && tags.length > 0) {
      filteredEndpoints = filteredEndpoints.filter(endpoint =>
        endpoint.tags.some(tag => tags.includes(tag))
      );
    }

    if (complexity && complexity.length > 0) {
      filteredEndpoints = filteredEndpoints.filter(endpoint =>
        endpoint.complexity && complexity.includes(endpoint.complexity)
      );
    }

    if (typeof deprecated === 'boolean') {
      filteredEndpoints = filteredEndpoints.filter(endpoint =>
        endpoint.deprecated === deprecated
      );
    }

    if (typeof hasParameters === 'boolean') {
      filteredEndpoints = filteredEndpoints.filter(endpoint =>
        (endpoint.parameters.length > 0) === hasParameters
      );
    }

    if (typeof hasRequestBody === 'boolean') {
      filteredEndpoints = filteredEndpoints.filter(endpoint =>
        !!endpoint.requestBody === hasRequestBody
      );
    }

    const results = filteredEndpoints.slice(0, 20); // Limit results

    return {
      content: [
        {
          type: 'text',
          text: `# Search Results

Found **${filteredEndpoints.length}** endpoints matching your criteria${filteredEndpoints.length > 20 ? ' (showing first 20)' : ''}:

${results.map(endpoint => `
## ${endpoint.method} ${endpoint.path}
- **Summary:** ${endpoint.summary || 'No summary'}
- **Tags:** ${endpoint.tags.join(', ') || 'None'}
- **Complexity:** ${endpoint.complexity || 'Unknown'}
- **Parameters:** ${endpoint.parameters.length}
- **Deprecated:** ${endpoint.deprecated ? 'Yes' : 'No'}
- **Has Request Body:** ${endpoint.requestBody ? 'Yes' : 'No'}
${endpoint.description ? `- **Description:** ${endpoint.description}` : ''}
`).join('\n')}`,
        },
      ],
    };
  }

  private async getEndpointDetails(args: any) {
    if (!this.currentEndpoints.length) {
      throw new Error('No OpenAPI specification loaded. Please load a spec first.');
    }

    const { method, path } = args;
    const endpoint = this.currentEndpoints.find(
      ep => ep.method.toLowerCase() === method.toLowerCase() && ep.path === path
    );

    if (!endpoint) {
      throw new Error(`Endpoint ${method} ${path} not found.`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `# ${endpoint.method} ${endpoint.path}

## Overview
- **Summary:** ${endpoint.summary || 'No summary provided'}
- **Description:** ${endpoint.description || 'No description provided'}
- **Tags:** ${endpoint.tags.join(', ') || 'None'}
- **Deprecated:** ${endpoint.deprecated ? '⚠️ Yes' : '✅ No'}
- **Complexity:** ${endpoint.complexity || 'Unknown'}

## Parameters (${endpoint.parameters.length})
${endpoint.parameters.length > 0 ? 
  endpoint.parameters.map(param => `
### ${param.name} (${param.in})
- **Type:** ${param.schema?.type || 'Unknown'}
- **Required:** ${param.required ? 'Yes' : 'No'}
- **Description:** ${param.description || 'No description'}
`).join('\n') : 'No parameters'}

## Request Body
${endpoint.requestBody ? 'This endpoint accepts a request body' : 'No request body required'}

## Responses
${Object.entries(endpoint.responses).map(([code, response]) => `
### ${code}
${response.description}
`).join('\n')}

## Business Context
${endpoint.businessContext || 'No business context available'}

## AI Suggestions
${endpoint.aiSuggestions && endpoint.aiSuggestions.length > 0 ? 
  endpoint.aiSuggestions.map(suggestion => `- ${suggestion}`).join('\n') : 
  'No AI suggestions available'}`,
        },
      ],
    };
  }

  private async generateCodeExamples(args: any) {
    if (!this.currentEndpoints.length) {
      throw new Error('No OpenAPI specification loaded. Please load a spec first.');
    }

    const { method, path, language = 'curl' } = args;
    const endpoint = this.currentEndpoints.find(
      ep => ep.method.toLowerCase() === method.toLowerCase() && ep.path === path
    );

    if (!endpoint) {
      throw new Error(`Endpoint ${method} ${path} not found.`);
    }

    let example = '';

    switch (language) {
      case 'curl':
        example = this.generateCurlExample(endpoint);
        break;
      case 'javascript':
        example = this.generateJavaScriptExample(endpoint);
        break;
      case 'python':
        example = this.generatePythonExample(endpoint);
        break;
      case 'typescript':
        example = this.generateTypeScriptExample(endpoint);
        break;
      default:
        throw new Error(`Unsupported language: ${language}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `# Code Example: ${endpoint.method} ${endpoint.path}

## ${language.charAt(0).toUpperCase() + language.slice(1)} Example

\`\`\`${language === 'typescript' ? 'typescript' : language}
${example}
\`\`\`

## Endpoint Details
- **Summary:** ${endpoint.summary || 'No summary'}
- **Parameters:** ${endpoint.parameters.length}
- **Request Body:** ${endpoint.requestBody ? 'Required' : 'Not required'}`,
        },
      ],
    };
  }

  private generateCurlExample(endpoint: EndpointData): string {
    const method = endpoint.method.toLowerCase();
    let curl = `curl -X ${endpoint.method} "${endpoint.path}"`;
    
    if (endpoint.parameters?.some(p => p.in === 'header')) {
      curl += ` \\\n  -H "Content-Type: application/json"`;
    }
    
    if (endpoint.requestBody && (method === 'post' || method === 'put' || method === 'patch')) {
      curl += ` \\\n  -d '{"example": "data"}'`;
    }
    
    return curl;
  }

  private generateJavaScriptExample(endpoint: EndpointData): string {
    const hasBody = endpoint.requestBody && ['post', 'put', 'patch'].includes(endpoint.method.toLowerCase());
    
    return `const response = await fetch('${endpoint.path}', {
  method: '${endpoint.method}',
  headers: {
    'Content-Type': 'application/json',
  },${hasBody ? `
  body: JSON.stringify({
    // Add your request data here
  }),` : ''}
});

const data = await response.json();
console.log(data);`;
  }

  private generatePythonExample(endpoint: EndpointData): string {
    const hasBody = endpoint.requestBody && ['post', 'put', 'patch'].includes(endpoint.method.toLowerCase());
    
    return `import requests

url = "${endpoint.path}"
headers = {"Content-Type": "application/json"}
${hasBody ? `
data = {
    # Add your request data here
}

response = requests.${endpoint.method.toLowerCase()}(url, headers=headers, json=data)` : `
response = requests.${endpoint.method.toLowerCase()}(url, headers=headers)`}
print(response.json())`;
  }

  private generateTypeScriptExample(endpoint: EndpointData): string {
    const hasBody = endpoint.requestBody && ['post', 'put', 'patch'].includes(endpoint.method.toLowerCase());
    
    return `interface ApiResponse {
  // Define your response type here
}

${hasBody ? `interface RequestData {
  // Define your request data type here
}

` : ''}const response = await fetch('${endpoint.path}', {
  method: '${endpoint.method}',
  headers: {
    'Content-Type': 'application/json',
  },${hasBody ? `
  body: JSON.stringify({
    // Add your request data here
  } as RequestData),` : ''}
});

const data: ApiResponse = await response.json();
console.log(data);`;
  }

  private async getAPIAnalytics(args: any) {
    if (!this.currentEndpoints.length) {
      throw new Error('No OpenAPI specification loaded. Please load a spec first.');
    }

    const { includeDistributions = true } = args;
    const analytics = generateAnalytics(this.currentEndpoints);

    let result = `# API Analytics

## Overview Statistics
- **Total Endpoints:** ${analytics.totalEndpoints}
- **Deprecated Endpoints:** ${analytics.deprecatedCount} (${((analytics.deprecatedCount / analytics.totalEndpoints) * 100).toFixed(1)}%)
- **Average Parameters per Endpoint:** ${analytics.averageParametersPerEndpoint.toFixed(1)}
- **Security Schemes:** ${analytics.securitySchemes.length}

## Security Analysis
${analytics.securitySchemes.length > 0 ? 
  `**Security Schemes Used:** ${analytics.securitySchemes.join(', ')}` : 
  '⚠️ **No security schemes detected** - Consider adding authentication'}`;

    if (includeDistributions) {
      result += `

## Method Distribution
${Object.entries(analytics.methodDistribution)
  .sort(([,a], [,b]) => b - a)
  .map(([method, count]) => `- **${method}:** ${count} endpoints (${((count / analytics.totalEndpoints) * 100).toFixed(1)}%)`)
  .join('\n')}

## Complexity Distribution
${Object.entries(analytics.complexityDistribution)
  .map(([complexity, count]) => `- **${complexity.charAt(0).toUpperCase() + complexity.slice(1)}:** ${count} endpoints (${((count / analytics.totalEndpoints) * 100).toFixed(1)}%)`)
  .join('\n')}

## Response Code Distribution
${Object.entries(analytics.responseCodeDistribution)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .map(([code, count]) => `- **${code}:** ${count} endpoints`)
  .join('\n')}

## Tag Distribution (Top 10)
${Object.entries(analytics.tagDistribution)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .map(([tag, count]) => `- **${tag}:** ${count} endpoints`)
  .join('\n')}`;
    }

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  private async validateAPIDesign(args: any) {
    if (!this.currentEndpoints.length) {
      throw new Error('No OpenAPI specification loaded. Please load a spec first.');
    }

    const { focus = 'all' } = args;
    const analytics = generateAnalytics(this.currentEndpoints);
    const recommendations: string[] = [];

    // Security validation
    if (focus === 'security' || focus === 'all') {
      if (analytics.securitySchemes.length === 0) {
        recommendations.push('🔒 **Security:** No security schemes detected. Consider adding authentication to protect your API.');
      }
      
      const unsecuredEndpoints = this.currentEndpoints.filter(ep => !ep.security || ep.security.length === 0);
      if (unsecuredEndpoints.length > 0) {
        recommendations.push(`🔒 **Security:** ${unsecuredEndpoints.length} endpoints have no security requirements. Review if this is intentional.`);
      }
    }

    // Documentation validation
    if (focus === 'documentation' || focus === 'all') {
      const undocumentedEndpoints = this.currentEndpoints.filter(ep => !ep.summary && !ep.description);
      if (undocumentedEndpoints.length > 0) {
        recommendations.push(`📝 **Documentation:** ${undocumentedEndpoints.length} endpoints lack summaries or descriptions.`);
      }

      const untaggedEndpoints = this.currentEndpoints.filter(ep => ep.tags.length === 0);
      if (untaggedEndpoints.length > 0) {
        recommendations.push(`🏷️ **Organization:** ${untaggedEndpoints.length} endpoints have no tags for better organization.`);
      }
    }

    // Design validation
    if (focus === 'design' || focus === 'all') {
      if (analytics.deprecatedCount > 0) {
        recommendations.push(`⚠️ **Maintenance:** ${analytics.deprecatedCount} deprecated endpoints found. Consider migration strategy.`);
      }

      const highComplexityEndpoints = this.currentEndpoints.filter(ep => ep.complexity === 'high');
      if (highComplexityEndpoints.length > analytics.totalEndpoints * 0.3) {
        recommendations.push(`🔧 **Design:** High number of complex endpoints (${highComplexityEndpoints.length}). Consider simplifying API design.`);
      }
    }

    // Performance validation
    if (focus === 'performance' || focus === 'all') {
      const slowEndpoints = this.currentEndpoints.filter(ep => ep.estimatedResponseTime === 'slow');
      if (slowEndpoints.length > 0) {
        recommendations.push(`⚡ **Performance:** ${slowEndpoints.length} endpoints estimated as slow. Consider optimization.`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ **Great job!** No major issues detected in your API design.');
    }

    return {
      content: [
        {
          type: 'text',
          text: `# API Design Validation Report

## Analysis Focus: ${focus.charAt(0).toUpperCase() + focus.slice(1)}

## Recommendations

${recommendations.map(rec => rec).join('\n\n')}

## Summary Statistics
- **Total Endpoints:** ${analytics.totalEndpoints}
- **Security Coverage:** ${((this.currentEndpoints.filter(ep => ep.security && ep.security.length > 0).length / analytics.totalEndpoints) * 100).toFixed(1)}%
- **Documentation Coverage:** ${((this.currentEndpoints.filter(ep => ep.summary || ep.description).length / analytics.totalEndpoints) * 100).toFixed(1)}%
- **Tag Coverage:** ${((this.currentEndpoints.filter(ep => ep.tags.length > 0).length / analytics.totalEndpoints) * 100).toFixed(1)}%`,
        },
      ],
    };
  }

  private async exportDocumentation(args: any) {
    if (!this.currentSpec || !this.currentEndpoints.length) {
      throw new Error('No OpenAPI specification loaded. Please load a spec first.');
    }

    const { format = 'markdown', includeExamples = true, includeAnalytics = false } = args;
    
    if (format === 'summary') {
      return {
        content: [
          {
            type: 'text',
            text: `# ${this.currentSpec.info.title} - API Summary

**Version:** ${this.currentSpec.info.version}
**Total Endpoints:** ${this.currentEndpoints.length}

## Endpoints by Method
${Object.entries(generateAnalytics(this.currentEndpoints).methodDistribution)
  .map(([method, count]) => `- ${method}: ${count}`)
  .join('\n')}

## All Endpoints
${this.currentEndpoints.map(ep => `- ${ep.method} ${ep.path}${ep.summary ? ` - ${ep.summary}` : ''}`).join('\n')}`,
          },
        ],
      };
    }

    if (format === 'json') {
      const exportData = {
        api: {
          title: this.currentSpec.info.title,
          version: this.currentSpec.info.version,
          description: this.currentSpec.info.description,
        },
        endpoints: this.currentEndpoints.map(ep => ({
          method: ep.method,
          path: ep.path,
          summary: ep.summary,
          description: ep.description,
          tags: ep.tags,
          deprecated: ep.deprecated,
          complexity: ep.complexity,
          parameters: ep.parameters.length,
          hasRequestBody: !!ep.requestBody,
          responseCodes: Object.keys(ep.responses),
        })),
        ...(includeAnalytics && { analytics: generateAnalytics(this.currentEndpoints) }),
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(exportData, null, 2),
          },
        ],
      };
    }

    // Markdown format (default)
    let markdown = `# ${this.currentSpec.info.title}

**Version:** ${this.currentSpec.info.version}
**OpenAPI Version:** ${this.currentSpec.openapi}

${this.currentSpec.info.description ? `## Description\n${this.currentSpec.info.description}\n` : ''}

## Endpoints (${this.currentEndpoints.length})

`;

    for (const endpoint of this.currentEndpoints) {
      markdown += `### ${endpoint.method} ${endpoint.path}\n\n`;
      
      if (endpoint.summary) {
        markdown += `**Summary:** ${endpoint.summary}\n\n`;
      }
      
      if (endpoint.description) {
        markdown += `**Description:** ${endpoint.description}\n\n`;
      }

      if (endpoint.tags.length > 0) {
        markdown += `**Tags:** ${endpoint.tags.join(', ')}\n\n`;
      }

      if (endpoint.deprecated) {
        markdown += `⚠️ **This endpoint is deprecated**\n\n`;
      }

      if (endpoint.parameters.length > 0) {
        markdown += `**Parameters:**\n`;
        endpoint.parameters.forEach(param => {
          markdown += `- \`${param.name}\` (${param.in}) - ${param.description || 'No description'}\n`;
        });
        markdown += '\n';
      }

      markdown += `**Responses:**\n`;
      Object.entries(endpoint.responses).forEach(([code, response]) => {
        markdown += `- \`${code}\` - ${response.description}\n`;
      });
      markdown += '\n';

      if (includeExamples) {
        markdown += `**Example:**\n\`\`\`bash\n${this.generateCurlExample(endpoint)}\n\`\`\`\n\n`;
      }

      markdown += '---\n\n';
    }

    if (includeAnalytics) {
      const analytics = generateAnalytics(this.currentEndpoints);
      markdown += `## Analytics

**Total Endpoints:** ${analytics.totalEndpoints}
**Deprecated:** ${analytics.deprecatedCount}
**Average Parameters:** ${analytics.averageParametersPerEndpoint.toFixed(1)}

### Method Distribution
${Object.entries(analytics.methodDistribution)
  .map(([method, count]) => `- ${method}: ${count}`)
  .join('\n')}

### Complexity Distribution
${Object.entries(analytics.complexityDistribution)
  .map(([complexity, count]) => `- ${complexity}: ${count}`)
  .join('\n')}
`;
    }

    return {
      content: [
        {
          type: 'text',
          text: markdown,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('OpenAPI Explorer MCP Server running on stdio');
  }
}

const server = new OpenAPIExplorerMCPServer();
server.run().catch(console.error);