import React from 'react';
import { GitCompare, PlusCircle, X } from 'lucide-react';

interface ComparisonTabProps {
  selectedSchemas: Set<string>;
  schemas: Record<string, any>;
  onRemoveSchema: (schemaName: string) => void;
  onAddSchema: () => void;
}

export const ComparisonTab: React.FC<ComparisonTabProps> = ({
  selectedSchemas,
  schemas,
  onRemoveSchema,
  onAddSchema
}) => {
  const selectedSchemaArray = Array.from(selectedSchemas);

  return (
    <div className="h-full p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GitCompare className="h-6 w-6 text-blue-600" />
            Schema Comparison
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Comparing {selectedSchemaArray.length} schemas
          </p>
        </div>

        {selectedSchemaArray.length < 2 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
            <GitCompare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              Select Schemas to Compare
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mt-2 mb-4">
              You need to select at least two schemas to see a comparison.
            </p>
            <button
              onClick={onAddSchema}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <PlusCircle className="h-4 w-4" />
              Add Schemas from Explorer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedSchemaArray.map(schemaName => {
              const schema = schemas[schemaName];
              if (!schema) return null;
              
              return (
                <div key={schemaName} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h4 className="font-bold text-gray-900 dark:text-white">{schema.title || schemaName}</h4>
                    <button
                      onClick={() => onRemoveSchema(schemaName)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-4 space-y-3 text-sm flex-1">
                    <p className="text-gray-600 dark:text-gray-400 h-16 overflow-hidden">
                      {schema.description || 'No description.'}
                    </p>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">Properties:</span>
                      <span className="ml-2">{Object.keys(schema.properties || {}).length}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">Required:</span>
                      <span className="ml-2">{schema.required?.length || 0}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
