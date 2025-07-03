import { OpenAPISpec, EndpointData } from '../types/openapi';

interface StreamParsingOptions {
  chunkSize?: number;
  progressCallback?: (progress: { percentage: number; stage: string; message: string }) => void;
  maxMemoryUsage?: number; // in MB
  enableCompression?: boolean;
  validateOnParse?: boolean;
  prioritizeEndpoints?: boolean;
}

interface ParsedChunk {
  type: 'info' | 'paths' | 'components' | 'servers' | 'security' | 'tags';
  data: any;
  size: number;
  timestamp: number;
}

interface StreamParsingResult {
  spec: OpenAPISpec;
  endpoints: EndpointData[];
  metadata: {
    totalSize: number;
    parseTime: number;
    chunksProcessed: number;
    memoryUsed: number;
    compressionRatio?: number;
  };
}

// Memory-efficient JSON parser for large files
class StreamingJSONParser {
  private buffer: string = '';
  private depth: number = 0;
  private inString: boolean = false;
  private escapeNext: boolean = false;
  private currentObject: any = {};
  private objectStack: any[] = [];
  private keyStack: string[] = [];
  private currentKey: string = '';
  private chunks: ParsedChunk[] = [];

  parse(chunk: string, options: StreamParsingOptions): ParsedChunk[] {
    this.buffer += chunk;
    const results: ParsedChunk[] = [];
    
    let i = 0;
    while (i < this.buffer.length) {
      const char = this.buffer[i];
      
      if (this.escapeNext) {
        this.escapeNext = false;
        i++;
        continue;
      }

      if (char === '\\' && this.inString) {
        this.escapeNext = true;
        i++;
        continue;
      }

      if (char === '"' && !this.escapeNext) {
        this.inString = !this.inString;
      }

      if (!this.inString) {
        if (char === '{') {
          this.depth++;
          this.objectStack.push(this.currentObject);
          this.currentObject = {};
        } else if (char === '}') {
          this.depth--;
          
          // Check if we've completed a top-level section
          if (this.depth === 1 && this.keyStack.length > 0) {
            const sectionKey = this.keyStack[this.keyStack.length - 1];
            if (['info', 'paths', 'components', 'servers', 'security', 'tags'].includes(sectionKey)) {
              results.push({
                type: sectionKey as any,
                data: this.currentObject,
                size: JSON.stringify(this.currentObject).length,
                timestamp: Date.now()
              });
              
              // Clear processed section to free memory
              this.currentObject = {};
            }
          }
          
          if (this.objectStack.length > 0) {
            this.currentObject = this.objectStack.pop();
          }
          this.keyStack.pop();
        }
      }

      i++;
    }

    // Keep only unprocessed buffer
    if (this.depth === 0) {
      this.buffer = '';
    }

    return results;
  }

  finalize(): any {
    return this.currentObject;
  }
}

// YAML streaming parser (simplified)
class StreamingYAMLParser {
  private lines: string[] = [];
  private currentSection: string = '';
  private currentObject: any = {};
  private indentLevel: number = 0;

  parse(chunk: string, options: StreamParsingOptions): ParsedChunk[] {
    const newLines = chunk.split('\n');
    this.lines.push(...newLines);
    
    const results: ParsedChunk[] = [];
    const processableLines = this.lines.slice(0, -1); // Keep last line for next chunk
    
    for (const line of processableLines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (trimmed.startsWith('#') || trimmed === '') continue;
      
      // Detect main sections
      if (!line.startsWith(' ') && trimmed.endsWith(':')) {
        if (this.currentSection && Object.keys(this.currentObject).length > 0) {
          results.push({
            type: this.currentSection as any,
            data: this.currentObject,
            size: JSON.stringify(this.currentObject).length,
            timestamp: Date.now()
          });
        }
        
        this.currentSection = trimmed.slice(0, -1);
        this.currentObject = {};
      }
    }

    // Keep last line for next chunk
    this.lines = this.lines.slice(-1);
    
    return results;
  }

  finalize(): any {
    return this.currentObject;
  }
}

// Main streaming parser class
export class OpenAPIStreamingParser {
  private options: Required<StreamParsingOptions>;
  private jsonParser?: StreamingJSONParser;
  private yamlParser?: StreamingYAMLParser;
  private processedChunks: ParsedChunk[] = [];
  private totalBytesProcessed: number = 0;
  private totalFileSize: number = 0;
  private startTime: number = 0;
  private memoryMonitor: number = 0;

  constructor(options: StreamParsingOptions = {}) {
    this.options = {
      chunkSize: options.chunkSize || 64 * 1024, // 64KB chunks
      progressCallback: options.progressCallback || (() => {}),
      maxMemoryUsage: options.maxMemoryUsage || 100, // 100MB
      enableCompression: options.enableCompression || false,
      validateOnParse: options.validateOnParse || true,
      prioritizeEndpoints: options.prioritizeEndpoints || true
    };
  }

