export const generateTypeScript = (schemaName: string, schema: any): string => {
  const anInterface = `export interface ${schemaName} {\n`;

  const getType = (prop: any): string => {
    if (prop.$ref) {
      return prop.$ref.split('/').pop() || 'any';
    }
    if (prop.type === 'integer') {
      return 'number';
    }
    if (prop.type === 'array') {
      if (prop.items) {
        return `${getType(prop.items)}[]`;
      }
      return 'any[]';
    }
    return prop.type || 'any';
  };

  const generateProperties = (properties: any) => {
    return Object.entries(properties)
      .map(([key, value]: [string, any]) => {
        const type = getType(value);
        return `  ${key}: ${type};`;
      })
      .join('\n');
  };

  const properties = schema.properties ? generateProperties(schema.properties) : '';

  return `${anInterface}${properties}\n}`;
}; 