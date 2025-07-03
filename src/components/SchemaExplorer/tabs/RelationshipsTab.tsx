import React from 'react';
import { Network } from 'lucide-react';
import { DependencyTreeVisualization } from '../../DependencyTreeVisualization';

interface RelationshipsTabProps {
  schemas: Record<string, any>;
  dependencyMap: Map<string, string[]>;
}

export const RelationshipsTab: React.FC<RelationshipsTabProps> = ({
  schemas,
  dependencyMap,
}) => (
  <div className="h-full p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Network className="h-5 w-5 text-blue-600" />
          Schema Relationship Graph
        </h3>
        <div className="h-[80vh] md:h-[600px] w-full bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
          <DependencyTreeVisualization schemas={schemas} dependencyMap={dependencyMap} />
        </div>
      </div>
    </div>
  </div>
);
