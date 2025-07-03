import React from 'react';
import { Type, Braces, Pilcrow, Hash } from 'lucide-react';

const propertyTypes = [
  { name: 'string', icon: <Pilcrow className="h-4 w-4" /> },
  { name: 'number', icon: <Hash className="h-4 w-4" /> },
  { name: 'object', icon: <Braces className="h-4 w-4" /> },
  { name: 'array', icon: <Type className="h-4 w-4" /> },
];

interface PropertyTypeFilterProps {
  selectedTypes: string[];
  onChange: (selectedTypes: string[]) => void;
}

export const PropertyTypeFilter: React.FC<PropertyTypeFilterProps> = ({ selectedTypes, onChange }) => {
  const toggleType = (type: string) => {
    const newSelectedTypes = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type];
    onChange(newSelectedTypes);
  };

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Filter by Type</h4>
      <div className="flex flex-wrap gap-2">
        {propertyTypes.map((type) => (
          <button
            key={type.name}
            onClick={() => toggleType(type.name)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 border transition-colors ${
              selectedTypes.includes(type.name)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            {type.icon}
            <span>{type.name.charAt(0).toUpperCase() + type.name.slice(1)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}; 