export const generateJava = (schemaName: string, schema: any): string => {
  const classDef = `public class ${schemaName} {\n`;

  const typeMap: { [key: string]: string } = {
    string: 'String',
    number: 'Double',
    integer: 'Integer',
    boolean: 'Boolean',
    array: 'List',
    object: 'Map<String, Object>',
  };

  const generateProperties = (properties: any) => {
    return Object.entries(properties)
      .map(([key, value]: [string, any]) => {
        const type = typeMap[value.type] || 'Object';
        return `    private ${type} ${key};`;
      })
      .join('\n');
  };

  const properties = schema.properties ? generateProperties(schema.properties) : '';

  return `${classDef}${properties}\n}`;
}; 