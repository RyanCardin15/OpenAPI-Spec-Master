import React, { useState } from 'react';
import { X, Copy, Download } from 'lucide-react';
import { generateTypeScript } from '../utils/generateTypeScript';
import { generatePython } from '../utils/generatePython';
import { generateJava } from '../utils/generateJava';
import { generateCSharp } from '../utils/generateCSharp';

interface SchemaExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  schemaName: string;
  schema: any;
}

export const SchemaExportModal: React.FC<SchemaExportModalProps> = ({ isOpen, onClose, schemaName, schema }) => {
  const [language, setLanguage] = useState('typescript');
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (language === 'typescript') {
      setGeneratedCode(generateTypeScript(schemaName, schema));
    } else if (language === 'python') {
      setGeneratedCode(generatePython(schemaName, schema));
    } else if (language === 'java') {
      setGeneratedCode(generateJava(schemaName, schema));
    } else if (language === 'csharp') {
      setGeneratedCode(generateCSharp(schemaName, schema));
    } else {
      setGeneratedCode(`// ${language} code generation not implemented yet`);
    }
  }, [language, schemaName, schema]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold">Export Schema</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-4"
          >
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="csharp">C#</option>
          </select>
          <div className="bg-gray-900 text-white p-4 rounded-lg font-mono text-sm overflow-x-auto">
            <pre>
              <code>{generatedCode}</code>
            </pre>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg">Download</button>
        </div>
      </div>
    </div>
  );
}; 