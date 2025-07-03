import React, { useState, useEffect } from 'react';
import { GitCompare, PlusCircle, X, Download } from 'lucide-react';
import { compareSchemas, SchemaChange, summarizeChanges, DiffSummary as DiffSummaryType, isBreakingChange } from '../utils/schema-diff';
import DiffViewer from '../components/DiffViewer';
import DiffSummary from '../components/DiffSummary';
import DiffFilter, { Filters } from '../components/DiffFilter';
import { generateMarkdownReport } from '../utils/report-generator';

interface ComparisonTabProps {
  schemas: Record<string, any>;
}

export const ComparisonTab: React.FC<ComparisonTabProps> = ({ schemas }) => {
  const [schemaA, setSchemaA] = useState<string | null>(null);
  const [schemaB, setSchemaB] = useState<string | null>(null);
  const [diffResults, setDiffResults] = useState<SchemaChange[]>([]);
  const [summary, setSummary] = useState<DiffSummaryType | null>(null);
  const [filters, setFilters] = useState<Filters>({
    added: true,
    deleted: true,
    modified: true,
    breaking: false,
  });
  const [filteredDiffResults, setFilteredDiffResults] = useState<SchemaChange[]>([]);

  useEffect(() => {
    if (schemaA && schemaB && schemas[schemaA] && schemas[schemaB]) {
      const results = compareSchemas(schemas[schemaA], schemas[schemaB]);
      setDiffResults(results);
      setSummary(summarizeChanges(results));
    } else {
      setDiffResults([]);
      setSummary(null);
    }
  }, [schemaA, schemaB, schemas]);

  useEffect(() => {
    let filtered = diffResults;

    if (filters.breaking) {
      filtered = diffResults.filter(c => isBreakingChange(c));
    } else {
        if (!filters.added) {
            filtered = filtered.filter(c => c.type !== 'added');
        }
        if (!filters.deleted) {
            filtered = filtered.filter(c => c.type !== 'deleted');
        }
        if (!filters.modified) {
            filtered = filtered.filter(c => c.type !== 'modified');
        }
    }
    
    setFilteredDiffResults(filtered);
  }, [diffResults, filters]);

  const handleExport = () => {
    if (!summary || !schemaA || !schemaB) return;

    const report = generateMarkdownReport(
        schemas[schemaA]?.title || schemaA,
        schemas[schemaB]?.title || schemaB,
        summary,
        diffResults
    );
    
    const element = document.createElement('a');
    const file = new Blob([report], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `comparison-${schemaA}-vs-${schemaB}.md`;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    document.body.removeChild(element);
  };

  const schemaNames = Object.keys(schemas);

  const renderSchemaSelector = (
    selectedValue: string | null,
    onChange: (value: string) => void,
    title: string
  ) => (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {title}
      </label>
      <select
        value={selectedValue || ''}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      >
        <option value="" disabled>
          Select a schema
        </option>
        {schemaNames.map((name) => (
          <option key={name} value={name}>
            {schemas[name]?.title || name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="h-full p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GitCompare className="h-6 w-6 text-blue-600" />
            Schema Comparison
          </h3>
          <button
            onClick={handleExport}
            disabled={!summary || summary.total === 0}
            className="px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {renderSchemaSelector(schemaA, (val) => setSchemaA(val), 'Schema A (Original)')}
          {renderSchemaSelector(schemaB, (val) => setSchemaB(val), 'Schema B (Changed)')}
        </div>

        {(!schemaA || !schemaB) ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
            <GitCompare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              Ready for Comparison
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Select two schemas from the dropdowns above to see the difference.
            </p>
          </div>
        ) : (
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                {summary && (
                    <>
                        <DiffSummary summary={summary} />
                        <DiffFilter filters={filters} onFilterChange={setFilters} summary={summary} />
                    </>
                )}
                {filteredDiffResults.length > 0 ? (
                  <DiffViewer diffResults={filteredDiffResults} />
                ) : (
                  <div className="text-center py-10">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        {diffResults.length > 0 ? 'No matching changes' : 'No Differences Found'}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                      {diffResults.length > 0 ? 'Adjust your filters to see more results.' : 'The selected schemas are identical.'}
                    </p>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