  async parseFile(file: File): Promise<StreamParsingResult> {
    this.startTime = performance.now();
    this.totalFileSize = file.size;
    this.totalBytesProcessed = 0;
    this.processedChunks = [];

    const isYAML = file.name.endsWith('.yaml') || file.name.endsWith('.yml');
    
    if (isYAML) {
      this.yamlParser = new StreamingYAMLParser();
    } else {
      this.jsonParser = new StreamingJSONParser();
    }

    this.reportProgress(0, 'initialization', 'Starting file parsing...');

    // Process file in chunks
    const reader = file.stream().getReader();
    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        this.totalBytesProcessed += value.length;
        
        // Monitor memory usage
        await this.checkMemoryUsage();
        
        // Parse chunk
        const parsedChunks = isYAML ? 
          this.yamlParser!.parse(chunk, this.options) :
          this.jsonParser!.parse(chunk, this.options);
        
        this.processedChunks.push(...parsedChunks);
        
        // Report progress
        const percentage = (this.totalBytesProcessed / this.totalFileSize) * 100;
        this.reportProgress(
          percentage,
          'parsing',
          `Parsed ${this.formatBytes(this.totalBytesProcessed)} of ${this.formatBytes(this.totalFileSize)}`
        );

        // Yield control to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    } finally {
      reader.releaseLock();
    }

    this.reportProgress(90, 'assembling', 'Assembling parsed data...');
    
    // Assemble final result
    const result = await this.assembleResult();
    
    this.reportProgress(100, 'complete', 'Parsing complete');
    
