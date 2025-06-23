import { EnhancedEndpointData, EnhancedSchema, CodeExportOptions, ExportResult } from '../types/enhanced-spec';

export class CodeGenerator {
    
    generateCode(schemas: EnhancedSchema[], endpoints: EnhancedEndpointData[], options: CodeExportOptions): ExportResult {
        try {
            let code = '';
            const errors: string[] = [];
            const warnings: string[] = [];
            
            switch (options.language) {
                case 'typescript':
                    code = this.generateTypeScript(schemas, endpoints, options);
                    break;
                case 'javascript':
                    code = this.generateJavaScript(schemas, endpoints, options);
                    break;
                case 'python':
                    code = this.generatePython(schemas, endpoints, options);
                    break;
                case 'java':
                    code = this.generateJava(schemas, endpoints, options);
                    break;
                case 'csharp':
                    code = this.generateCSharp(schemas, endpoints, options);
                    break;
                case 'go':
                    code = this.generateGo(schemas, endpoints, options);
                    break;
                case 'rust':
                    code = this.generateRust(schemas, endpoints, options);
                    break;
                case 'swift':
                    code = this.generateSwift(schemas, endpoints, options);
                    break;
                default:
                    throw new Error(`Unsupported language: ${options.language}`);
            }

            const filename = this.generateFilename(options);
            
            return {
                code,
                filename,
                language: options.language,
                errors,
                warnings
            };
        } catch (error) {
            return {
                code: '',
                filename: '',
                language: options.language,
                errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
                warnings: []
            };
        }
    }

    private generateTypeScript(schemas: EnhancedSchema[], endpoints: EnhancedEndpointData[], options: CodeExportOptions): string {
        let code = '';
        
        // Add header comment
        code += this.generateHeader('TypeScript', options);
        
        // Generate imports if needed
        if (options.includeValidation) {
            code += "import * as yup from 'yup';\n\n";
        }
        
        // Generate interfaces/types for schemas
        schemas.forEach(schema => {
            code += this.generateTypeScriptInterface(schema, options);
            code += '\n\n';
            
            if (options.includeValidation) {
                code += this.generateTypeScriptValidation(schema, options);
                code += '\n\n';
            }
        });
        
        // Generate API client if requested
        if (options.outputFormat === 'classes') {
            code += this.generateTypeScriptApiClient(endpoints, options);
        }
        
        // Generate mock data if requested
        if (options.generateMocks) {
            code += this.generateTypeScriptMocks(schemas, options);
        }
        
        return code;
    }

    private generateTypeScriptInterface(schema: EnhancedSchema, options: CodeExportOptions): string {
        const interfaceName = this.convertNaming(schema.name, options.namingConvention);
        let code = '';
        
        if (options.includeDocumentation && schema.description) {
            code += `/**\n * ${schema.description}\n`;
            if (schema.deprecated) {
                code += ` * @deprecated\n`;
            }
            code += ` */\n`;
        }
        
        code += `export interface ${interfaceName} {\n`;
        
        if (schema.properties) {
            Object.entries(schema.properties).forEach(([propName, propSchema]) => {
                const propertyName = this.convertNaming(propName, options.namingConvention);
                const isRequired = schema.required?.includes(propName) ?? false;
                const isOptional = !isRequired || options.includeNullChecks;
                
                if (options.includeDocumentation && propSchema.description) {
                    code += `  /** ${propSchema.description} */\n`;
                }
                
                const typeAnnotation = this.getTypeScriptType(propSchema);
                code += `  ${propertyName}${isOptional ? '?' : ''}: ${typeAnnotation};\n`;
            });
        }
        
        code += '}';
        
        return code;
    }

