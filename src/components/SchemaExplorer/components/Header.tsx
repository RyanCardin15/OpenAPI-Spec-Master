import React from 'react';
import { Database, Maximize2, Minimize2, X } from 'lucide-react';

interface HeaderProps {
  schemaCount: number;
  propertyCount: number;
  selectedSchemaCount: number;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  onClose: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  schemaCount,
  propertyCount,
  selectedSchemaCount,
  isMaximized,
  onToggleMaximize,
  onClose,
}) => (
  <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
    <div className="flex items-center gap-3 md:gap-4">
      <div className="relative">
        <div className="p-3 bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700 rounded-xl shadow-lg">
          <Database className="h-6 w-6 text-white" />
        </div>
        <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
      </div>
      <div>
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
          Advanced Schema Explorer
        </h2>
        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
          {schemaCount} schemas • {propertyCount} properties • {selectedSchemaCount} selected
        </p>
      </div>
    </div>
    
    <div className="flex items-center gap-1 md:gap-2">
      <button
        onClick={onToggleMaximize}
        className="hidden md:block p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title={isMaximized ? "Restore" : "Maximize"}
      >
        {isMaximized ? (
          <Minimize2 className="h-5 w-5 text-gray-500" />
        ) : (
          <Maximize2 className="h-5 w-5 text-gray-500" />
        )}
      </button>
      <button
        onClick={onClose}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <X className="h-5 w-5 text-gray-500" />
      </button>
    </div>
  </div>
);
