import React from 'react';
import { Type, Braces, Pilcrow, Hash, List, Box, AlertCircle } from 'lucide-react';

export const getIconForType = (type: string) => {
  switch (type) {
    case 'string':
      return <Pilcrow className="h-4 w-4 text-green-500" />;
    case 'number':
    case 'integer':
      return <Hash className="h-4 w-4 text-blue-500" />;
    case 'object':
      return <Braces className="h-4 w-4 text-purple-500" />;
    case 'array':
      return <List className="h-4 w-4 text-orange-500" />;
    case 'boolean':
      return <Type className="h-4 w-4 text-yellow-500" />;
    case 'null':
      return <Box className="h-4 w-4 text-gray-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-red-500" />;
  }
}; 