    private generateTypeScriptValidation(schema: EnhancedSchema, options: CodeExportOptions): string {
        const schemaName = this.convertNaming(schema.name, options.namingConvention);
        let code = `export const ${schemaName}Schema = yup.object({\n`;
        
        if (schema.properties) {
            Object.entries(schema.properties).forEach(([propName, propSchema]) => {
                const propertyName = this.convertNaming(propName, options.namingConvention);
                const isRequired = schema.required?.includes(propName) ?? false;
                
                let validation = this.getYupValidation(propSchema);
                if (!isRequired) {
                    validation += '.optional()';
                }
                
                code += `  ${propertyName}: ${validation},\n`;
            });
        }
        
        code += '});';
        
        return code;
    }

    private generateTypeScriptApiClient(endpoints: EnhancedEndpointData[], options: CodeExportOptions): string {
        let code = '\n// API Client Configuration\n';
        code += 'export interface ApiClientConfig {\n';
        code += '  baseUrl: string;\n';
        code += '  apiKey?: string;\n';
        code += '  timeout?: number;\n';
        code += '  retries?: number;\n';
        code += '  headers?: Record<string, string>;\n';
        code += '}\n\n';

        code += '// API Response wrapper\n';
        code += 'export interface ApiResponse<T> {\n';
        code += '  data: T;\n';
        code += '  status: number;\n';
        code += '  statusText: string;\n';
        code += '  headers: Record<string, string>;\n';
        code += '}\n\n';

        code += '// API Error class\n';
        code += 'export class ApiError extends Error {\n';
        code += '  public readonly status: number;\n';
        code += '  public readonly response: any;\n\n';
        code += '  constructor(message: string, status: number, response?: any) {\n';
        code += '    super(message);\n';
        code += '    this.name = "ApiError";\n';
        code += '    this.status = status;\n';
        code += '    this.response = response;\n';
        code += '  }\n';
        code += '}\n\n';

        code += '// Main API Client\n';
        code += 'export class ApiClient {\n';
        code += '  private readonly config: Required<ApiClientConfig>;\n\n';
        
        code += '  constructor(config: ApiClientConfig) {\n';
        code += '    this.config = {\n';
        code += '      baseUrl: config.baseUrl.replace(/\/$/, ""),\n';
        code += '      apiKey: config.apiKey || "",\n';
        code += '      timeout: config.timeout || 30000,\n';
        code += '      retries: config.retries || 3,\n';
        code += '      headers: { "Content-Type": "application/json", ...config.headers }\n';
        code += '    };\n';
        code += '  }\n\n';

        // Add utility methods
        code += '  private async makeRequest<T>(\n';
        code += '    method: string,\n';
        code += '    path: string,\n';
        code += '    data?: any,\n';
        code += '    queryParams?: Record<string, any>\n';
        code += '  ): Promise<ApiResponse<T>> {\n';
        code += '    const url = new URL(path, this.config.baseUrl);\n';
        code += '    \n';
        code += '    if (queryParams) {\n';
        code += '      Object.entries(queryParams).forEach(([key, value]) => {\n';
        code += '        if (value !== undefined && value !== null) {\n';
        code += '          url.searchParams.append(key, String(value));\n';
        code += '        }\n';
        code += '      });\n';
        code += '    }\n\n';
        code += '    const headers = { ...this.config.headers };\n';
        code += '    if (this.config.apiKey) {\n';
        code += '      headers.Authorization = `Bearer ${this.config.apiKey}`;\n';
        code += '    }\n\n';
        code += '    const requestOptions: RequestInit = {\n';
        code += '      method,\n';
        code += '      headers,\n';
        code += '    };\n\n';
        code += '    if (data && method !== "GET") {\n';
        code += '      requestOptions.body = JSON.stringify(data);\n';
        code += '    }\n\n';
        code += '    let lastError: Error;\n';
        code += '    for (let attempt = 0; attempt <= this.config.retries; attempt++) {\n';
        code += '      try {\n';
        code += '        const response = await fetch(url.toString(), requestOptions);\n';
        code += '        \n';
        code += '        if (!response.ok) {\n';
        code += '          const errorData = await response.text();\n';
        code += '          throw new ApiError(\n';
        code += '            `HTTP ${response.status}: ${response.statusText}`,\n';
        code += '            response.status,\n';
        code += '            errorData\n';
        code += '          );\n';
        code += '        }\n\n';
        code += '        const responseData = await response.json();\n';
        code += '        return {\n';
        code += '          data: responseData,\n';
        code += '          status: response.status,\n';
        code += '          statusText: response.statusText,\n';
        code += '          headers: Object.fromEntries(response.headers.entries())\n';
        code += '        };\n';
        code += '      } catch (error) {\n';
        code += '        lastError = error as Error;\n';
        code += '        if (attempt < this.config.retries) {\n';
        code += '          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));\n';
        code += '        }\n';
        code += '      }\n';
        code += '    }\n';
        code += '    throw lastError!;\n';
        code += '  }\n\n';

        // Generate endpoint methods grouped by tags
        const groupedEndpoints = this.groupEndpointsByTag(endpoints);
        
        Object.entries(groupedEndpoints).forEach(([tag, tagEndpoints]) => {
            code += `  // ${tag} endpoints\n`;
            tagEndpoints.forEach(endpoint => {
                code += this.generateTypeScriptEndpointMethod(endpoint, options);
                code += '\n\n';
            });
        });
        
        code += '}';
        
        return code;
    }