    return result;
  }

  async parseText(text: string): Promise<StreamParsingResult> {
    this.startTime = performance.now();
    this.totalFileSize = text.length;
    this.totalBytesProcessed = 0;
    this.processedChunks = [];

    const isYAML = text.trim().startsWith('openapi:') || text.trim().startsWith('swagger:');
    
    if (isYAML) {
      this.yamlParser = new StreamingYAMLParser();
    } else {
      this.jsonParser = new StreamingJSONParser();
    }

    this.reportProgress(0, 'initialization', 'Starting text parsing...');

    // Process text in chunks
    const chunkSize = this.options.chunkSize;
    
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize);
      this.totalBytesProcessed += chunk.length;
      
      // Monitor memory usage
      await this.checkMemoryUsage();
      
      // Parse chunk
      const parsedChunks = isYAML ? 
        this.yamlParser!.parse(chunk, this.options) :
        this.jsonParser!.parse(chunk, this.options);
      
      this.processedChunks.push(...parsedChunks);
      
      // Report progress
      const percentage = (this.totalBytesProcessed / this.totalFileSize) * 100;
      this.reportProgress(
        percentage,
        'parsing',
        `Parsed ${this.formatBytes(this.totalBytesProcessed)} of ${this.formatBytes(this.totalFileSize)}`
      );

      // Yield control to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    this.reportProgress(90, 'assembling', 'Assembling parsed data...');
    
    // Assemble final result
    const result = await this.assembleResult();
    
    this.reportProgress(100, 'complete', 'Parsing complete');
    
    return result;
  }

  private async assembleResult(): Promise<StreamParsingResult> {
    const spec: Partial<OpenAPISpec> = {
      openapi: '3.0.0',
      info: { title: 'Unknown', version: '1.0.0' },
      paths: {},
      components: {},
      servers: [],
      security: [],
      tags: []
    };

    const endpoints: EndpointData[] = [];
    let totalMemoryUsed = 0;

    // Process chunks in priority order if enabled
    const sortedChunks = this.options.prioritizeEndpoints ?
      this.processedChunks.sort((a, b) => {
        const priority = { info: 1, paths: 2, components: 3, servers: 4, security: 5, tags: 6 };
        return priority[a.type] - priority[b.type];
      }) :
      this.processedChunks;

    for (const chunk of sortedChunks) {
      totalMemoryUsed += chunk.size;
      
      switch (chunk.type) {
        case 'info':
          spec.info = { ...spec.info, ...chunk.data };
          break;
        case 'paths':
          spec.paths = { ...spec.paths, ...chunk.data };
          // Extract endpoints from paths
          endpoints.push(...this.extractEndpointsFromPaths(chunk.data));
          break;
        case 'components':
          spec.components = { ...spec.components, ...chunk.data };
          break;
        case 'servers':
          spec.servers = Array.isArray(chunk.data) ? chunk.data : [chunk.data];
          break;
        case 'security':
          spec.security = Array.isArray(chunk.data) ? chunk.data : [chunk.data];
          break;
        case 'tags':
          spec.tags = Array.isArray(chunk.data) ? chunk.data : [chunk.data];
          break;
      }

      // Yield control periodically
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    const parseTime = performance.now() - this.startTime;

    return {
      spec: spec as OpenAPISpec,
      endpoints,
      metadata: {
        totalSize: this.totalFileSize,
        parseTime,
        chunksProcessed: this.processedChunks.length,
        memoryUsed: totalMemoryUsed,
        compressionRatio: this.options.enableCompression ? this.calculateCompressionRatio() : undefined
      }
    };
  }

  private extractEndpointsFromPaths(paths: any): EndpointData[] {
    const endpoints: EndpointData[] = [];
    
    for (const [path, pathItem] of Object.entries(paths)) {
      const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'];
      
      for (const method of methods) {
        if (pathItem[method]) {
          const operation = pathItem[method];
          endpoints.push({
            method: method.toUpperCase(),
            path,
            summary: operation.summary || '',
            description: operation.description || '',
            tags: operation.tags || [],
            operationId: operation.operationId || '',
            parameters: operation.parameters || [],
            requestBody: operation.requestBody,
            responses: operation.responses || {},
            security: operation.security,
            deprecated: operation.deprecated || false,
            complexity: this.calculateComplexity(operation),
            businessContext: this.extractBusinessContext(operation),
            responseTime: this.estimateResponseTime(operation)
          });
        }
      }
    }

    return endpoints;
  }

  private calculateComplexity(operation: any): 'low' | 'medium' | 'high' {
    let complexity = 0;
    
    // Parameter complexity
    if (operation.parameters) complexity += operation.parameters.length;
    
    // Request body complexity
    if (operation.requestBody) complexity += 2;
    
    // Response complexity
    const responseCount = Object.keys(operation.responses || {}).length;
    complexity += responseCount;
    
    // Security complexity
    if (operation.security) complexity += operation.security.length;
    
    if (complexity <= 3) return 'low';
    if (complexity <= 8) return 'medium';
    return 'high';
  }

  private extractBusinessContext(operation: any): string {
    const tags = operation.tags || [];
    const summary = operation.summary || '';
    
    if (tags.includes('auth') || summary.toLowerCase().includes('auth')) return 'Authentication';
    if (tags.includes('user') || summary.toLowerCase().includes('user')) return 'User Management';
    if (tags.includes('payment') || summary.toLowerCase().includes('payment')) return 'Payments';
    if (tags.includes('order') || summary.toLowerCase().includes('order')) return 'Orders';
    if (tags.includes('product') || summary.toLowerCase().includes('product')) return 'Products';
    
    return 'General';
  }

  private estimateResponseTime(operation: any): 'fast' | 'medium' | 'slow' {
    const method = operation.method?.toLowerCase();
    const hasComplexParams = operation.parameters?.length > 5;
    const hasFileUpload = operation.requestBody?.content?.['multipart/form-data'];
    
    if (method === 'get' && !hasComplexParams) return 'fast';
    if (hasFileUpload || method === 'patch') return 'slow';
    return 'medium';
  }

  private async checkMemoryUsage(): Promise<void> {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const usedMB = memInfo.usedJSHeapSize / (1024 * 1024);
      
      if (usedMB > this.options.maxMemoryUsage) {
        // Trigger garbage collection by clearing processed chunks
        this.processedChunks = this.processedChunks.slice(-10); // Keep only last 10 chunks
        
        // Force garbage collection if available
        if ('gc' in window) {
          (window as any).gc();
        }
      }
    }
  }

  private calculateCompressionRatio(): number {
    const originalSize = this.totalFileSize;
    const compressedSize = this.processedChunks.reduce((sum, chunk) => sum + chunk.size, 0);
    return originalSize / compressedSize;
  }

  private reportProgress(percentage: number, stage: string, message: string): void {
    this.options.progressCallback({
      percentage: Math.min(100, Math.max(0, percentage)),
      stage,
      message
    });
  }

  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Static utility methods
  static async detectFileType(file: File): Promise<'json' | 'yaml' | 'unknown'> {
    const extension = file.name.toLowerCase();
    if (extension.endsWith('.json')) return 'json';
    if (extension.endsWith('.yaml') || extension.endsWith('.yml')) return 'yaml';
    
    // Try to detect from content
    const firstChunk = await file.slice(0, 1024).text();
    const trimmed = firstChunk.trim();
    
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
    if (trimmed.startsWith('openapi:') || trimmed.startsWith('swagger:')) return 'yaml';
    
    return 'unknown';
  }

  static async validateFileSize(file: File, maxSizeMB: number = 50): Promise<boolean> {
    return file.size <= maxSizeMB * 1024 * 1024;
  }

  static createProgressHandler(
    onProgress: (progress: { percentage: number; stage: string; message: string }) => void
  ): (progress: { percentage: number; stage: string; message: string }) => void {
    let lastUpdate = 0;
    const updateInterval = 100; // Update every 100ms max
    
    return (progress) => {
      const now = Date.now();
      if (now - lastUpdate >= updateInterval || progress.percentage === 100) {
        onProgress(progress);
        lastUpdate = now;
      }
    };
  }
}

export default OpenAPIStreamingParser; 