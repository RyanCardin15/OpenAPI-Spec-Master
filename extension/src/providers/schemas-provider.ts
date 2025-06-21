import * as vscode from 'vscode';

export class SchemasProvider implements vscode.TreeDataProvider<SchemaItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SchemaItem | undefined | null | void> = new vscode.EventEmitter<SchemaItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SchemaItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private schemas: { [name: string]: any } = {};

    updateSchemas(schemas: { [name: string]: any }): void {
        this.schemas = schemas;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SchemaItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SchemaItem): Thenable<SchemaItem[]> {
        if (!element) {
            // Root level - show all schemas
            return Promise.resolve(Object.entries(this.schemas).map(([name, schema]) => 
                new SchemaItem(name, schema, vscode.TreeItemCollapsibleState.Collapsed)
            ));
        }

        if (element.schema.properties) {
            // Show properties of the schema
            return Promise.resolve(Object.entries(element.schema.properties).map(([propName, propSchema]: [string, any]) => 
                new PropertyItem(propName, propSchema, element.schema.required?.includes(propName) || false)
            ));
        }

        return Promise.resolve([]);
    }
}

class SchemaItem extends vscode.TreeItem {
    constructor(
        public readonly schemaName: string,
        public readonly schema: any,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(schemaName, collapsibleState);
        
        this.tooltip = schema.description || `Schema: ${schemaName}`;
        this.description = schema.description;
        this.iconPath = new vscode.ThemeIcon('symbol-structure');
        this.contextValue = 'schema';

        // Command to generate mock data
        this.command = {
            command: 'openapi-explorer.generateMockDataForSchema',
            title: 'Generate Mock Data',
            arguments: [schemaName, schema]
        };
    }
}

class PropertyItem extends vscode.TreeItem {
    constructor(
        public readonly propertyName: string,
        public readonly property: any,
        public readonly isRequired: boolean
    ) {
        super(propertyName, vscode.TreeItemCollapsibleState.None);
        
        const type = property.type || 'unknown';
        this.description = `${type}${isRequired ? ' (required)' : ''}`;
        this.tooltip = property.description || `Property: ${propertyName} (${type})`;
        this.iconPath = this.getTypeIcon(type);
        
        if (isRequired) {
            this.iconPath = new vscode.ThemeIcon('star-full', new vscode.ThemeColor('charts.red'));
        }
    }

    private getTypeIcon(type: string): vscode.ThemeIcon {
        switch (type) {
            case 'string': return new vscode.ThemeIcon('symbol-string');
            case 'number':
            case 'integer': return new vscode.ThemeIcon('symbol-number');
            case 'boolean': return new vscode.ThemeIcon('symbol-boolean');
            case 'array': return new vscode.ThemeIcon('symbol-array');
            case 'object': return new vscode.ThemeIcon('symbol-object');
            default: return new vscode.ThemeIcon('symbol-property');
        }
    }
}