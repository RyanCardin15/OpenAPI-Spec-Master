import * as vscode from 'vscode';
import { EndpointData } from '../openapi-parser';

export class AnalyticsProvider implements vscode.TreeDataProvider<AnalyticsItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<AnalyticsItem | undefined | null | void> = new vscode.EventEmitter<AnalyticsItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AnalyticsItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private analytics: any = {};

    updateAnalytics(endpoints: EndpointData[]): void {
        this.analytics = this.generateAnalytics(endpoints);
        this._onDidChangeTreeData.fire();
    }

    generateAnalytics(endpoints: EndpointData[]): any {
        const methodDistribution: { [method: string]: number } = {};
        const tagDistribution: { [tag: string]: number } = {};
        const complexityDistribution: { [complexity: string]: number } = {};
        
        let deprecatedCount = 0;
        let totalParameters = 0;

        endpoints.forEach(endpoint => {
            // Method distribution
            methodDistribution[endpoint.method] = (methodDistribution[endpoint.method] || 0) + 1;

            // Tag distribution
            endpoint.tags.forEach(tag => {
                tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
            });

            // Complexity distribution
            const complexity = endpoint.complexity || 'medium';
            complexityDistribution[complexity] = (complexityDistribution[complexity] || 0) + 1;

            // Count deprecated
            if (endpoint.deprecated) {
                deprecatedCount++;
            }

            // Count parameters
            totalParameters += endpoint.parameters.length;
        });

        return {
            totalEndpoints: endpoints.length,
            methodDistribution,
            tagDistribution,
            complexityDistribution,
            deprecatedCount,
            averageParametersPerEndpoint: endpoints.length > 0 ? totalParameters / endpoints.length : 0
        };
    }

    getTreeItem(element: AnalyticsItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: AnalyticsItem): Thenable<AnalyticsItem[]> {
        if (!element) {
            return Promise.resolve([
                new AnalyticsItem('Overview', 'overview', vscode.TreeItemCollapsibleState.Expanded),
                new AnalyticsItem('HTTP Methods', 'methods', vscode.TreeItemCollapsibleState.Collapsed),
                new AnalyticsItem('Complexity', 'complexity', vscode.TreeItemCollapsibleState.Collapsed),
                new AnalyticsItem('Tags', 'tags', vscode.TreeItemCollapsibleState.Collapsed)
            ]);
        }

        switch (element.category) {
            case 'overview':
                return Promise.resolve([
                    new MetricItem('Total Endpoints', this.analytics.totalEndpoints),
                    new MetricItem('Deprecated', this.analytics.deprecatedCount),
                    new MetricItem('Avg Parameters', this.analytics.averageParametersPerEndpoint.toFixed(1))
                ]);
            
            case 'methods':
                return Promise.resolve(Object.entries(this.analytics.methodDistribution).map(([method, count]) => 
                    new MetricItem(method, count as number)
                ));
            
            case 'complexity':
                return Promise.resolve(Object.entries(this.analytics.complexityDistribution).map(([complexity, count]) => 
                    new MetricItem(complexity, count as number)
                ));
            
            case 'tags':
                return Promise.resolve(Object.entries(this.analytics.tagDistribution).map(([tag, count]) => 
                    new MetricItem(tag, count as number)
                ));
        }

        return Promise.resolve([]);
    }
}

class AnalyticsItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly category: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.iconPath = this.getCategoryIcon(category);
    }

    private getCategoryIcon(category: string): vscode.ThemeIcon {
        switch (category) {
            case 'overview': return new vscode.ThemeIcon('dashboard');
            case 'methods': return new vscode.ThemeIcon('symbol-method');
            case 'complexity': return new vscode.ThemeIcon('graph');
            case 'tags': return new vscode.ThemeIcon('tag');
            default: return new vscode.ThemeIcon('info');
        }
    }
}

class MetricItem extends AnalyticsItem {
    constructor(
        public readonly metric: string,
        public readonly value: number | string
    ) {
        super(`${metric}: ${value}`, 'metric', vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('symbol-number');
    }
}