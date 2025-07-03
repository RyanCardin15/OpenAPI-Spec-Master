import React from 'react';
import { AlertTriangle, Plus, Minus } from 'lucide-react';
import { SchemaChange } from '../utils/schema-diff';

interface DiffViewerProps {
  diffResults: SchemaChange[];
}

const DiffViewer: React.FC<DiffViewerProps> = ({ diffResults }) => {
  const getChangeColor = (type: SchemaChange['type']) => {
    switch (type) {
      case 'added':
        return 'bg-green-100 dark:bg-green-900/50 border-green-500';
      case 'deleted':
        return 'bg-red-100 dark:bg-red-900/50 border-red-500';
      case 'modified':
        return 'bg-yellow-100 dark:bg-yellow-900/50 border-yellow-500';
      default:
        return 'bg-gray-100 dark:bg-gray-700 border-gray-500';
    }
  };

  const getIcon = (type: SchemaChange['type']) => {
    switch (type) {
        case 'added':
            return <Plus className="h-4 w-4 text-green-600" />;
        case 'deleted':
            return <Minus className="h-4 w-4 text-red-600" />;
        case 'modified':
            return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {diffResults.map((change, index) => (
        <div key={index} className={`p-4 rounded-lg border-l-4 ${getChangeColor(change.type)}`}>
          <div className="flex items-center gap-3">
            {getIcon(change.type)}
            <span className="font-mono text-sm text-gray-800 dark:text-gray-200 break-all">
              {change.path.join('.')}
            </span>
            <span className="text-xs font-semibold uppercase px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full">
                {change.type}
            </span>
          </div>
          <div className="mt-3 pl-8">
            {change.type === 'deleted' || change.type === 'modified' ? (
              <div className="flex items-start gap-2 text-sm">
                <span className="text-red-600 font-bold">-</span>
                <pre className="bg-transparent p-0 m-0"><code>{JSON.stringify(change.lhs, null, 2)}</code></pre>
              </div>
            ) : null}
            {change.type === 'added' || change.type === 'modified' ? (
              <div className="flex items-start gap-2 text-sm">
                <span className="text-green-600 font-bold">+</span>
                <pre className="bg-transparent p-0 m-0"><code>{JSON.stringify(change.rhs, null, 2)}</code></pre>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DiffViewer; 