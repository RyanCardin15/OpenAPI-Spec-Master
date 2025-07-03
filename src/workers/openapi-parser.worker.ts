// Basic OpenAPI type definitions for worker
interface OpenAPIDocument {
  openapi?: string;
  swagger?: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  paths?: {
    [path: string]: PathItem | undefined;
  };
  components?: {
    schemas?: {
      [schema: string]: SchemaObject;
    };
  };
}

interface PathItem {
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  delete?: OperationObject;
  patch?: OperationObject;
  head?: OperationObject;
  options?: OperationObject;
  trace?: OperationObject;
}

interface OperationObject {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: any[];
  requestBody?: any;
  responses?: any;
  security?: any;
  deprecated?: boolean;
}

interface SchemaObject {
  type?: string;
  properties?: { [name: string]: SchemaObject };
  required?: string[];
  allOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
}

export interface ParseWorkerMessage {
  type: 'parse' | 'validate' | 'extract-endpoints' | 'extract-schemas';
  payload: {
    spec?: any;
    content?: string;
    options?: {
      validateSpec?: boolean;
      extractMetadata?: boolean;
      optimizeMemory?: boolean;
    };
  };
  id: string;
}

export interface ParseWorkerResponse {
  type: 'success' | 'error' | 'progress';
  payload: any;
  id: string;
  progress?: number;
}

// OpenAPI parsing utilities
class OpenAPIParserWorker {
  private validateSpec(spec: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!spec.openapi && !spec.swagger) {
      errors.push('Missing OpenAPI/Swagger version');
    }
    
    if (!spec.info) {
      errors.push('Missing info object');
    }
    
    if (!spec.paths) {
      errors.push('Missing paths object');
    }
    
    return { valid: errors.length === 0, errors };
  }

  private extractEndpoints(spec: OpenAPIDocument): any[] {
    const endpoints: any[] = [];
    
    if (!spec.paths) return endpoints;
    
    Object.entries(spec.paths).forEach(([path, pathItem]) => {
      if (!pathItem) return;
      
      const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'];
      
      methods.forEach(method => {
        const operation = (pathItem as any)[method];
        if (!operation) return;
        
        endpoints.push({
          path,
          method: method.toUpperCase(),
          operationId: operation.operationId,
          summary: operation.summary,
          description: operation.description,
          tags: operation.tags || [],
          parameters: operation.parameters || [],
          requestBody: operation.requestBody,
          responses: operation.responses || {},
          security: operation.security,
          deprecated: operation.deprecated || false
        });
      });
    });
    
    return endpoints;
  }

  private extractSchemas(spec: OpenAPIDocument): any[] {
    const schemas: any[] = [];
    
    if (spec.components?.schemas) {
      Object.entries(spec.components.schemas).forEach(([name, schema]) => {
        schemas.push({
          name,
          schema,
          type: this.getSchemaType(schema as any),
          properties: this.getSchemaProperties(schema as any),
          required: (schema as any)?.required || []
        });
      });
    }
    
    return schemas;
  }

  private getSchemaType(schema: any): string {
    if (schema.type) return schema.type;
    if (schema.allOf) return 'allOf';
    if (schema.oneOf) return 'oneOf';
    if (schema.anyOf) return 'anyOf';
    return 'unknown';
  }

  private getSchemaProperties(schema: any): string[] {
    if (schema.properties) {
      return Object.keys(schema.properties);
    }
    return [];
  }

  private parseSpecContent(content: string): any {
    try {
      // Try JSON first
      return JSON.parse(content);
    } catch {
      try {
        // Try YAML (simplified parsing)
        // Note: For production, you'd want to use a proper YAML parser
        const lines = content.split('\n');
        const result: any = {};
        let currentKey = '';
        
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            if (trimmed.endsWith(':')) {
              currentKey = trimmed.slice(0, -1);
              result[currentKey] = {};
            }
          }
        });
        
        return result;
      } catch {
        throw new Error('Unable to parse spec content as JSON or YAML');
      }
    }
  }

  async processMessage(message: ParseWorkerMessage): Promise<ParseWorkerResponse> {
    const { type, payload, id } = message;
    
    try {
      switch (type) {
        case 'parse': {
          const { content, options = {} } = payload;
          
          // Send progress update
          self.postMessage({
            type: 'progress',
            payload: { message: 'Parsing spec content...' },
            id,
            progress: 25
          });
          
          const spec = content ? this.parseSpecContent(content) : payload.spec;
          
          if (options.validateSpec) {
            self.postMessage({
              type: 'progress',
              payload: { message: 'Validating spec...' },
              id,
              progress: 50
            });
            
            const validation = this.validateSpec(spec);
            if (!validation.valid) {
              return {
                type: 'error',
                payload: { errors: validation.errors },
                id
              };
            }
          }
          
          const result: any = { spec };
          
          if (options.extractMetadata) {
            self.postMessage({
              type: 'progress',
              payload: { message: 'Extracting metadata...' },
              id,
              progress: 75
            });
            
            result.endpoints = this.extractEndpoints(spec);
            result.schemas = this.extractSchemas(spec);
            result.metadata = {
              title: spec.info?.title,
              version: spec.info?.version,
              description: spec.info?.description,
              endpointCount: result.endpoints.length,
              schemaCount: result.schemas.length
            };
          }
          
          return {
            type: 'success',
            payload: result,
            id
          };
        }
        
        case 'validate': {
          const { spec } = payload;
          const validation = this.validateSpec(spec);
          
          return {
            type: 'success',
            payload: validation,
            id
          };
        }
        
        case 'extract-endpoints': {
          const { spec } = payload;
          const endpoints = this.extractEndpoints(spec);
          
          return {
            type: 'success',
            payload: { endpoints },
            id
          };
        }
        
        case 'extract-schemas': {
          const { spec } = payload;
          const schemas = this.extractSchemas(spec);
          
          return {
            type: 'success',
            payload: { schemas },
            id
          };
        }
        
        default:
          throw new Error(`Unknown message type: ${type}`);
      }
    } catch (error) {
      return {
        type: 'error',
        payload: { 
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          stack: error instanceof Error ? error.stack : undefined
        },
        id
      };
    }
  }
}

// Worker instance
const parser = new OpenAPIParserWorker();

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent<ParseWorkerMessage>) => {
  const response = await parser.processMessage(event.data);
  self.postMessage(response);
});

// Export for TypeScript
export {}; 