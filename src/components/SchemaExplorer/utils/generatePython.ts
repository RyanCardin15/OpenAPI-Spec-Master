export const generatePython = (schemaName: string, schema: any): string => {
  const classDef = `class ${schemaName}:\n`;

  const typeMap: { [key: string]: string } = {
    string: 'str',
    number: 'float',
    integer: 'int',
    boolean: 'bool',
    object: 'dict',
  };

  const getType = (prop: any): string => {
    if (prop.$ref) {
      return prop.$ref.split('/').pop() || 'Any';
    }
    if (prop.type === 'array') {
      if (prop.items) {
        return `List[${getType(prop.items)}]`;
      }
      return 'List';
    }
    return typeMap[prop.type] || 'Any';
  };

  const generateProperties = (properties: any) => {
    return Object.entries(properties)
      .map(([key, value]: [string, any]) => {
        const type = getType(value);
        return `    ${key}: ${type}`;
      })
      .join('\n');
  };

  const properties = schema.properties ? generateProperties(schema.properties) : '    pass';

  return `from typing import List, Any, Dict\n\n${classDef}${properties}`;
}; 