    private generateTypeScriptEndpointMethod(endpoint: EnhancedEndpointData, options: CodeExportOptions): string {
        const methodName = this.generateMethodName(endpoint, options);
        const hasRequestBody = endpoint.hasRequestBody;
        const pathParams = endpoint.parameters.filter(p => p.in === 'path');
        const queryParams = endpoint.parameters.filter(p => p.in === 'query');
        
        let code = '';
        
        if (options.includeDocumentation) {
            code += '  /**\n';
            code += `   * ${endpoint.summary || endpoint.description || 'API endpoint'}\n`;
            if (endpoint.deprecated) {
                code += '   * @deprecated\n';
            }
            if (endpoint.parameters.length > 0) {
                code += '   * @param params - Request parameters\n';
            }
            if (hasRequestBody) {
                code += '   * @param data - Request body data\n';
            }
            code += '   * @returns Promise with API response\n';
            code += '   */\n';
        }
        
        // Method signature
        code += `  async ${methodName}(`;
        
        const params: string[] = [];
        
        // Combined parameters object
        if (pathParams.length > 0 || queryParams.length > 0) {
            params.push('params: {\n');
            pathParams.forEach(param => {
                const paramName = this.convertNaming(param.name, options.namingConvention);
                const paramType = this.getTypeScriptType(param.schema);
                params.push(`    ${paramName}: ${paramType};\n`);
            });
            queryParams.forEach(param => {
                const paramName = this.convertNaming(param.name, options.namingConvention);
                const paramType = this.getTypeScriptType(param.schema);
                const optional = param.required ? '' : '?';
                params.push(`    ${paramName}${optional}: ${paramType};\n`);
            });
            params.push('  }');
        }
        
        // Request body parameter
        if (hasRequestBody) {
            if (params.length > 0) {
                params.push(',\n  ');
            }
            params.push('data?: any');
        }
        
        code += params.join('');
        
        // Response type
        const responseType = this.getResponseType(endpoint);
        code += `): Promise<ApiResponse<${responseType}>> {\n`;
        
        // Method body
        let path = endpoint.path;
        
        // Replace path parameters
        pathParams.forEach(param => {
            const paramName = this.convertNaming(param.name, options.namingConvention);
            path = path.replace(`{${param.name}}`, `\${params.${paramName}}`);
        });
        
        code += `    const path = \`${path}\`;\n`;
        
        // Query parameters
        if (queryParams.length > 0) {
            code += '    const queryParams: Record<string, any> = {};\n';
            queryParams.forEach(param => {
                const paramName = this.convertNaming(param.name, options.namingConvention);
                code += `    if (params.${paramName} !== undefined) queryParams.${param.name} = params.${paramName};\n`;
            });
            code += '\n';
        }
        
        // Make request
        code += `    return this.makeRequest<${responseType}>(\n`;
        code += `      '${endpoint.method.toUpperCase()}',\n`;
        code += '      path';
        
        if (hasRequestBody) {
            code += ',\n      data';
        } else {
            code += ',\n      undefined';
        }
        
        if (queryParams.length > 0) {
            code += ',\n      queryParams';
        }
        
        code += '\n    );\n';
        code += '  }';
        
        return code;
    }
    
