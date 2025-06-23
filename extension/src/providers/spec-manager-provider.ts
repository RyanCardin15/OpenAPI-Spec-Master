import * as vscode from 'vscode';
import * as path from 'path';

export interface SpecFolder {
    id: string;
    name: string;
    specs: SpecItem[];
}

export type SpecStatus = 'unloaded' | 'loading' | 'loaded' | 'error';

export interface SpecItem {
    id: string;
    name: string;
    source: 'file' | 'url';
    path?: string;
    url?: string;
    spec?: any;
    lastModified: string;
    status: SpecStatus;
    error?: string;
    loadingProgress?: number;
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
            // Show specs in the folder plus "Add Spec" option
            const items: SpecTreeItem[] = [];
            
            // Add "Add Spec" option
            items.push(new AddSpecItem(element.folder.id));
            
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

    async addSpec(folderId: string): Promise<void> {
        const option = await vscode.window.showQuickPick([
            {
                label: '📁 Add from File',
                description: 'Select a local OpenAPI specification file',
                value: 'file'
            },
            {
                label: '🌐 Add from URL',
                description: 'Enter a URL to an OpenAPI specification',
                value: 'url'
            }
        ], {
            placeHolder: 'Choose how to add the OpenAPI specification'
        });

        if (!option) return;

        if (option.value === 'file') {
            await this.addSpecFromFile(folderId);
        } else if (option.value === 'url') {
            await this.addSpecFromUrl(folderId);
        }
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

        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) return;

        // Create spec item first, then try to load it
        const specItem: SpecItem = {
            id: Date.now().toString(),
            name: specName,
            source: 'file',
            path: file.fsPath,
            lastModified: new Date().toISOString(),
            status: 'unloaded'
        };

        // Add to folder immediately
        folder.specs.push(specItem);
        await this.saveFolders();
        this.refresh();
        vscode.window.showInformationMessage(`Added "${specName}" to "${folder.name}"`);

        // Try to load the spec in the background after a brief delay to show the status transition
        setTimeout(() => {
            this.loadSpecInBackground(folder.id, specItem.id);
        }, 100);
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

        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) return;

        // Create spec item first, then try to load it
        const specItem: SpecItem = {
            id: Date.now().toString(),
            name: specName,
            source: 'url',
            url: url,
            lastModified: new Date().toISOString(),
            status: 'unloaded'
        };

        // Add to folder immediately
        folder.specs.push(specItem);
        await this.saveFolders();
        this.refresh();
        vscode.window.showInformationMessage(`Added "${specName}" to "${folder.name}"`);

        // Try to load the spec in the background after a brief delay to show the status transition
        setTimeout(() => {
            this.loadSpecInBackground(folder.id, specItem.id);
        }, 100);
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
            const oldName = spec.name;
            spec.name = newName;
            await this.saveFolders();
            this.refresh();
            vscode.window.showInformationMessage(`Renamed "${oldName}" to "${newName}"`);
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

        // If spec already has content, ensure status is set correctly and return it
        if (spec.spec) {
            if (spec.status !== 'loaded') {
                spec.status = 'loaded';
                await this.saveFolders();
                this.refresh();
            }
            return spec;
        }

        // If spec is already loading, wait for it
        if (spec.status === 'loading') {
            // Wait for loading to complete (max 30 seconds)
            const maxWaitTime = 30000;
            const checkInterval = 100;
            let waitTime = 0;
            
            while (spec.status === 'loading' && waitTime < maxWaitTime) {
                await new Promise(resolve => setTimeout(resolve, checkInterval));
                waitTime += checkInterval;
            }
            
            return spec.spec ? spec : null;
        }

        return this.loadSpecInBackground(folderId, specId, true);
    }

    private async loadSpecInBackground(folderId: string, specId: string, showProgress: boolean = false): Promise<SpecItem | null> {
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) return null;

        const spec = folder.specs.find(s => s.id === specId);
        if (!spec) return null;

        // Set loading status
        spec.status = 'loading';
        spec.loadingProgress = 0;
        await this.saveFolders();
        this.refresh();

        // Set up periodic refresh during loading
        const refreshInterval = setInterval(() => {
            if (spec.status === 'loading') {
                this.refresh();
            } else {
                clearInterval(refreshInterval);
            }
        }, 500); // Refresh every 500ms while loading

        try {
            if (showProgress) {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `Loading spec "${spec.name}"...`,
                    cancellable: false
                }, async (progress) => {
                    return this.performSpecLoading(spec, progress);
                });
            } else {
                await this.performSpecLoading(spec);
            }

            // Update status and save
            spec.status = 'loaded';
            spec.loadingProgress = 100;
            spec.lastModified = new Date().toISOString();
            spec.error = undefined;
            
            await this.saveFolders();
            this.refresh();
            
            if (showProgress) {
                vscode.window.showInformationMessage(`Successfully loaded "${spec.name}"`);
            }
            
            return spec;

        } catch (error) {
            // Update status with error
            spec.status = 'error';
            spec.error = error instanceof Error ? error.message : 'Unknown error';
            spec.loadingProgress = undefined;
            
            await this.saveFolders();
            this.refresh();
            
            if (showProgress) {
                vscode.window.showErrorMessage(`Failed to load spec "${spec.name}": ${spec.error}`);
            }
            
            return null;
        } finally {
            // Always clear the interval to prevent memory leaks
            clearInterval(refreshInterval);
        }
    }

    private async performSpecLoading(spec: SpecItem, progress?: vscode.Progress<{ message?: string; increment?: number }>): Promise<void> {
        let content: string;
        
        progress?.report({ message: 'Fetching content...', increment: 10 });
        
        if (spec.source === 'file' && spec.path) {
            // Load from file
            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(spec.path));
            content = document.getText();
            progress?.report({ increment: 40 });
        } else if (spec.source === 'url' && spec.url) {
            // Load from URL with extended timeout for large specs
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
                    let receivedLength = 0;
                    const contentLength = parseInt(response.headers['content-length'] || '0');
                    
                    response.on('data', (chunk: any) => {
                        data += chunk;
                        receivedLength += chunk.length;
                        
                        if (contentLength > 0 && progress) {
                            const downloadProgress = Math.min((receivedLength / contentLength) * 30, 30);
                            progress.report({ increment: downloadProgress });
                        }
                    });
                    response.on('end', () => resolve(data));
                });
                
                request.on('error', reject);
                // Extended timeout for large specs - 60 seconds
                request.setTimeout(60000, () => {
                    request.destroy();
                    reject(new Error('Request timeout (60s) - spec file may be too large'));
                });
            });
            progress?.report({ increment: 40 });
        } else {
            throw new Error('No valid source path or URL found');
        }
        
        progress?.report({ message: 'Parsing specification...', increment: 10 });
        
        // Parse the spec with timeout protection for large files
        const { OpenAPIParser } = await import('../openapi-parser');
        const parser = new OpenAPIParser();
        
        // Use a promise with timeout for parsing large specs
        const parsePromise = parser.parseFromText(content);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Parsing timeout (30s) - spec file may be too large or complex')), 30000);
        });
        
        const parsedSpec = await Promise.race([parsePromise, timeoutPromise]);
        progress?.report({ increment: 40 });
        
        // Update the spec with the loaded content
        spec.spec = parsedSpec;
    }

    async retryLoadSpec(folderId: string, specId: string): Promise<void> {
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) return;

        const spec = folder.specs.find(s => s.id === specId);
        if (!spec) return;

        // Reset spec to unloaded state
        spec.status = 'unloaded';
        spec.error = undefined;
        spec.loadingProgress = undefined;
        spec.spec = undefined;
        
        this.refresh();

        // Try loading again in background
        this.loadSpecInBackground(folderId, specId, true);
    }

    private async loadFolders(): Promise<void> {
        const stored = this.context.globalState.get<SpecFolder[]>('openapi-spec-folders', []);
        
        // Migrate existing specs to include status fields
        this.folders = stored.map(folder => ({
            ...folder,
            specs: folder.specs.map(spec => ({
                ...spec,
                status: (spec.status as SpecStatus) || (spec.spec ? 'loaded' : 'unloaded'),
                error: spec.error,
                loadingProgress: spec.loadingProgress
            }))
        }));
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
                status: 'unloaded' as SpecStatus,
                error: undefined,
                loadingProgress: undefined,
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
        super(folder.name, vscode.TreeItemCollapsibleState.Collapsed);
        this.iconPath = new vscode.ThemeIcon('folder');
        this.description = `${folder.specs.length} spec${folder.specs.length !== 1 ? 's' : ''}`;
        this.contextValue = 'folder';
    }
}

