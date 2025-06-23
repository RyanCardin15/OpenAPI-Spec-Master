import * as vscode from 'vscode';
import { EndpointData } from '../openapi-parser';
const Fuse = require('fuse.js');

export class EndpointsProvider implements vscode.TreeDataProvider<EndpointItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<EndpointItem | undefined | null | void> = new vscode.EventEmitter<EndpointItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<EndpointItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private endpoints: EndpointData[] = [];
    private fuse: any;

    constructor() {
        this.fuse = new Fuse([], {
            keys: ['path', 'summary', 'description', 'tags'],
            threshold: 0.4
        });
    }

    updateEndpoints(endpoints: EndpointData[]): void {
        this.endpoints = endpoints;
        this.fuse = new Fuse(endpoints, {
            keys: ['path', 'summary', 'description', 'tags'],
            threshold: 0.4
        });
        this._onDidChangeTreeData.fire();
    }

    searchEndpoints(query: string): EndpointData[] {
        if (!query.trim()) return this.endpoints;
        
        const results = this.fuse.search(query);
        return results.map((result: any) => result.item);
    }

    getTreeItem(element: EndpointItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: EndpointItem): Thenable<EndpointItem[]> {
        if (!element) {
            // Group by tags
            const grouped = this.groupEndpointsByTag();
            return Promise.resolve(Object.entries(grouped).map(([tag, endpoints]) => 
                new TagItem(tag, endpoints.length, vscode.TreeItemCollapsibleState.Collapsed)
            ));
        }

        if (element instanceof TagItem) {
            const endpoints = this.endpoints.filter(ep => 
                ep.tags.includes(element.label as string) || 
                (element.label === 'Untagged' && ep.tags.length === 0)
            );
            return Promise.resolve(endpoints.map(ep => new EndpointItem(ep)));
        }

        return Promise.resolve([]);
    }

    private groupEndpointsByTag(): { [tag: string]: EndpointData[] } {
        const grouped: { [tag: string]: EndpointData[] } = {};
        
        this.endpoints.forEach(endpoint => {
            if (endpoint.tags.length === 0) {
                if (!grouped['Untagged']) grouped['Untagged'] = [];
                grouped['Untagged'].push(endpoint);
            } else {
                endpoint.tags.forEach(tag => {
                    if (!grouped[tag]) grouped[tag] = [];
                    grouped[tag].push(endpoint);
                });
            }
        });

        return grouped;
    }
}

class EndpointItem extends vscode.TreeItem {
    constructor(public readonly endpoint: EndpointData) {
        super(`${endpoint.method} ${endpoint.path}`, vscode.TreeItemCollapsibleState.None);
        
        this.tooltip = endpoint.summary || endpoint.description || 'No description';
        this.description = endpoint.summary;
        this.iconPath = this.getMethodIcon(endpoint.method);
        
        if (endpoint.deprecated) {
            this.description = `[DEPRECATED] ${this.description}`;
        }

        // Add context value for command handling
        this.contextValue = 'endpoint';
        
        // Command to show endpoint details
        this.command = {
            command: 'openapi-explorer.showEndpointDetails',
            title: 'Show Details',
            arguments: [endpoint]
        };
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

class TagItem extends EndpointItem {
    constructor(
        public readonly label: string,
        public readonly count: number,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        // Create a dummy endpoint for the parent constructor
        const dummyEndpoint: EndpointData = {
            id: `tag_${label}`,
            path: '',
            method: 'TAG',
            operation: {},
            tags: [],
            parameters: [],
            responses: {}
        };
        super(dummyEndpoint);
        
        // Override the label and other properties
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.tooltip = `${this.label} (${this.count} endpoints)`;
        this.description = `${this.count} endpoints`;
        this.iconPath = new vscode.ThemeIcon('tag');
        this.command = undefined; // Remove the command from tag items
    }
}