export const generateTypeScript = (schemaName: string, schema: any): string => {
  const anInterface = `export interface ${schemaName} {\n`;

  const generateProperties = (properties: any) => {
    return Object.entries(properties)
      .map(([key, value]: [string, any]) => {
        const type = value.type === 'integer' ? 'number' : value.type;
        return `  ${key}: ${type};`;
      })
      .join('\n');
  };

  const properties = schema.properties ? generateProperties(schema.properties) : '';

  return `${anInterface}${properties}\n}`;
}; 