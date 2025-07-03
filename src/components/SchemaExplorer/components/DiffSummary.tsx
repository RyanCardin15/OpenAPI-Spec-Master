import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { DiffSummary } from '../utils/schema-diff';

interface DiffSummaryProps {
  summary: DiffSummary;
}

const DiffSummary: React.FC<DiffSummaryProps> = ({ summary }) => {
  return (
    <div className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                <h4 className="text-2xl font-bold text-blue-800 dark:text-blue-300">{summary.total}</h4>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Changes</p>
            </div>
             <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/50">
                <h4 className="text-2xl font-bold text-green-800 dark:text-green-300">{summary.added}</h4>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Added</p>
            </div>
             <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/50">
                <h4 className="text-2xl font-bold text-red-800 dark:text-red-300">{summary.deleted}</h4>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Deleted</p>
            </div>
             <div className="p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/50">
                <h4 className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">{summary.modified}</h4>
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Modified</p>
            </div>
        </div>
        {summary.breaking > 0 && (
             <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                    <span className="font-bold">{summary.breaking}</span> breaking changes identified.
                </p>
             </div>
        )}
    </div>
  );
};

export default DiffSummary; 