import React from 'react';
import { 
  Grid, 
  List, 
  Table, 
  Layers, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  MoreHorizontal,
  Eye,
  EyeOff,
  Maximize,
  Minimize
} from 'lucide-react';
import { GroupingState, ViewState } from '../types/openapi';

interface ViewControlsProps {
  grouping: GroupingState;
  onGroupingChange: (grouping: GroupingState) => void;
  view: ViewState;
  onViewChange: (view: ViewState) => void;
}

export const ViewControls: React.FC<ViewControlsProps> = ({
  grouping,
  onGroupingChange,
  view,
  onViewChange
}) => {
  const layoutOptions = [
    { id: 'list', icon: List, label: 'List' },
    { id: 'grid', icon: Grid, label: 'Grid' },
    { id: 'compact', icon: Layers, label: 'Compact' },
    { id: 'table', icon: Table, label: 'Table' }
  ];

  const groupByOptions = [
    { id: 'none', label: 'No Grouping' },
    { id: 'tag', label: 'By Tag' },
    { id: 'method', label: 'By Method' },
    { id: 'path', label: 'By Path Segment' },
    { id: 'complexity', label: 'By Complexity' },
    { id: 'security', label: 'By Security' }
  ];

  const sortByOptions = [
    { id: 'path', label: 'Path' },
    { id: 'method', label: 'Method' },
    { id: 'summary', label: 'Summary' },
    { id: 'complexity', label: 'Complexity' },
    { id: 'responseTime', label: 'Response Time' }
  ];

  const densityOptions = [
    { id: 'compact', label: 'Compact' },
    { id: 'comfortable', label: 'Comfortable' },
    { id: 'spacious', label: 'Spacious' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Layout Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Layout:</span>
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {layoutOptions.map((option) => {
              const Icon = option.icon;
              const isActive = view.layout === option.id;
              
              return (
                <button
                  key={option.id}
                  onClick={() => onViewChange({ ...view, layout: option.id as any })}
                  className={`
                    flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                    ${isActive 
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }
                  `}
                  title={option.label}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Group By */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Group:</span>
          <select
            value={grouping.groupBy}
            onChange={(e) => onGroupingChange({ ...grouping, groupBy: e.target.value as any })}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {groupByOptions.map(option => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort:</span>
          <select
            value={grouping.sortBy}
            onChange={(e) => onGroupingChange({ ...grouping, sortBy: e.target.value as any })}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {sortByOptions.map(option => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => onGroupingChange({ 
              ...grouping, 
              sortOrder: grouping.sortOrder === 'asc' ? 'desc' : 'asc' 
            })}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={`Sort ${grouping.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            {grouping.sortOrder === 'asc' ? (
              <ArrowUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ArrowDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>

        {/* Density */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Density:</span>
          <select
            value={view.density}
            onChange={(e) => onViewChange({ ...view, density: e.target.value as any })}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {densityOptions.map(option => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* View Options */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => onViewChange({ ...view, showDetails: !view.showDetails })}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${view.showDetails 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }
            `}
          >
            {view.showDetails ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            Details
          </button>

          <button
            onClick={() => onViewChange({ ...view, showBusinessContext: !view.showBusinessContext })}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${view.showBusinessContext 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }
            `}
          >
            Business
          </button>

          <button
            onClick={() => onViewChange({ ...view, showAISuggestions: !view.showAISuggestions })}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${view.showAISuggestions 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }
            `}
          >
            AI Tips
          </button>

          <button
            onClick={() => onViewChange({ ...view, showCodeExamples: !view.showCodeExamples })}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${view.showCodeExamples 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }
            `}
          >
            Code
          </button>
        </div>
      </div>
    </div>
  );
};