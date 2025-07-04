export const generateJava = (schemaName: string, schema: any): string => {
  const classDef = `public class ${schemaName} {\n`;

  const typeMap: { [key: string]: string } = {
    string: 'String',
    number: 'Double',
    integer: 'Integer',
    boolean: 'Boolean',
    object: 'Map<String, Object>',
  };

  const getType = (prop: any): string => {
    if (prop.$ref) {
      return prop.$ref.split('/').pop() || 'Object';
    }
    if (prop.type === 'array') {
      if (prop.items) {
        return `List<${getType(prop.items)}>`;
      }
      return 'List<Object>';
    }
    return typeMap[prop.type] || 'Object';
  };

  const generateProperties = (properties: any) => {
    return Object.entries(properties)
      .map(([key, value]: [string, any]) => {
        const type = getType(value);
        return `    private ${type} ${key};`;
      })
      .join('\n');
  };

  const properties = schema.properties ? generateProperties(schema.properties) : '';

  return `import java.util.List;\nimport java.util.Map;\n\n${classDef}${properties}\n}`;
}; 