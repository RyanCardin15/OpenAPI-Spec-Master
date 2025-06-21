import * as yaml from 'js-yaml';

export interface OpenAPISpec {
    openapi: string;
    info: {
        title: string;
        version: string;
        description?: string;
    };
    paths: { [path: string]: any };
    components?: {
        schemas?: { [name: string]: any };
    };
}

export interface EndpointData {
    id: string;
    path: string;
    method: string;
    operation: any;
    tags: string[];
    summary?: string;
    description?: string;
    parameters: any[];
    responses: { [code: string]: any };
    deprecated?: boolean;
    complexity?: 'low' | 'medium' | 'high';
}

export class OpenAPIParser {
    private spec: OpenAPISpec | null = null;

    async parseFromText(content: string): Promise<OpenAPISpec> {
        try {
            // Try JSON first
            this.spec = JSON.parse(content);
        } catch {
            try {
                // Try YAML
                this.spec = yaml.load(content) as OpenAPISpec;
            } catch (error) {
                throw new Error('Invalid OpenAPI specification format. Please provide valid JSON or YAML.');
            }
        }

        if (!this.spec) {
            throw new Error('Invalid specification format.');
        }

        // Check if it's Swagger 2.0 and convert to OpenAPI 3.0
        if ((this.spec as any).swagger && (this.spec as any).swagger.startsWith('2.')) {
            this.spec = this.convertSwagger2ToOpenAPI3(this.spec as any);
        } else if (!this.spec.openapi) {
            throw new Error('Invalid OpenAPI specification. Missing openapi version.');
        }

        return this.spec;
    }

    private convertSwagger2ToOpenAPI3(swagger2: any): OpenAPISpec {
        const openapi3: OpenAPISpec = {
            openapi: '3.0.0',
            info: {
                title: swagger2.info?.title || 'API',
                version: swagger2.info?.version || '1.0.0',
                description: swagger2.info?.description
            },
            paths: {}
        };

        // Convert paths
        if (swagger2.paths) {
            Object.entries(swagger2.paths).forEach(([path, pathItem]: [string, any]) => {
                const convertedPathItem: any = {};

                // Convert operations
                ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].forEach(method => {
                    if (pathItem[method]) {
                        convertedPathItem[method] = this.convertSwagger2Operation(pathItem[method]);
                    }
                });

                openapi3.paths[path] = convertedPathItem;
            });
        }

        // Convert definitions to components/schemas
        if (swagger2.definitions) {
            openapi3.components = {
                schemas: swagger2.definitions
            };
        }

        return openapi3;
    }

    private convertSwagger2Operation(operation: any): any {
        return {
            summary: operation.summary,
            description: operation.description,
            operationId: operation.operationId,
            tags: operation.tags,
            deprecated: operation.deprecated,
            parameters: operation.parameters || [],
            responses: operation.responses || {}
        };
    }

    extractEndpoints(): EndpointData[] {
        if (!this.spec) return [];

        const endpoints: EndpointData[] = [];
        const paths = this.spec.paths;

        Object.entries(paths).forEach(([path, pathItem]) => {
            const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'];
            
            methods.forEach(method => {
                const operation = pathItem[method];
                if (!operation) return;

                const parameters = operation.parameters || [];
                
                const endpoint: EndpointData = {
                    id: `${method.toUpperCase()}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
                    path,
                    method: method.toUpperCase(),
                    operation,
                    tags: operation.tags || [],
                    summary: operation.summary,
                    description: operation.description,
                    parameters,
                    responses: operation.responses || {},
                    deprecated: operation.deprecated || false,
                    complexity: this.calculateComplexity(operation, parameters)
                };

                endpoints.push(endpoint);
            });
        });

        return endpoints;
    }

    private calculateComplexity(operation: any, parameters: any[]): 'low' | 'medium' | 'high' {
        let score = 0;

        // Base complexity from parameters
        score += parameters.length * 0.5;

        // Request body adds complexity
        if (operation.requestBody) score += 2;

        // Multiple response codes add complexity
        const responseCount = Object.keys(operation.responses || {}).length;
        score += responseCount * 0.3;

        // Security requirements add complexity
        if (operation.security && operation.security.length > 0) score += 1;

        // Tags suggest organizational complexity
        if (operation.tags && operation.tags.length > 1) score += 0.5;

        if (score <= 2) return 'low';
        if (score <= 5) return 'medium';
        return 'high';
    }

    getSpec(): OpenAPISpec | null {
        return this.spec;
    }
}