export class AddSpecItem extends SpecTreeItem {
    constructor(public readonly folderId: string) {
        super('➕ Add Spec', vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('add');
        this.command = {
            command: 'openapi-explorer.addSpec',
            title: 'Add Spec',
            arguments: [folderId]
        };
        this.contextValue = 'addSpec';
    }
}

export class SpecItemTreeItem extends SpecTreeItem {
    constructor(
        public readonly spec: SpecItem,
        public readonly folderId: string
    ) {
        super(spec.name, vscode.TreeItemCollapsibleState.None);
        
        // Status indicators based on spec status
        const sourceIcon = spec.source === 'url' ? '🌐' : '📁';
        let statusIcon = '';
        let statusText = '';
        
        switch (spec.status) {
            case 'loaded':
                statusIcon = '✅';
                statusText = 'Loaded';
                break;
            case 'loading':
                statusIcon = '⏳';
                statusText = spec.loadingProgress ? `Loading... ${spec.loadingProgress}%` : 'Loading...';
                break;
            case 'error':
                statusIcon = '❌';
                statusText = `Error: ${spec.error || 'Unknown error'}`;
                break;
            case 'unloaded':
            default:
                statusIcon = '⭕';
                statusText = 'Not loaded';
                break;
        }
        
        this.description = `${sourceIcon} ${statusIcon} ${statusText}`;
        
        this.tooltip = `${spec.name}\nSource: ${spec.source === 'url' ? spec.url : spec.path}\nStatus: ${statusText}\nLast modified: ${new Date(spec.lastModified).toLocaleString()}`;
        
        // Different icons based on status
        let iconName = 'file-code';
        switch (spec.status) {
            case 'loaded':
                iconName = 'file-code';
                break;
            case 'loading':
                iconName = 'loading~spin';
                break;
            case 'error':
                iconName = 'error';
                break;
            case 'unloaded':
            default:
                iconName = 'file-add';
                break;
        }
        
        this.iconPath = new vscode.ThemeIcon(iconName);
        this.command = {
            command: 'openapi-explorer.openSpec',
            title: 'Open Spec',
            arguments: [folderId, spec.id]
        };
        // Set context value based on status for different menu options
        switch (spec.status) {
            case 'error':
                this.contextValue = 'spec-error';
                break;
            case 'unloaded':
                this.contextValue = 'spec-unloaded';
                break;
            case 'loading':
                this.contextValue = 'spec-loading';
                break;
            case 'loaded':
                this.contextValue = 'spec-loaded';
                break;
            default:
                this.contextValue = 'spec';
                break;
        }
    }
} 