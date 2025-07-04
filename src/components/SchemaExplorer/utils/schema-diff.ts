import { diff } from 'deep-diff';

export type ChangeType = 'added' | 'deleted' | 'modified';

export interface SchemaChange {
  path: (string | number)[];
  type: ChangeType;
  lhs?: any;
  rhs?: any;
}

export const compareSchemas = (schemaA: object, schemaB: object): SchemaChange[] => {
  const differences = diff(schemaA, schemaB);

  if (!differences) {
    return [];
  }

  return differences.map((d) => {
    const path = d.path || [];
    switch (d.kind) {
      case 'N': // New item
        return { path, type: 'added', rhs: d.rhs };
      case 'D': // Deleted item
        return { path, type: 'deleted', lhs: d.lhs };
      case 'E': // Edited item
        return { path, type: 'modified', lhs: d.lhs, rhs: d.rhs };
      case 'A': // Array change
        // This indicates a change within an array. The `d.item` contains the actual change.
        const arrayChangePath = [...path, d.index];
        const itemDiff = d.item;
        switch (itemDiff.kind) {
          case 'N':
            return { path: arrayChangePath, type: 'added', rhs: itemDiff.rhs };
          case 'D':
            return { path: arrayChangePath, type: 'deleted', lhs: itemDiff.lhs };
          default:
             // Other array changes (e.g. reordering) are complex.
             // For now, we'll mark the specific item as modified.
            return { path: arrayChangePath, type: 'modified', lhs: undefined, rhs: undefined };
        }
      default:
        // Fallback for unexpected cases
        return null;
    }
  }).filter(Boolean) as SchemaChange[];
};

export interface DiffSummary {
  added: number;
  deleted: number;
  modified: number;
  total: number;
  breaking: number;
}

export const isBreakingChange = (change: SchemaChange): boolean => {
    // Rule 1: Deleting a property is a breaking change.
    if (change.type === 'deleted' && change.path.includes('properties')) {
        return true;
    }

    // Rule 2: Adding a property to the 'required' array is a breaking change.
    if (change.type === 'added' && change.path.includes('required')) {
        return true;
    }
    
    // Rule 3: Changing the type of an existing property.
    if (change.type === 'modified' && change.path.includes('type')) {
        return true;
    }

    return false;
};

export const summarizeChanges = (changes: SchemaChange[]): DiffSummary => {
  const summary: DiffSummary = {
    added: 0,
    deleted: 0,
    modified: 0,
    total: changes.length,
    breaking: 0,
  };

  for (const change of changes) {
    summary[change.type]++;
    if (isBreakingChange(change)) {
      summary.breaking++;
    }
  }

  return summary;
}; 