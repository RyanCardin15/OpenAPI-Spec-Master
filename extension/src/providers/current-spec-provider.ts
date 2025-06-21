import * as vscode from 'vscode';
import { SpecItem } from './spec-manager-provider';

export class CurrentSpecProvider implements vscode.TreeDataProvider<CurrentSpecTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<CurrentSpecTreeItem | undefined | null | void> = new vscode.EventEmitter<CurrentSpecTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<CurrentSpecTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private currentSpec: SpecItem | null = null;
    private endpoints: any[] = [];
    private schemas: any[] = [];
    private analytics: any = {};

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setCurrentSpec(spec: SpecItem | null): void {
        this.currentSpec = spec;
        if (spec?.spec) {
            this.analyzeSpec(spec.spec);
        } else {
            this.endpoints = [];
            this.schemas = [];
            this.analytics = {};
        }
        this.refresh();
    }

    getCurrentSpec(): SpecItem | null {
        return this.currentSpec;
    }

    getTreeItem(element: CurrentSpecTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: CurrentSpecTreeItem): Thenable<CurrentSpecTreeItem[]> {
        if (!this.currentSpec) {
            return Promise.resolve([
                new NoSpecSelectedItem()
            ]);
        }

        if (!element) {
            // Root level - show main categories
            return Promise.resolve([
                new SpecInfoItem(this.currentSpec),
                new EndpointsRootItem(this.endpoints.length),
                new SchemasRootItem(this.schemas.length),
                new AnalyticsRootItem()
            ]);
        }

        if (element instanceof EndpointsRootItem) {
            return Promise.resolve(
                this.endpoints.slice(0, 20).map(endpoint => new EndpointItem(endpoint))
            );
        }

        if (element instanceof SchemasRootItem) {
            return Promise.resolve(
                this.schemas.slice(0, 20).map(schema => new SchemaItem(schema))
            );
        }

        if (element instanceof AnalyticsRootItem) {
            return Promise.resolve([
                new MetricItem('Total Endpoints', this.analytics.totalEndpoints || 0),
                new MetricItem('Total Schemas', this.analytics.totalSchemas || 0),
                new MetricItem('Deprecated Endpoints', this.analytics.deprecatedCount || 0),
                new MetricItem('Most Common Method', this.analytics.mostCommonMethod || 'N/A')
            ]);
        }

        return Promise.resolve([]);
    }

    private analyzeSpec(spec: any): void {
        try {
            // Extract endpoints
            this.endpoints = [];
            if (spec.paths) {
                Object.entries(spec.paths).forEach(([path, pathObj]: [string, any]) => {
                    Object.entries(pathObj).forEach(([method, operation]: [string, any]) => {
                        if (typeof operation === 'object' && operation !== null) {
                            this.endpoints.push({
                                path,
                                method: method.toUpperCase(),
                                summary: operation.summary || '',
                                description: operation.description || '',
                                deprecated: operation.deprecated || false,
                                tags: operation.tags || []
                            });
                        }
                    });
                });
            }

            // Extract schemas
            this.schemas = [];
            if (spec.components?.schemas) {
                Object.entries(spec.components.schemas).forEach(([name, schema]) => {
                    this.schemas.push({
                        name,
                        schema
                    });
                });
            }

            // Calculate analytics
            this.analytics = {
                totalEndpoints: this.endpoints.length,
                totalSchemas: this.schemas.length,
                deprecatedCount: this.endpoints.filter(e => e.deprecated).length,
                mostCommonMethod: this.getMostCommonMethod()
            };
        } catch (error) {
            console.error('Error analyzing spec:', error);
        }
    }

    private getMostCommonMethod(): string {
        const methodCounts: { [key: string]: number } = {};
        this.endpoints.forEach(endpoint => {
            methodCounts[endpoint.method] = (methodCounts[endpoint.method] || 0) + 1;
        });

        let mostCommon = '';
        let maxCount = 0;
        Object.entries(methodCounts).forEach(([method, count]) => {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = method;
            }
        });

        return mostCommon;
    }
}

