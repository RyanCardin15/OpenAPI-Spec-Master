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
    { id: 'list', icon: List, label: 'List View', description: 'Display endpoints in a detailed list format' },
    { id: 'grid', icon: Grid, label: 'Grid View', description: 'Display endpoints in a grid layout' },
    { id: 'compact', icon: Layers, label: 'Compact View', description: 'Display endpoints in a space-efficient format' },
    { id: 'table', icon: Table, label: 'Table View', description: 'Display endpoints in a sortable table' }
  ];

  const groupByOptions = [
    { id: 'none', label: 'No Grouping', description: 'Show all endpoints without grouping' },
    { id: 'tag', label: 'By Tag', description: 'Group endpoints by their tags' },
    { id: 'method', label: 'By Method', description: 'Group endpoints by HTTP method' },
    { id: 'path', label: 'By Path Segment', description: 'Group endpoints by path segments' },
    { id: 'complexity', label: 'By Complexity', description: 'Group endpoints by complexity level' },
    { id: 'security', label: 'By Security', description: 'Group endpoints by security requirements' }
  ];

  const sortByOptions = [
    { id: 'path', label: 'Path', description: 'Sort by endpoint path' },
    { id: 'method', label: 'Method', description: 'Sort by HTTP method' },
    { id: 'summary', label: 'Summary', description: 'Sort by endpoint summary' },
    { id: 'complexity', label: 'Complexity', description: 'Sort by complexity level' },
    { id: 'responseTime', label: 'Response Time', description: 'Sort by estimated response time' }
  ];

  const densityOptions = [
    { id: 'compact', label: 'Compact', description: 'Minimal spacing for more content' },
    { id: 'comfortable', label: 'Comfortable', description: 'Balanced spacing for readability' },
    { id: 'spacious', label: 'Spacious', description: 'Generous spacing for better focus' }
  ];

  return (
    <nav 
      className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4"
      aria-label="View and display controls"
      role="toolbar"
    >
      <div className="flex flex-wrap items-center gap-4">
        {/* Layout Controls */}
        <fieldset className="flex items-center gap-2">
          <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Layout:</legend>
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1" role="radiogroup" aria-label="Choose layout style">
            {layoutOptions.map((option) => {
              const Icon = option.icon;
              const isActive = view.layout === option.id;
              
              return (
                <button
                  key={option.id}
                  onClick={() => onViewChange({ ...view, layout: option.id as any })}
                  className={`
                    flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all touch-target-sm
                    ${isActive 
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }
                  `}
                  title={option.description}
                  aria-label={option.label}
                  aria-pressed={isActive}
                  role="radio"
                  aria-checked={isActive}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{option.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Group By */}
        <div className="flex items-center gap-2">
          <label htmlFor="group-by-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Group:
          </label>
          <select
            id="group-by-select"
            value={grouping.groupBy}
            onChange={(e) => onGroupingChange({ ...grouping, groupBy: e.target.value as any })}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-describedby="group-by-description"
          >
            {groupByOptions.map(option => (
              <option key={option.id} value={option.id} title={option.description}>
                {option.label}
              </option>
            ))}
          </select>
          <div id="group-by-description" className="sr-only">
            Choose how to group endpoints for better organization
          </div>
        </div>

        {/* Sort By */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-by-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Sort:
          </label>
          <select
            id="sort-by-select"
            value={grouping.sortBy}
            onChange={(e) => onGroupingChange({ ...grouping, sortBy: e.target.value as any })}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-describedby="sort-by-description"
          >
            {sortByOptions.map(option => (
              <option key={option.id} value={option.id} title={option.description}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => onGroupingChange({ 
              ...grouping, 
              sortOrder: grouping.sortOrder === 'asc' ? 'desc' : 'asc' 
            })}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-target-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            title={`Currently sorting ${grouping.sortOrder === 'asc' ? 'ascending' : 'descending'}. Click to sort ${grouping.sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            aria-label={`Sort ${grouping.sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            aria-pressed={grouping.sortOrder === 'desc'}
          >
            {grouping.sortOrder === 'asc' ? (
              <ArrowUp className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
            ) : (
              <ArrowDown className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
            )}
          </button>
          <div id="sort-by-description" className="sr-only">
            Choose how to sort endpoints within groups
          </div>
        </div>

        {/* Density */}
        <div className="flex items-center gap-2">
          <label htmlFor="density-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Density:
          </label>
          <select
            id="density-select"
            value={view.density}
            onChange={(e) => onViewChange({ ...view, density: e.target.value as any })}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-describedby="density-description"
          >
            {densityOptions.map(option => (
              <option key={option.id} value={option.id} title={option.description}>
                {option.label}
              </option>
            ))}
          </select>
          <div id="density-description" className="sr-only">
            Adjust spacing and information density
          </div>
        </div>

        {/* View Options */}
        <fieldset className="flex items-center gap-2 ml-auto">
          <legend className="sr-only">Toggle display options</legend>
          
          <button
            onClick={() => onViewChange({ ...view, showDetails: !view.showDetails })}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors touch-target-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${view.showDetails 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
            aria-pressed={view.showDetails}
            aria-label={`${view.showDetails ? 'Hide' : 'Show'} endpoint details`}
            title={`${view.showDetails ? 'Hide' : 'Show'} detailed information for each endpoint`}
          >
            {view.showDetails ? (
              <Eye className="h-4 w-4" aria-hidden="true" />
            ) : (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            )}
            Details
          </button>

          <button
            onClick={() => onViewChange({ ...view, showBusinessContext: !view.showBusinessContext })}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors touch-target-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${view.showBusinessContext 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
            aria-pressed={view.showBusinessContext}
            aria-label={`${view.showBusinessContext ? 'Hide' : 'Show'} business context`}
            title={`${view.showBusinessContext ? 'Hide' : 'Show'} business context and use cases`}
          >
            Business
          </button>

          <button
            onClick={() => onViewChange({ ...view, showAISuggestions: !view.showAISuggestions })}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors touch-target-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${view.showAISuggestions 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
            aria-pressed={view.showAISuggestions}
            aria-label={`${view.showAISuggestions ? 'Hide' : 'Show'} AI suggestions`}
            title={`${view.showAISuggestions ? 'Hide' : 'Show'} AI-powered suggestions and insights`}
          >
            AI Tips
          </button>

          <button
            onClick={() => onViewChange({ ...view, showCodeExamples: !view.showCodeExamples })}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors touch-target-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${view.showCodeExamples 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
            aria-pressed={view.showCodeExamples}
            aria-label={`${view.showCodeExamples ? 'Hide' : 'Show'} code examples`}
            title={`${view.showCodeExamples ? 'Hide' : 'Show'} code examples for each endpoint`}
          >
            Code Examples
          </button>
        </fieldset>
      </div>
    </nav>
  );
};