import * as vscode from 'vscode';
import { SpecItem } from './spec-manager-provider';
import { EnhancedEndpointData, EnhancedSchema, FilterState, GroupingState, ViewState, EnhancedSpecData } from '../types/enhanced-spec';
import { EnhancedSearch } from '../utils/enhanced-search';

export class EnhancedSpecWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'openapi-enhanced-spec';

    private _view?: vscode.WebviewView;
    private _currentSpec: SpecItem | null = null;
    private _enhancedData: EnhancedSpecData | null = null;
    private _search: EnhancedSearch = new EnhancedSearch();

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
        responseTime: []
    };

    private _grouping: GroupingState = {
        groupBy: 'none',
        sortBy: 'path',
        sortOrder: 'asc'
    };

    private _viewState: ViewState = {
        layout: 'list',
        showDetails: true,
        showBusinessContext: false,
        showAISuggestions: false,
        showCodeExamples: false,
        density: 'comfortable'
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
                        responseTime: []
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
                this._view.title = spec.name;
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
                    totalFiltered: filteredEndpoints.length
                }
            });
        } else if (this._view) {
            this._view.webview.postMessage({
                type: 'noSpec',
                data: null
            });
        }
    }

    private _analyzeSpec(spec: any): EnhancedSpecData {
        const endpoints: EnhancedEndpointData[] = [];
        const schemas: EnhancedSchema[] = [];

        // Extract endpoints
        if (spec.paths) {
            Object.entries(spec.paths).forEach(([path, pathObj]: [string, any]) => {
                Object.entries(pathObj).forEach(([method, operation]: [string, any]) => {
                    if (typeof operation === 'object' && operation !== null) {
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
                            aiSuggestions: this._generateAISuggestions(operation, path)
                        };
                        endpoints.push(endpoint);
                    }
                });
            });
        }

        // Extract schemas
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
                    usageCount: this._calculateSchemaUsage(name, spec)
                };
                schemas.push(schema);
            });
        }

        // Update search with new data
        this._search.updateData(endpoints, schemas);

        // Calculate analytics
        const analytics = this._calculateAnalytics(endpoints, schemas);

        return {
            endpoints,
            schemas,
            analytics,
            availableTags: this._search.getAvailableTags(),
            availableMethods: this._search.getAvailableMethods(),
            availableStatusCodes: this._search.getAvailableStatusCodes(),
            securitySchemes: this._search.getSecuritySchemes()
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
            schemaComplexity
        };
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
                .endpoints-section {
                    margin-top: 16px;
                }
                .endpoint-group {
                    margin-bottom: 16px;
                }
                .group-header {
                    font-weight: 600;
                    margin-bottom: 8px;
                    padding: 8px;
                    background: var(--vscode-sideBar-background);
                    border-radius: 3px;
                }
                .endpoint-item {
                    padding: 12px;
                    border: 1px solid var(--vscode-sideBar-border);
                    border-radius: 4px;
                    margin-bottom: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .endpoint-item:hover {
                    background: var(--vscode-list-hoverBackground);
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
                }
                .endpoint-summary {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 4px;
                }
                .endpoint-tags {
                    display: flex;
                    gap: 4px;
                    flex-wrap: wrap;
                }
                .tag {
                    padding: 2px 6px;
                    background: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    border-radius: 10px;
                    font-size: 10px;
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

                    document.getElementById('content').innerHTML = \`
                        <div class="search-section">
                            <input type="text" class="search-input" placeholder="Search endpoints by path, summary, tags..." value="\${filters.search}" onInput="updateSearch(this.value)">
                            <div class="stats">
                                <span class="stat">Total: \${analytics.totalEndpoints}</span>
                                <span class="stat">Filtered: \${totalFiltered}</span>
                                <span class="stat">Schemas: \${analytics.totalSchemas}</span>
                                <button class="clear-filters" onclick="clearAllFilters()">Clear Filters</button>
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
                                <h4>Status Codes</h4>
                                <div class="filter-tags">
                                    \${currentData.availableStatusCodes.slice(0, 10).map(code => \`
                                        <span class="filter-tag \${filters.statusCodes.includes(code) ? 'active' : ''}" 
                                              onclick="toggleStatusCodeFilter('\${code}')">
                                            \${code}
                                        </span>
                                    \`).join('')}
                                </div>
                            </div>
                        </div>

                        <div class="view-controls">
                            <div class="control-group">
                                <span class="control-label">Group:</span>
                                <select onchange="updateGrouping('groupBy', this.value)">
                                    <option value="none" \${grouping.groupBy === 'none' ? 'selected' : ''}>No Grouping</option>
                                    <option value="tag" \${grouping.groupBy === 'tag' ? 'selected' : ''}>By Tag</option>
                                    <option value="method" \${grouping.groupBy === 'method' ? 'selected' : ''}>By Method</option>
                                    <option value="path" \${grouping.groupBy === 'path' ? 'selected' : ''}>By Path</option>
                                    <option value="complexity" \${grouping.groupBy === 'complexity' ? 'selected' : ''}>By Complexity</option>
                                </select>
                            </div>
                            <div class="control-group">
                                <span class="control-label">Sort:</span>
                                <select onchange="updateGrouping('sortBy', this.value)">
                                    <option value="path" \${grouping.sortBy === 'path' ? 'selected' : ''}>Path</option>
                                    <option value="method" \${grouping.sortBy === 'method' ? 'selected' : ''}>Method</option>
                                    <option value="summary" \${grouping.sortBy === 'summary' ? 'selected' : ''}>Summary</option>
                                    <option value="complexity" \${grouping.sortBy === 'complexity' ? 'selected' : ''}>Complexity</option>
                                </select>
                                <button onclick="toggleSortOrder()" title="Toggle sort order">\${grouping.sortOrder === 'asc' ? '↑' : '↓'}</button>
                            </div>
                        </div>

                        <div class="endpoints-section">
                            \${Object.entries(groupedEndpoints).map(([groupName, groupEndpoints]) => \`
                                <div class="endpoint-group">
                                    <div class="group-header">\${groupName} (\${groupEndpoints.length})</div>
                                    \${groupEndpoints.map(endpoint => \`
                                        <div class="endpoint-item" onclick="openEndpoint('\${endpoint.id}')">
                                            <div class="endpoint-header">
                                                <span class="method-badge method-\${endpoint.method.toLowerCase()}">\${endpoint.method}</span>
                                                <span class="endpoint-path">\${endpoint.path}</span>
                                                \${endpoint.deprecated ? '<span style="color: orange; font-size: 10px;">DEPRECATED</span>' : ''}
                                            </div>
                                            \${endpoint.summary ? \`<div class="endpoint-summary">\${endpoint.summary}</div>\` : ''}
                                            \${endpoint.tags.length > 0 ? \`
                                                <div class="endpoint-tags">
                                                    \${endpoint.tags.slice(0, 5).map(tag => \`<span class="tag">\${tag}</span>\`).join('')}
                                                    \${endpoint.tags.length > 5 ? \`<span class="tag">+\${endpoint.tags.length - 5}</span>\` : ''}
                                                </div>
                                            \` : ''}
                                        </div>
                                    \`).join('')}
                                </div>
                            \`).join('')}
                        </div>
                    \`;
                }

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

                function toggleStatusCodeFilter(code) {
                    const statusCodes = currentData.filters.statusCodes.includes(code) 
                        ? currentData.filters.statusCodes.filter(c => c !== code)
                        : [...currentData.filters.statusCodes, code];
                    
                    vscode.postMessage({
                        type: 'updateFilters',
                        filters: { statusCodes }
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

                function openEndpoint(endpointId) {
                    vscode.postMessage({
                        type: 'openEndpoint',
                        endpointId
                    });
                }
            </script>
        </body>
        </html>`;
    }
} 