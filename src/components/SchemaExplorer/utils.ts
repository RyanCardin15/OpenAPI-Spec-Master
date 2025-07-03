export const isSchemaReference = (schema: any): schema is { $ref: string } => {
  return schema && typeof schema === 'object' && '$ref' in schema;
};

export const resolveSchemaReference = (schema: any, schemas: Record<string, any>): any => {
  if (isSchemaReference(schema)) {
    const refName = schema.$ref.replace('#/components/schemas/', '');
    return schemas[refName] || schema;
  }
  return schema;
}; 