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
  responseBodySchemas?: { [statusCode: string]: any };
  responseBodyContent?: string;
  sampleRequestBodies?: any[];
  sampleResponses?: { [statusCode: string]: any };
  usagePatterns?: string[];
  relatedEndpoints?: string[];
  testCases?: TestCase[];
  performanceMetrics?: PerformanceMetrics;
  changeHistory?: ChangeHistoryItem[];
}

export interface EnhancedParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: any;
  example?: any;
  validation?: ValidationRule[];
  businessPurpose?: string;
  relatedFields?: string[];
}

export interface ValidationRule {
  type: 'format' | 'range' | 'length' | 'pattern' | 'enum';
  value: any;
  message?: string;
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
  relationships?: SchemaRelationship[];
  validationRules?: { [property: string]: ValidationRule[] };
  migrationHistory?: SchemaMigration[];
  codeExamples?: { [language: string]: string };
}

export interface SchemaRelationship {
  type: 'extends' | 'uses' | 'contains' | 'references';
  targetSchema: string;
  description?: string;
}

export interface SchemaMigration {
  fromVersion: string;
  toVersion: string;
  changes: string[];
  breaking: boolean;
  migrationScript?: string;
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
  hasTestCases: boolean | null;
  hasExamples: boolean | null;
  lastModified: string | null;
  breaking: boolean | null;
  responseBodySearch: string;
}

export interface GroupingState {
  groupBy: 'none' | 'tag' | 'method' | 'path' | 'complexity' | 'security' | 'domain' | 'status';
  sortBy: 'path' | 'method' | 'summary' | 'complexity' | 'responseTime' | 'lastModified' | 'usage';
  sortOrder: 'asc' | 'desc';
}

export interface ViewState {
  layout: 'list' | 'grid' | 'compact' | 'table' | 'timeline';
  showDetails: boolean;
  showBusinessContext: boolean;
  showAISuggestions: boolean;
  showCodeExamples: boolean;
  density: 'comfortable' | 'compact' | 'spacious';
  showTestCases: boolean;
  showPerformanceMetrics: boolean;
  showChangeHistory: boolean;
  showRelationships: boolean;
  colorScheme: 'auto' | 'light' | 'dark' | 'high-contrast';
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
  testCoverageRate: number;
  documentationCompleteness: number;
  apiHealthScore: number;
  breakingChangeRate: number;
  performanceTrends: { [endpoint: string]: number[] };
}

export interface SearchOptions {
  fuzzy: boolean;
  caseSensitive: boolean;
  includeDescription: boolean;
  includeTags: boolean;
  includeParameters: boolean;
  includeResponseBodies: boolean;
  includeRequestBodies: boolean;
  includeTestCases: boolean;
  includeBusinessContext: boolean;
  searchDepth: 'shallow' | 'deep' | 'comprehensive';
}

export interface CodeExportOptions {
  language: 'typescript' | 'javascript' | 'python' | 'java' | 'csharp' | 'go' | 'rust' | 'swift';
  includeValidation: boolean;
  includeDocumentation: boolean;
  includeExamples: boolean;
  namingConvention: 'camelCase' | 'PascalCase' | 'snake_case' | 'kebab-case';
  outputFormat: 'types' | 'classes' | 'interfaces' | 'models';
  includeNullChecks: boolean;
  generateMocks: boolean;
}

export interface ExportResult {
  code: string;
  filename: string;
  language: string;
  errors?: string[];
  warnings?: string[];
}

export interface EnhancedSpecData {
  endpoints: EnhancedEndpointData[];
  schemas: EnhancedSchema[];
  analytics: AnalyticsData;
  availableTags: string[];
  availableMethods: string[];
  availableStatusCodes: string[];
  securitySchemes: string[];
  apiVersion: string;
  lastUpdated: string;
  healthStatus: 'healthy' | 'warning' | 'critical';
  maturityLevel: 'prototype' | 'beta' | 'stable' | 'deprecated';
}

export interface TestCase {
  id: string;
  name: string;
  description?: string;
  requestData?: any;
  expectedStatusCode: number;
  expectedResponseSchema?: any;
  tags?: string[];
}

export interface PerformanceMetrics {
  averageResponseTime?: number;
  percentile95?: number;
  successRate?: number;
  errorRate?: number;
  lastMeasured?: string;
}

export interface ChangeHistoryItem {
  version: string;
  date: string;
  changes: string[];
  breaking: boolean;
} 