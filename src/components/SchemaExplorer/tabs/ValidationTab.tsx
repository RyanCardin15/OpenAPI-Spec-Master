import React from 'react';
import { FileCheck, AlertTriangle, Info, CheckCircle, Lightbulb } from 'lucide-react';
import { ValidationIssue } from '../types';

interface ValidationTabProps {
  validationResults: {
    summary: {
      total: number;
      errors: number;
      warnings: number;
      info: number;
      schemasWithIssues: number;
      totalSchemas: number;
    };
    issues: ValidationIssue[];
  };
  onSelectSchema: (schemaName: string) => void;
}

export const ValidationTab: React.FC<ValidationTabProps> = ({
  validationResults,
  onSelectSchema
}) => {
  const { summary, issues } = validationResults;
  
  const getSeverityIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error': return <FileCheck className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="h-full p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-blue-600" />
            Validation Center
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.errors}</p>
              <p className="text-sm text-red-700 dark:text-red-300">Errors</p>
            </div>
            <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summary.warnings}</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">Warnings</p>
            </div>
            <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.info}</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">Info</p>
            </div>
            <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.totalSchemas - summary.schemasWithIssues}</p>
              <p className="text-sm text-green-700 dark:text-green-300">Clean Schemas</p>
            </div>
          </div>
        </div>

        {issues.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-white">All Issues ({summary.total})</h4>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {issues.map((issue, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getSeverityIcon(issue.severity)}</div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{issue.message}</p>
                      <button
                        onClick={() => onSelectSchema(issue.path.split('.')[0])}
                        className="text-sm text-blue-600 hover:underline cursor-pointer font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded"
                      >
                        {issue.path}
                      </button>
                      {issue.suggestion && (
                        <div className="mt-2 flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
                          <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <p className="text-yellow-800 dark:text-yellow-200">{issue.suggestion}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              No validation issues found!
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Your OpenAPI specification is looking clean.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
