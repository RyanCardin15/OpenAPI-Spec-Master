import * as vscode from 'vscode';

export class DiagnosticsProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('openapi-explorer');
    }

    updateDiagnostics(validationResults: any[]): void {
        this.diagnosticCollection.clear();

        const diagnostics: vscode.Diagnostic[] = [];

        validationResults.forEach(result => {
            if (result.type === 'error' || result.type === 'warning') {
                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(0, 0, 0, 0), // Would need proper line/column info
                    result.message,
                    result.type === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
                );

                diagnostic.source = 'OpenAPI Explorer';
                diagnostic.code = result.category;
                
                diagnostics.push(diagnostic);
            }
        });

        // Apply diagnostics to active document if it's an OpenAPI spec
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && this.isOpenAPIFile(activeEditor.document)) {
            this.diagnosticCollection.set(activeEditor.document.uri, diagnostics);
        }
    }

    private isOpenAPIFile(document: vscode.TextDocument): boolean {
        const fileName = document.fileName.toLowerCase();
        return fileName.includes('openapi') || 
               fileName.includes('swagger') ||
               (document.languageId === 'json' && this.looksLikeOpenAPI(document.getText())) ||
               (document.languageId === 'yaml' && this.looksLikeOpenAPI(document.getText()));
    }

    private looksLikeOpenAPI(content: string): boolean {
        return content.includes('"openapi"') || 
               content.includes('openapi:') ||
               content.includes('"swagger"') ||
               content.includes('swagger:');
    }

    dispose(): void {
        this.diagnosticCollection.dispose();
    }
}