export const generateCSharp = (schemaName: string, schema: any): string => {
  const classDef = `public class ${schemaName}\n{\n`;

  const typeMap: { [key: string]: string } = {
    string: 'string',
    number: 'double',
    integer: 'int',
    boolean: 'bool',
    object: 'Dictionary<string, object>',
  };

  const getType = (prop: any): string => {
    if (prop.$ref) {
      return prop.$ref.split('/').pop() || 'object';
    }
    if (prop.type === 'array') {
      if (prop.items) {
        return `List<${getType(prop.items)}>`;
      }
      return 'List<object>';
    }
    return typeMap[prop.type] || 'object';
  };

  const generateProperties = (properties: any) => {
    return Object.entries(properties)
      .map(([key, value]: [string, any]) => {
        const type = getType(value);
        const propertyName = key.charAt(0).toUpperCase() + key.slice(1);
        return `    public ${type} ${propertyName} { get; set; }`;
      })
      .join('\n\n');
  };

  const properties = schema.properties ? generateProperties(schema.properties) : '';

  return `using System.Collections.Generic;\n\n${classDef}${properties}\n}`;
}; 