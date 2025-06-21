export interface EnhancedEndpointData {
  id: string;
  path: string;
  method: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: EnhancedParameter[];
  requestBody?: any;
  responses: { [key: string]: any };
  deprecated?: boolean;
  businessContext?: string;
  aiSuggestions?: string[];
  complexity?: 'low' | 'medium' | 'high';
  security?: any[];
  pathSegments?: string[];
  hasPathParams?: boolean;
  hasQueryParams?: boolean;
  hasRequestBody?: boolean;
  responseTypes?: string[];
  estimatedResponseTime?: 'fast' | 'medium' | 'slow';
  operationId?: string;
  externalDocs?: any;
}

export interface EnhancedParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: any;
  example?: any;
}

export interface EnhancedSchema {
  name: string;
  type?: string;
  description?: string;
  properties?: { [key: string]: any };
  required?: string[];
  example?: any;
  deprecated?: boolean;
  complexity?: 'low' | 'medium' | 'high';
  usageCount?: number;
}

export interface FilterState {
  methods: string[];
  tags: string[];
  statusCodes: string[];
  deprecated: boolean | null;
  search: string;
  complexity: string[];
  security: string[];
  pathPattern: string;
  hasParameters: boolean | null;
  hasRequestBody: boolean | null;
  responseTime: string[];
}

export interface GroupingState {
  groupBy: 'none' | 'tag' | 'method' | 'path' | 'complexity' | 'security';
  sortBy: 'path' | 'method' | 'summary' | 'complexity' | 'responseTime';
  sortOrder: 'asc' | 'desc';
}

export interface ViewState {
  layout: 'list' | 'grid' | 'compact' | 'table';
  showDetails: boolean;
  showBusinessContext: boolean;
  showAISuggestions: boolean;
  showCodeExamples: boolean;
  density: 'comfortable' | 'compact' | 'spacious';
}

export interface AnalyticsData {
  totalEndpoints: number;
  methodDistribution: { [method: string]: number };
  tagDistribution: { [tag: string]: number };
  complexityDistribution: { [complexity: string]: number };
  deprecatedCount: number;
  securitySchemes: string[];
  averageParametersPerEndpoint: number;
  pathPatterns: string[];
  responseCodeDistribution: { [code: string]: number };
  totalSchemas: number;
  schemaComplexity: { [complexity: string]: number };
}

export interface SearchOptions {
  fuzzy: boolean;
  caseSensitive: boolean;
  includeDescription: boolean;
  includeTags: boolean;
  includeParameters: boolean;
}

export interface EnhancedSpecData {
  endpoints: EnhancedEndpointData[];
  schemas: EnhancedSchema[];
  analytics: AnalyticsData;
  availableTags: string[];
  availableMethods: string[];
  availableStatusCodes: string[];
  securitySchemes: string[];
} 