    private getResponseType(endpoint: EnhancedEndpointData): string {
        // Try to determine response type from the endpoint
        const responses = endpoint.responses;
        if (responses && responses['200']) {
            // Try to extract type from response schema
            return 'any'; // Simplified for now
        }
        return 'any';
    }

    private generateTypeScriptMocks(schemas: EnhancedSchema[], options: CodeExportOptions): string {
        let code = '\n// Mock data generators\n';
        
        schemas.forEach(schema => {
            const schemaName = this.convertNaming(schema.name, options.namingConvention);
            code += `\nexport function create${schemaName}Mock(): ${schemaName} {\n`;
            code += '  return {\n';
            
            if (schema.properties) {
                Object.entries(schema.properties).forEach(([propName, propSchema]) => {
                    const propertyName = this.convertNaming(propName, options.namingConvention);
                    const mockValue = this.generateMockValue(propSchema);
                    code += `    ${propertyName}: ${mockValue},\n`;
                });
            }
            
            code += '  };\n';
            code += '}';
        });
        
        return code;
    }

    private generateJavaScript(schemas: EnhancedSchema[], endpoints: EnhancedEndpointData[], options: CodeExportOptions): string {
        let code = '';
        
        code += this.generateHeader('JavaScript', options);
        
        // Generate JSDoc types
        schemas.forEach(schema => {
            code += this.generateJSDocType(schema, options);
            code += '\n\n';
        });
        
        // Generate API client class
        if (options.outputFormat === 'classes') {
            code += this.generateJavaScriptApiClient(endpoints, options);
        }
        
        return code;
    }

    private generatePython(schemas: EnhancedSchema[], endpoints: EnhancedEndpointData[], options: CodeExportOptions): string {
        let code = '';
        
        code += this.generateHeader('Python', options);
        code += 'from typing import Dict, List, Optional, Any\n';
        code += 'from dataclasses import dataclass\n';
        if (options.includeValidation) {
            code += 'from pydantic import BaseModel\n';
        }
        code += 'import requests\n\n';
        
        // Generate dataclasses or Pydantic models
        schemas.forEach(schema => {
            if (options.includeValidation) {
                code += this.generatePydanticModel(schema, options);
            } else {
                code += this.generatePythonDataclass(schema, options);
            }
            code += '\n\n';
        });
        
        // Generate API client
        if (options.outputFormat === 'classes') {
            code += this.generatePythonApiClient(endpoints, options);
        }
        
        return code;
    }

    private generateJava(schemas: EnhancedSchema[], endpoints: EnhancedEndpointData[], options: CodeExportOptions): string {
        let code = '';
        
        code += this.generateHeader('Java', options);
        code += 'import com.fasterxml.jackson.annotation.JsonProperty;\n';
        if (options.includeValidation) {
            code += 'import javax.validation.constraints.*;\n';
        }
        code += '\n';
        
        schemas.forEach(schema => {
            code += this.generateJavaClass(schema, options);
            code += '\n\n';
        });
        
        return code;
    }

