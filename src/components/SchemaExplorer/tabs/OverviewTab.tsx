import React from 'react';
import { Database, Type, GitBranch, AlertTriangle, TrendingUp } from 'lucide-react';
import { SchemaMetrics } from '../types';

interface OverviewTabProps {
  schemaNames: string[];
  searchProperties: any[];
  findSchemaDependencies: Map<string, string[]>;
  getValidationSummary: () => { total: number };
  schemaMetrics: Map<string, SchemaMetrics>;
  onSelectSchema: (schemaName: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  schemaNames,
  searchProperties,
  findSchemaDependencies,
  getValidationSummary,
  schemaMetrics,
  onSelectSchema,
}) => (
  <div className="h-full p-6 overflow-y-auto">
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{schemaNames.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Schemas</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Type className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{searchProperties.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Properties</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <GitBranch className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Array.from(findSchemaDependencies.values()).reduce((acc, deps) => acc + deps.length, 0)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Dependencies</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {getValidationSummary().total}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Issues Found</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Schemas by Complexity */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Most Complex Schemas
        </h3>
        <div className="space-y-3">
          {Array.from(schemaMetrics.entries())
            .sort(([,a], [,b]) => b.complexity - a.complexity)
            .slice(0, 5)
            .map(([name, metrics]) => (
              <div key={name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Type className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-900 dark:text-white">{name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>Complexity: {metrics.complexity}</span>
                  <span>Props: {metrics.propertyCount}</span>
                  <span>Deps: {metrics.dependencyCount}</span>
                  <button
                    onClick={() => onSelectSchema(name)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs"
                  >
                    Explore
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  </div>
);
