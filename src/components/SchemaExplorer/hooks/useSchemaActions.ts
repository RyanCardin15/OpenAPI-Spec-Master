import { useState } from 'react';

export const useSchemaActions = () => {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [selectedSchemas, setSelectedSchemas] = useState<Set<string>>(new Set());

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const toggleSchemaSelection = (schemaName: string) => {
    const newSelection = new Set(selectedSchemas);
    if (newSelection.has(schemaName)) {
      newSelection.delete(schemaName);
    } else {
      newSelection.add(schemaName);
    }
    setSelectedSchemas(newSelection);
  };

  return {
    copiedText,
    selectedSchemas,
    copyToClipboard,
    toggleSchemaSelection,
    setSelectedSchemas,
  };
};
