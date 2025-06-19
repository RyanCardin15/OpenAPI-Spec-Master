import { Schema, Reference, OpenAPISpec } from '../types/openapi.js';

export class SchemaUtils {
  /**
   * Resolves a $ref to the actual schema object
   */
  static resolveRef(ref: string, spec: OpenAPISpec): any {
    if (!ref.startsWith('#/')) return null;
    
    const path = ref.substring(2).split('/');
    let current: any = spec;
    
    for (const segment of path) {
      if (!current || typeof current !== 'object') return null;
      current = current[segment];
    }
    
    return current;
  }

  /**
   * Checks if a schema is a reference
   */
  static isReference(schema: any): schema is Reference {
    return schema && typeof schema === 'object' && '$ref' in schema;
  }

  /**
   * Gets all property names from a schema, recursively
   */
  static getAllPropertyNames(schema: any, spec: OpenAPISpec, visited = new Set<string>()): string[] {
    if (!schema || typeof schema !== 'object') return [];

    if (this.isReference(schema)) {
      if (visited.has(schema.$ref)) return []; // Avoid circular refs
      visited.add(schema.$ref);
      const resolved = this.resolveRef(schema.$ref, spec);
      return resolved ? this.getAllPropertyNames(resolved, spec, visited) : [];
    }

    const properties: string[] = [];

    if (schema.properties) {
      Object.keys(schema.properties).forEach(prop => {
        properties.push(prop);
        properties.push(...this.getAllPropertyNames(schema.properties[prop], spec, visited));
      });
    }

    // Handle allOf, oneOf, anyOf
    ['allOf', 'oneOf', 'anyOf'].forEach(keyword => {
      if (schema[keyword] && Array.isArray(schema[keyword])) {
        schema[keyword].forEach((subSchema: any) => {
          properties.push(...this.getAllPropertyNames(subSchema, spec, visited));
        });
      }
    });

    return [...new Set(properties)];
  }

