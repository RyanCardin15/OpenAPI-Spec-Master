import * as vscode from 'vscode';
import { OpenAPIParser } from './openapi-parser';
import { SpecManagerProvider } from './providers/spec-manager-provider';

import { EnhancedSpecWebviewProvider } from './providers/enhanced-spec-webview-provider';
import { CodeGenerator } from './code-generator';
import { ValidationEngine } from './validation-engine';
import { DiagnosticsProvider } from './diagnostics-provider';
import { registerPerformanceCommands } from './utils/performance-monitor-ui';

export function activate(context: vscode.ExtensionContext) {
    console.log('OpenAPI Explorer extension is now active!');

    // Track current spec
    let currentSpec: any = null;

    // Initialize providers
    const specManagerProvider = new SpecManagerProvider(context);
    const enhancedSpecWebviewProvider = new EnhancedSpecWebviewProvider(context.extensionUri);
    const validationEngine = new ValidationEngine();
    const codeGenerator = new CodeGenerator();
    const diagnosticsProvider = new DiagnosticsProvider();

    // Register tree views
    const specManagerView = vscode.window.createTreeView('openapi-spec-manager', {
        treeDataProvider: specManagerProvider,
        showCollapseAll: true
    });

    // Register enhanced webview provider
    const enhancedSpecWebview = vscode.window.registerWebviewViewProvider(
        EnhancedSpecWebviewProvider.viewType,
        enhancedSpecWebviewProvider
    );

    // New commands for spec management
    const createFolderCommand = vscode.commands.registerCommand('openapi-explorer.createFolder', () => {
        specManagerProvider.createFolder();
    });

    const addSpecFromFileCommand = vscode.commands.registerCommand('openapi-explorer.addSpecFromFile', (folderId: string) => {
        specManagerProvider.addSpecFromFile(folderId);
    });

    const addSpecFromUrlCommand = vscode.commands.registerCommand('openapi-explorer.addSpecFromUrl', (folderId: string) => {
        specManagerProvider.addSpecFromUrl(folderId);
    });

    const openSpecCommand = vscode.commands.registerCommand('openapi-explorer.openSpec', async (folderId: string, specId: string) => {
        const spec = await specManagerProvider.loadSpecContent(folderId, specId);
        if (spec) {
            currentSpec = spec;
            enhancedSpecWebviewProvider.setCurrentSpec(spec);
            vscode.window.showInformationMessage(`Opened: ${spec.name}`);
        } else {
            vscode.window.showErrorMessage('Failed to load spec content');
        }
    });

    const deleteSpecCommand = vscode.commands.registerCommand('openapi-explorer.deleteSpec', (item?: any) => {
        if (item && (item.contextValue === 'spec' || item.contextValue === 'spec-loaded' || item.contextValue === 'spec-unloaded' || item.contextValue === 'spec-error' || item.contextValue === 'spec-loading')) {
            specManagerProvider.deleteSpec(item.folderId, item.spec.id);
        }
    });

    const renameSpecCommand = vscode.commands.registerCommand('openapi-explorer.renameSpec', (item?: any) => {
        if (item && (item.contextValue === 'spec' || item.contextValue === 'spec-loaded' || item.contextValue === 'spec-unloaded' || item.contextValue === 'spec-error' || item.contextValue === 'spec-loading')) {
            specManagerProvider.renameSpec(item.folderId, item.spec.id);
        }
    });

    const refreshSpecsCommand = vscode.commands.registerCommand('openapi-explorer.refreshSpecs', () => {
        specManagerProvider.refresh();
    });

    // Export/Import configuration commands
    const exportConfigCommand = vscode.commands.registerCommand('openapi-explorer.exportConfig', () => {
        specManagerProvider.exportConfig();
    });

    const importConfigCommand = vscode.commands.registerCommand('openapi-explorer.importConfig', () => {
        specManagerProvider.importConfig();
    });

    const exportSelectedItemsCommand = vscode.commands.registerCommand('openapi-explorer.exportSelectedItems', (item?: any) => {
        if (item && item.contextValue === 'folder') {
            specManagerProvider.exportSelectedItems(item.folder.id);
        } else if (item && (item.contextValue === 'spec' || item.contextValue === 'spec-loaded' || item.contextValue === 'spec-unloaded' || item.contextValue === 'spec-error' || item.contextValue === 'spec-loading')) {
            specManagerProvider.exportSelectedItems(item.folderId, item.spec.id);
        }
    });

    // Delete and rename commands
    const deleteFolderCommand = vscode.commands.registerCommand('openapi-explorer.deleteFolder', (item?: any) => {
        if (item && item.contextValue === 'folder') {
            specManagerProvider.deleteFolder(item.folder.id);
        }
    });

    const renameFolderCommand = vscode.commands.registerCommand('openapi-explorer.renameFolder', (item?: any) => {
        if (item && item.contextValue === 'folder') {
            specManagerProvider.renameFolder(item.folder.id);
        }
    });

    // Validate current spec
    const validateCurrentSpecCommand = vscode.commands.registerCommand('openapi-explorer.validateCurrentSpec', async () => {
        if (!currentSpec?.spec) {
            vscode.window.showWarningMessage('No OpenAPI specification selected. Please select a spec first.');
            return;
        }

        try {
            // Extract endpoints for validation
            const endpoints: any[] = [];
            if (currentSpec.spec.paths) {
                Object.entries(currentSpec.spec.paths).forEach(([path, pathObj]: [string, any]) => {
                    Object.entries(pathObj).forEach(([method, operation]: [string, any]) => {
                        if (typeof operation === 'object' && operation !== null) {
                            endpoints.push({
                                path,
                                method: method.toUpperCase(),
                                operation,
                                summary: operation.summary || '',
                                description: operation.description || ''
                            });
                        }
                    });
                });
            }

            const results = await validationEngine.validateAPIDesign(currentSpec.spec, endpoints);
            
            // Show results in a webview
            const panel = vscode.window.createWebviewPanel(
                'openapi-validation',
                `Validation: ${currentSpec.name}`,
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
        if (!currentSpec?.spec) {
            vscode.window.showWarningMessage('No OpenAPI specification selected. Please select a spec first.');
            return;
        }

        // Extract endpoints
        const endpoints: any[] = [];
        if (currentSpec.spec.paths) {
            Object.entries(currentSpec.spec.paths).forEach(([path, pathObj]: [string, any]) => {
                Object.entries(pathObj).forEach(([method, operation]: [string, any]) => {
                    if (typeof operation === 'object' && operation !== null) {
                        endpoints.push({
                            path,
                            method: method.toUpperCase(),
                            operation,
                            summary: operation.summary || '',
                            description: operation.description || ''
                        });
                    }
                });
            });
        }

        if (!endpoints.length) {
            vscode.window.showWarningMessage('No endpoints found in the selected specification.');
            return;
        }

        // Show endpoint picker
        const endpointItems = endpoints.map(ep => ({
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
        if (!currentSpec?.spec) {
            vscode.window.showWarningMessage('No OpenAPI specification selected. Please select a spec first.');
            return;
        }

        vscode.window.showInformationMessage(`Analytics for ${currentSpec.name} - Feature coming soon!`);
    });

    // Register performance monitoring commands
    registerPerformanceCommands(context);

    // Open Enhanced View
    const openEnhancedViewCommand = vscode.commands.registerCommand('openapi-explorer.openEnhancedView', () => {
        vscode.commands.executeCommand('openapi-enhanced-spec.focus');
    });

    // Search Endpoints
    const searchEndpointsCommand = vscode.commands.registerCommand('openapi-explorer.searchEndpoints', async () => {
        if (!currentSpec?.spec) {
            vscode.window.showWarningMessage('No OpenAPI specification selected. Please select a spec first.');
            return;
        }

        const searchTerm = await vscode.window.showInputBox({
            placeHolder: 'Enter search term for endpoints...',
            prompt: 'Search by path, summary, description, or tags'
        });

        if (searchTerm) {
            // Focus the enhanced view and trigger search
            vscode.commands.executeCommand('openapi-enhanced-spec.focus');
            // The search will be handled by the webview
        }
    });

    // Filter by Method
    const filterByMethodCommand = vscode.commands.registerCommand('openapi-explorer.filterByMethod', async () => {
        if (!currentSpec?.spec) {
            vscode.window.showWarningMessage('No OpenAPI specification selected. Please select a spec first.');
            return;
        }

        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
        const selectedMethod = await vscode.window.showQuickPick(methods, {
            placeHolder: 'Select HTTP method to filter by'
        });

        if (selectedMethod) {
            vscode.commands.executeCommand('openapi-enhanced-spec.focus');
            // The filtering will be handled by the webview
        }
    });

    // Export Documentation
    const exportDocsCommand = vscode.commands.registerCommand('openapi-explorer.exportDocs', async () => {
        if (!currentSpec?.spec) {
            vscode.window.showWarningMessage('No OpenAPI specification selected. Please select a spec first.');
            return;
        }

        vscode.window.showInformationMessage(`Export documentation for ${currentSpec.name} - Feature coming soon!`);
    });

    const retryLoadSpecCommand = vscode.commands.registerCommand('openapi-explorer.retryLoadSpec', (item?: any) => {
        if (item && (item.contextValue === 'spec-error' || item.contextValue === 'spec-unloaded' || item.contextValue === 'spec-loading')) {
            specManagerProvider.retryLoadSpec(item.folderId, item.spec.id);
        }
    });

    // Register all commands
    context.subscriptions.push(
        createFolderCommand,
        addSpecFromFileCommand,
        addSpecFromUrlCommand,
        openSpecCommand,
        deleteSpecCommand,
        renameSpecCommand,
        refreshSpecsCommand,
        exportConfigCommand,
        importConfigCommand,
        exportSelectedItemsCommand,
        deleteFolderCommand,
        renameFolderCommand,
        retryLoadSpecCommand,
        validateCurrentSpecCommand,
        generateCodeCommand,
        showAnalyticsCommand,
        exportDocsCommand,
        openEnhancedViewCommand,
        searchEndpointsCommand,
        filterByMethodCommand,
        specManagerView,
        enhancedSpecWebview
    );
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