import React, { useState, useMemo } from 'react';
import { FileCheck, AlertTriangle, Info, CheckCircle, Lightbulb, ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { ValidationIssue } from '../types';
import { OpenAPISpec } from '../../../types/openapi';

type Severity = 'error' | 'warning' | 'info';

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
  spec: OpenAPISpec | null;
  onSelectSchema: (schemaName: string) => void;
}

export const ValidationTab: React.FC<ValidationTabProps> = ({
  validationResults,
  spec,
  onSelectSchema
}) => {
  const { summary, issues } = validationResults;
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedSeverities, setSelectedSeverities] = useState<Set<Severity>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };
  
  const handleSeverityToggle = (severity: Severity) => {
    const newSelection = new Set(selectedSeverities);
    if (newSelection.has(severity)) {
      newSelection.delete(severity);
    } else {
      newSelection.add(severity);
    }
    setSelectedSeverities(newSelection);
  };

  const getSeverityIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error': return <FileCheck className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const filteredIssues = useMemo(() => {
    return issues
      .filter(issue => selectedSeverities.size === 0 || selectedSeverities.has(issue.severity))
      .filter(issue => 
        searchQuery === '' || 
        issue.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.path.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [issues, selectedSeverities, searchQuery]);

  const groupedIssues = useMemo(() => {
    return filteredIssues.reduce((acc, issue) => {
      if (issue.tags && issue.tags.length > 0) {
        issue.tags.forEach(tag => {
          if (!acc[tag]) {
            acc[tag] = [];
          }
          acc[tag].push(issue);
        });
      } else {
        const groupName = 'Uncategorized';
        if (!acc[groupName]) {
          acc[groupName] = [];
        }
        acc[groupName].push(issue);
      }
      return acc;
    }, {} as Record<string, ValidationIssue[]>);
  }, [filteredIssues]);

  const totalFilteredIssues = filteredIssues.length;

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
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-gray-900 dark:text-white">All Issues ({totalFilteredIssues} of {summary.total})</h4>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search issues..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  />
                   {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                      <X className="h-4 w-4 text-gray-500 hover:text-gray-800" />
                    </button>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedSeverities(new Set())}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                      selectedSeverities.size === 0
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    All
                  </button>
                  {(['error', 'warning', 'info'] as Severity[]).map((severity) => (
                    <button
                      key={severity}
                      onClick={() => handleSeverityToggle(severity)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors capitalize ${
                        selectedSeverities.has(severity)
                          ? severity === 'error'
                            ? 'bg-red-500 text-white'
                            : severity === 'warning'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {severity}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {Object.entries(groupedIssues).map(([groupName, groupIssues]) => (
              <div key={groupName} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex justify-between items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className="flex items-center gap-3">
                    {expandedGroups[groupName] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    <span className="font-semibold text-lg capitalize">{groupName}</span>
                  </div>
                  <span className="text-sm font-mono bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-2.5 py-1 rounded-full">{groupIssues.length}</span>
                </button>
                {expandedGroups[groupName] && (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700 border-t border-gray-200 dark:border-gray-700">
                    {groupIssues.map((issue, index) => (
                      <div key={index} className="p-4 pl-12">
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
                )}
              </div>
            ))}
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