    private generateCSharp(schemas: EnhancedSchema[], endpoints: EnhancedEndpointData[], options: CodeExportOptions): string {
        let code = '';
        
        code += this.generateHeader('C#', options);
        code += 'using System;\n';
        code += 'using System.ComponentModel.DataAnnotations;\n';
        code += 'using Newtonsoft.Json;\n\n';
        
        schemas.forEach(schema => {
            code += this.generateCSharpClass(schema, options);
            code += '\n\n';
        });
        
        return code;
    }

    private generateGo(schemas: EnhancedSchema[], endpoints: EnhancedEndpointData[], options: CodeExportOptions): string {
        let code = '';
        
        code += this.generateHeader('Go', options);
        code += 'package main\n\n';
        code += 'import (\n';
        code += '    "encoding/json"\n';
        code += '    "time"\n';
        code += ')\n\n';
        
        schemas.forEach(schema => {
            code += this.generateGoStruct(schema, options);
            code += '\n\n';
        });
        
        return code;
    }

    private generateRust(schemas: EnhancedSchema[], endpoints: EnhancedEndpointData[], options: CodeExportOptions): string {
        let code = '';
        
        code += this.generateHeader('Rust', options);
        code += 'use serde::{Deserialize, Serialize};\n';
        code += 'use chrono::{DateTime, Utc};\n\n';
        
        schemas.forEach(schema => {
            code += this.generateRustStruct(schema, options);
            code += '\n\n';
        });
        
        return code;
    }

    private generateSwift(schemas: EnhancedSchema[], endpoints: EnhancedEndpointData[], options: CodeExportOptions): string {
        let code = '';
        
        code += this.generateHeader('Swift', options);
        code += 'import Foundation\n\n';
        
        schemas.forEach(schema => {
            code += this.generateSwiftStruct(schema, options);
            code += '\n\n';
        });
        
        return code;
    }

    // Helper methods
    private generateHeader(language: string, options: CodeExportOptions): string {
        const timestamp = new Date().toISOString();
        return `/**\n * Generated ${language} types\n * Generated on: ${timestamp}\n * Language: ${language}\n * Options: ${JSON.stringify(options, null, 2)}\n */\n\n`;
    }

    private generateFilename(options: CodeExportOptions): string {
        const extension = this.getFileExtension(options.language);
        const format = options.outputFormat || 'types';
        return `api-${format}.${extension}`;
    }

    private getFileExtension(language: string): string {
        const extensions: { [key: string]: string } = {
            typescript: 'ts',
            javascript: 'js',
            python: 'py',
            java: 'java',
            csharp: 'cs',
            go: 'go',
            rust: 'rs',
            swift: 'swift'
        };
        return extensions[language] || 'txt';
    }

