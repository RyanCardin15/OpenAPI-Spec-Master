import * as vscode from 'vscode';
import { SpecItem } from './spec-manager-provider';
import { EnhancedEndpointData, EnhancedSchema, FilterState, GroupingState, ViewState, EnhancedSpecData, CodeExportOptions } from '../types/enhanced-spec';
import { EnhancedSearch } from '../utils/enhanced-search';
import { CodeGenerator } from '../utils/code-generator';
import { globalDebouncer, globalPerformanceMonitor, memoize } from '../utils/performance-cache';

export class EnhancedSpecWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'openapi-enhanced-spec';

    private _view?: vscode.WebviewView;
    private _currentSpec: SpecItem | null = null;
    private _enhancedData: EnhancedSpecData | null = null;
    private _search: EnhancedSearch = new EnhancedSearch();
    private _codeGenerator: CodeGenerator = new CodeGenerator();
    
    // Performance optimization flags
    private _isUpdating = false;
    private _pendingUpdate = false;

    private _filters: FilterState = {
        methods: [],
        tags: [],
        statusCodes: [],
        deprecated: null,
        search: '',
        complexity: [],
        security: [],
        pathPattern: '',
        hasParameters: null,
        hasRequestBody: null,
        responseTime: [],
        hasTestCases: null,
        hasExamples: null,
        lastModified: null,
        breaking: null,
        responseBodySearch: ''
    };

    private _grouping: GroupingState = {
        groupBy: 'tag',
        sortBy: 'path',
        sortOrder: 'asc'
    };

    private _viewState: ViewState = {
        layout: 'list',
        showDetails: true,
        showBusinessContext: false,
        showAISuggestions: false,
        showCodeExamples: false,
        density: 'comfortable',
        showTestCases: false,
        showPerformanceMetrics: false,
        showChangeHistory: false,
        showRelationships: false,
        colorScheme: 'auto'
    };

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'updateFilters':
                    this._filters = { ...this._filters, ...data.filters };
                    this._updateView();
                    break;
                case 'updateGrouping':
                    this._grouping = { ...this._grouping, ...data.grouping };
                    this._updateView();
                    break;
                case 'updateViewState':
                    this._viewState = { ...this._viewState, ...data.viewState };
                    this._updateView();
                    break;
                case 'clearFilters':
                    this._filters = {
                        methods: [],
                        tags: [],
                        statusCodes: [],
                        deprecated: null,
                        search: '',
                        complexity: [],
                        security: [],
                        pathPattern: '',
                        hasParameters: null,
                        hasRequestBody: null,
                        responseTime: [],
                        hasTestCases: null,
                        hasExamples: null,
                        lastModified: null,
                        breaking: null,
                        responseBodySearch: ''
                    };
                    this._updateView();
                    break;
                case 'openEndpoint':
                    this._openEndpointDetails(data.endpointId);
                    break;
                case 'openSchema':
                    this._openSchemaDetails(data.schemaName);
                    break;
                case 'generateCode':
                    this._generateCodeForEndpoint(data.endpointId);
                    break;
                case 'generateSDK':
                    this._generateSDK(data.options);
                    break;
                case 'runEndpointTest':
                    this._runEndpointTest(data.endpointId);
                    break;
                case 'showRelatedEndpoints':
                    this._showRelatedEndpoints(data.endpointId);
                    break;
                case 'analyzeEndpoint':
                    this._analyzeEndpoint(data.endpointId);
                    break;
                case 'copyCode':
                    this._copyToClipboard(data.code);
                    break;
                case 'showEndpointDetails':
                    this._showEndpointDetails(data.endpointId);
                    break;
                case 'showEndpointBody':
                    this._showEndpointBody(data.endpointId);
                    break;
                case 'showEndpointCode':
                    this._showEndpointCode(data.endpointId, data.codeType);
                    break;
                case 'exportEndpoint':
                    this._exportEndpoint(data.endpointId);
                    break;
                case 'selectCodeType':
                    this._selectCodeType(data.endpointId);
                    break;
            }
        });

        // Send initial data
        this._updateView();
    }

    public setCurrentSpec(spec: SpecItem | null): void {
        this._currentSpec = spec;
        if (spec?.spec) {
            this._enhancedData = this._analyzeSpec(spec.spec);
            this._search.updateData(this._enhancedData.endpoints, this._enhancedData.schemas);
            // Update the panel title to show the spec name
            if (this._view) {
                this._view.title = `${spec.name} - Enhanced View`;
            }
        } else {
            this._enhancedData = null;
            this._search.updateData([], []);
            // Reset the panel title
            if (this._view) {
                this._view.title = 'No Spec Selected';
            }
        }
        this._updateView();
    }

    private _updateView(): void {
        // Use debouncing for frequent updates
        globalDebouncer.debounce('updateView', () => this._performUpdate(), 300)();
    }

    private _performUpdate(): void {
        if (this._isUpdating) {
            this._pendingUpdate = true;
            return;
        }

        this._isUpdating = true;
        const endTimer = globalPerformanceMonitor.startTiming('updateView');

        try {
            if (this._view && this._enhancedData) {
                const filteredEndpoints = this._search.searchEndpoints(this._filters, this._grouping);
                const groupedEndpoints = this._search.groupEndpoints(filteredEndpoints, this._grouping.groupBy);
                
                this._view.webview.postMessage({
                    type: 'updateData',
                    data: {
                        ...this._enhancedData,
                        filteredEndpoints,
                        groupedEndpoints,
                        filters: this._filters,
                        grouping: this._grouping,
                        viewState: this._viewState,
                        totalFiltered: filteredEndpoints.length,
                        availableTags: this._search.getAvailableTags(),
                        availableMethods: this._search.getAvailableMethods(),
                        availableStatusCodes: this._search.getAvailableStatusCodes(),
        
                        healthStatus: this._enhancedData.healthStatus
                    }
                });
            } else if (this._view) {
                this._view.webview.postMessage({
                    type: 'noSpec',
                    data: null
                });
            }
        } finally {
            this._isUpdating = false;
            endTimer();

            // Handle pending update
            if (this._pendingUpdate) {
                this._pendingUpdate = false;
                setTimeout(() => this._performUpdate(), 100);
            }
        }
    }

    private _analyzeSpec(spec: any): EnhancedSpecData {
        const endTimer = globalPerformanceMonitor.startTiming('analyzeSpec');
        
        // Use memoization for expensive spec analysis
        const specHash = JSON.stringify(spec).substring(0, 100); // Simple hash for memoization key
        const memoizedAnalyze = memoize((specData: any) => this._performSpecAnalysis(specData), 5, 15 * 60 * 1000);
        
        const result = memoizedAnalyze(spec);
        endTimer();
        return result;
    }

    private _performSpecAnalysis(spec: any): EnhancedSpecData {
        const endpoints: EnhancedEndpointData[] = [];
        const schemas: EnhancedSchema[] = [];
        
        console.log('Starting spec analysis for:', spec.info?.title || 'Unknown API');

        // Extract endpoints
        if (spec.paths) {
            Object.entries(spec.paths).forEach(([path, pathObj]: [string, any]) => {
                Object.entries(pathObj).forEach(([method, operation]: [string, any]) => {
                    if (typeof operation === 'object' && operation !== null && 
                        ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method.toLowerCase())) {
                        const endpoint: EnhancedEndpointData = {
                            id: `${method.toUpperCase()}_${path}`,
                            path,
                            method: method.toUpperCase(),
                            summary: operation.summary || '',
                            description: operation.description || '',
                            tags: operation.tags || [],
                            parameters: this._extractParameters(operation.parameters || []),
                            requestBody: operation.requestBody,
                            responses: operation.responses || {},
                            deprecated: operation.deprecated || false,
                            operationId: operation.operationId,
                            externalDocs: operation.externalDocs,
                            complexity: this._calculateComplexity(operation),
                            security: operation.security || spec.security || [],
                            pathSegments: path.split('/').filter(Boolean),
                            hasPathParams: (operation.parameters || []).some((p: any) => p.in === 'path'),
                            hasQueryParams: (operation.parameters || []).some((p: any) => p.in === 'query'),
                            hasRequestBody: !!operation.requestBody,
                            responseTypes: Object.keys(operation.responses || {}),
                            estimatedResponseTime: this._estimateResponseTime(operation),
                            businessContext: this._generateBusinessContext(operation, path),
                            aiSuggestions: this._generateAISuggestions(operation, path),
                            // Enhanced features
                            responseBodySchemas: this._extractResponseBodySchemas(operation.responses || {}),
                            responseBodyContent: this._extractResponseBodyContent(operation.responses || {}),
                            sampleRequestBodies: this._generateSampleRequestBodies(operation),
                            sampleResponses: this._generateSampleResponses(operation.responses || {}),
                            usagePatterns: this._generateUsagePatterns(operation, path),
                            relatedEndpoints: this._findRelatedEndpoints(path, operation.tags || []),
                            testCases: this._generateTestCases(operation, path),
                            performanceMetrics: this._generatePerformanceMetrics(operation),
                            changeHistory: this._generateChangeHistory(operation)
                        };
                        endpoints.push(endpoint);
                    }
                });
            });
        }

        // Extract schemas with enhancements
        if (spec.components?.schemas) {
            Object.entries(spec.components.schemas).forEach(([name, schemaObj]: [string, any]) => {
                const schema: EnhancedSchema = {
                    name,
                    type: schemaObj.type,
                    description: schemaObj.description,
                    properties: schemaObj.properties,
                    required: schemaObj.required,
                    example: schemaObj.example,
                    deprecated: schemaObj.deprecated,
                    complexity: this._calculateSchemaComplexity(schemaObj),
                    usageCount: this._calculateSchemaUsage(name, spec),
                    // Enhanced features
    
                    relationships: this._findSchemaRelationships(name, schemaObj, spec.components.schemas),
                    validationRules: this._extractValidationRules(schemaObj),
                    migrationHistory: this._generateSchemaMigrationHistory(name, schemaObj),
                    codeExamples: this._generateSchemaCodeExamples(name, schemaObj)
                };
                schemas.push(schema);
            });
        }

        console.log(`Extracted ${endpoints.length} endpoints and ${schemas.length} schemas`);
        
        // Create a temporary search instance to get the available options
        const tempSearch = new EnhancedSearch(endpoints, schemas);
        
        const availableTags = tempSearch.getAvailableTags();
        const availableMethods = tempSearch.getAvailableMethods();
        const availableStatusCodes = tempSearch.getAvailableStatusCodes();
        
        console.log('Available data:', {
            tags: availableTags,
            methods: availableMethods,
            statusCodes: availableStatusCodes
        });

        return {
            endpoints,
            schemas,
            analytics: this._calculateAnalytics(endpoints, schemas),
            availableTags,
            availableMethods,
            availableStatusCodes,
            securitySchemes: tempSearch.getSecuritySchemes(),
            
            apiVersion: spec.info?.version || '1.0.0',
            lastUpdated: new Date().toISOString(),
            healthStatus: this._calculateHealthStatus(endpoints, schemas),
            maturityLevel: this._calculateMaturityLevel(spec, endpoints)
        };
    }

    private _extractParameters(params: any[]): EnhancedEndpointData['parameters'] {
        return params.map(param => ({
            name: param.name,
            in: param.in,
            description: param.description,
            required: param.required,
            deprecated: param.deprecated,
            schema: param.schema,
            example: param.example
        }));
    }

    private _calculateComplexity(operation: any): 'low' | 'medium' | 'high' {
        let score = 0;
        
        // Parameters complexity
        const paramCount = (operation.parameters || []).length;
        if (paramCount > 5) score += 2;
        else if (paramCount > 2) score += 1;

        // Request body complexity
        if (operation.requestBody) {
            score += 1;
            if (operation.requestBody.content && Object.keys(operation.requestBody.content).length > 1) {
                score += 1;
            }
        }

        // Response complexity
        const responseCount = Object.keys(operation.responses || {}).length;
        if (responseCount > 3) score += 2;
        else if (responseCount > 1) score += 1;

        // Security requirements
        if (operation.security && operation.security.length > 0) {
            score += 1;
        }

        if (score >= 4) return 'high';
        if (score >= 2) return 'medium';
        return 'low';
    }

    private _calculateSchemaComplexity(schema: any): 'low' | 'medium' | 'high' {
        let score = 0;
        
        if (schema.properties) {
            const propCount = Object.keys(schema.properties).length;
            if (propCount > 10) score += 2;
            else if (propCount > 5) score += 1;
        }

        if (schema.allOf || schema.oneOf || schema.anyOf) score += 2;
        if (schema.additionalProperties) score += 1;
        if (schema.required && schema.required.length > 5) score += 1;

        if (score >= 4) return 'high';
        if (score >= 2) return 'medium';
        return 'low';
    }

    private _estimateResponseTime(operation: any): 'fast' | 'medium' | 'slow' {
        // Simple heuristic based on operation characteristics
        if (operation.operationId?.includes('batch') || 
            operation.operationId?.includes('bulk') ||
            operation.summary?.toLowerCase().includes('export')) {
            return 'slow';
        }
        
        if (operation.method === 'GET' && !operation.parameters?.length) {
            return 'fast';
        }

        return 'medium';
    }

    private _calculateSchemaUsage(schemaName: string, spec: any): number {
        // Simple usage calculation - count references
        const specString = JSON.stringify(spec);
        const regex = new RegExp(`#/components/schemas/${schemaName}`, 'g');
        const matches = specString.match(regex);
        return matches ? matches.length - 1 : 0; // -1 to exclude the definition itself
    }

    private _generateBusinessContext(operation: any, path: string): string {
        // Generate basic business context based on path and operation
        const pathSegments = path.split('/').filter(Boolean);
        const resource = pathSegments[0] || 'resource';
        const method = operation.method || 'operation';
        
        return `This ${method.toLowerCase()} operation manages ${resource} resources. ${operation.summary || ''}`;
    }

    private _generateAISuggestions(operation: any, path: string): string[] {
        const suggestions: string[] = [];
        
        if (!operation.summary) {
            suggestions.push('Consider adding a summary to improve API documentation');
        }
        
        if (!operation.description) {
            suggestions.push('Add a detailed description to help developers understand the endpoint');
        }
        
        if (!operation.tags || operation.tags.length === 0) {
            suggestions.push('Add tags to organize and categorize this endpoint');
        }
        
        if (operation.deprecated) {
            suggestions.push('This endpoint is deprecated - consider providing migration guidance');
        }

        return suggestions;
    }

    private _calculateAnalytics(endpoints: EnhancedEndpointData[], schemas: EnhancedSchema[]) {
        const methodDistribution: { [method: string]: number } = {};
        const tagDistribution: { [tag: string]: number } = {};
        const complexityDistribution: { [complexity: string]: number } = {};
        const responseCodeDistribution: { [code: string]: number } = {};
        const schemaComplexity: { [complexity: string]: number } = {};

        endpoints.forEach(endpoint => {
            // Method distribution
            methodDistribution[endpoint.method] = (methodDistribution[endpoint.method] || 0) + 1;
            
            // Tag distribution
            endpoint.tags.forEach(tag => {
                tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
            });
            
            // Complexity distribution
            if (endpoint.complexity) {
                complexityDistribution[endpoint.complexity] = (complexityDistribution[endpoint.complexity] || 0) + 1;
            }
            
            // Response code distribution
            Object.keys(endpoint.responses).forEach(code => {
                responseCodeDistribution[code] = (responseCodeDistribution[code] || 0) + 1;
            });
        });

        schemas.forEach(schema => {
            if (schema.complexity) {
                schemaComplexity[schema.complexity] = (schemaComplexity[schema.complexity] || 0) + 1;
            }
        });

        const securitySchemes = Array.from(new Set(
            endpoints.flatMap(e => e.security?.flatMap(s => Object.keys(s)) || [])
        ));

        const totalParameters = endpoints.reduce((sum, e) => sum + e.parameters.length, 0);
        const averageParametersPerEndpoint = endpoints.length > 0 ? totalParameters / endpoints.length : 0;

        const pathPatterns = Array.from(new Set(
            endpoints.map(e => e.pathSegments?.[0] || 'root')
        ));

        // Calculate enhanced analytics

        const testCoverageRate = endpoints.length > 0 ? 
            (endpoints.filter(e => e.testCases && e.testCases.length > 0).length / endpoints.length) * 100 : 0;

        const documentationCompleteness = endpoints.length > 0 ?
            (endpoints.filter(e => e.description && e.summary).length / endpoints.length) * 100 : 0;

        const apiHealthScore = (testCoverageRate + documentationCompleteness) / 2;

        const breakingChangeRate = endpoints.length > 0 ?
            (endpoints.filter(e => e.changeHistory?.some(c => c.breaking)).length / endpoints.length) * 100 : 0;

        const performanceTrends: { [endpoint: string]: number[] } = {};
        endpoints.forEach(e => {
            if (e.performanceMetrics?.averageResponseTime) {
                performanceTrends[e.id] = [e.performanceMetrics.averageResponseTime];
            }
        });

        return {
            totalEndpoints: endpoints.length,
            methodDistribution,
            tagDistribution,
            complexityDistribution,
            deprecatedCount: endpoints.filter(e => e.deprecated).length,
            securitySchemes,
            averageParametersPerEndpoint,
            pathPatterns,
            responseCodeDistribution,
            totalSchemas: schemas.length,
            schemaComplexity,
            testCoverageRate,
            documentationCompleteness,
            apiHealthScore,
            breakingChangeRate,
            performanceTrends
        };
    }

    // Enhanced helper methods for new features
    private _extractResponseBodySchemas(responses: any): { [statusCode: string]: any } {
        const schemas: { [statusCode: string]: any } = {};
        
        Object.entries(responses).forEach(([statusCode, response]: [string, any]) => {
            if (response.content) {
                Object.entries(response.content).forEach(([mediaType, content]: [string, any]) => {
                    if (content.schema) {
                        // Resolve schema references if needed
                        let resolvedSchema = content.schema;
                        
                        // If it's a reference, try to resolve it
                        if (content.schema.$ref && this._currentSpec?.spec) {
                            console.log(`Resolving schema reference: ${content.schema.$ref}`);
                            const refPath = content.schema.$ref.replace('#/', '').split('/');
                            let resolved = this._currentSpec.spec;
                            
                            for (const pathPart of refPath) {
                                if (resolved && resolved[pathPart]) {
                                    resolved = resolved[pathPart];
                                } else {
                                    console.log(`Failed to resolve path part: ${pathPart}`);
                                    resolved = null;
                                    break;
                                }
                            }
                            
                            if (resolved) {
                                console.log(`Successfully resolved schema:`, resolved);
                                resolvedSchema = {
                                    ...resolved,
                                    $ref: content.schema.$ref  // Keep the original reference for context
                                };
                            } else {
                                console.log(`Could not resolve reference: ${content.schema.$ref}`);
                            }
                        }
                        
                        console.log(`Setting schema for status ${statusCode}:`, resolvedSchema);
                        schemas[statusCode] = resolvedSchema;
                    }
                });
            }
        });
        
        console.log('Final extracted schemas:', schemas);
        return schemas;
    }

    private _extractResponseBodyContent(responses: any): string {
        let content = '';
        
        Object.entries(responses).forEach(([statusCode, response]: [string, any]) => {
            content += `Status ${statusCode}: ${response.description || ''}\n`;
            
            if (response.content) {
                Object.entries(response.content).forEach(([mediaType, contentInfo]: [string, any]) => {
                    content += `Content-Type: ${mediaType}\n`;
                    if (contentInfo.schema) {
                        content += `Schema: ${JSON.stringify(contentInfo.schema, null, 2)}\n`;
                    }
                    if (contentInfo.example) {
                        content += `Example: ${JSON.stringify(contentInfo.example, null, 2)}\n`;
                    }
                });
            }
            content += '\n';
        });
        
        return content;
    }

    private _generateSampleRequestBodies(operation: any): any[] {
        const samples: any[] = [];
        
        if (operation.requestBody?.content) {
            Object.entries(operation.requestBody.content).forEach(([mediaType, content]: [string, any]) => {
                if (content.example) {
                    samples.push(content.example);
                } else if (content.schema) {
                    samples.push(this._generateSchemaExample(content.schema));
                }
            });
        }
        
        return samples;
    }

    private _generateSampleResponses(responses: any): { [statusCode: string]: any } {
        const samples: { [statusCode: string]: any } = {};
        
        Object.entries(responses).forEach(([statusCode, response]: [string, any]) => {
            if (response.content) {
                Object.entries(response.content).forEach(([mediaType, content]: [string, any]) => {
                    if (content.example) {
                        samples[statusCode] = content.example;
                    } else if (content.schema) {
                        samples[statusCode] = this._generateSchemaExample(content.schema);
                    }
                });
            }
        });
        
        return samples;
    }

    private _generateUsagePatterns(operation: any, path: string): string[] {
        const patterns: string[] = [];
        
        // Common patterns based on HTTP method and path
        const method = operation.method || 'GET';
        if (method === 'GET' && path.includes('{id}')) {
            patterns.push('Retrieve single resource by ID');
        } else if (method === 'GET') {
            patterns.push('List/search resources');
        } else if (method === 'POST') {
            patterns.push('Create new resource');
        } else if (method === 'PUT') {
            patterns.push('Update/replace resource');
        } else if (method === 'PATCH') {
            patterns.push('Partial update resource');
        } else if (method === 'DELETE') {
            patterns.push('Remove resource');
        }
        
        // Add patterns based on tags
        if (operation.tags) {
            operation.tags.forEach((tag: string) => {
                patterns.push(`${tag} operations`);
            });
        }
        
        return patterns;
    }

    private _findRelatedEndpoints(path: string, tags: string[]): string[] {
        // This would be implemented to find related endpoints based on path similarity and shared tags
        // For now, return empty array as a placeholder
        return [];
    }

    private _generateTestCases(operation: any, path: string): any[] {
        const testCases: any[] = [];
        
        // Generate basic test cases
        if (operation.responses) {
            Object.keys(operation.responses).forEach(statusCode => {
                testCases.push({
                    id: `test_${statusCode}`,
                    name: `Test ${statusCode} response`,
                    description: `Verify endpoint returns ${statusCode} status`,
                    expectedStatusCode: parseInt(statusCode),
                    tags: ['auto-generated']
                });
            });
        }
        
        return testCases;
    }

    private _generatePerformanceMetrics(operation: any): any {
        // Mock performance metrics - in real implementation, this would come from monitoring
        return {
            averageResponseTime: Math.random() * 1000,
            percentile95: Math.random() * 2000,
            successRate: 95 + Math.random() * 5,
            errorRate: Math.random() * 5,
            lastMeasured: new Date().toISOString()
        };
    }

    private _generateChangeHistory(operation: any): any[] {
        // Mock change history - in real implementation, this would come from version control
        return [
            {
                version: '1.0.0',
                date: new Date().toISOString(),
                changes: ['Initial implementation'],
                breaking: false
            }
        ];
    }



    private _findSchemaRelationships(name: string, schemaObj: any, allSchemas: any): any[] {
        const relationships: any[] = [];
        
        // Find relationships by analyzing schema properties
        if (schemaObj.properties) {
            Object.entries(schemaObj.properties).forEach(([propName, propSchema]: [string, any]) => {
                if (propSchema.$ref) {
                    const refSchema = propSchema.$ref.split('/').pop();
                    if (refSchema && refSchema !== name) {
                        relationships.push({
                            type: 'references',
                            targetSchema: refSchema,
                            description: `References ${refSchema} via ${propName}`
                        });
                    }
                }
            });
        }
        
        return relationships;
    }

    private _extractValidationRules(schemaObj: any): any {
        const rules: any = {};
        
        if (schemaObj.properties) {
            Object.entries(schemaObj.properties).forEach(([propName, propSchema]: [string, any]) => {
                const propRules: any[] = [];
                
                if (propSchema.minLength !== undefined) {
                    propRules.push({ type: 'length', value: { min: propSchema.minLength }, message: `Minimum length: ${propSchema.minLength}` });
                }
                if (propSchema.maxLength !== undefined) {
                    propRules.push({ type: 'length', value: { max: propSchema.maxLength }, message: `Maximum length: ${propSchema.maxLength}` });
                }
                if (propSchema.pattern) {
                    propRules.push({ type: 'pattern', value: propSchema.pattern, message: `Must match pattern: ${propSchema.pattern}` });
                }
                if (propSchema.enum) {
                    propRules.push({ type: 'enum', value: propSchema.enum, message: `Must be one of: ${propSchema.enum.join(', ')}` });
                }
                
                if (propRules.length > 0) {
                    rules[propName] = propRules;
                }
            });
        }
        
        return rules;
    }

    private _generateSchemaMigrationHistory(name: string, schemaObj: any): any[] {
        // Mock migration history
        return [
            {
                fromVersion: '0.9.0',
                toVersion: '1.0.0',
                changes: ['Added validation rules', 'Updated description'],
                breaking: false,
                migrationScript: '// No migration needed'
            }
        ];
    }

    private _generateSchemaCodeExamples(name: string, schemaObj: any): { [language: string]: string } {
        return {
            typescript: `interface ${name} {\n  // TypeScript interface\n}`,
            python: `class ${name}:\n    # Python class`,
            java: `public class ${name} {\n    // Java class\n}`
        };
    }

    private _calculateHealthStatus(endpoints: EnhancedEndpointData[], schemas: EnhancedSchema[]): 'healthy' | 'warning' | 'critical' {
        const deprecatedCount = endpoints.filter(e => e.deprecated).length;
        const undocumentedCount = endpoints.filter(e => !e.description).length;
        
        const deprecatedRatio = deprecatedCount / endpoints.length;
        const undocumentedRatio = undocumentedCount / endpoints.length;
        
        if (deprecatedRatio > 0.3 || undocumentedRatio > 0.5) {
            return 'critical';
        } else if (deprecatedRatio > 0.1 || undocumentedRatio > 0.3) {
            return 'warning';
        }
        
        return 'healthy';
    }

    private _calculateMaturityLevel(spec: any, endpoints: EnhancedEndpointData[]): 'prototype' | 'beta' | 'stable' | 'deprecated' {
        const version = spec.info?.version || '0.1.0';
        const deprecatedCount = endpoints.filter(e => e.deprecated).length;
        
        if (deprecatedCount > endpoints.length * 0.5) {
            return 'deprecated';
        } else if (version.startsWith('0.')) {
            return 'prototype';
        } else if (version.startsWith('1.0') || version.startsWith('1.1')) {
            return 'beta';
        } else {
            return 'stable';
        }
    }

    // New action methods
    private _generateSDK(options: CodeExportOptions): void {
        if (!this._enhancedData) {
            vscode.window.showErrorMessage('No spec data available for SDK generation');
            return;
        }
        
        try {
            // Enhanced options for full SDK generation
            const sdkOptions: CodeExportOptions = {
                ...options,
                outputFormat: 'classes', // Always generate full classes for SDK
                includeValidation: true,
                includeDocumentation: true,
                includeExamples: true,
                includeNullChecks: true
            };

            const result = this._codeGenerator.generateCode(
                this._enhancedData.schemas,
                this._enhancedData.endpoints,
                sdkOptions
            );
            
            if (result.errors && result.errors.length > 0) {
                vscode.window.showErrorMessage(`SDK generation failed: ${result.errors.join(', ')}`);
                return;
            }
            
            // Create a new document with the generated SDK
            vscode.workspace.openTextDocument({
                content: result.code,
                language: this._getVSCodeLanguage(options.language)
            }).then(doc => {
                vscode.window.showTextDocument(doc);
                vscode.window.showInformationMessage(`${options.language} SDK generated successfully! This is a comprehensive, production-ready SDK with full API client functionality.`);
            });
            
        } catch (error) {
            vscode.window.showErrorMessage(`SDK generation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private _runEndpointTest(endpointId: string): void {
        const endpoint = this._enhancedData?.endpoints.find(e => e.id === endpointId);
        if (!endpoint) {
            vscode.window.showErrorMessage('Endpoint not found');
            return;
        }
        
        // Show test runner interface
        vscode.window.showInformationMessage(
            `Running tests for ${endpoint.method} ${endpoint.path}...`,
            'View Results'
        ).then(selection => {
            if (selection === 'View Results') {
                this._showTestResults(endpoint);
            }
        });
    }

    private _showRelatedEndpoints(endpointId: string): void {
        const endpoint = this._enhancedData?.endpoints.find(e => e.id === endpointId);
        if (!endpoint) {
            return;
        }
        
        const related = this._search.searchRelatedEndpoints(endpointId);
        if (related.length === 0) {
            vscode.window.showInformationMessage('No related endpoints found');
            return;
        }
        
        // Update view to show related endpoints
        this._view?.webview.postMessage({
            type: 'showRelatedEndpoints',
            data: { endpointId, relatedEndpoints: related }
        });
    }

    private _analyzeEndpoint(endpointId: string): void {
        const endpoint = this._enhancedData?.endpoints.find(e => e.id === endpointId);
        if (!endpoint) {
            return;
        }
        
        // Generate analysis report
        const analysis = {
            complexity: endpoint.complexity,
            businessContext: endpoint.businessContext,
            suggestions: endpoint.aiSuggestions,
            testCoverage: endpoint.testCases?.length || 0,
            performanceScore: endpoint.performanceMetrics?.successRate || 0,
            documentationScore: this._calculateDocumentationScore(endpoint)
        };
        
        this._view?.webview.postMessage({
            type: 'showAnalysis',
            data: { endpointId, analysis }
        });
    }

    private _copyToClipboard(code: string): void {
        vscode.env.clipboard.writeText(code).then(() => {
            vscode.window.showInformationMessage('Code copied to clipboard!');
        });
    }

    private _showEndpointDetails(endpointId: string): void {
        const endpoint = this._enhancedData?.endpoints.find(e => e.id === endpointId);
        if (!endpoint) return;

        // Create a new webview panel for detailed endpoint view
        const panel = vscode.window.createWebviewPanel(
            'openapi-endpoint-details',
            `Details: ${endpoint.method} ${endpoint.path}`,
            vscode.ViewColumn.Two,
            { enableScripts: true }
        );

        panel.webview.html = this._getEndpointDetailsPanel(endpoint);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'generateCode':
                    this._generateCodeForEndpoint(endpointId);
                    break;
                case 'copyPath':
                    vscode.env.clipboard.writeText(endpoint.path);
                    vscode.window.showInformationMessage('Path copied to clipboard');
                    break;
                case 'copyUrl':
                    const baseUrl = this._currentSpec?.spec?.servers?.[0]?.url || 'https://api.example.com';
                    const fullUrl = `${baseUrl}${endpoint.path}`;
                    vscode.env.clipboard.writeText(fullUrl);
                    vscode.window.showInformationMessage('URL copied to clipboard');
                    break;
            }
        });
    }

    private _showEndpointBody(endpointId: string): void {
        const endpoint = this._enhancedData?.endpoints.find(e => e.id === endpointId);
        if (!endpoint) return;

        // Create a new webview panel for response body view
        const panel = vscode.window.createWebviewPanel(
            'openapi-endpoint-body',
            `Body: ${endpoint.method} ${endpoint.path}`,
            vscode.ViewColumn.Two,
            { enableScripts: true }
        );

        panel.webview.html = this._getEndpointBodyPanel(endpoint);
    }

    private _showEndpointCode(endpointId: string, codeType?: string): void {
        const endpoint = this._enhancedData?.endpoints.find(e => e.id === endpointId);
        if (!endpoint) return;

        if (!codeType) {
            this._selectCodeType(endpointId);
            return;
        }

        // Generate code based on type
        this._generateCodeWithType(endpoint, codeType);
    }

    private _exportEndpoint(endpointId: string): void {
        const endpoint = this._enhancedData?.endpoints.find(e => e.id === endpointId);
        if (!endpoint) return;

        // Create and open a comprehensive endpoint documentation file
        this._createEndpointDocumentationFile(endpoint);
    }

    private _selectCodeType(endpointId: string): void {
        const items = [
            { label: 'Types', description: 'Generate TypeScript/language-specific types' },
            { label: 'HttpRequest', description: 'Generate HTTP request code' }
        ];

        vscode.window.showQuickPick(items, {
            placeHolder: 'Select code generation type'
        }).then(selected => {
            if (selected) {
                this._showEndpointCode(endpointId, selected.label);
            }
        });
    }

    private _getEndpointDetailsPanel(endpoint: EnhancedEndpointData): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Endpoint Details</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        .header {
            border-bottom: 2px solid var(--vscode-panel-border);
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        .method-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 14px;
            margin-right: 15px;
            text-transform: uppercase;
        }
        .method-get { background-color: #28a745; color: white; }
        .method-post { background-color: #007bff; color: white; }
        .method-put { background-color: #fd7e14; color: white; }
        .method-delete { background-color: #dc3545; color: white; }
        .method-patch { background-color: #6f42c1; color: white; }
        .section {
            margin: 25px 0;
            padding: 20px;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 6px;
            border-left: 4px solid var(--vscode-textLink-foreground);
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 15px;
        }
        .parameter-item {
            margin: 10px 0;
            padding: 10px;
            background: var(--vscode-textCodeBlock-background);
            border-radius: 4px;
        }
        .parameter-name {
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }
        .ai-suggestion {
            margin: 8px 0;
            padding: 10px;
            background: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
        }
        .usage-pattern {
            margin: 8px 0;
            padding: 8px;
            background: var(--vscode-textCodeBlock-background);
            border-radius: 4px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="header">
        <span class="method-badge method-${endpoint.method.toLowerCase()}">${endpoint.method}</span>
        <span style="font-size: 20px; font-weight: bold;">${endpoint.path}</span>
        ${endpoint.summary ? `<p style="margin-top: 10px; color: var(--vscode-descriptionForeground);">${endpoint.summary}</p>` : ''}
    </div>

    ${endpoint.parameters.length > 0 ? `
        <div class="section">
            <div class="section-title">Parameters</div>
            ${endpoint.parameters.map(param => `
                <div class="parameter-item">
                    <span class="parameter-name">${param.name}</span>
                    <span style="color: var(--vscode-descriptionForeground); margin-left: 8px;">(${param.in})</span>
                    ${param.required ? '<span style="color: #dc3545; margin-left: 8px;">*required</span>' : ''}
                    ${param.description ? `<div style="margin-top: 8px;">${param.description}</div>` : ''}
                    ${param.schema ? `<div style="margin-top: 8px; font-family: monospace; font-size: 12px;">Type: ${param.schema.type || 'any'}</div>` : ''}
                </div>
            `).join('')}
        </div>
    ` : ''}

    ${endpoint.responseBodySchemas && Object.keys(endpoint.responseBodySchemas).length > 0 ? `
        <div class="section">
            <div class="section-title">Response Schemas</div>
            ${Object.entries(endpoint.responseBodySchemas).map(([status, schema]) => `
                <div style="margin: 15px 0;">
                    <div style="font-weight: bold; margin-bottom: 8px;">Status ${status}</div>
                    <pre style="background: var(--vscode-textCodeBlock-background); padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(schema, null, 2)}</pre>
                </div>
            `).join('')}
        </div>
    ` : ''}

    ${endpoint.usagePatterns && endpoint.usagePatterns.length > 0 ? `
        <div class="section">
            <div class="section-title">Usage Patterns</div>
            ${endpoint.usagePatterns.map(pattern => `
                <div class="usage-pattern">${pattern}</div>
            `).join('')}
        </div>
    ` : ''}

    ${endpoint.aiSuggestions && endpoint.aiSuggestions.length > 0 ? `
        <div class="section">
            <div class="section-title">AI Suggestions</div>
            ${endpoint.aiSuggestions.map(suggestion => `
                <div class="ai-suggestion">${suggestion}</div>
            `).join('')}
        </div>
    ` : ''}
</body>
</html>`;
    }

    private _getEndpointBodyPanel(endpoint: EnhancedEndpointData): string {
        // Use the full schema registry to resolve any schema references
        const resolvedResponseSchemas = this._resolveResponseSchemas(endpoint);
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Response Body</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        .header {
            border-bottom: 2px solid var(--vscode-panel-border);
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        .method-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 14px;
            margin-right: 15px;
            text-transform: uppercase;
        }
        .method-get { background-color: #28a745; color: white; }
        .method-post { background-color: #007bff; color: white; }
        .method-put { background-color: #fd7e14; color: white; }
        .method-delete { background-color: #dc3545; color: white; }
        .method-patch { background-color: #6f42c1; color: white; }
        .response-body {
            background: var(--vscode-textCodeBlock-background);
            padding: 20px;
            border-radius: 6px;
            font-family: monospace;
            white-space: pre-wrap;
            overflow-x: auto;
            margin: 20px 0;
        }
        .status-section {
            margin: 20px 0;
            padding: 15px;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 6px;
            border-left: 4px solid var(--vscode-textLink-foreground);
        }
        .status-title {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 10px;
            color: var(--vscode-textLink-foreground);
        }
    </style>
</head>
<body>
    <div class="header">
        <span class="method-badge method-${endpoint.method.toLowerCase()}">${endpoint.method}</span>
        <span style="font-size: 20px; font-weight: bold;">${endpoint.path}</span>
        <p style="margin-top: 10px; color: var(--vscode-descriptionForeground);">Response Body Content</p>
    </div>

    ${endpoint.responseBodyContent ? `
        <div class="status-section">
            <div class="status-title">Raw Response Body</div>
            <div class="response-body">${endpoint.responseBodyContent}</div>
        </div>
    ` : ''}

    ${resolvedResponseSchemas && Object.keys(resolvedResponseSchemas).length > 0 ? `
        <div class="status-section">
            <div class="status-title">Response Body Schemas</div>
            ${Object.entries(resolvedResponseSchemas).map(([status, schema]) => `
                <div style="margin: 15px 0;">
                    <div style="font-weight: bold; margin-bottom: 8px;">Status ${status} Schema</div>
                    <div class="response-body">${this._formatSchemaForDisplay(schema)}</div>
                </div>
            `).join('')}
        </div>
    ` : ''}

    ${endpoint.sampleResponses && Object.keys(endpoint.sampleResponses).length > 0 ? `
        <div class="status-section">
            <div class="status-title">Sample Response Bodies</div>
            ${Object.entries(endpoint.sampleResponses).map(([status, response]) => `
                <div style="margin: 15px 0;">
                    <div style="font-weight: bold; margin-bottom: 8px;">Status ${status}</div>
                    <div class="response-body">${JSON.stringify(response, null, 2)}</div>
                </div>
            `).join('')}
        </div>
    ` : ''}

    ${(!endpoint.responseBodyContent && (!resolvedResponseSchemas || Object.keys(resolvedResponseSchemas).length === 0) && (!endpoint.sampleResponses || Object.keys(endpoint.sampleResponses).length === 0)) ? `
        <div class="status-section">
            <div class="status-title">No Response Body Available</div>
            <p>This endpoint does not have response body content, schemas, or sample responses defined.</p>
        </div>
    ` : ''}
</body>
</html>`;
    }

    private _generateCodeWithType(endpoint: EnhancedEndpointData, codeType: string): void {
        // Show language picker
        const languageItems = [
            { label: 'TypeScript', value: 'typescript' },
            { label: 'JavaScript', value: 'javascript' },
            { label: 'Python', value: 'python' },
            { label: 'Java', value: 'java' },
            { label: 'C#', value: 'csharp' },
            { label: 'Go', value: 'go' },
            { label: 'Rust', value: 'rust' },
            { label: 'Swift', value: 'swift' }
        ];

        vscode.window.showQuickPick(languageItems, {
            placeHolder: `Select language for ${codeType} generation`
        }).then(selectedLanguage => {
            if (!selectedLanguage) return;

            try {
                let code: string;
                if (codeType === 'Types') {
                    code = this._generateTypes(endpoint, selectedLanguage.value);
                } else {
                    code = this._generateHttpRequest(endpoint, selectedLanguage.value);
                }

                // Create new document with generated code
                vscode.workspace.openTextDocument({
                    content: code,
                    language: this._getVSCodeLanguage(selectedLanguage.value)
                }).then(doc => {
                    vscode.window.showTextDocument(doc);
                });

            } catch (error) {
                vscode.window.showErrorMessage(`Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }

    private _generateTypes(endpoint: EnhancedEndpointData, language: string): string {
        // Generate type definitions based on endpoint schema
        switch (language) {
            case 'typescript':
                return this._generateTypeScriptTypes(endpoint);
            case 'python':
                return this._generatePythonTypes(endpoint);
            case 'java':
                return this._generateJavaTypes(endpoint);
            default:
                return this._generateGenericTypes(endpoint, language);
        }
    }

    private _generateHttpRequest(endpoint: EnhancedEndpointData, language: string): string {
        // Generate HTTP request code
        switch (language) {
            case 'typescript':
            case 'javascript':
                return this._generateJSHttpRequest(endpoint);
            case 'python':
                return this._generatePythonHttpRequest(endpoint);
            case 'java':
                return this._generateJavaHttpRequest(endpoint);
            case 'csharp':
                return this._generateCSharpHttpRequest(endpoint);
            default:
                return this._generateCurlRequest(endpoint);
        }
    }

    private _generateTypeScriptTypes(endpoint: EnhancedEndpointData): string {
        let code = `// Types for ${endpoint.method.toUpperCase()} ${endpoint.path}\n\n`;
        
        // Request parameters interface
        if (endpoint.parameters.length > 0) {
            const pathParams = endpoint.parameters.filter(p => p.in === 'path');
            const queryParams = endpoint.parameters.filter(p => p.in === 'query');
            const headerParams = endpoint.parameters.filter(p => p.in === 'header');

            if (pathParams.length > 0) {
                code += 'interface PathParameters {\n';
                pathParams.forEach(param => {
                    const description = param.description ? `  /** ${param.description} */\n` : '';
                    code += `${description}  ${param.name}${param.required ? '' : '?'}: ${this._getTypeScriptType(param.schema)};\n`;
                });
                code += '}\n\n';
            }

            if (queryParams.length > 0) {
                code += 'interface QueryParameters {\n';
                queryParams.forEach(param => {
                    const description = param.description ? `  /** ${param.description} */\n` : '';
                    code += `${description}  ${param.name}${param.required ? '' : '?'}: ${this._getTypeScriptType(param.schema)};\n`;
                });
                code += '}\n\n';
            }

            if (headerParams.length > 0) {
                code += 'interface HeaderParameters {\n';
                headerParams.forEach(param => {
                    const description = param.description ? `  /** ${param.description} */\n` : '';
                    code += `${description}  ${param.name}${param.required ? '' : '?'}: ${this._getTypeScriptType(param.schema)};\n`;
                });
                code += '}\n\n';
            }
        }

        // Request body interface - now properly parsing the schema
        if (endpoint.requestBody) {
            const requestBodySchema = this._extractRequestBodySchema(endpoint.requestBody);
            if (requestBodySchema) {
                const interfaceContent = this._generateTypeScriptInterface(requestBodySchema, 'RequestBody');
                code += interfaceContent + '\n\n';
            } else {
                code += 'interface RequestBody {\n';
                code += '  [key: string]: any;\n';
                code += '}\n\n';
            }
        }

        // Response interfaces - now properly parsing the actual response schemas
        if (endpoint.responseBodySchemas && Object.keys(endpoint.responseBodySchemas).length > 0) {
            Object.entries(endpoint.responseBodySchemas).forEach(([status, schema]) => {
                if (schema) {
                    const interfaceName = `Response${status}`;
                    const interfaceContent = this._generateTypeScriptInterface(schema, interfaceName);
                    code += interfaceContent + '\n\n';
                } else {
                    code += `interface Response${status} {\n`;
                    code += '  [key: string]: any;\n';
                    code += '}\n\n';
                }
            });
        }

        // Add utility types for the endpoint
        const operationId = endpoint.operationId || `${endpoint.method.toLowerCase()}${endpoint.path.replace(/[^a-zA-Z0-9]/g, '')}`;
        code += `// Utility types for this endpoint\n`;
        code += `export type ${this._capitalize(operationId)}Request = {\n`;
        if (endpoint.parameters.some(p => p.in === 'path')) {
            code += `  pathParams: PathParameters;\n`;
        }
        if (endpoint.parameters.some(p => p.in === 'query')) {
            code += `  queryParams?: QueryParameters;\n`;
        }
        if (endpoint.parameters.some(p => p.in === 'header')) {
            code += `  headerParams?: HeaderParameters;\n`;
        }
        if (endpoint.requestBody) {
            code += `  body: RequestBody;\n`;
        }
        code += `};\n\n`;

        // Add response union type if multiple responses exist
        const responseStatuses = Object.keys(endpoint.responseBodySchemas || {});
        if (responseStatuses.length > 1) {
            code += `export type ${this._capitalize(operationId)}Response = \n`;
            code += responseStatuses.map(status => `  Response${status}`).join(' |\n');
            code += ';\n\n';
        }

        return code;
    }

    private _extractRequestBodySchema(requestBody: any): any {
        if (!requestBody || !requestBody.content) return null;
        
        // Look for JSON content first
        const jsonContent = requestBody.content['application/json'];
        if (jsonContent && jsonContent.schema) {
            return jsonContent.schema;
        }
        
        // Fall back to first available content type
        const firstContentType = Object.keys(requestBody.content)[0];
        if (firstContentType && requestBody.content[firstContentType].schema) {
            return requestBody.content[firstContentType].schema;
        }
        
        return null;
    }

    private _generateTypeScriptInterface(schema: any, interfaceName: string): string {
        if (!schema) {
            return `interface ${interfaceName} {\n  [key: string]: any;\n}`;
        }

        // Handle $ref references
        if (schema.$ref) {
            const refName = schema.$ref.split('/').pop() || 'any';
            return `export type ${interfaceName} = ${refName};`;
        }

        let interfaceContent = `interface ${interfaceName} {\n`;

        if (schema.description) {
            interfaceContent = `/** ${schema.description} */\n${interfaceContent}`;
        }

        if (schema.type === 'object' && schema.properties) {
            Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
                const isRequired = schema.required?.includes(propName) ?? false;
                const optional = isRequired ? '' : '?';
                const description = propSchema.description ? `  /** ${propSchema.description} */\n` : '';
                const propType = this._getDetailedTypeScriptType(propSchema);
                
                interfaceContent += `${description}  ${propName}${optional}: ${propType};\n`;
            });
        } else if (schema.type === 'array') {
            // For array responses, create an interface that represents the array type
            const itemType = this._getDetailedTypeScriptType(schema.items);
            return `export type ${interfaceName} = ${itemType}[];`;
        } else {
            // For primitive or unknown types
            const primitiveType = this._getDetailedTypeScriptType(schema);
            return `export type ${interfaceName} = ${primitiveType};`;
        }

        interfaceContent += '}';
        return interfaceContent;
    }

    private _getDetailedTypeScriptType(schema: any): string {
        if (!schema) return 'any';
        
        // Handle $ref references
        if (schema.$ref) {
            return schema.$ref.split('/').pop() || 'any';
        }
        
        // Handle enums
        if (schema.enum) {
            if (schema.type === 'string') {
                return schema.enum.map((val: string) => `'${val}'`).join(' | ');
            } else {
                return schema.enum.join(' | ');
            }
        }
        
        switch (schema.type) {
            case 'string':
                if (schema.format === 'date' || schema.format === 'date-time') {
                    return 'string'; // Could be Date if you prefer
                }
                return 'string';
            
            case 'number':
            case 'integer':
                return 'number';
            
            case 'boolean':
                return 'boolean';
            
            case 'array':
                const itemType = this._getDetailedTypeScriptType(schema.items);
                return `${itemType}[]`;
            
            case 'object':
                if (schema.properties) {
                    // Inline object type
                    let objectType = '{\n';
                    Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
                        const isRequired = schema.required?.includes(propName) ?? false;
                        const optional = isRequired ? '' : '?';
                        const propType = this._getDetailedTypeScriptType(propSchema);
                        objectType += `    ${propName}${optional}: ${propType};\n`;
                    });
                    objectType += '  }';
                    return objectType;
                } else if (schema.additionalProperties) {
                    // Record type
                    const valueType = this._getDetailedTypeScriptType(schema.additionalProperties);
                    return `Record<string, ${valueType}>`;
                } else {
                    return 'Record<string, any>';
                }
            
            default:
                return 'any';
        }
    }

    private _capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    private _generatePythonTypes(endpoint: EnhancedEndpointData): string {
        let code = `# Types for ${endpoint.method.toUpperCase()} ${endpoint.path}\n`;
        code += 'from typing import Optional, Dict, Any, List, Union\n';
        code += 'from dataclasses import dataclass\n';
        code += 'from datetime import datetime\n\n';

        // Request parameters dataclass
        if (endpoint.parameters.length > 0) {
            const pathParams = endpoint.parameters.filter(p => p.in === 'path');
            const queryParams = endpoint.parameters.filter(p => p.in === 'query');
            const headerParams = endpoint.parameters.filter(p => p.in === 'header');

            if (pathParams.length > 0) {
                code += '@dataclass\n';
                code += 'class PathParameters:\n';
                pathParams.forEach(param => {
                    const pythonType = this._getPythonType(param.schema);
                    const optional = param.required ? '' : 'Optional[';
                    const optionalClose = param.required ? '' : ']';
                    const description = param.description ? `    # ${param.description}\n` : '';
                    code += `${description}    ${param.name}: ${optional}${pythonType}${optionalClose}\n`;
                });
                code += '\n';
            }

            if (queryParams.length > 0) {
                code += '@dataclass\n';
                code += 'class QueryParameters:\n';
                queryParams.forEach(param => {
                    const pythonType = this._getPythonType(param.schema);
                    const optional = param.required ? '' : 'Optional[';
                    const optionalClose = param.required ? '' : ']';
                    const description = param.description ? `    # ${param.description}\n` : '';
                    code += `${description}    ${param.name}: ${optional}${pythonType}${optionalClose}\n`;
                });
                code += '\n';
            }

            if (headerParams.length > 0) {
                code += '@dataclass\n';
                code += 'class HeaderParameters:\n';
                headerParams.forEach(param => {
                    const pythonType = this._getPythonType(param.schema);
                    const optional = param.required ? '' : 'Optional[';
                    const optionalClose = param.required ? '' : ']';
                    const description = param.description ? `    # ${param.description}\n` : '';
                    code += `${description}    ${param.name}: ${optional}${pythonType}${optionalClose}\n`;
                });
                code += '\n';
            }
        }

        // Request body dataclass
        if (endpoint.requestBody) {
            const requestBodySchema = this._extractRequestBodySchema(endpoint.requestBody);
            if (requestBodySchema) {
                const dataclassContent = this._generatePythonDataclass(requestBodySchema, 'RequestBody');
                code += dataclassContent + '\n\n';
            } else {
                code += '@dataclass\n';
                code += 'class RequestBody:\n';
                code += '    # Define based on your request body schema\n';
                code += '    data: Dict[str, Any]\n\n';
            }
        }

        // Response dataclasses
        if (endpoint.responseBodySchemas && Object.keys(endpoint.responseBodySchemas).length > 0) {
            Object.entries(endpoint.responseBodySchemas).forEach(([status, schema]) => {
                if (schema) {
                    const className = `Response${status}`;
                    const dataclassContent = this._generatePythonDataclass(schema, className);
                    code += dataclassContent + '\n\n';
                } else {
                    code += `@dataclass\n`;
                    code += `class Response${status}:\n`;
                    code += '    # Define based on your response schema\n';
                    code += '    data: Dict[str, Any]\n\n';
                }
            });
        }

        return code;
    }

    private _generatePythonDataclass(schema: any, className: string): string {
        if (!schema) {
            return `@dataclass\nclass ${className}:\n    data: Dict[str, Any]`;
        }

        // Handle $ref references
        if (schema.$ref) {
            const refName = schema.$ref.split('/').pop() || 'Any';
            return `# Type alias for ${className}\n${className} = ${refName}`;
        }

        let classContent = '@dataclass\n';
        
        if (schema.description) {
            classContent += `class ${className}:\n    """${schema.description}"""\n`;
        } else {
            classContent += `class ${className}:\n`;
        }

        if (schema.type === 'object' && schema.properties) {
            Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
                const isRequired = schema.required?.includes(propName) ?? false;
                const pythonType = this._getDetailedPythonType(propSchema);
                const typeAnnotation = isRequired ? pythonType : `Optional[${pythonType}]`;
                const description = propSchema.description ? `    # ${propSchema.description}\n` : '';
                
                classContent += `${description}    ${propName}: ${typeAnnotation}\n`;
            });
        } else if (schema.type === 'array') {
            // For array responses
            const itemType = this._getDetailedPythonType(schema.items);
            return `# Type alias for ${className}\n${className} = List[${itemType}]`;
        } else {
            // For primitive or unknown types
            const primitiveType = this._getDetailedPythonType(schema);
            return `# Type alias for ${className}\n${className} = ${primitiveType}`;
        }

        return classContent;
    }

    private _getDetailedPythonType(schema: any): string {
        if (!schema) return 'Any';
        
        // Handle $ref references
        if (schema.$ref) {
            return schema.$ref.split('/').pop() || 'Any';
        }
        
        // Handle enums
        if (schema.enum) {
            return 'str';  // Could use Literal types in newer Python versions
        }
        
        switch (schema.type) {
            case 'string':
                if (schema.format === 'date' || schema.format === 'date-time') {
                    return 'datetime';
                }
                return 'str';
            
            case 'number':
                return 'float';
            
            case 'integer':
                return 'int';
            
            case 'boolean':
                return 'bool';
            
            case 'array':
                const itemType = this._getDetailedPythonType(schema.items);
                return `List[${itemType}]`;
            
            case 'object':
                if (schema.properties) {
                    return 'Dict[str, Any]';  // Could generate nested dataclasses
                } else {
                    return 'Dict[str, Any]';
                }
            
            default:
                return 'Any';
        }
    }

    private _generateJavaTypes(endpoint: EnhancedEndpointData): string {
        let code = `// Types for ${endpoint.method.toUpperCase()} ${endpoint.path}\n\n`;
        code += 'import java.util.*;\n';
        code += 'import java.time.LocalDateTime;\n';
        code += 'import com.fasterxml.jackson.annotation.JsonProperty;\n\n';
        
        // Request parameters classes
        if (endpoint.parameters.length > 0) {
            const pathParams = endpoint.parameters.filter(p => p.in === 'path');
            const queryParams = endpoint.parameters.filter(p => p.in === 'query');
            const headerParams = endpoint.parameters.filter(p => p.in === 'header');

            if (pathParams.length > 0) {
                code += 'public class PathParameters {\n';
                pathParams.forEach(param => {
                    const javaType = this._getJavaType(param.schema);
                    const description = param.description ? `    // ${param.description}\n` : '';
                    code += `${description}    @JsonProperty("${param.name}")\n`;
                    code += `    private ${javaType} ${param.name};\n\n`;
                });
                code += '    // Getters and setters would go here\n';
                code += '}\n\n';
            }

            if (queryParams.length > 0) {
                code += 'public class QueryParameters {\n';
                queryParams.forEach(param => {
                    const javaType = this._getJavaType(param.schema);
                    const description = param.description ? `    // ${param.description}\n` : '';
                    code += `${description}    @JsonProperty("${param.name}")\n`;
                    code += `    private ${javaType} ${param.name};\n\n`;
                });
                code += '    // Getters and setters would go here\n';
                code += '}\n\n';
            }

            if (headerParams.length > 0) {
                code += 'public class HeaderParameters {\n';
                headerParams.forEach(param => {
                    const javaType = this._getJavaType(param.schema);
                    const description = param.description ? `    // ${param.description}\n` : '';
                    code += `${description}    @JsonProperty("${param.name}")\n`;
                    code += `    private ${javaType} ${param.name};\n\n`;
                });
                code += '    // Getters and setters would go here\n';
                code += '}\n\n';
            }
        }

        // Request body class
        if (endpoint.requestBody) {
            const requestBodySchema = this._extractRequestBodySchema(endpoint.requestBody);
            if (requestBodySchema) {
                const classContent = this._generateJavaClass(requestBodySchema, 'RequestBody');
                code += classContent + '\n\n';
            } else {
                code += 'public class RequestBody {\n';
                code += '    // Define based on your request body schema\n';
                code += '    private Map<String, Object> data;\n\n';
                code += '    // Getters and setters would go here\n';
                code += '}\n\n';
            }
        }

        // Response classes
        if (endpoint.responseBodySchemas && Object.keys(endpoint.responseBodySchemas).length > 0) {
            Object.entries(endpoint.responseBodySchemas).forEach(([status, schema]) => {
                if (schema) {
                    const className = `Response${status}`;
                    const classContent = this._generateJavaClass(schema, className);
                    code += classContent + '\n\n';
                } else {
                    code += `public class Response${status} {\n`;
                    code += '    // Define based on your response schema\n';
                    code += '    private Map<String, Object> data;\n\n';
                    code += '    // Getters and setters would go here\n';
                    code += '}\n\n';
                }
            });
        }

        return code;
    }

    private _generateJavaClass(schema: any, className: string): string {
        if (!schema) {
            return `public class ${className} {\n    private Map<String, Object> data;\n\n    // Getters and setters would go here\n}`;
        }

        // Handle $ref references
        if (schema.$ref) {
            const refName = schema.$ref.split('/').pop() || 'Object';
            return `// Type alias for ${className}\n// public class ${className} extends ${refName} {}`;
        }

        let classContent = '';
        
        if (schema.description) {
            classContent += `/**\n * ${schema.description}\n */\n`;
        }
        
        classContent += `public class ${className} {\n`;

        if (schema.type === 'object' && schema.properties) {
            Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
                const javaType = this._getDetailedJavaType(propSchema);
                const description = propSchema.description ? `    // ${propSchema.description}\n` : '';
                
                classContent += `${description}    @JsonProperty("${propName}")\n`;
                classContent += `    private ${javaType} ${propName};\n\n`;
            });
            
            classContent += '    // Getters and setters would go here\n';
        } else if (schema.type === 'array') {
            // For array responses
            const itemType = this._getDetailedJavaType(schema.items);
            classContent += `    @JsonProperty("data")\n`;
            classContent += `    private List<${itemType}> data;\n\n`;
            classContent += '    // Getters and setters would go here\n';
        } else {
            // For primitive or unknown types
            const primitiveType = this._getDetailedJavaType(schema);
            classContent += `    @JsonProperty("value")\n`;
            classContent += `    private ${primitiveType} value;\n\n`;
            classContent += '    // Getters and setters would go here\n';
        }

        classContent += '}';
        return classContent;
    }

    private _getDetailedJavaType(schema: any): string {
        if (!schema) return 'Object';
        
        // Handle $ref references
        if (schema.$ref) {
            return schema.$ref.split('/').pop() || 'Object';
        }
        
        // Handle enums
        if (schema.enum) {
            return 'String';  // Could generate enum classes
        }
        
        switch (schema.type) {
            case 'string':
                if (schema.format === 'date' || schema.format === 'date-time') {
                    return 'LocalDateTime';
                }
                return 'String';
            
            case 'number':
                return 'Double';
            
            case 'integer':
                return 'Integer';
            
            case 'boolean':
                return 'Boolean';
            
            case 'array':
                const itemType = this._getDetailedJavaType(schema.items);
                return `List<${itemType}>`;
            
            case 'object':
                if (schema.properties) {
                    return 'Map<String, Object>';  // Could generate nested classes
                } else {
                    return 'Map<String, Object>';
                }
            
            default:
                return 'Object';
        }
    }

    private _generateGenericTypes(endpoint: EnhancedEndpointData, language: string): string {
        return `// Types for ${endpoint.method} ${endpoint.path} (${language})\n\n// Parameter types and response types would be defined here based on the OpenAPI schema`;
    }

    private _generateJSHttpRequest(endpoint: EnhancedEndpointData): string {
        let code = `// HTTP Request for ${endpoint.method} ${endpoint.path}\n\n`;
        code += 'async function makeRequest() {\n';
        code += `    const url = \`\${baseUrl}${endpoint.path}\`;\n`;
        
        if (endpoint.parameters.length > 0) {
            code += '\n    // Parameters\n';
            endpoint.parameters.forEach(param => {
                code += `    const ${param.name} = ''; // ${param.description || 'parameter value'}\n`;
            });
        }

        code += '\n    const response = await fetch(url, {\n';
        code += `        method: '${endpoint.method}',\n`;
        code += '        headers: {\n';
        code += "            'Content-Type': 'application/json',\n";
        code += '        },\n';

        if (endpoint.requestBody) {
            code += '        body: JSON.stringify({\n';
            code += '            // Request body data\n';
            code += '        }),\n';
        }

        code += '    });\n\n';
        code += '    const data = await response.json();\n';
        code += '    return data;\n';
        code += '}\n';

        return code;
    }

    private _generatePythonHttpRequest(endpoint: EnhancedEndpointData): string {
        let code = `# HTTP Request for ${endpoint.method} ${endpoint.path}\n\n`;
        code += 'import requests\n';
        code += 'import json\n\n';
        code += 'def make_request():\n';
        code += `    url = f"{{base_url}}${endpoint.path}"\n`;
        
        if (endpoint.parameters.length > 0) {
            code += '\n    # Parameters\n';
            endpoint.parameters.forEach(param => {
                code += `    ${param.name} = ""  # ${param.description || 'parameter value'}\n`;
            });
        }

        code += '\n    headers = {\n';
        code += "        'Content-Type': 'application/json',\n";
        code += '    }\n\n';

        if (endpoint.requestBody) {
            code += '    data = {\n';
            code += '        # Request body data\n';
            code += '    }\n\n';
            code += `    response = requests.${endpoint.method.toLowerCase()}(url, headers=headers, json=data)\n`;
        } else {
            code += `    response = requests.${endpoint.method.toLowerCase()}(url, headers=headers)\n`;
        }

        code += '    return response.json()\n';

        return code;
    }

    private _generateJavaHttpRequest(endpoint: EnhancedEndpointData): string {
        let code = `// HTTP Request for ${endpoint.method} ${endpoint.path}\n\n`;
        code += 'import java.net.http.*;\n';
        code += 'import java.net.URI;\n\n';
        code += 'public class ApiClient {\n';
        code += '    public String makeRequest() throws Exception {\n';
        code += '        HttpClient client = HttpClient.newHttpClient();\n';
        code += `        String url = baseUrl + "${endpoint.path}";\n\n`;
        
        code += '        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()\n';
        code += '            .uri(URI.create(url))\n';
        code += `            .${endpoint.method}(`;
        
        if (endpoint.requestBody) {
            code += 'HttpRequest.BodyPublishers.ofString("{}")'; // JSON placeholder
        } else {
            code += 'HttpRequest.BodyPublishers.noBody()';
        }
        
        code += ')\n';
        code += '            .header("Content-Type", "application/json");\n\n';
        code += '        HttpRequest request = requestBuilder.build();\n';
        code += '        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());\n';
        code += '        return response.body();\n';
        code += '    }\n';
        code += '}\n';

        return code;
    }

    private _generateCSharpHttpRequest(endpoint: EnhancedEndpointData): string {
        let code = `// HTTP Request for ${endpoint.method} ${endpoint.path}\n\n`;
        code += 'using System;\n';
        code += 'using System.Net.Http;\n';
        code += 'using System.Text;\n';
        code += 'using System.Threading.Tasks;\n\n';
        code += 'public class ApiClient\n';
        code += '{\n';
        code += '    private readonly HttpClient _httpClient;\n\n';
        code += '    public ApiClient(HttpClient httpClient)\n';
        code += '    {\n';
        code += '        _httpClient = httpClient;\n';
        code += '    }\n\n';
        code += '    public async Task<string> MakeRequestAsync()\n';
        code += '    {\n';
        code += `        var url = $"{{baseUrl}}${endpoint.path}";\n\n`;
        
        if (endpoint.requestBody) {
            code += '        var json = "{}";\n'; // JSON placeholder
            code += '        var content = new StringContent(json, Encoding.UTF8, "application/json");\n';
            code += `        var response = await _httpClient.${endpoint.method.charAt(0).toUpperCase() + endpoint.method.slice(1).toLowerCase()}Async(url, content);\n`;
        } else {
            code += `        var response = await _httpClient.${endpoint.method.charAt(0).toUpperCase() + endpoint.method.slice(1).toLowerCase()}Async(url);\n`;
        }
        
        code += '        return await response.Content.ReadAsStringAsync();\n';
        code += '    }\n';
        code += '}\n';

        return code;
    }

    private _generateCurlRequest(endpoint: EnhancedEndpointData): string {
        let code = `# cURL Request for ${endpoint.method} ${endpoint.path}\n\n`;
        code += `curl -X ${endpoint.method} \\\n`;
        code += `  "\${base_url}${endpoint.path}" \\\n`;
        code += '  -H "Content-Type: application/json" \\\n';
        
        if (endpoint.requestBody) {
            code += '  -d \'{\n';
            code += '    "key": "value"\n';
            code += '  }\'\n';
        }

        return code;
    }

    private _getTypeScriptType(schema: any): string {
        if (!schema) return 'any';
        switch (schema.type) {
            case 'string': return 'string';
            case 'number': case 'integer': return 'number';
            case 'boolean': return 'boolean';
            case 'array': return `${this._getTypeScriptType(schema.items)}[]`;
            case 'object': return 'object';
            default: return 'any';
        }
    }

    private _getPythonType(schema: any): string {
        if (!schema) return 'Any';
        switch (schema.type) {
            case 'string': return 'str';
            case 'number': return 'float';
            case 'integer': return 'int';
            case 'boolean': return 'bool';
            case 'array': return 'list';
            case 'object': return 'Dict[str, Any]';
            default: return 'Any';
        }
    }

    private _getJavaType(schema: any): string {
        if (!schema) return 'Object';
        switch (schema.type) {
            case 'string': return 'String';
            case 'number': return 'Double';
            case 'integer': return 'Integer';
            case 'boolean': return 'Boolean';
            case 'array': return 'List<Object>';
            case 'object': return 'Object';
            default: return 'Object';
        }
    }

    private _createEndpointDocumentationFile(endpoint: EnhancedEndpointData): void {
        const fileName = `${endpoint.method.toLowerCase()}-${endpoint.path.replace(/[^a-zA-Z0-9]/g, '-')}.md`;
        const content = this._generateEndpointDocumentation(endpoint);

        vscode.workspace.openTextDocument({
            content,
            language: 'markdown'
        }).then(doc => {
            vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage(`Endpoint documentation created: ${fileName}`);
        }, (error: any) => {
            vscode.window.showErrorMessage(`Failed to create documentation: ${error}`);
        });
    }

    private _generateEndpointDocumentation(endpoint: EnhancedEndpointData): string {
        let doc = `# ${endpoint.method.toUpperCase()} ${endpoint.path}\n\n`;

        if (endpoint.summary) {
            doc += `## Summary\n${endpoint.summary}\n\n`;
        }

        if (endpoint.description) {
            doc += `## Description\n${endpoint.description}\n\n`;
        }

        if (endpoint.tags.length > 0) {
            doc += `## Tags\n${endpoint.tags.map(tag => `- ${tag}`).join('\n')}\n\n`;
        }

        if (endpoint.parameters.length > 0) {
            doc += `## Parameters\n\n`;
            endpoint.parameters.forEach(param => {
                doc += `### ${param.name} *(${param.in})*\n`;
                if (param.description) doc += `${param.description}\n\n`;
                doc += `- **Type**: ${param.schema?.type || 'any'}\n`;
                doc += `- **Required**: ${param.required ? 'Yes' : 'No'}\n\n`;
            });
        }

        if (endpoint.requestBody) {
            doc += `## Request Body\n\n`;
            if (endpoint.sampleRequestBodies && endpoint.sampleRequestBodies.length > 0) {
                doc += `\`\`\`json\n${JSON.stringify(endpoint.sampleRequestBodies[0], null, 2)}\n\`\`\`\n\n`;
            }
        }

        if (endpoint.responseBodySchemas && Object.keys(endpoint.responseBodySchemas).length > 0) {
            doc += `## Response Schemas\n\n`;
            Object.entries(endpoint.responseBodySchemas).forEach(([status, schema]) => {
                doc += `### Status ${status}\n\n`;
                doc += `\`\`\`json\n${JSON.stringify(schema, null, 2)}\n\`\`\`\n\n`;
            });
        }

        if (endpoint.sampleResponses && Object.keys(endpoint.sampleResponses).length > 0) {
            doc += `## Sample Responses\n\n`;
            Object.entries(endpoint.sampleResponses).forEach(([status, response]) => {
                doc += `### Status ${status}\n\n`;
                doc += `\`\`\`json\n${JSON.stringify(response, null, 2)}\n\`\`\`\n\n`;
            });
        }

        if (endpoint.usagePatterns && endpoint.usagePatterns.length > 0) {
            doc += `## Usage Patterns\n\n`;
            endpoint.usagePatterns.forEach(pattern => {
                doc += `- ${pattern}\n`;
            });
            doc += '\n';
        }

        if (endpoint.aiSuggestions && endpoint.aiSuggestions.length > 0) {
            doc += `## AI Suggestions\n\n`;
            endpoint.aiSuggestions.forEach(suggestion => {
                doc += `- ${suggestion}\n`;
            });
            doc += '\n';
        }

        if (endpoint.businessContext) {
            doc += `## Business Context\n${endpoint.businessContext}\n\n`;
        }

        if (endpoint.complexity) {
            doc += `## Complexity\n${endpoint.complexity}\n\n`;
        }

        if (endpoint.estimatedResponseTime) {
            doc += `## Estimated Response Time\n${endpoint.estimatedResponseTime}\n\n`;
        }

        doc += `---\n*Generated on ${new Date().toISOString()}*\n`;

        return doc;
    }

    private _showTestResults(endpoint: EnhancedEndpointData): void {
        // In a real implementation, this would show actual test results
        const testResults = {
            passed: endpoint.testCases?.length || 0,
            failed: 0,
            duration: Math.random() * 1000,
            coverage: 85 + Math.random() * 15
        };
        
        this._view?.webview.postMessage({
            type: 'showTestResults',
            data: { endpointId: endpoint.id, results: testResults }
        });
    }

    private _calculateDocumentationScore(endpoint: EnhancedEndpointData): number {
        let score = 0;
        
        // Basic documentation
        if (endpoint.summary) score += 20;
        if (endpoint.description) score += 30;
        
        // Parameters documentation
        const documentedParams = endpoint.parameters.filter(p => p.description).length;
        if (endpoint.parameters.length > 0) {
            score += (documentedParams / endpoint.parameters.length) * 25;
        } else {
            score += 25; // No parameters to document
        }
        
        // Response documentation
        const responsesWithDesc = Object.values(endpoint.responses).filter((r: any) => r.description).length;
        const totalResponses = Object.keys(endpoint.responses).length;
        if (totalResponses > 0) {
            score += (responsesWithDesc / totalResponses) * 25;
        } else {
            score += 25;
        }
        
        return Math.round(score);
    }

    private _getVSCodeLanguage(language: string): string {
        const languageMap: { [key: string]: string } = {
            typescript: 'typescript',
            javascript: 'javascript',
            python: 'python',
            java: 'java',
            csharp: 'csharp',
            go: 'go',
            rust: 'rust',
            swift: 'swift'
        };
        
        return languageMap[language] || 'plaintext';
    }

    private _resolveResponseSchemas(endpoint: EnhancedEndpointData): { [statusCode: string]: any } {
        if (!this._enhancedData?.schemas || !this._currentSpec?.spec) {
            return endpoint.responseBodySchemas || {};
        }
        
        const resolvedSchemas: { [statusCode: string]: any } = {};
        
        // Get the operation from the spec to access the raw response schemas
        const spec = this._currentSpec.spec;
        const pathItem = spec.paths?.[endpoint.path];
        const operation = pathItem?.[endpoint.method.toLowerCase()];
        
        if (!operation?.responses) {
            return endpoint.responseBodySchemas || {};
        }
        
        Object.entries(operation.responses).forEach(([statusCode, response]: [string, any]) => {
            if (response.content) {
                Object.entries(response.content).forEach(([mediaType, content]: [string, any]) => {
                    if (content.schema) {
                        // Resolve schema references using the full schema registry
                        resolvedSchemas[statusCode] = this._resolveSchemaReference(content.schema);
                    }
                });
            }
        });
        
        return resolvedSchemas;
    }
    
    private _resolveSchemaReference(schema: any): any {
        if (!schema) return schema;
        
        // If it's a reference, resolve it using the full schema registry
        if (schema.$ref && this._enhancedData?.schemas) {
            const refName = schema.$ref.split('/').pop();
            const resolvedSchema = this._enhancedData.schemas.find(s => s.name === refName);
            if (resolvedSchema) {
                return {
                    type: resolvedSchema.type,
                    properties: resolvedSchema.properties,
                    required: resolvedSchema.required,
                    title: resolvedSchema.name,
                    description: resolvedSchema.description,
                    example: resolvedSchema.example
                };
            }
        }
        
        // If it's an array, resolve the items schema
        if (schema.type === 'array' && schema.items) {
            return {
                ...schema,
                items: this._resolveSchemaReference(schema.items)
            };
        }
        
        // If it's an object with properties, resolve each property
        if (schema.type === 'object' && schema.properties) {
            const resolvedProperties: any = {};
            Object.entries(schema.properties).forEach(([propName, propSchema]) => {
                resolvedProperties[propName] = this._resolveSchemaReference(propSchema);
            });
            return {
                ...schema,
                properties: resolvedProperties
            };
        }
        
        return schema;
    }
    
    private _formatSchemaForDisplay(schema: any): string {
        if (!schema) return 'No schema available';
        
        // If it's a reference, show the reference info first
        if (schema.$ref && !schema.properties) {
            const refName = schema.$ref.split('/').pop();
            return `Reference: ${refName}\n\nThis endpoint references the ${refName} schema.\nCheck the Schemas section for the full definition.\n\n${JSON.stringify(schema, null, 2)}`;
        }
        
        // If it's an object with properties, format it nicely
        if ((schema.type === 'object' || !schema.type) && schema.properties) {
            let formatted = '';
            
            // Show reference info if available
            if (schema.$ref) {
                const refName = schema.$ref.split('/').pop();
                formatted += `Schema: ${refName}\n`;
            }
            
            formatted += `Type: ${schema.type || 'object'}\n`;
            if (schema.description) {
                formatted += `Description: ${schema.description}\n`;
            }
            formatted += '\nProperties:\n';
            
            Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
                formatted += `  - ${propName}`;
                if (propSchema.type) {
                    formatted += ` (${propSchema.type})`;
                }
                if (propSchema.format) {
                    formatted += ` [${propSchema.format}]`;
                }
                if (propSchema.description) {
                    formatted += `: ${propSchema.description}`;
                }
                if (propSchema.example !== undefined) {
                    formatted += ` (example: ${JSON.stringify(propSchema.example)})`;
                }
                formatted += '\n';
            });
            
            // Add required fields if they exist
            if (schema.required && schema.required.length > 0) {
                formatted += `\nRequired fields: ${schema.required.join(', ')}\n`;
            }
            
            formatted += '\nFull Schema:\n' + JSON.stringify(schema, null, 2);
            return formatted;
        }
        
        // For array types
        if (schema.type === 'array' && schema.items) {
            let formatted = `Type: array\n`;
            if (schema.description) {
                formatted += `Description: ${schema.description}\n`;
            }
            formatted += `Items: ${schema.items.type || 'object'}\n`;
            
            if (schema.items.$ref) {
                const refName = schema.items.$ref.split('/').pop();
                formatted += `Items Reference: ${refName}\n`;
            } else if (schema.items.properties) {
                formatted += '\nItem Properties:\n';
                Object.entries(schema.items.properties).forEach(([propName, propSchema]: [string, any]) => {
                    formatted += `  - ${propName}`;
                    if (propSchema.type) {
                        formatted += ` (${propSchema.type})`;
                    }
                    if (propSchema.description) {
                        formatted += `: ${propSchema.description}`;
                    }
                    formatted += '\n';
                });
            }
            
            formatted += '\nFull Schema:\n' + JSON.stringify(schema, null, 2);
            return formatted;
        }
        
        // For other types, just show the JSON with some formatting
        let formatted = '';
        if (schema.type) {
            formatted += `Type: ${schema.type}\n`;
        }
        if (schema.description) {
            formatted += `Description: ${schema.description}\n`;
        }
        if (schema.format) {
            formatted += `Format: ${schema.format}\n`;
        }
        if (schema.enum) {
            formatted += `Allowed values: ${schema.enum.join(', ')}\n`;
        }
        formatted += '\nSchema:\n' + JSON.stringify(schema, null, 2);
        
        return formatted;
    }

    private _generateSchemaExample(schema: any): any {
        if (!schema) return null;
        
        switch (schema.type) {
            case 'string':
                return schema.example || 'example string';
            case 'number':
            case 'integer':
                return schema.example || 42;
            case 'boolean':
                return schema.example || true;
            case 'array':
                return schema.example || [];
            case 'object':
                if (schema.properties) {
                    const obj: any = {};
                    Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
                        obj[key] = this._generateSchemaExample(prop);
                    });
                    return obj;
                }
                return schema.example || {};
            default:
                return schema.example || null;
        }
    }

    private _openEndpointDetails(endpointId: string): void {
        const endpoint = this._enhancedData?.endpoints.find(e => e.id === endpointId);
        if (!endpoint) return;

        // Create a new webview panel for endpoint details
        const panel = vscode.window.createWebviewPanel(
            'openapi-endpoint-details',
            `${endpoint.method} ${endpoint.path}`,
            vscode.ViewColumn.Two,
            { enableScripts: true }
        );

        panel.webview.html = this._getEndpointDetailsHtml(endpoint, panel.webview);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'generateCode':
                    this._generateCodeForEndpoint(endpointId);
                    break;
                case 'copyPath':
                    vscode.env.clipboard.writeText(endpoint.path);
                    vscode.window.showInformationMessage('Path copied to clipboard');
                    break;
                case 'copyUrl':
                    const baseUrl = this._currentSpec?.spec?.servers?.[0]?.url || 'https://api.example.com';
                    const fullUrl = `${baseUrl}${endpoint.path}`;
                    vscode.env.clipboard.writeText(fullUrl);
                    vscode.window.showInformationMessage('URL copied to clipboard');
                    break;
            }
        });
    }

    private _openSchemaDetails(schemaName: string): void {
        // Open schema details
        const schema = this._enhancedData?.schemas.find(s => s.name === schemaName);
        if (schema) {
            vscode.window.showInformationMessage(`Opening details for schema: ${schema.name}`);
            // TODO: Implement detailed schema view
        }
    }

    private _generateCodeForEndpoint(endpointId: string): void {
        // Generate code examples for endpoint
        const endpoint = this._enhancedData?.endpoints.find(e => e.id === endpointId);
        if (endpoint) {
            vscode.commands.executeCommand('openapi-explorer.generateCode', endpoint);
        }
    }

    private _getEndpointDetailsHtml(endpoint: EnhancedEndpointData, webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Endpoint Details</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        
        .header {
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        
        .method-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
            margin-right: 10px;
            text-transform: uppercase;
        }
        
        .method-get { background-color: #28a745; color: white; }
        .method-post { background-color: #007bff; color: white; }
        .method-put { background-color: #fd7e14; color: white; }
        .method-delete { background-color: #dc3545; color: white; }
        .method-patch { background-color: #6f42c1; color: white; }
        .method-head { background-color: #17a2b8; color: white; }
        .method-options { background-color: #6c757d; color: white; }
        
        .path {
            font-family: var(--vscode-editor-font-family);
            font-size: 18px;
            font-weight: bold;
            margin: 0;
        }
        
        .summary {
            color: var(--vscode-descriptionForeground);
            margin: 10px 0;
            font-size: 16px;
        }
        
        .description {
            margin: 10px 0;
            white-space: pre-wrap;
        }
        
        .section {
            margin: 20px 0;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
        }
        
        .section-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: var(--vscode-textLink-foreground);
        }
        
        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin: 10px 0;
        }
        
        .tag {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
        }
        
        .deprecated {
            color: var(--vscode-errorForeground);
            font-weight: bold;
        }
        
        .complexity {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .complexity-low { background-color: #28a745; color: white; }
        .complexity-medium { background-color: #ffc107; color: black; }
        .complexity-high { background-color: #dc3545; color: white; }
        
        .security-item {
            background-color: var(--vscode-textBlockQuote-background);
            padding: 8px;
            margin: 5px 0;
            border-left: 3px solid var(--vscode-textLink-foreground);
        }
        
        .code-block {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
            font-size: 14px;
            overflow-x: auto;
            white-space: pre;
        }
        
        .button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
            font-size: 14px;
        }
        
        .button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .button-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .button-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .actions {
            margin: 20px 0;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
        }
        
        .parameter-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }
        
        .parameter-table th,
        .parameter-table td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .parameter-table th {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            font-weight: bold;
        }
        
        .required {
            color: var(--vscode-errorForeground);
        }
        
        .ai-suggestions {
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
        }
        
        .suggestion-item {
            margin: 8px 0;
            padding: 8px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <span class="method-badge method-${endpoint.method.toLowerCase()}">${endpoint.method}</span>
            <span class="path">${endpoint.path}</span>
            ${endpoint.deprecated ? '<span class="deprecated">DEPRECATED</span>' : ''}
        </div>
        
        ${endpoint.summary ? `<div class="summary">${endpoint.summary}</div>` : ''}
        ${endpoint.description ? `<div class="description">${endpoint.description}</div>` : ''}
        
        ${endpoint.tags.length > 0 ? `
        <div class="tags">
            ${endpoint.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>` : ''}
    </div>

    <div class="actions">
        <div class="section-title">Actions</div>
        <button class="button" onclick="generateCode()">Generate Code</button>
        <button class="button button-secondary" onclick="copyPath()">Copy Path</button>
        <button class="button button-secondary" onclick="copyUrl()">Copy Full URL</button>
    </div>

    <div class="section">
        <div class="section-title">Metadata</div>
        ${endpoint.complexity ? `<p><strong>Complexity:</strong> <span class="complexity complexity-${endpoint.complexity}">${endpoint.complexity.toUpperCase()}</span></p>` : ''}
        ${endpoint.estimatedResponseTime ? `<p><strong>Estimated Response Time:</strong> ${endpoint.estimatedResponseTime}</p>` : ''}
        ${endpoint.businessContext ? `<p><strong>Business Context:</strong> ${endpoint.businessContext}</p>` : ''}
        ${endpoint.operationId ? `<p><strong>Operation ID:</strong> ${endpoint.operationId}</p>` : ''}
    </div>

    ${endpoint.parameters.length > 0 ? `
    <div class="section">
        <div class="section-title">Parameters</div>
        <table class="parameter-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>In</th>
                    <th>Required</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>
                ${endpoint.parameters.map(param => `
                <tr>
                    <td><strong>${param.name}</strong></td>
                    <td>${param.schema?.type || 'string'}</td>
                    <td>${param.in}</td>
                    <td>${param.required ? '<span class="required">Yes</span>' : 'No'}</td>
                    <td>${param.description || '-'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>` : ''}

    ${endpoint.requestBody ? `
    <div class="section">
        <div class="section-title">Request Body</div>
        <div class="code-block">${JSON.stringify(endpoint.requestBody, null, 2)}</div>
    </div>` : ''}

    ${endpoint.responses && Object.keys(endpoint.responses).length > 0 ? `
    <div class="section">
        <div class="section-title">Responses</div>
        ${Object.entries(endpoint.responses).map(([statusCode, response]: [string, any]) => `
        <div style="margin: 10px 0; padding: 10px; background-color: var(--vscode-textBlockQuote-background); border-radius: 4px;">
            <p><strong>Status Code:</strong> ${statusCode}</p>
            ${response.description ? `<p><strong>Description:</strong> ${response.description}</p>` : ''}
            ${response.content ? `<p><strong>Content Types:</strong> ${Object.keys(response.content).join(', ')}</p>` : ''}
        </div>
        `).join('')}
    </div>` : ''}

    ${endpoint.security && endpoint.security.length > 0 ? `
    <div class="section">
        <div class="section-title">Security</div>
        ${endpoint.security.map((sec: any) => `
        <div class="security-item">
            <strong>${typeof sec === 'string' ? sec : JSON.stringify(sec)}</strong>
        </div>
        `).join('')}
    </div>` : ''}

    ${endpoint.aiSuggestions && endpoint.aiSuggestions.length > 0 ? `
    <div class="ai-suggestions">
        <div class="section-title">AI Suggestions</div>
        ${endpoint.aiSuggestions.map((suggestion: string) => `
        <div class="suggestion-item">
            ${suggestion}
        </div>
        `).join('')}
    </div>` : ''}

    <script>
        const vscode = acquireVsCodeApi();
        
        function generateCode() {
            vscode.postMessage({ type: 'generateCode' });
        }
        
        function copyPath() {
            vscode.postMessage({ type: 'copyPath' });
        }
        
        function copyUrl() {
            vscode.postMessage({ type: 'copyUrl' });
        }
    </script>
</body>
</html>`;
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Enhanced Spec View</title>
            <style>
                body { 
                    font-family: var(--vscode-font-family); 
                    font-size: var(--vscode-font-size);
                    background: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    margin: 0;
                    padding: 16px;
                }
                .container { max-width: 100%; }
                .search-section {
                    background: var(--vscode-sideBar-background);
                    border: 1px solid var(--vscode-sideBar-border);
                    border-radius: 4px;
                    padding: 12px;
                    margin-bottom: 16px;
                }
                .search-input {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid var(--vscode-input-border);
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border-radius: 3px;
                    margin-bottom: 8px;
                    box-sizing: border-box;
                }
                .export-section {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 16px;
                    flex-wrap: wrap;
                    padding: 12px;
                    background: var(--vscode-sideBar-background);
                    border: 1px solid var(--vscode-sideBar-border);
                    border-radius: 4px;
                }
                .filters-section {
                    display: grid;
                    gap: 12px;
                    margin-bottom: 16px;
                }
                .filter-group {
                    background: var(--vscode-sideBar-background);
                    border: 1px solid var(--vscode-sideBar-border);
                    border-radius: 4px;
                    padding: 12px;
                }
                .filter-group h4 {
                    margin: 0 0 8px 0;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                    color: var(--vscode-descriptionForeground);
                }
                .filter-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                }
                .filter-tag {
                    padding: 4px 8px;
                    border: 1px solid var(--vscode-button-border);
                    border-radius: 12px;
                    font-size: 11px;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                .filter-tag.active {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }
                .filter-tag:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                .view-controls {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 16px;
                    flex-wrap: wrap;
                }
                .control-group {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .control-label {
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                }
                select, button {
                    padding: 4px 8px;
                    border: 1px solid var(--vscode-dropdown-border);
                    background: var(--vscode-dropdown-background);
                    color: var(--vscode-dropdown-foreground);
                    border-radius: 3px;
                    font-size: 11px;
                }
                button {
                    cursor: pointer;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }
                button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                button.primary {
                    background: var(--vscode-textLink-foreground);
                    color: white;
                }
                button.primary:hover {
                    background: var(--vscode-textLink-activeForeground);
                }
                .endpoints-section {
                    margin-top: 16px;
                }
                .endpoint-group {
                    margin-bottom: 16px;
                }
                .group-header {
                    font-weight: 600;
                    margin-bottom: 8px;
                    padding: 12px;
                    background: var(--vscode-sideBar-background);
                    border: 1px solid var(--vscode-sideBar-border);
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    user-select: none;
                }
                .group-header:hover {
                    background: var(--vscode-list-hoverBackground);
                }
                .group-content {
                    display: none;
                    padding-left: 12px;
                    margin-top: 8px;
                }
                .group-content.expanded {
                    display: block;
                }
                .collapse-icon {
                    transition: transform 0.2s;
                    font-size: 12px;
                }
                .collapse-icon.expanded {
                    transform: rotate(90deg);
                }
                .endpoint-item {
                    padding: 12px;
                    border: 1px solid var(--vscode-sideBar-border);
                    border-radius: 4px;
                    margin-bottom: 8px;
                    transition: all 0.2s;
                    position: relative;
                }
                .endpoint-item:hover {
                    background: var(--vscode-list-hoverBackground);
                    border-color: var(--vscode-focusBorder);
                }
                .endpoint-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 4px;
                }
                .method-badge {
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .method-get { background: #28a745; color: white; }
                .method-post { background: #007bff; color: white; }
                .method-put { background: #fd7e14; color: white; }
                .method-delete { background: #dc3545; color: white; }
                .method-patch { background: #6f42c1; color: white; }
                .method-options { background: #6c757d; color: white; }
                .method-head { background: #17a2b8; color: white; }
                .endpoint-path {
                    font-family: monospace;
                    font-size: 12px;
                    flex-grow: 1;
                }
                .endpoint-actions {
                    display: flex;
                    gap: 4px;
                    margin-left: auto;
                    position: relative;
                }
                .endpoint-actions button {
                    padding: 2px 6px;
                    font-size: 10px;
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                .dropdown {
                    position: relative;
                    display: inline-block;
                }
                .dropdown-btn {
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: 1px solid var(--vscode-button-border);
                    padding: 4px 8px;
                    cursor: pointer;
                    border-radius: 3px;
                    font-size: 14px;
                    min-width: 24px;
                }
                .dropdown-btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                .dropdown-content {
                    display: none;
                    position: absolute;
                    right: 0;
                    background: var(--vscode-dropdown-background);
                    border: 1px solid var(--vscode-dropdown-border);
                    border-radius: 4px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    z-index: 1000;
                    min-width: 180px;
                    max-height: 300px;
                    overflow-y: auto;
                }
                .dropdown-content.show {
                    display: block;
                }
                .dropdown-section {
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding: 4px 0;
                }
                .dropdown-section:last-child {
                    border-bottom: none;
                }
                .dropdown-header {
                    padding: 6px 12px;
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--vscode-descriptionForeground);
                    text-transform: uppercase;
                    background: var(--vscode-editor-inactiveSelectionBackground);
                }
                .dropdown-item {
                    padding: 8px 16px;
                    cursor: pointer;
                    font-size: 12px;
                    color: var(--vscode-dropdown-foreground);
                    border-left: 3px solid transparent;
                }
                .dropdown-item:hover {
                    background: var(--vscode-list-hoverBackground);
                    border-left-color: var(--vscode-textLink-foreground);
                }
                .endpoint-summary {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 4px;
                }
                .endpoint-details {
                    display: none;
                    margin-top: 8px;
                    padding: 8px;
                    background: var(--vscode-editor-background);
                    border-radius: 3px;
                    border: 1px solid var(--vscode-panel-border);
                }
                .endpoint-details.expanded {
                    display: block;
                }
                .endpoint-tags {
                    display: flex;
                    gap: 4px;
                    flex-wrap: wrap;
                    margin-bottom: 8px;
                }
                .tag {
                    padding: 2px 6px;
                    background: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    border-radius: 10px;
                    font-size: 10px;
                }
                .request-response-section {
                    margin-top: 8px;
                }
                .section-header {
                    font-weight: 600;
                    font-size: 11px;
                    color: var(--vscode-textPreformat-foreground);
                    margin-bottom: 4px;
                    text-transform: uppercase;
                }
                .code-block {
                    background: var(--vscode-textBlockQuote-background);
                    border: 1px solid var(--vscode-textBlockQuote-border);
                    border-radius: 3px;
                    padding: 8px;
                    font-family: monospace;
                    font-size: 11px;
                    white-space: pre-wrap;
                    overflow-x: auto;
                    max-height: 200px;
                    overflow-y: auto;
                }
                .parameters-section {
                    margin-top: 8px;
                }
                .parameter-item {
                    padding: 4px 8px;
                    margin-bottom: 4px;
                    border-left: 3px solid var(--vscode-textLink-foreground);
                    background: var(--vscode-textBlockQuote-background);
                    border-radius: 0 3px 3px 0;
                }
                .parameter-name {
                    font-family: monospace;
                    font-weight: 600;
                    color: var(--vscode-textLink-foreground);
                }
                .parameter-required {
                    color: var(--vscode-errorForeground);
                    font-size: 10px;
                    margin-left: 4px;
                }
                .no-spec {
                    text-align: center;
                    padding: 40px;
                    color: var(--vscode-descriptionForeground);
                }
                .stats {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 16px;
                    font-size: 12px;
                    align-items: center;
                }
                .stat {
                    color: var(--vscode-descriptionForeground);
                }
                .clear-filters {
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    margin-left: auto;
                }
                .complexity-badge {
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 9px;
                    font-weight: 600;
                    text-transform: uppercase;
                    margin-left: 8px;
                }
                .complexity-low { background: #28a745; color: white; }
                .complexity-medium { background: #fd7e14; color: white; }
                .complexity-high { background: #dc3545; color: white; }
                .business-context {
                    font-style: italic;
                    color: var(--vscode-descriptionForeground);
                    font-size: 11px;
                    margin-top: 4px;
                }
                .ai-suggestions {
                    background: var(--vscode-editorInfo-background);
                    border: 1px solid var(--vscode-editorInfo-border);
                    border-radius: 3px;
                    padding: 6px;
                    margin-top: 6px;
                    font-size: 11px;
                }
                .ai-suggestions ul {
                    margin: 0;
                    padding-left: 16px;
                }
                .health-indicator {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    margin-left: 8px;
                }
                .health-healthy { background: #28a745; }
                .health-warning { background: #fd7e14; }
                .health-critical { background: #dc3545; }
            </style>
        </head>
        <body>
            <div class="container">
                <div id="content">
                    <div class="no-spec">
                        <p>No spec selected</p>
                        <p>Select a spec from the Spec Manager to view enhanced details</p>
                    </div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                let currentData = null;

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.type) {
                        case 'updateData':
                            currentData = message.data;
                            renderContent();
                            break;
                        case 'noSpec':
                            renderNoSpec();
                            break;
                    }
                });

                function renderNoSpec() {
                    document.getElementById('content').innerHTML = \`
                        <div class="no-spec">
                            <p>No spec selected</p>
                            <p>Select a spec from the Spec Manager to view enhanced details</p>
                        </div>
                    \`;
                }

                function renderContent() {
                    if (!currentData) return;

                    const { endpoints, schemas, analytics, filteredEndpoints, groupedEndpoints, filters, grouping, viewState, totalFiltered } = currentData;
                    
                    console.log('Rendering webview with data:', {
                        endpointsCount: endpoints?.length || 0,
                        availableTagsCount: currentData.availableTags?.length || 0,
                        availableMethodsCount: currentData.availableMethods?.length || 0,
                        filteredEndpointsCount: filteredEndpoints?.length || 0,
                        groupedEndpointsKeys: Object.keys(groupedEndpoints || {}),
                        availableTags: currentData.availableTags,
                        availableMethods: currentData.availableMethods
                    });

                    document.getElementById('content').innerHTML = \`
                        <div class="search-section">
                            <input type="text" class="search-input" placeholder="Search endpoints, request/response bodies, business context..." value="\${filters.search}" onInput="updateSearch(this.value)">
                            <div class="stats">
                                <span class="stat">Total: \${analytics.totalEndpoints}</span>
                                <span class="stat">Filtered: \${totalFiltered}</span>
                                <span class="stat">Schemas: \${analytics.totalSchemas}</span>
                                <span class="stat">Health: <span class="health-indicator health-\${currentData.healthStatus}"></span></span>
                                <button class="clear-filters" onclick="clearAllFilters()">Clear Filters</button>
                            </div>
                        </div>

                        <div class="sdk-section">
                            <div class="control-group">
                                <span class="control-label">Generate SDK:</span>
                                <select id="sdkLanguage">
                                    <option value="typescript">TypeScript</option>
                                    <option value="javascript">JavaScript</option>
                                    <option value="python">Python</option>
                                    <option value="java">Java</option>
                                    <option value="csharp">C#</option>
                                    <option value="go">Go</option>
                                    <option value="rust">Rust</option>
                                    <option value="swift">Swift</option>
                                </select>
                                <button class="primary" onclick="generateSDK()">Generate SDK</button>
                                <button onclick="generateClientLibrary()">Generate Client Library</button>
                            </div>
                        </div>

                        <div class="filters-section">
                            <div class="filter-group">
                                <h4>Methods (\${currentData.availableMethods.length})</h4>
                                <div class="filter-tags">
                                    \${currentData.availableMethods.map(method => \`
                                        <span class="filter-tag \${filters.methods.includes(method) ? 'active' : ''}" 
                                              onclick="toggleMethodFilter('\${method}')">
                                            \${method} (\${analytics.methodDistribution[method] || 0})
                                        </span>
                                    \`).join('')}
                                </div>
                            </div>

                            <div class="filter-group">
                                <h4>Tags (\${currentData.availableTags.length})</h4>
                                <div class="filter-tags">
                                    \${currentData.availableTags.slice(0, 15).map(tag => \`
                                        <span class="filter-tag \${filters.tags.includes(tag) ? 'active' : ''}" 
                                              onclick="toggleTagFilter('\${tag}')">
                                            \${tag} (\${analytics.tagDistribution[tag] || 0})
                                        </span>
                                    \`).join('')}
                                    \${currentData.availableTags.length > 15 ? \`<span class="filter-tag">+\${currentData.availableTags.length - 15} more</span>\` : ''}
                                </div>
                            </div>



                            <div class="filter-group">
                                <h4>Complexity & Features</h4>
                                <div class="filter-tags">
                                    <span class="filter-tag \${filters.hasTestCases ? 'active' : ''}" onclick="toggleFilter('hasTestCases')">Has Tests</span>
                                    <span class="filter-tag \${filters.hasExamples ? 'active' : ''}" onclick="toggleFilter('hasExamples')">Has Examples</span>
                                    <span class="filter-tag \${filters.breaking ? 'active' : ''}" onclick="toggleFilter('breaking')">Breaking Changes</span>
                                    <span class="filter-tag \${filters.deprecated ? 'active' : ''}" onclick="toggleFilter('deprecated')">Deprecated</span>
                                </div>
                            </div>
                        </div>

                        <div class="view-controls">
                            <div class="control-group">
                                <span class="control-label">Group:</span>
                                <select onchange="updateGrouping('groupBy', this.value)">
                                    <option value="tag" \${grouping.groupBy === 'tag' ? 'selected' : ''}>By Tag</option>
                                    <option value="none" \${grouping.groupBy === 'none' ? 'selected' : ''}>No Grouping</option>
                                    <option value="method" \${grouping.groupBy === 'method' ? 'selected' : ''}>By Method</option>
                                    <option value="path" \${grouping.groupBy === 'path' ? 'selected' : ''}>By Path</option>
                                    <option value="complexity" \${grouping.groupBy === 'complexity' ? 'selected' : ''}>By Complexity</option>
                                    <option value="domain" \${grouping.groupBy === 'domain' ? 'selected' : ''}>By Domain</option>
                                </select>
                            </div>
                            <div class="control-group">
                                <span class="control-label">Sort:</span>
                                <select onchange="updateGrouping('sortBy', this.value)">
                                    <option value="path" \${grouping.sortBy === 'path' ? 'selected' : ''}>Path</option>
                                    <option value="method" \${grouping.sortBy === 'method' ? 'selected' : ''}>Method</option>
                                    <option value="summary" \${grouping.sortBy === 'summary' ? 'selected' : ''}>Summary</option>
                                    <option value="complexity" \${grouping.sortBy === 'complexity' ? 'selected' : ''}>Complexity</option>
                                    <option value="lastModified" \${grouping.sortBy === 'lastModified' ? 'selected' : ''}>Last Modified</option>
                                    <option value="usage" \${grouping.sortBy === 'usage' ? 'selected' : ''}>Usage</option>
                                </select>
                                <button onclick="toggleSortOrder()" title="Toggle sort order">\${grouping.sortOrder === 'asc' ? '↑' : '↓'}</button>
                            </div>
                            <div class="control-group">
                                <button onclick="collapseAllGroups()">Collapse All</button>
                                <button onclick="expandAllGroups()">Expand All</button>
                            </div>
                        </div>

                        <div class="endpoints-section">
                            \${Object.entries(groupedEndpoints).map(([groupName, groupEndpoints]) => \`
                                <div class="endpoint-group">
                                    <div class="group-header" onclick="toggleGroup('\${groupName}')">
                                        <span>\${groupName} (\${groupEndpoints.length})</span>
                                        <span class="collapse-icon">▶</span>
                                    </div>
                                    <div class="group-content" id="group-\${groupName.replace(/[^a-zA-Z0-9]/g, '-')}">
                                        \${groupEndpoints.map(endpoint => \`
                                            <div class="endpoint-item">
                                                <div class="endpoint-header">
                                                    <span class="method-badge method-\${endpoint.method.toLowerCase()}">\${endpoint.method}</span>
                                                    <span class="endpoint-path">\${endpoint.path}</span>
                                                    \${endpoint.complexity ? \`<span class="complexity-badge complexity-\${endpoint.complexity}">\${endpoint.complexity}</span>\` : ''}
                                                    \${endpoint.deprecated ? '<span style="color: orange; font-size: 10px;">DEPRECATED</span>' : ''}
                                                    <div class="endpoint-actions">
                                                        <div class="dropdown">
                                                            <button class="dropdown-btn" onclick="toggleDropdown('\${endpoint.id}')">⋮</button>
                                                            <div class="dropdown-content" id="dropdown-\${endpoint.id}">
                                                                <div class="dropdown-section">
                                                                    <div class="dropdown-header">Details</div>
                                                                    <div class="dropdown-item" onclick="showEndpointDetails('\${endpoint.id}')">Parameters</div>
                                                                    <div class="dropdown-item" onclick="showEndpointDetails('\${endpoint.id}')">Schema</div>
                                                                    <div class="dropdown-item" onclick="showEndpointDetails('\${endpoint.id}')">Usage Patterns</div>
                                                                    <div class="dropdown-item" onclick="showEndpointDetails('\${endpoint.id}')">AI Suggestions</div>
                                                                </div>
                                                                <div class="dropdown-section">
                                                                    <div class="dropdown-header">Body</div>
                                                                    <div class="dropdown-item" onclick="showEndpointBody('\${endpoint.id}')">Response Body</div>
                                                                </div>
                                                                <div class="dropdown-section">
                                                                    <div class="dropdown-header">Code</div>
                                                                    <div class="dropdown-item" onclick="showEndpointCode('\${endpoint.id}', 'Types')">Types</div>
                                                                    <div class="dropdown-item" onclick="showEndpointCode('\${endpoint.id}', 'HttpRequest')">HttpRequest</div>
                                                                </div>
                                                                <div class="dropdown-section">
                                                                    <div class="dropdown-header">Export</div>
                                                                    <div class="dropdown-item" onclick="exportEndpoint('\${endpoint.id}')">Create/Open File</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                \${endpoint.summary ? \`<div class="endpoint-summary">\${endpoint.summary}</div>\` : ''}
                                                \${endpoint.businessContext ? \`<div class="business-context">\${endpoint.businessContext}</div>\` : ''}
                                                \${endpoint.tags.length > 0 ? \`
                                                    <div class="endpoint-tags">
                                                        \${endpoint.tags.slice(0, 8).map(tag => \`<span class="tag">\${tag}</span>\`).join('')}
                                                        \${endpoint.tags.length > 8 ? \`<span class="tag">+\${endpoint.tags.length - 8}</span>\` : ''}
                                                    </div>
                                                \` : ''}
                                                
                                                <div class="endpoint-details" id="details-\${endpoint.id}">
                                                    \${endpoint.description ? \`<div class="section-header">Description</div><div>\${endpoint.description}</div>\` : ''}
                                                    
                                                    \${endpoint.parameters.length > 0 ? \`
                                                        <div class="parameters-section">
                                                            <div class="section-header">Parameters</div>
                                                            \${endpoint.parameters.map(param => \`
                                                                <div class="parameter-item">
                                                                    <span class="parameter-name">\${param.name}</span>
                                                                    <span style="color: var(--vscode-descriptionForeground); margin-left: 8px;">(\${param.in})</span>
                                                                    \${param.required ? '<span class="parameter-required">*</span>' : ''}
                                                                    \${param.description ? \`<div style="margin-top: 2px; font-size: 10px;">\${param.description}</div>\` : ''}
                                                                </div>
                                                            \`).join('')}
                                                        </div>
                                                    \` : ''}
                                                    
                                                    \${endpoint.sampleRequestBodies && endpoint.sampleRequestBodies.length > 0 ? \`
                                                        <div class="request-response-section">
                                                            <div class="section-header">Sample Request Body</div>
                                                            <div class="code-block">\${JSON.stringify(endpoint.sampleRequestBodies[0], null, 2)}</div>
                                                        </div>
                                                    \` : ''}
                                                    
                                                    \${endpoint.responseBodySchemas && Object.keys(endpoint.responseBodySchemas).length > 0 ? \`
                                                        <div class="request-response-section">
                                                            <div class="section-header">Response Body Schemas</div>
                                                            \${Object.entries(endpoint.responseBodySchemas).map(([status, schema]) => \`
                                                                <div style="margin-bottom: 8px;">
                                                                    <div style="font-weight: 600; font-size: 10px; margin-bottom: 2px;">Status \${status}</div>
                                                                    <div class="code-block">\${JSON.stringify(schema, null, 2)}</div>
                                                                </div>
                                                            \`).join('')}
                                                        </div>
                                                    \` : endpoint.responseBodyContent ? \`
                                                        <div class="request-response-section">
                                                            <div class="section-header">Response Body Schema</div>
                                                            <div class="code-block">\${endpoint.responseBodyContent}</div>
                                                        </div>
                                                    \` : ''}
                                                    
                                                    \${endpoint.sampleResponses && Object.keys(endpoint.sampleResponses).length > 0 ? \`
                                                        <div class="request-response-section">
                                                            <div class="section-header">Sample Responses</div>
                                                            \${Object.entries(endpoint.sampleResponses).map(([status, response]) => \`
                                                                <div style="margin-bottom: 8px;">
                                                                    <div style="font-weight: 600; font-size: 10px; margin-bottom: 2px;">Status \${status}</div>
                                                                    <div class="code-block">\${JSON.stringify(response, null, 2)}</div>
                                                                </div>
                                                            \`).join('')}
                                                        </div>
                                                    \` : ''}
                                                    
                                                    \${endpoint.usagePatterns && endpoint.usagePatterns.length > 0 ? \`
                                                        <div class="request-response-section">
                                                            <div class="section-header">Usage Patterns</div>
                                                            \${endpoint.usagePatterns.map(pattern => \`<div style="margin-bottom: 4px; font-size: 11px;">• \${pattern}</div>\`).join('')}
                                                        </div>
                                                    \` : ''}
                                                    
                                                    \${endpoint.aiSuggestions && endpoint.aiSuggestions.length > 0 ? \`
                                                        <div class="ai-suggestions">
                                                            <div class="section-header">AI Suggestions</div>
                                                            <ul>
                                                                \${endpoint.aiSuggestions.map(suggestion => \`<li>\${suggestion}</li>\`).join('')}
                                                            </ul>
                                                        </div>
                                                    \` : ''}
                                                </div>
                                            </div>
                                        \`).join('')}
                                    </div>
                                </div>
                            \`).join('')}
                        </div>
                    \`;

                    // Initialize with tag grouping and collapsed groups
                    setTimeout(() => {
                        const groups = document.querySelectorAll('.group-content');
                        groups.forEach(group => {
                            group.classList.remove('expanded');
                        });
                    }, 100);
                }

                // Event handlers
                function updateSearch(value) {
                    vscode.postMessage({
                        type: 'updateFilters',
                        filters: { search: value }
                    });
                }

                function toggleMethodFilter(method) {
                    const methods = currentData.filters.methods.includes(method) 
                        ? currentData.filters.methods.filter(m => m !== method)
                        : [...currentData.filters.methods, method];
                    
                    vscode.postMessage({
                        type: 'updateFilters',
                        filters: { methods }
                    });
                }

                function toggleTagFilter(tag) {
                    const tags = currentData.filters.tags.includes(tag) 
                        ? currentData.filters.tags.filter(t => t !== tag)
                        : [...currentData.filters.tags, tag];
                    
                    vscode.postMessage({
                        type: 'updateFilters',
                        filters: { tags }
                    });
                }



                function toggleFilter(filterName) {
                    vscode.postMessage({
                        type: 'updateFilters',
                        filters: { [filterName]: !currentData.filters[filterName] }
                    });
                }

                function updateGrouping(key, value) {
                    vscode.postMessage({
                        type: 'updateGrouping',
                        grouping: { [key]: value }
                    });
                }

                function toggleSortOrder() {
                    const sortOrder = currentData.grouping.sortOrder === 'asc' ? 'desc' : 'asc';
                    vscode.postMessage({
                        type: 'updateGrouping',
                        grouping: { sortOrder }
                    });
                }

                function clearAllFilters() {
                    vscode.postMessage({
                        type: 'clearFilters'
                    });
                }

                function toggleGroup(groupName) {
                    const groupContent = document.getElementById('group-' + groupName.replace(/[^a-zA-Z0-9]/g, '-'));
                    const icon = event.currentTarget.querySelector('.collapse-icon');
                    
                    if (groupContent.classList.contains('expanded')) {
                        groupContent.classList.remove('expanded');
                        icon.classList.remove('expanded');
                    } else {
                        groupContent.classList.add('expanded');
                        icon.classList.add('expanded');
                    }
                }

                function collapseAllGroups() {
                    document.querySelectorAll('.group-content').forEach(group => {
                        group.classList.remove('expanded');
                    });
                    document.querySelectorAll('.collapse-icon').forEach(icon => {
                        icon.classList.remove('expanded');
                    });
                }

                function expandAllGroups() {
                    document.querySelectorAll('.group-content').forEach(group => {
                        group.classList.add('expanded');
                    });
                    document.querySelectorAll('.collapse-icon').forEach(icon => {
                        icon.classList.add('expanded');
                    });
                }

                function toggleEndpointDetails(endpointId) {
                    const details = document.getElementById('details-' + endpointId);
                    if (details.classList.contains('expanded')) {
                        details.classList.remove('expanded');
                    } else {
                        details.classList.add('expanded');
                    }
                }

                function generateSDK() {
                    const language = document.getElementById('sdkLanguage').value;
                    vscode.postMessage({
                        type: 'generateSDK',
                        options: {
                            language,
                            includeValidation: true,
                            includeDocumentation: true,
                            includeExamples: true,
                            outputFormat: 'classes',
                            generateMocks: false,
                            includeNullChecks: true,
                            namingConvention: 'camelCase'
                        }
                    });
                }

                function generateClientLibrary() {
                    const language = document.getElementById('sdkLanguage').value;
                    vscode.postMessage({
                        type: 'generateSDK',
                        options: {
                            language,
                            includeValidation: true,
                            includeDocumentation: true,
                            includeExamples: true,
                            outputFormat: 'classes',
                            generateMocks: true,
                            includeNullChecks: true,
                            namingConvention: 'camelCase'
                        }
                    });
                }

                function generateCode(endpointId) {
                    vscode.postMessage({
                        type: 'generateCode',
                        endpointId
                    });
                }

                function testEndpoint(endpointId) {
                    vscode.postMessage({
                        type: 'runEndpointTest',
                        endpointId
                    });
                }

                function copyEndpoint(endpointId) {
                    vscode.postMessage({
                        type: 'copyCode',
                        endpointId
                    });
                }

                function toggleDropdown(endpointId) {
                    const dropdown = document.getElementById('dropdown-' + endpointId);
                    if (dropdown.classList.contains('show')) {
                        dropdown.classList.remove('show');
                    } else {
                        // Close all other dropdowns first
                        document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
                        dropdown.classList.add('show');
                    }
                }

                function showEndpointDetails(endpointId) {
                    vscode.postMessage({
                        type: 'showEndpointDetails',
                        endpointId
                    });
                    // Close dropdown
                    document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
                }

                function showEndpointBody(endpointId) {
                    vscode.postMessage({
                        type: 'showEndpointBody',
                        endpointId
                    });
                    // Close dropdown
                    document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
                }

                function selectCodeType(endpointId) {
                    vscode.postMessage({
                        type: 'selectCodeType',
                        endpointId
                    });
                    // Close dropdown
                    document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
                }

                function showEndpointCode(endpointId, codeType) {
                    vscode.postMessage({
                        type: 'showEndpointCode',
                        endpointId,
                        codeType
                    });
                    // Close dropdown
                    document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
                }

                function exportEndpoint(endpointId) {
                    vscode.postMessage({
                        type: 'exportEndpoint',
                        endpointId
                    });
                    // Close dropdown
                    document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
                }

                // Close dropdowns when clicking outside
                document.addEventListener('click', function(event) {
                    if (!event.target.closest('.dropdown')) {
                        document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
                    }
                });
            </script>
        </body>
        </html>`;
    }
} 