  /**
   * Flattens a nested schema structure
   */
  static flattenSchema(schema: any, spec: OpenAPISpec, path = '', visited = new Set<string>()): any[] {
    if (!schema || typeof schema !== 'object') return [];

    if (this.isReference(schema)) {
      if (visited.has(schema.$ref)) return []; // Avoid circular refs
      visited.add(schema.$ref);
      const resolved = this.resolveRef(schema.$ref, spec);
      return resolved ? this.flattenSchema(resolved, spec, path, visited) : [];
    }

    const flattened: any[] = [];

    if (schema.properties) {
      Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
        const currentPath = path ? `${path}.${propName}` : propName;
        const isRequired = schema.required?.includes(propName) || false;

        flattened.push({
          path: currentPath,
          name: propName,
          type: propSchema.type || 'unknown',
          required: isRequired,
          description: propSchema.description,
          format: propSchema.format,
          enum: propSchema.enum,
          schema: propSchema
        });

        // Recursively flatten nested objects
        if (propSchema.type === 'object' || propSchema.properties) {
          flattened.push(...this.flattenSchema(propSchema, spec, currentPath, visited));
        }

        // Handle array items
        if (propSchema.type === 'array' && propSchema.items) {
          flattened.push(...this.flattenSchema(propSchema.items, spec, `${currentPath}[items]`, visited));
        }
      });
    }

    // Handle composition keywords
    ['allOf', 'oneOf', 'anyOf'].forEach(keyword => {
      if (schema[keyword] && Array.isArray(schema[keyword])) {
        schema[keyword].forEach((subSchema: any, index: number) => {
          flattened.push(...this.flattenSchema(subSchema, spec, `${path}[${keyword}[${index}]]`, visited));
        });
      }
    });

    return flattened;
  }

  /**
   * Generates realistic mock data based on schema and field name
   */
  static generateRealisticValue(schema: any, fieldName?: string): any {
    // Use example if available
    if (schema.example !== undefined) {
      return schema.example;
    }

    // Handle enum
    if (schema.enum) {
      return schema.enum[Math.floor(Math.random() * schema.enum.length)];
    }

    // Generate based on type and format
    switch (schema.type) {
      case 'string':
        return this.generateStringValue(schema, fieldName);
      case 'number':
      case 'integer':
        return this.generateNumberValue(schema);
      case 'boolean':
        return Math.random() > 0.5;
      default:
        return null;
    }
  }

  private static generateStringValue(schema: any, fieldName?: string): string {
    // Format-based generation
    if (schema.format) {
      switch (schema.format) {
        case 'email':
          return this.generateEmail(fieldName);
        case 'uri':
        case 'url':
          return 'https://example.com/api/resource';
        case 'date':
          return new Date().toISOString().split('T')[0];
        case 'date-time':
          return new Date().toISOString();
        case 'uuid':
          return this.generateUUID();
        case 'password':
          return '**********';
        case 'byte':
          return btoa('sample data');
      }
    }

    // Context-aware generation based on field name
    if (fieldName) {
      const lowerName = fieldName.toLowerCase();
      
      // Names
      if (lowerName.includes('firstname') || lowerName.includes('first_name')) return 'John';
      if (lowerName.includes('lastname') || lowerName.includes('last_name')) return 'Doe';
      if (lowerName.includes('fullname') || lowerName.includes('full_name') || lowerName === 'name') return 'John Doe';
      if (lowerName.includes('username') || lowerName.includes('user_name')) return 'johndoe';
      
      // Contact information
      if (lowerName.includes('email')) return this.generateEmail();
      if (lowerName.includes('phone')) return '+1-555-123-4567';
      if (lowerName.includes('address')) return '123 Main St';
      if (lowerName.includes('city')) return 'New York';
      if (lowerName.includes('state')) return 'NY';
      if (lowerName.includes('country')) return 'United States';
      if (lowerName.includes('zipcode') || lowerName.includes('zip_code') || lowerName.includes('postal')) return '12345';
      
      // Identifiers
      if (lowerName.includes('id') && !lowerName.includes('email')) return this.generateId();
      if (lowerName.includes('token') || lowerName.includes('key')) return this.generateToken();
      if (lowerName.includes('code')) return this.generateCode();
      
      // URLs and paths
      if (lowerName.includes('url') || lowerName.includes('link')) return 'https://example.com';
      if (lowerName.includes('path')) return '/api/v1/resource';
      if (lowerName.includes('endpoint')) return '/api/endpoint';
      
      // Descriptions and content
      if (lowerName.includes('description') || lowerName.includes('desc')) return 'Sample description';
      if (lowerName.includes('title')) return 'Sample Title';
      if (lowerName.includes('message') || lowerName.includes('msg')) return 'Sample message';
      if (lowerName.includes('content') || lowerName.includes('body')) return 'Sample content';
      
      // Status and categories
      if (lowerName.includes('status')) return 'active';
      if (lowerName.includes('type')) return 'standard';
      if (lowerName.includes('category')) return 'general';
      if (lowerName.includes('tag')) return 'sample';
      
      // Versions and timestamps
      if (lowerName.includes('version')) return '1.0.0';
      if (lowerName.includes('created') && lowerName.includes('at')) return new Date().toISOString();
      if (lowerName.includes('updated') && lowerName.includes('at')) return new Date().toISOString();
    }

    // Generate based on constraints
    const minLength = schema.minLength || 1;
    const maxLength = Math.min(schema.maxLength || 20, 100);
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    
    // Pattern-based generation
    if (schema.pattern) {
      // Simple pattern matching
      if (schema.pattern.includes('[a-zA-Z]')) return this.generateAlphaString(length);
      if (schema.pattern.includes('[0-9]')) return this.generateNumericString(length);
    }
    
    return this.generateGenericString(length);
  }

  private static generateNumberValue(schema: any): number {
    const min = schema.minimum || 0;
    const max = schema.maximum || 100;
    const value = Math.random() * (max - min) + min;
    
    if (schema.multipleOf) {
      return Math.round(value / schema.multipleOf) * schema.multipleOf;
    }
    
    return schema.type === 'integer' ? Math.floor(value) : Math.round(value * 100) / 100;
  }

  private static generateEmail(baseName?: string): string {
    const name = baseName?.toLowerCase().replace(/[^a-z]/g, '') || 'user';
    const domains = ['example.com', 'test.com', 'sample.org'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const num = Math.floor(Math.random() * 1000);
    return `${name}${num}@${domain}`;
  }

  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private static generateId(): string {
    const prefixes = ['usr', 'org', 'proj', 'item', 'rec'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}_${suffix}`;
  }

  private static generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private static generateCode(): string {
    return Math.floor(Math.random() * 900000 + 100000).toString();
  }

  private static generateAlphaString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private static generateNumericString(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10).toString();
    }
    return result;
  }

  private static generateGenericString(length: number): string {
    const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do'];
    let result = '';
    let currentLength = 0;
    
    while (currentLength < length) {
      const word = words[Math.floor(Math.random() * words.length)];
      if (currentLength + word.length + 1 <= length) {
        result += (currentLength > 0 ? ' ' : '') + word;
        currentLength += word.length + (currentLength > 0 ? 1 : 0);
      } else {
        result += word.substring(0, length - currentLength);
        break;
      }
    }
    
    return result;
  }
} 