    private convertNaming(name: string, convention: string): string {
        switch (convention) {
            case 'camelCase':
                return name.charAt(0).toLowerCase() + name.slice(1).replace(/_/g, '');
            case 'PascalCase':
                return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, '');
            case 'snake_case':
                return name.replace(/([A-Z])/g, '_$1').toLowerCase();
            case 'kebab-case':
                return name.replace(/([A-Z])/g, '-$1').toLowerCase();
            default:
                return name;
        }
    }

    private getTypeScriptType(schema: any): string {
        if (!schema) return 'any';
        
        switch (schema.type) {
            case 'string':
                return 'string';
            case 'number':
            case 'integer':
                return 'number';
            case 'boolean':
                return 'boolean';
            case 'array':
                const itemType = this.getTypeScriptType(schema.items);
                return `${itemType}[]`;
            case 'object':
                return 'Record<string, any>';
            default:
                return 'any';
        }
    }

    private getYupValidation(schema: any): string {
        if (!schema) return 'yup.mixed()';
        
        let validation: string;
        
        switch (schema.type) {
            case 'string':
                validation = 'yup.string()';
                if (schema.minLength) validation += `.min(${schema.minLength})`;
                if (schema.maxLength) validation += `.max(${schema.maxLength})`;
                if (schema.pattern) validation += `.matches(/${schema.pattern}/)`;
                return validation;
            case 'number':
            case 'integer':
                validation = 'yup.number()';
                if (schema.minimum) validation += `.min(${schema.minimum})`;
                if (schema.maximum) validation += `.max(${schema.maximum})`;
                return validation;
            case 'boolean':
                return 'yup.boolean()';
            case 'array':
                return 'yup.array()';
            default:
                return 'yup.mixed()';
        }
    }

    private generateMethodName(endpoint: EnhancedEndpointData, options: CodeExportOptions): string {
        const method = endpoint.method.toLowerCase();
        const pathParts = endpoint.path.split('/').filter(part => part && !part.startsWith('{'));
        const resourceName = pathParts[pathParts.length - 1] || 'resource';
        
        let methodName = `${method}${this.convertNaming(resourceName, 'PascalCase')}`;
        return this.convertNaming(methodName, options.namingConvention);
    }

    private generateMockValue(schema: any): string {
        if (!schema) return 'null';
        
        switch (schema.type) {
            case 'string':
                return schema.example ? `"${schema.example}"` : '"example string"';
            case 'number':
            case 'integer':
                return schema.example?.toString() || '42';
            case 'boolean':
                return schema.example?.toString() || 'true';
            case 'array':
                return '[]';
            case 'object':
                return '{}';
            default:
                return 'null';
        }
    }

    // Placeholder methods for other language generators
    private generateJSDocType(schema: EnhancedSchema, options: CodeExportOptions): string {
        return `/**\n * @typedef {Object} ${schema.name}\n */`;
    }

    private generateJavaScriptApiClient(endpoints: EnhancedEndpointData[], options: CodeExportOptions): string {
        return 'class ApiClient {\n  // JavaScript API client implementation\n}';
    }

    private generatePydanticModel(schema: EnhancedSchema, options: CodeExportOptions): string {
        return `class ${schema.name}(BaseModel):\n    pass`;
    }

    private generatePythonDataclass(schema: EnhancedSchema, options: CodeExportOptions): string {
        return `@dataclass\nclass ${schema.name}:\n    pass`;
    }

    private generatePythonApiClient(endpoints: EnhancedEndpointData[], options: CodeExportOptions): string {
        return 'class ApiClient:\n    # Python API client implementation\n    pass';
    }

    private generateJavaClass(schema: EnhancedSchema, options: CodeExportOptions): string {
        return `public class ${schema.name} {\n    // Java class implementation\n}`;
    }

    private generateCSharpClass(schema: EnhancedSchema, options: CodeExportOptions): string {
        return `public class ${schema.name}\n{\n    // C# class implementation\n}`;
    }

    private generateGoStruct(schema: EnhancedSchema, options: CodeExportOptions): string {
        return `type ${schema.name} struct {\n    // Go struct implementation\n}`;
    }

    private generateRustStruct(schema: EnhancedSchema, options: CodeExportOptions): string {
        return `#[derive(Debug, Serialize, Deserialize)]\npub struct ${schema.name} {\n    // Rust struct implementation\n}`;
    }

    private generateSwiftStruct(schema: EnhancedSchema, options: CodeExportOptions): string {
        return `struct ${schema.name} {\n    // Swift struct\n}`;
    }

    private groupEndpointsByTag(endpoints: EnhancedEndpointData[]): { [tag: string]: EnhancedEndpointData[] } {
        const groups: { [tag: string]: EnhancedEndpointData[] } = {};
        
        endpoints.forEach(endpoint => {
            if (endpoint.tags && endpoint.tags.length > 0) {
                endpoint.tags.forEach(tag => {
                    if (!groups[tag]) {
                        groups[tag] = [];
                    }
                    groups[tag].push(endpoint);
                });
            } else {
                // Endpoints without tags go to a default group
                if (!groups['Default']) {
                    groups['Default'] = [];
                }
                groups['Default'].push(endpoint);
            }
        });
        
        return groups;
    }
} 