// Tree item classes
export abstract class CurrentSpecTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
    }
}

export class NoSpecSelectedItem extends CurrentSpecTreeItem {
    constructor() {
        super('No spec selected', vscode.TreeItemCollapsibleState.None);
        this.description = 'Select a spec to view details';
        this.iconPath = new vscode.ThemeIcon('info');
        this.contextValue = 'noSpec';
    }
}

export class SpecInfoItem extends CurrentSpecTreeItem {
    constructor(spec: SpecItem) {
        super(spec.name, vscode.TreeItemCollapsibleState.None);
        this.description = spec.source === 'url' ? '🌐 Remote' : '📁 Local';
        this.tooltip = `${spec.name}\nSource: ${spec.source === 'url' ? spec.url : spec.path}\nLast modified: ${new Date(spec.lastModified).toLocaleString()}`;
        this.iconPath = new vscode.ThemeIcon('file-code');
        this.contextValue = 'specInfo';
    }
}

export class EndpointsRootItem extends CurrentSpecTreeItem {
    constructor(count: number) {
        super('Endpoints', vscode.TreeItemCollapsibleState.Expanded);
        this.description = `${count} endpoint${count !== 1 ? 's' : ''}`;
        this.iconPath = new vscode.ThemeIcon('symbol-method');
        this.contextValue = 'endpointsRoot';
    }
}

export class SchemasRootItem extends CurrentSpecTreeItem {
    constructor(count: number) {
        super('Schemas', vscode.TreeItemCollapsibleState.Expanded);
        this.description = `${count} schema${count !== 1 ? 's' : ''}`;
        this.iconPath = new vscode.ThemeIcon('symbol-structure');
        this.contextValue = 'schemasRoot';
    }
}

export class AnalyticsRootItem extends CurrentSpecTreeItem {
    constructor() {
        super('Analytics', vscode.TreeItemCollapsibleState.Expanded);
        this.iconPath = new vscode.ThemeIcon('graph');
        this.contextValue = 'analyticsRoot';
    }
}

export class EndpointItem extends CurrentSpecTreeItem {
    constructor(endpoint: any) {
        super(`${endpoint.method} ${endpoint.path}`, vscode.TreeItemCollapsibleState.None);
        this.description = endpoint.summary || '';
        this.tooltip = `${endpoint.method} ${endpoint.path}\n${endpoint.summary || ''}\n${endpoint.description || ''}`;
        this.iconPath = this.getMethodIcon(endpoint.method);
        this.contextValue = 'endpointItem';
        
        if (endpoint.deprecated) {
            this.description = `${this.description} (deprecated)`;
        }
    }

    private getMethodIcon(method: string): vscode.ThemeIcon {
        switch (method.toUpperCase()) {
            case 'GET': return new vscode.ThemeIcon('arrow-down', new vscode.ThemeColor('charts.green'));
            case 'POST': return new vscode.ThemeIcon('add', new vscode.ThemeColor('charts.blue'));
            case 'PUT': return new vscode.ThemeIcon('edit', new vscode.ThemeColor('charts.orange'));
            case 'PATCH': return new vscode.ThemeIcon('diff-modified', new vscode.ThemeColor('charts.yellow'));
            case 'DELETE': return new vscode.ThemeIcon('trash', new vscode.ThemeColor('charts.red'));
            default: return new vscode.ThemeIcon('circle-outline');
        }
    }
}

export class SchemaItem extends CurrentSpecTreeItem {
    constructor(schema: any) {
        super(schema.name, vscode.TreeItemCollapsibleState.None);
        this.description = schema.schema.type || 'object';
        this.tooltip = `Schema: ${schema.name}\nType: ${schema.schema.type || 'object'}`;
        this.iconPath = new vscode.ThemeIcon('symbol-class');
        this.contextValue = 'schema';
    }
}

export class MetricItem extends CurrentSpecTreeItem {
    constructor(metric: string, value: number | string) {
        super(`${metric}: ${value}`, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('symbol-number');
        this.contextValue = 'metric';
    }
} 