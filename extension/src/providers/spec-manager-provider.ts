import * as vscode from 'vscode';
import * as path from 'path';

export interface SpecFolder {
    id: string;
    name: string;
    specs: SpecItem[];
}

export interface SpecItem {
    id: string;
    name: string;
    source: 'file' | 'url';
    path?: string;
    url?: string;
    spec?: any;
    lastModified: string;
}

export class SpecManagerProvider implements vscode.TreeDataProvider<SpecTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SpecTreeItem | undefined | null | void> = new vscode.EventEmitter<SpecTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SpecTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private folders: SpecFolder[] = [];
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadFolders();
    }

    refresh(): void {
        this.loadFolders();
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SpecTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SpecTreeItem): Thenable<SpecTreeItem[]> {
        if (!element) {
            // Root level - show folders and "Add Folder" option
            const items: SpecTreeItem[] = [];
            
            // Add "Create Folder" button
            items.push(new CreateFolderItem());
            
            // Add existing folders
            this.folders.forEach(folder => {
                items.push(new FolderTreeItem(folder));
            });

            return Promise.resolve(items);
        }

        if (element instanceof FolderTreeItem) {
            // Show specs in the folder plus "Add Spec" options
            const items: SpecTreeItem[] = [];
            
            // Add "Add Spec" options
            items.push(new AddSpecFromFileItem(element.folder.id));
            items.push(new AddSpecFromUrlItem(element.folder.id));
            
            // Add existing specs
            element.folder.specs.forEach(spec => {
                items.push(new SpecItemTreeItem(spec, element.folder.id));
            });

            return Promise.resolve(items);
        }

        return Promise.resolve([]);
    }

    async createFolder(name?: string): Promise<void> {
        const folderName = name || await vscode.window.showInputBox({
            prompt: 'Enter folder name',
            placeHolder: 'e.g., My API Project'
        });

        if (!folderName) return;

        const folder: SpecFolder = {
            id: Date.now().toString(),
            name: folderName,
            specs: []
        };

        this.folders.push(folder);
        await this.saveFolders();
        this.refresh();
    }

    async addSpecFromFile(folderId: string): Promise<void> {
        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'OpenAPI/Swagger': ['json', 'yaml', 'yml']
            },
            title: 'Select OpenAPI Specification'
        });

        if (!files || files.length === 0) return;

        const file = files[0];
        const fileName = path.basename(file.fsPath);
        
        const specName = await vscode.window.showInputBox({
            prompt: 'Enter spec name',
            value: fileName.replace(/\.(json|yaml|yml)$/, ''),
            placeHolder: 'e.g., User API v1.0'
        });

        if (!specName) return;

        try {
            const document = await vscode.workspace.openTextDocument(file);
            const content = document.getText();
            
            // Parse the spec to validate it
            const { OpenAPIParser } = await import('../openapi-parser');
            const parser = new OpenAPIParser();
            const spec = await parser.parseFromText(content);

            const specItem: SpecItem = {
                id: Date.now().toString(),
                name: specName,
                source: 'file',
                path: file.fsPath,
                spec: spec,
                lastModified: new Date().toISOString()
            };

            const folder = this.folders.find(f => f.id === folderId);
            if (folder) {
                folder.specs.push(specItem);
                await this.saveFolders();
                this.refresh();
                vscode.window.showInformationMessage(`Added "${specName}" to "${folder.name}"`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load spec: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async addSpecFromUrl(folderId: string): Promise<void> {
        const url = await vscode.window.showInputBox({
            prompt: 'Enter OpenAPI specification URL',
            placeHolder: 'https://api.example.com/openapi.json'
        });

        if (!url) return;

        const specName = await vscode.window.showInputBox({
            prompt: 'Enter spec name',
            placeHolder: 'e.g., Remote API v1.0'
        });

        if (!specName) return;

        try {
            // Fetch the spec from URL using VS Code's built-in method
            const https = require('https');
            const http = require('http');
            
            const content = await new Promise<string>((resolve, reject) => {
                const client = url.startsWith('https:') ? https : http;
                const request = client.get(url, (response: any) => {
                    if (response.statusCode !== 200) {
                        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                        return;
                    }
                    
                    let data = '';
                    response.on('data', (chunk: any) => data += chunk);
                    response.on('end', () => resolve(data));
                });
                
                request.on('error', reject);
                request.setTimeout(10000, () => {
                    request.destroy();
                    reject(new Error('Request timeout'));
                });
            });
            
            // Parse the spec to validate it
            const { OpenAPIParser } = await import('../openapi-parser');
            const parser = new OpenAPIParser();
            const spec = await parser.parseFromText(content);

            const specItem: SpecItem = {
                id: Date.now().toString(),
                name: specName,
                source: 'url',
                url: url,
                spec: spec,
                lastModified: new Date().toISOString()
            };

            const folder = this.folders.find(f => f.id === folderId);
            if (folder) {
                folder.specs.push(specItem);
                await this.saveFolders();
                this.refresh();
                vscode.window.showInformationMessage(`Added "${specName}" to "${folder.name}"`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load spec from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async deleteSpec(folderId: string, specId: string): Promise<void> {
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) return;

        const spec = folder.specs.find(s => s.id === specId);
        if (!spec) return;

        const confirmed = await vscode.window.showWarningMessage(
            `Delete "${spec.name}"?`,
            { modal: true },
            'Delete'
        );

        if (confirmed === 'Delete') {
            folder.specs = folder.specs.filter(s => s.id !== specId);
            await this.saveFolders();
            this.refresh();
            vscode.window.showInformationMessage(`Deleted "${spec.name}"`);
        }
    }

    async renameSpec(folderId: string, specId: string): Promise<void> {
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) return;

        const spec = folder.specs.find(s => s.id === specId);
        if (!spec) return;

        const newName = await vscode.window.showInputBox({
            prompt: 'Enter new name',
            value: spec.name
        });

        if (newName && newName !== spec.name) {
            spec.name = newName;
            await this.saveFolders();
            this.refresh();
        }
    }

    getSpec(folderId: string, specId: string): SpecItem | undefined {
        const folder = this.folders.find(f => f.id === folderId);
        return folder?.specs.find(s => s.id === specId);
    }

    async deleteFolder(folderId: string): Promise<void> {
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) return;

        const confirmed = await vscode.window.showWarningMessage(
            `Delete folder "${folder.name}" and all its specs (${folder.specs.length})?`,
            { modal: true },
            'Delete'
        );

        if (confirmed === 'Delete') {
            this.folders = this.folders.filter(f => f.id !== folderId);
            await this.saveFolders();
            this.refresh();
            vscode.window.showInformationMessage(`Deleted folder "${folder.name}"`);
        }
    }

    async renameFolder(folderId: string): Promise<void> {
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) return;

        const newName = await vscode.window.showInputBox({
            prompt: 'Enter new folder name',
            value: folder.name,
            placeHolder: 'e.g., My API Project'
        });

        if (newName && newName !== folder.name) {
            folder.name = newName;
            await this.saveFolders();
            this.refresh();
            vscode.window.showInformationMessage(`Renamed folder to "${newName}"`);
        }
    }

    async loadSpecContent(folderId: string, specId: string): Promise<SpecItem | null> {
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) return null;

        const spec = folder.specs.find(s => s.id === specId);
        if (!spec) return null;

        // If spec already has content, return it
        if (spec.spec) {
            return spec;
        }

        try {
            vscode.window.showInformationMessage(`Loading spec "${spec.name}"...`);
            
            let content: string;
            
            if (spec.source === 'file' && spec.path) {
                // Load from file
                const document = await vscode.workspace.openTextDocument(vscode.Uri.file(spec.path));
                content = document.getText();
            } else if (spec.source === 'url' && spec.url) {
                // Load from URL
                const https = require('https');
                const http = require('http');
                
                content = await new Promise<string>((resolve, reject) => {
                    const client = spec.url!.startsWith('https:') ? https : http;
                    const request = client.get(spec.url, (response: any) => {
                        if (response.statusCode !== 200) {
                            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                            return;
                        }
                        
                        let data = '';
                        response.on('data', (chunk: any) => data += chunk);
                        response.on('end', () => resolve(data));
                    });
                    
                    request.on('error', reject);
                    request.setTimeout(10000, () => {
                        request.destroy();
                        reject(new Error('Request timeout'));
                    });
                });
            } else {
                throw new Error('No valid source path or URL found');
            }
            
            // Parse the spec
            const { OpenAPIParser } = await import('../openapi-parser');
            const parser = new OpenAPIParser();
            const parsedSpec = await parser.parseFromText(content);
            
            // Update the spec with the loaded content
            spec.spec = parsedSpec;
            spec.lastModified = new Date().toISOString();
            
            // Save the updated folder structure
            await this.saveFolders();
            this.refresh();
            
            vscode.window.showInformationMessage(`Successfully loaded "${spec.name}"`);
            return spec;

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load spec "${spec.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
        }
    }

    private async loadFolders(): Promise<void> {
        const stored = this.context.globalState.get<SpecFolder[]>('openapi-spec-folders', []);
        this.folders = stored;
    }

    private async saveFolders(): Promise<void> {
        await this.context.globalState.update('openapi-spec-folders', this.folders);
    }

    // Export/Import functionality
    async exportConfig(): Promise<void> {
        try {
            // Export only the configuration metadata, not the actual spec content
            const configFolders = this.folders.map(folder => ({
                id: folder.id,
                name: folder.name,
                specs: folder.specs.map(spec => ({
                    id: spec.id,
                    name: spec.name,
                    source: spec.source,
                    path: spec.path,
                    url: spec.url,
                    lastModified: spec.lastModified
                    // Explicitly exclude the 'spec' property to keep export lightweight
                }))
            }));

            const exportData = {
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                description: 'OpenAPI Spec Manager Configuration - Team Sharing Format',
                folders: configFolders
            };

            const defaultFileName = `openapi-team-config-${new Date().toISOString().split('T')[0]}.json`;
            
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(defaultFileName),
                filters: {
                    'JSON': ['json']
                },
                title: 'Export Spec Manager Configuration'
            });

            if (saveUri) {
                const content = JSON.stringify(exportData, null, 2);
                await vscode.workspace.fs.writeFile(saveUri, Buffer.from(content, 'utf8'));
                
                vscode.window.showInformationMessage(
                    `Configuration exported successfully to ${saveUri.fsPath}`,
                    'Open File'
                ).then(action => {
                    if (action === 'Open File') {
                        vscode.window.showTextDocument(saveUri);
                    }
                });
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async importConfig(): Promise<void> {
        try {
            const openUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'JSON': ['json']
                },
                title: 'Import Spec Manager Configuration'
            });

            if (!openUri || openUri.length === 0) return;

            const content = await vscode.workspace.fs.readFile(openUri[0]);
            const importData = JSON.parse(content.toString());

            // Validate import data structure
            if (!importData.folders || !Array.isArray(importData.folders)) {
                throw new Error('Invalid configuration file format');
            }

            const importOptions = await vscode.window.showQuickPick(
                [
                    { label: 'Replace All', description: 'Replace all existing folders and specs', value: 'replace' },
                    { label: 'Merge', description: 'Add imported folders alongside existing ones', value: 'merge' },
                    { label: 'Select Items', description: 'Choose specific folders/specs to import', value: 'select' }
                ],
                { placeHolder: 'How would you like to import the configuration?' }
            );

            if (!importOptions) return;

                         if (importOptions.value === 'select') {
                await this.selectiveImport(importData.folders);
            } else if (importOptions.value === 'replace') {
                this.folders = await this.processImportedFolders(importData.folders);
                await this.saveFolders();
                this.refresh();
                vscode.window.showInformationMessage('Configuration imported successfully (replaced all existing data). Specs will be loaded from their sources.');
            } else if (importOptions.value === 'merge') {
                // Merge folders with unique IDs
                const existingIds = new Set(this.folders.map(f => f.id));
                const foldersToAdd = importData.folders.filter((f: SpecFolder) => !existingIds.has(f.id));
                
                // For folders with duplicate IDs, generate new IDs
                const duplicateFolders = importData.folders.filter((f: SpecFolder) => existingIds.has(f.id));
                duplicateFolders.forEach((f: SpecFolder) => {
                    f.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                });

                const allFoldersToAdd = [...foldersToAdd, ...duplicateFolders];
                const processedFolders = await this.processImportedFolders(allFoldersToAdd);
                this.folders.push(...processedFolders);
                await this.saveFolders();
                this.refresh();
                vscode.window.showInformationMessage('Configuration imported successfully (merged with existing data). Specs will be loaded from their sources.');
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async processImportedFolders(folders: SpecFolder[]): Promise<SpecFolder[]> {
        // Process imported folders - they only contain configuration metadata, not the actual specs
        // We need to create the folder structure but mark specs as needing to be loaded
        return folders.map(folder => ({
            ...folder,
            specs: folder.specs.map(spec => ({
                ...spec,
                // Clear the spec content since it's not in the exported config
                spec: undefined,
                lastModified: new Date().toISOString() // Update timestamp to indicate it needs reloading
            }))
        }));
    }

    private async selectiveImport(importFolders: SpecFolder[]): Promise<void> {
        const folderItems = importFolders.map(folder => ({
            label: folder.name,
            description: `${folder.specs.length} spec${folder.specs.length !== 1 ? 's' : ''}`,
            folder,
            picked: true
        }));

        const selectedFolders = await vscode.window.showQuickPick(folderItems, {
            canPickMany: true,
            placeHolder: 'Select folders to import'
        });

        if (!selectedFolders || selectedFolders.length === 0) return;

        // For each selected folder, allow selection of individual specs
        const foldersToImport: SpecFolder[] = [];

        for (const folderItem of selectedFolders) {
            if (folderItem.folder.specs.length === 0) {
                foldersToImport.push(folderItem.folder);
                continue;
            }

            const specItems = folderItem.folder.specs.map(spec => ({
                label: spec.name,
                description: `${spec.source === 'url' ? '🌐 ' + spec.url : '📁 ' + spec.path}`,
                spec,
                picked: true
            }));

            const selectedSpecs = await vscode.window.showQuickPick(specItems, {
                canPickMany: true,
                placeHolder: `Select specs to import from "${folderItem.folder.name}"`
            });

            if (selectedSpecs && selectedSpecs.length > 0) {
                const newFolder: SpecFolder = {
                    ...folderItem.folder,
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    specs: selectedSpecs.map(s => s.spec)
                };
                foldersToImport.push(newFolder);
            }
        }

        if (foldersToImport.length > 0) {
            const processedFolders = await this.processImportedFolders(foldersToImport);
            this.folders.push(...processedFolders);
            await this.saveFolders();
            this.refresh();
            vscode.window.showInformationMessage(`Imported ${foldersToImport.length} folder${foldersToImport.length !== 1 ? 's' : ''} successfully. Specs will be loaded from their sources.`);
        }
    }

    async exportSelectedItems(folderId?: string, specId?: string): Promise<void> {
        try {
            let exportData: any;
            let defaultFileName: string;

            if (specId && folderId) {
                // Export single spec configuration
                const spec = this.getSpec(folderId, specId);
                if (!spec) {
                    vscode.window.showErrorMessage('Spec not found');
                    return;
                }

                const configSpec = {
                    id: spec.id,
                    name: spec.name,
                    source: spec.source,
                    path: spec.path,
                    url: spec.url,
                    lastModified: spec.lastModified
                };

                exportData = {
                    version: '1.0.0',
                    exportDate: new Date().toISOString(),
                    exportType: 'spec',
                    description: 'OpenAPI Spec Configuration - Team Sharing Format',
                    folders: [{
                        id: 'exported',
                        name: 'Exported Spec',
                        specs: [configSpec]
                    }]
                };
                defaultFileName = `${spec.name.replace(/[^a-zA-Z0-9]/g, '-')}-spec-config.json`;
            } else if (folderId) {
                // Export single folder configuration
                const folder = this.folders.find(f => f.id === folderId);
                if (!folder) {
                    vscode.window.showErrorMessage('Folder not found');
                    return;
                }

                const configFolder = {
                    id: folder.id,
                    name: folder.name,
                    specs: folder.specs.map(spec => ({
                        id: spec.id,
                        name: spec.name,
                        source: spec.source,
                        path: spec.path,
                        url: spec.url,
                        lastModified: spec.lastModified
                    }))
                };

                exportData = {
                    version: '1.0.0',
                    exportDate: new Date().toISOString(),
                    exportType: 'folder',
                    description: 'OpenAPI Spec Configuration - Team Sharing Format',
                    folders: [configFolder]
                };
                defaultFileName = `${folder.name.replace(/[^a-zA-Z0-9]/g, '-')}-folder-config.json`;
            } else {
                vscode.window.showErrorMessage('No item selected for export');
                return;
            }

            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(defaultFileName),
                filters: {
                    'JSON': ['json']
                },
                title: 'Export Selected Items'
            });

            if (saveUri) {
                const content = JSON.stringify(exportData, null, 2);
                await vscode.workspace.fs.writeFile(saveUri, Buffer.from(content, 'utf8'));
                
                vscode.window.showInformationMessage(
                    `Items exported successfully to ${saveUri.fsPath}`,
                    'Open File'
                ).then(action => {
                    if (action === 'Open File') {
                        vscode.window.showTextDocument(saveUri);
                    }
                });
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

// Tree item classes
export abstract class SpecTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
    }
}

export class CreateFolderItem extends SpecTreeItem {
    constructor() {
        super('➕ Create Folder', vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('folder-opened');
        this.command = {
            command: 'openapi-explorer.createFolder',
            title: 'Create Folder'
        };
        this.contextValue = 'createFolder';
    }
}

export class FolderTreeItem extends SpecTreeItem {
    constructor(public readonly folder: SpecFolder) {
        super(folder.name, vscode.TreeItemCollapsibleState.Expanded);
        this.iconPath = new vscode.ThemeIcon('folder');
        this.description = `${folder.specs.length} spec${folder.specs.length !== 1 ? 's' : ''}`;
        this.contextValue = 'folder';
    }
}

export class AddSpecFromFileItem extends SpecTreeItem {
    constructor(public readonly folderId: string) {
        super('📁 Add from File', vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('file-add');
        this.command = {
            command: 'openapi-explorer.addSpecFromFile',
            title: 'Add from File',
            arguments: [folderId]
        };
        this.contextValue = 'addSpecFromFile';
    }
}

export class AddSpecFromUrlItem extends SpecTreeItem {
    constructor(public readonly folderId: string) {
        super('🌐 Add from URL', vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('cloud-download');
        this.command = {
            command: 'openapi-explorer.addSpecFromUrl',
            title: 'Add from URL',
            arguments: [folderId]
        };
        this.contextValue = 'addSpecFromUrl';
    }
}

export class SpecItemTreeItem extends SpecTreeItem {
    constructor(
        public readonly spec: SpecItem,
        public readonly folderId: string
    ) {
        super(spec.name, vscode.TreeItemCollapsibleState.None);
        
        // Show different indicators based on whether spec content is loaded
        const isLoaded = !!spec.spec;
        const sourceIcon = spec.source === 'url' ? '🌐' : '📁';
        this.description = isLoaded ? sourceIcon : `${sourceIcon} (needs loading)`;
        
        this.tooltip = `${spec.name}\nSource: ${spec.source === 'url' ? spec.url : spec.path}\nLast modified: ${new Date(spec.lastModified).toLocaleString()}\nStatus: ${isLoaded ? 'Loaded' : 'Not loaded - click to load'}`;
        
        // Different icon for loaded vs not loaded specs
        this.iconPath = new vscode.ThemeIcon(isLoaded ? 'file-code' : 'file-add');
        this.command = {
            command: 'openapi-explorer.openSpec',
            title: 'Open Spec',
            arguments: [folderId, spec.id]
        };
        this.contextValue = 'spec';
    }
} 