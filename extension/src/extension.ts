import * as vscode from 'vscode';
import { OpenAPIParser } from './openapi-parser';
import { EndpointsProvider } from './providers/endpoints-provider';
import { SchemasProvider } from './providers/schemas-provider';
import { AnalyticsProvider } from './providers/analytics-provider';
import { CodeGenerator } from './code-generator';
import { ValidationEngine } from './validation-engine';
import { DiagnosticsProvider } from './diagnostics-provider';

export function activate(context: vscode.ExtensionContext) {
    console.log('OpenAPI Explorer extension is now active!');

    // Initialize providers
    const parser = new OpenAPIParser();
    const codeGenerator = new CodeGenerator();
    const validationEngine = new ValidationEngine();
    const diagnosticsProvider = new DiagnosticsProvider();
    
    // Tree data providers
    const endpointsProvider = new EndpointsProvider();
    const schemasProvider = new SchemasProvider();
    const analyticsProvider = new AnalyticsProvider();

    // Register tree views
    const endpointsView = vscode.window.createTreeView('openapi-endpoints', {
        treeDataProvider: endpointsProvider,
        showCollapseAll: true
    });

    const schemasView = vscode.window.createTreeView('openapi-schemas', {
        treeDataProvider: schemasProvider,
        showCollapseAll: true
    });

    const analyticsView = vscode.window.createTreeView('openapi-analytics', {
        treeDataProvider: analyticsProvider,
        showCollapseAll: true
    });

    // State management
    let currentSpec: any = null;
    let currentEndpoints: any[] = [];

    // Update context when spec is loaded
    const updateContext = (hasSpec: boolean) => {
        vscode.commands.executeCommand('setContext', 'openapi-explorer.hasSpec', hasSpec);
    };

    // Load OpenAPI Specification
    const loadSpecCommand = vscode.commands.registerCommand('openapi-explorer.loadSpec', async (uri?: vscode.Uri) => {
        try {
            let targetUri = uri;
            
            if (!targetUri) {
                // Show file picker
                const files = await vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: false,
                    filters: {
                        'OpenAPI/Swagger': ['json', 'yaml', 'yml']
                    },
                    title: 'Select OpenAPI Specification'
                });
                
                if (!files || files.length === 0) {
                    return;
                }
                
                targetUri = files[0];
            }

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Loading OpenAPI Specification',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Reading file...' });
                
                const document = await vscode.workspace.openTextDocument(targetUri!);
                const content = document.getText();
                
                progress.report({ increment: 30, message: 'Parsing specification...' });
                
                currentSpec = await parser.parseFromText(content);
                currentEndpoints = parser.extractEndpoints();
                
                progress.report({ increment: 60, message: 'Updating views...' });
                
                // Update providers
                endpointsProvider.updateEndpoints(currentEndpoints);
                schemasProvider.updateSchemas(currentSpec.components?.schemas || {});
                analyticsProvider.updateAnalytics(currentEndpoints);
                
                progress.report({ increment: 90, message: 'Finalizing...' });
                
                updateContext(true);
                
                // Auto-validate if enabled
                const config = vscode.workspace.getConfiguration('openapi-explorer');
                if (config.get('autoValidate')) {
                    await vscode.commands.executeCommand('openapi-explorer.validateSpec');
                }
                
                progress.report({ increment: 100, message: 'Complete!' });
            });

            vscode.window.showInformationMessage(
                `✅ Loaded OpenAPI spec: ${currentSpec.info.title} v${currentSpec.info.version} (${currentEndpoints.length} endpoints)`
            );

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load OpenAPI spec: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    // Validate API Design
    const validateSpecCommand = vscode.commands.registerCommand('openapi-explorer.validateSpec', async () => {
        if (!currentSpec) {
            vscode.window.showWarningMessage('No OpenAPI specification loaded. Please load a spec first.');
            return;
        }

        try {
            const results = await validationEngine.validateAPIDesign(currentSpec, currentEndpoints);
            
            // Show results in a webview
            const panel = vscode.window.createWebviewPanel(
                'openapi-validation',
                'API Validation Results',
                vscode.ViewColumn.Two,
                { enableScripts: true }
            );

            panel.webview.html = generateValidationHTML(results);

            // Update diagnostics
            diagnosticsProvider.updateDiagnostics(results);

        } catch (error) {
            vscode.window.showErrorMessage(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    // Generate Code Examples
    const generateCodeCommand = vscode.commands.registerCommand('openapi-explorer.generateCode', async () => {
        if (!currentEndpoints.length) {
            vscode.window.showWarningMessage('No endpoints available. Please load an OpenAPI spec first.');
            return;
        }

        // Show endpoint picker
        const endpointItems = currentEndpoints.map(ep => ({
            label: `${ep.method} ${ep.path}`,
            description: ep.summary || 'No description',
            endpoint: ep
        }));

        const selectedEndpoint = await vscode.window.showQuickPick(endpointItems, {
            placeHolder: 'Select an endpoint to generate code for'
        });

        if (!selectedEndpoint) return;

        // Show language picker
        const config = vscode.workspace.getConfiguration('openapi-explorer');
        const defaultLanguage = config.get('defaultLanguage', 'typescript');
        
        const languageItems = [
            { label: 'TypeScript', value: 'typescript' },
            { label: 'JavaScript', value: 'javascript' },
            { label: 'Python', value: 'python' },
            { label: 'cURL', value: 'curl' }
        ];

        const selectedLanguage = await vscode.window.showQuickPick(languageItems, {
            placeHolder: 'Select programming language'
        });

        if (!selectedLanguage) return;

        try {
            const code = codeGenerator.generateExample(selectedEndpoint.endpoint, selectedLanguage.value);
            
            // Create new document with generated code
            const document = await vscode.workspace.openTextDocument({
                content: code,
                language: selectedLanguage.value === 'curl' ? 'shellscript' : selectedLanguage.value
            });

            await vscode.window.showTextDocument(document);

        } catch (error) {
            vscode.window.showErrorMessage(`Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    // Show Analytics
    const showAnalyticsCommand = vscode.commands.registerCommand('openapi-explorer.showAnalytics', async () => {
        if (!currentEndpoints.length) {
            vscode.window.showWarningMessage('No endpoints available. Please load an OpenAPI spec first.');
            return;
        }

        const analytics = analyticsProvider.generateAnalytics(currentEndpoints);
        
        const panel = vscode.window.createWebviewPanel(
            'openapi-analytics',
            'API Analytics Dashboard',
            vscode.ViewColumn.Two,
            { enableScripts: true }
        );

        panel.webview.html = generateAnalyticsHTML(analytics);
    });

    // Search Endpoints
    const searchEndpointsCommand = vscode.commands.registerCommand('openapi-explorer.searchEndpoints', async () => {
        if (!currentEndpoints.length) {
            vscode.window.showWarningMessage('No endpoints available. Please load an OpenAPI spec first.');
            return;
        }

        const query = await vscode.window.showInputBox({
            placeHolder: 'Search endpoints by path, method, or description...',
            prompt: 'Enter search query'
        });

        if (!query) return;

        const results = endpointsProvider.searchEndpoints(query);
        
        if (results.length === 0) {
            vscode.window.showInformationMessage('No endpoints found matching your search.');
            return;
        }

        const items = results.map(ep => ({
            label: `${ep.method} ${ep.path}`,
            description: ep.summary || 'No description',
            detail: ep.tags.join(', '),
            endpoint: ep
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `Found ${results.length} matching endpoints`
        });

        if (selected) {
            // Show endpoint details
            const panel = vscode.window.createWebviewPanel(
                'endpoint-details',
                `${selected.endpoint.method} ${selected.endpoint.path}`,
                vscode.ViewColumn.Two,
                { enableScripts: true }
            );

            panel.webview.html = generateEndpointDetailsHTML(selected.endpoint);
        }
    });

    // Generate TypeScript Types
    const generateTypesCommand = vscode.commands.registerCommand('openapi-explorer.generateTypes', async () => {
        if (!currentSpec) {
            vscode.window.showWarningMessage('No OpenAPI specification loaded.');
            return;
        }

        try {
            const types = codeGenerator.generateTypeScriptTypes(currentSpec);
            
            const document = await vscode.workspace.openTextDocument({
                content: types,
                language: 'typescript'
            });

            await vscode.window.showTextDocument(document);

        } catch (error) {
            vscode.window.showErrorMessage(`Type generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    // Generate Mock Data
    const generateMockDataCommand = vscode.commands.registerCommand('openapi-explorer.generateMockData', async () => {
        if (!currentSpec?.components?.schemas) {
            vscode.window.showWarningMessage('No schemas available for mock data generation.');
            return;
        }

        const schemaNames = Object.keys(currentSpec.components.schemas);
        const selected = await vscode.window.showQuickPick(schemaNames, {
            placeHolder: 'Select a schema to generate mock data for'
        });

        if (!selected) return;

        try {
            const mockData = codeGenerator.generateMockData(currentSpec.components.schemas[selected]);
            
            const document = await vscode.workspace.openTextDocument({
                content: JSON.stringify(mockData, null, 2),
                language: 'json'
            });

            await vscode.window.showTextDocument(document);

        } catch (error) {
            vscode.window.showErrorMessage(`Mock data generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    // Export Documentation
    const exportDocsCommand = vscode.commands.registerCommand('openapi-explorer.exportDocs', async () => {
        if (!currentSpec) {
            vscode.window.showWarningMessage('No OpenAPI specification loaded.');
            return;
        }

        const formats = [
            { label: 'Markdown', value: 'markdown' },
            { label: 'JSON', value: 'json' },
            { label: 'Summary', value: 'summary' }
        ];

        const selectedFormat = await vscode.window.showQuickPick(formats, {
            placeHolder: 'Select export format'
        });

        if (!selectedFormat) return;

        try {
            const docs = codeGenerator.exportDocumentation(currentSpec, currentEndpoints, selectedFormat.value);
            
            const document = await vscode.workspace.openTextDocument({
                content: docs,
                language: selectedFormat.value === 'json' ? 'json' : 'markdown'
            });

            await vscode.window.showTextDocument(document);

        } catch (error) {
            vscode.window.showErrorMessage(`Documentation export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    // Show Schema Explorer
    const showSchemaExplorerCommand = vscode.commands.registerCommand('openapi-explorer.showSchemaExplorer', async () => {
        if (!currentSpec?.components?.schemas) {
            vscode.window.showWarningMessage('No schemas available.');
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'schema-explorer',
            'Schema Explorer',
            vscode.ViewColumn.Two,
            { enableScripts: true }
        );

        panel.webview.html = generateSchemaExplorerHTML(currentSpec.components.schemas);
    });

    // Register all commands
    context.subscriptions.push(
        loadSpecCommand,
        validateSpecCommand,
        generateCodeCommand,
        showAnalyticsCommand,
        searchEndpointsCommand,
        generateTypesCommand,
        generateMockDataCommand,
        exportDocsCommand,
        showSchemaExplorerCommand,
        endpointsView,
        schemasView,
        analyticsView
    );

    // Auto-load spec if workspace contains OpenAPI files
    vscode.workspace.findFiles('**/*.{openapi,swagger}.{json,yaml,yml}', null, 1).then(files => {
        if (files.length > 0) {
            vscode.commands.executeCommand('openapi-explorer.loadSpec', files[0]);
        }
    });
}

export function deactivate() {}

// HTML generation functions
function generateValidationHTML(results: any[]): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>API Validation Results</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 20px;
                background: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
            }
            .result { 
                margin: 15px 0; 
                padding: 15px; 
                border-radius: 8px;
                border-left: 4px solid;
            }
            .success { 
                background: var(--vscode-inputValidation-infoBackground);
                border-color: var(--vscode-charts-green);
            }
            .warning { 
                background: var(--vscode-inputValidation-warningBackground);
                border-color: var(--vscode-charts-yellow);
            }
            .error { 
                background: var(--vscode-inputValidation-errorBackground);
                border-color: var(--vscode-charts-red);
            }
            .title { font-weight: bold; margin-bottom: 8px; }
            .details { font-size: 0.9em; opacity: 0.8; }
            .category { 
                display: inline-block; 
                background: var(--vscode-badge-background);
                color: var(--vscode-badge-foreground);
                padding: 2px 8px; 
                border-radius: 12px; 
                font-size: 0.8em;
                margin-top: 8px;
            }
        </style>
    </head>
    <body>
        <h1>🛡️ API Validation Results</h1>
        <p>Found ${results.length} validation result${results.length !== 1 ? 's' : ''}</p>
        
        ${results.map(result => `
            <div class="result ${result.type}">
                <div class="title">${getResultIcon(result.type)} ${result.message}</div>
                <div class="details">${result.details || ''}</div>
                <div class="category">${result.category}</div>
            </div>
        `).join('')}
    </body>
    </html>
    `;
}

function generateAnalyticsHTML(analytics: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>API Analytics</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 20px;
                background: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
            }
            .metric { 
                display: inline-block; 
                margin: 10px; 
                padding: 20px; 
                background: var(--vscode-input-background);
                border-radius: 8px;
                min-width: 150px;
                text-align: center;
            }
            .metric-value { font-size: 2em; font-weight: bold; color: var(--vscode-charts-blue); }
            .metric-label { font-size: 0.9em; opacity: 0.8; }
            .distribution { margin: 20px 0; }
            .bar { 
                display: flex; 
                align-items: center; 
                margin: 8px 0; 
            }
            .bar-label { width: 100px; font-size: 0.9em; }
            .bar-fill { 
                height: 20px; 
                background: var(--vscode-charts-blue);
                margin: 0 10px;
                border-radius: 4px;
            }
            .bar-value { font-size: 0.9em; }
        </style>
    </head>
    <body>
        <h1>📊 API Analytics Dashboard</h1>
        
        <div class="metrics">
            <div class="metric">
                <div class="metric-value">${analytics.totalEndpoints}</div>
                <div class="metric-label">Total Endpoints</div>
            </div>
            <div class="metric">
                <div class="metric-value">${analytics.deprecatedCount}</div>
                <div class="metric-label">Deprecated</div>
            </div>
            <div class="metric">
                <div class="metric-value">${analytics.averageParametersPerEndpoint.toFixed(1)}</div>
                <div class="metric-label">Avg Parameters</div>
            </div>
        </div>

        <div class="distribution">
            <h3>HTTP Methods Distribution</h3>
            ${Object.entries(analytics.methodDistribution).map(([method, count]) => `
                <div class="bar">
                    <div class="bar-label">${method}</div>
                    <div class="bar-fill" style="width: ${(count as number / analytics.totalEndpoints) * 200}px"></div>
                    <div class="bar-value">${count}</div>
                </div>
            `).join('')}
        </div>

        <div class="distribution">
            <h3>Complexity Distribution</h3>
            ${Object.entries(analytics.complexityDistribution).map(([complexity, count]) => `
                <div class="bar">
                    <div class="bar-label">${complexity}</div>
                    <div class="bar-fill" style="width: ${(count as number / analytics.totalEndpoints) * 200}px"></div>
                    <div class="bar-value">${count}</div>
                </div>
            `).join('')}
        </div>
    </body>
    </html>
    `;
}

function generateEndpointDetailsHTML(endpoint: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Endpoint Details</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 20px;
                background: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
            }
            .method { 
                display: inline-block; 
                padding: 4px 12px; 
                border-radius: 4px; 
                font-weight: bold;
                color: white;
                background: ${getMethodColor(endpoint.method)};
            }
            .path { 
                font-family: 'Courier New', monospace; 
                background: var(--vscode-input-background);
                padding: 8px;
                border-radius: 4px;
                margin: 10px 0;
            }
            .section { margin: 20px 0; }
            .parameter { 
                background: var(--vscode-input-background);
                padding: 10px;
                margin: 5px 0;
                border-radius: 4px;
            }
            .tag { 
                display: inline-block;
                background: var(--vscode-badge-background);
                color: var(--vscode-badge-foreground);
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.8em;
                margin: 2px;
            }
        </style>
    </head>
    <body>
        <h1>
            <span class="method">${endpoint.method}</span>
            <span class="path">${endpoint.path}</span>
        </h1>
        
        ${endpoint.summary ? `<p><strong>Summary:</strong> ${endpoint.summary}</p>` : ''}
        ${endpoint.description ? `<p><strong>Description:</strong> ${endpoint.description}</p>` : ''}
        
        ${endpoint.tags.length > 0 ? `
            <div class="section">
                <strong>Tags:</strong><br>
                ${endpoint.tags.map((tag: string) => `<span class="tag">${tag}</span>`).join('')}
            </div>
        ` : ''}
        
        ${endpoint.parameters.length > 0 ? `
            <div class="section">
                <h3>Parameters (${endpoint.parameters.length})</h3>
                ${endpoint.parameters.map((param: any) => `
                    <div class="parameter">
                        <strong>${param.name}</strong> (${param.in})
                        ${param.required ? '<span style="color: red;">*</span>' : ''}
                        <br>
                        <small>${param.description || 'No description'}</small>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        <div class="section">
            <h3>Responses</h3>
            ${Object.entries(endpoint.responses).map(([code, response]: [string, any]) => `
                <div class="parameter">
                    <strong>${code}</strong><br>
                    <small>${response.description}</small>
                </div>
            `).join('')}
        </div>
    </body>
    </html>
    `;
}

function generateSchemaExplorerHTML(schemas: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Schema Explorer</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 20px;
                background: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
            }
            .schema { 
                margin: 20px 0; 
                padding: 15px; 
                background: var(--vscode-input-background);
                border-radius: 8px;
            }
            .schema-name { 
                font-size: 1.2em; 
                font-weight: bold; 
                margin-bottom: 10px;
                color: var(--vscode-charts-blue);
            }
            .property { 
                margin: 8px 0; 
                padding: 8px;
                background: var(--vscode-editor-background);
                border-radius: 4px;
            }
            .property-name { font-weight: bold; }
            .property-type { 
                color: var(--vscode-charts-green);
                font-family: monospace;
            }
            .required { color: var(--vscode-charts-red); }
        </style>
    </head>
    <body>
        <h1>🏗️ Schema Explorer</h1>
        <p>Found ${Object.keys(schemas).length} schema${Object.keys(schemas).length !== 1 ? 's' : ''}</p>
        
        ${Object.entries(schemas).map(([name, schema]: [string, any]) => `
            <div class="schema">
                <div class="schema-name">${name}</div>
                ${schema.description ? `<p>${schema.description}</p>` : ''}
                
                ${schema.properties ? `
                    <div>
                        <strong>Properties:</strong>
                        ${Object.entries(schema.properties).map(([propName, prop]: [string, any]) => `
                            <div class="property">
                                <span class="property-name">${propName}</span>
                                ${schema.required?.includes(propName) ? '<span class="required">*</span>' : ''}
                                <span class="property-type">${prop.type || 'unknown'}</span>
                                ${prop.description ? `<br><small>${prop.description}</small>` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('')}
    </body>
    </html>
    `;
}

function getResultIcon(type: string): string {
    switch (type) {
        case 'success': return '✅';
        case 'warning': return '⚠️';
        case 'error': return '❌';
        default: return 'ℹ️';
    }
}

function getMethodColor(method: string): string {
    switch (method.toUpperCase()) {
        case 'GET': return '#28a745';
        case 'POST': return '#007bff';
        case 'PUT': return '#fd7e14';
        case 'PATCH': return '#ffc107';
        case 'DELETE': return '#dc3545';
        default: return '#6c757d';
    }
}