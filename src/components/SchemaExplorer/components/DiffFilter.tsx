import React from 'react';

export interface Filters {
    added: boolean;
    deleted: boolean;
    modified: boolean;
    breaking: boolean;
}

interface DiffFilterProps {
    filters: Filters;
    onFilterChange: (filters: Filters) => void;
    summary: { breaking: number }; 
}

const DiffFilter: React.FC<DiffFilterProps> = ({ filters, onFilterChange, summary }) => {
    
    const handleToggle = (filterName: keyof Omit<Filters, 'breaking'>) => {
        onFilterChange({ ...filters, breaking: false, [filterName]: !filters[filterName] });
    };
    
    const handleBreakingToggle = () => {
        const newBreakingValue = !filters.breaking;
        onFilterChange({
            added: !newBreakingValue,
            deleted: !newBreakingValue,
            modified: !newBreakingValue,
            breaking: newBreakingValue
        });
    }

    const baseStyle = "px-3 py-1.5 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors";
    const activeStyle = "bg-blue-600 text-white shadow-sm";
    const inactiveStyle = "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600";
    
    return (
        <div className="my-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span>Show:</span>
                <button
                    onClick={() => handleToggle('added')}
                    className={`${baseStyle} ${filters.added && !filters.breaking ? activeStyle : inactiveStyle}`}
                >
                    Added
                </button>
                <button
                    onClick={() => handleToggle('deleted')}
                    className={`${baseStyle} ${filters.deleted && !filters.breaking ? activeStyle : inactiveStyle}`}
                >
                    Deleted
                </button>
                <button
                    onClick={() => handleToggle('modified')}
                    className={`${baseStyle} ${filters.modified && !filters.breaking ? activeStyle : inactiveStyle}`}
                >
                    Modified
                </button>
            </div>
            <div className="border-l border-gray-300 dark:border-gray-600 pl-3 ml-3">
                 <button
                    onClick={handleBreakingToggle}
                    disabled={summary.breaking === 0}
                    className={`${baseStyle} ${filters.breaking ? 'bg-red-600 text-white shadow-sm' : inactiveStyle} disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                >
                    Breaking Changes <span className="bg-red-200/50 text-red-700 dark:bg-red-800/50 dark:text-red-100 text-xs font-bold px-2 py-0.5 rounded-full">{summary.breaking}</span>
                </button>
            </div>
        </div>
    );
};

export default DiffFilter; 