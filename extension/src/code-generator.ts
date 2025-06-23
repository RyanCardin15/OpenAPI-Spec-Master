export class CodeGenerator {
    generateExample(endpoint: any, language: string): string {
        switch (language) {
            case 'curl':
                return this.generateCurlExample(endpoint);
            case 'javascript':
                return this.generateJavaScriptExample(endpoint);
            case 'python':
                return this.generatePythonExample(endpoint);
            case 'typescript':
                return this.generateTypeScriptExample(endpoint);
            default:
                return '';
        }
    }

    private generateCurlExample(endpoint: any): string {
        const method = endpoint.method.toLowerCase();
        let curl = `curl -X ${endpoint.method} "${endpoint.path}"`;
        
        if (endpoint.parameters?.some((p: any) => p.in === 'header')) {
            curl += ` \\\n  -H "Content-Type: application/json"`;
        }
        
        if (endpoint.operation.requestBody && (method === 'post' || method === 'put' || method === 'patch')) {
            curl += ` \\\n  -d '{"example": "data"}'`;
        }
        
        return curl;
    }

    private generateJavaScriptExample(endpoint: any): string {
        const hasBody = endpoint.operation.requestBody && ['post', 'put', 'patch'].includes(endpoint.method.toLowerCase());
        
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

    private generatePythonExample(endpoint: any): string {
        const hasBody = endpoint.operation.requestBody && ['post', 'put', 'patch'].includes(endpoint.method.toLowerCase());
        
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

    private generateTypeScriptExample(endpoint: any): string {
        const hasBody = endpoint.operation.requestBody && ['post', 'put', 'patch'].includes(endpoint.method.toLowerCase());
        
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

    generateTypeScriptTypes(spec: any): string {
        const schemas = spec.components?.schemas || {};
        let types = `// Generated TypeScript types from OpenAPI specification\n`;
        types += `// Generated on ${new Date().toISOString()}\n\n`;
        
        Object.entries(schemas).forEach(([name, schema]: [string, any]) => {
            types += `export interface ${name} {\n`;
            
            if (schema.description) {
                types += `  /** ${schema.description} */\n`;
            }
            
            if (schema.properties) {
                Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
                    const isRequired = schema.required?.includes(propName);
                    const propType = this.getTypeScriptType(propSchema);
                    
                    if (propSchema.description) {
                        types += `  /** ${propSchema.description} */\n`;
                    }
                    
                    types += `  ${propName}${isRequired ? '' : '?'}: ${propType};\n`;
                });
            }
            
            types += '}\n\n';
        });
        
        return types;
    }

    private getTypeScriptType(schema: any): string {
        if (schema.$ref) {
            return schema.$ref.replace('#/components/schemas/', '');
        }
        
        switch (schema.type) {
            case 'string':
                if (schema.enum) {
                    return schema.enum.map((val: string) => `'${val}'`).join(' | ');
                }
                return 'string';
            case 'number':
            case 'integer':
                return 'number';
            case 'boolean':
                return 'boolean';
            case 'array':
                return `${this.getTypeScriptType(schema.items)}[]`;
            case 'object':
                return 'object';
            default:
                return 'any';
        }
    }

    generateMockData(schema: any): any {
        if (!schema || typeof schema !== 'object') return null;

        if (schema.type === 'object' && schema.properties) {
            const obj: any = {};
            Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
                obj[key] = this.generateMockValue(prop, key);
            });
            return obj;
        }
        
        return this.generateMockValue(schema);
    }

    private generateMockValue(schema: any, propName?: string): any {
        if (schema.example !== undefined) return schema.example;
        if (schema.enum) return schema.enum[0];
        
        switch (schema.type) {
            case 'string':
                if (schema.format === 'email') return 'user@example.com';
                if (schema.format === 'date') return '2024-01-01';
                if (schema.format === 'date-time') return new Date().toISOString();
                if (propName?.toLowerCase().includes('name')) return 'Sample Name';
                return 'sample string';
            case 'number':
            case 'integer':
                return Math.floor(Math.random() * 100);
            case 'boolean':
                return Math.random() > 0.5;
            case 'array':
                return schema.items ? [this.generateMockValue(schema.items)] : [];
            default:
                return null;
        }
    }

    exportDocumentation(spec: any, endpoints: any[], format: string): string {
        switch (format) {
            case 'markdown':
                return this.generateMarkdownDocs(spec, endpoints);
            case 'json':
                return JSON.stringify({ spec, endpoints }, null, 2);
            case 'summary':
                return this.generateSummaryDocs(spec, endpoints);
            default:
                return '';
        }
    }

    private generateMarkdownDocs(spec: any, endpoints: any[]): string {
        let markdown = `# ${spec.info.title}\n\n`;
        markdown += `**Version:** ${spec.info.version}\n`;
        markdown += `**OpenAPI Version:** ${spec.openapi}\n\n`;
        
        if (spec.info.description) {
            markdown += `## Description\n${spec.info.description}\n\n`;
        }
        
        markdown += `## Endpoints (${endpoints.length})\n\n`;
        
        endpoints.forEach(endpoint => {
            markdown += `### ${endpoint.method} ${endpoint.path}\n\n`;
            
            if (endpoint.summary) {
                markdown += `**Summary:** ${endpoint.summary}\n\n`;
            }
            
            if (endpoint.description) {
                markdown += `**Description:** ${endpoint.description}\n\n`;
            }
            
            if (endpoint.parameters.length > 0) {
                markdown += `**Parameters:**\n`;
                endpoint.parameters.forEach((param: any) => {
                    markdown += `- **${param.name}** (${param.in}): ${param.description || 'No description'}\n`;
                });
                markdown += '\n';
            }
            
            markdown += `**Example:**\n\`\`\`bash\n${this.generateCurlExample(endpoint)}\n\`\`\`\n\n`;
            markdown += '---\n\n';
        });
        
        return markdown;
    }

    private generateSummaryDocs(spec: any, endpoints: any[]): string {
        let summary = `# ${spec.info.title} - API Summary\n\n`;
        summary += `**Version:** ${spec.info.version}\n`;
        summary += `**Total Endpoints:** ${endpoints.length}\n\n`;
        
        summary += `## All Endpoints\n`;
        endpoints.forEach(ep => {
            summary += `- ${ep.method} ${ep.path}${ep.summary ? ` - ${ep.summary}` : ''}\n`;
        });
        
        return summary;
    }
}