import React from 'react';
import { BookOpen, Download } from 'lucide-react';

interface DocsTabProps {
  selectedSchema: string | null;
  generateMarkdownDoc: (schemaName: string) => string;
}

export const DocsTab: React.FC<DocsTabProps> = ({
  selectedSchema,
  generateMarkdownDoc
}) => (
  <div className="h-full p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Documentation Generator
          </h3>
          {selectedSchema && (
            <button
              onClick={() => {
                const doc = generateMarkdownDoc(selectedSchema);
                const blob = new Blob([doc], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${selectedSchema}-docs.md`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Markdown
            </button>
          )}
        </div>

        {!selectedSchema ? (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">No schema selected</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Select a schema from the Explorer tab to generate its documentation.
            </p>
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <pre className="whitespace-pre-wrap font-sans">{generateMarkdownDoc(selectedSchema)}</pre>
          </div>
        )}
      </div>
    </div>
  </div>
);
