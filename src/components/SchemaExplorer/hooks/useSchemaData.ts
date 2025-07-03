import { useMemo } from 'react';
import { OpenAPISpec } from '../../../types/openapi';
import { resolveSchemaReference } from '../utils';

export const useSchemaData = (spec: OpenAPISpec | null) => {
  const schemas = useMemo(() => {
    if (!spec) return {};
    if (spec.components?.schemas) {
      return spec.components.schemas;
    }
    if ((spec as any).definitions) {
      return (spec as any).definitions;
    }
    return {};
  }, [spec]);

  const schemaNames = useMemo(() => Object.keys(schemas), [schemas]);

  const findSchemaDependencies = useMemo(() => {
    const dependencyMap = new Map<string, string[]>();
    
    const findRefs = (obj: any, visited = new Set<string>()): string[] => {
      if (!obj || typeof obj !== 'object') return [];
      
      const refs: string[] = [];
      
      if (obj.$ref && typeof obj.$ref === 'string') {
        const refName = obj.$ref.replace('#/components/schemas/', '');
        if (schemas[refName] && !visited.has(refName)) {
          refs.push(refName);
        }
        return refs;
      }
      
      Object.values(obj).forEach(value => {
        if (typeof value === 'object') {
          refs.push(...findRefs(value, visited));
        }
      });
      
      return [...new Set(refs)];
    };
    
    Object.entries(schemas).forEach(([schemaName, schema]) => {
      const deps = findRefs(schema);
      dependencyMap.set(schemaName, deps);
    });
    
    return dependencyMap;
  }, [schemas]);

  return { schemas, schemaNames, findSchemaDependencies };
};
