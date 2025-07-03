export const generatePython = (schemaName: string, schema: any): string => {
  const classDef = `class ${schemaName}:\n`;

  const typeMap: { [key: string]: string } = {
    string: 'str',
    number: 'float',
    integer: 'int',
    boolean: 'bool',
    array: 'list',
    object: 'dict',
  };

  const generateProperties = (properties: any) => {
    return Object.entries(properties)
      .map(([key, value]: [string, any]) => {
        const type = typeMap[value.type] || 'any';
        return `    ${key}: ${type}`;
      })
      .join('\n');
  };

  const properties = schema.properties ? generateProperties(schema.properties) : '    pass';

  return `${classDef}${properties}`;
}; 