import { useCallback, useMemo } from 'react';
import { ValidationIssue, SchemaMetrics } from '../types';
import { resolveSchemaReference } from '../utils';
import { OpenAPISpec } from '../../../types/openapi';

export const useSchemaValidation = (
  spec: OpenAPISpec | null,
  schemas: Record<string, any>, 
  schemaMetrics: Map<string, SchemaMetrics>
) => {

  const schemaToTagsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!spec) return map;

    const isOAS3 = 'openapi' in spec;
    const schemaPrefix = isOAS3 ? '#/components/schemas/' : '#/definitions/';
    const specSchemas = (isOAS3 ? spec.components?.schemas : (spec as any).definitions) || {};

    const findSchemaRefs = (obj: any): string[] => {
      if (!obj || typeof obj !== 'object') return [];
      const refs: string[] = [];
      if (obj.$ref && typeof obj.$ref === 'string' && obj.$ref.startsWith(schemaPrefix)) {
        refs.push(obj.$ref.split('/').pop() || '');
      }
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          refs.push(...findSchemaRefs(obj[key]));
        }
      }
      return [...new Set(refs)];
    };

    const dependencyGraph = new Map<string, string[]>();
    for (const schemaName in specSchemas) {
      if (Object.prototype.hasOwnProperty.call(specSchemas, schemaName)) {
        dependencyGraph.set(schemaName, findSchemaRefs(specSchemas[schemaName]));
      }
    }

    const getAllDependencies = (schemaName: string, visited = new Set<string>()): string[] => {
      if (visited.has(schemaName)) return [];
      visited.add(schemaName);
      const directDependencies = dependencyGraph.get(schemaName) || [];
      const nestedDependencies = directDependencies.flatMap(dep => getAllDependencies(dep, visited));
      return [...new Set([...directDependencies, ...nestedDependencies])];
    };
    
    if (!spec.paths) return map;

    for (const path of Object.values(spec.paths)) {
      for (const operation of Object.values(path)) {
        if (typeof operation !== 'object' || operation === null || !operation.tags) continue;

        const tags = operation.tags;
        if (tags.length === 0) continue;

        const directSchemaNames = findSchemaRefs(operation);
        const allRelatedSchemas = new Set(directSchemaNames);
        for (const schemaName of directSchemaNames) {
            getAllDependencies(schemaName).forEach(dep => allRelatedSchemas.add(dep));
        }

        for (const schemaName of allRelatedSchemas) {
            const existingTags = map.get(schemaName) || [];
            map.set(schemaName, [...new Set([...existingTags, ...tags])]);
        }
      }
    }
    return map;
  }, [spec]);

  const validateSingleSchema = useCallback((schemaName: string, schema: any): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const resolvedSchema = resolveSchemaReference(schema, schemas);
    const metrics = schemaMetrics.get(schemaName);
    const tags = schemaToTagsMap.get(schemaName);
    
    if (!resolvedSchema.title) {
      issues.push({
        severity: 'warning',
        message: 'Schema is missing a title',
        path: `${schemaName}`,
        suggestion: 'Add a descriptive title for better API documentation',
        tags,
      });
    }
    
    if (!resolvedSchema.description) {
      issues.push({
        severity: 'warning',
        message: 'Schema is missing a description',
        path: `${schemaName}`,
        suggestion: 'Add a comprehensive description explaining the purpose and usage',
        tags,
      });
    }
    
    if (metrics?.circularRefs) {
      issues.push({
        severity: 'error',
        message: 'Circular dependency detected',
        path: `${schemaName}`,
        suggestion: 'Refactor to remove circular references by using composition or inheritance',
        tags,
      });
    }
    
    if (metrics && metrics.complexity > 100) {
      issues.push({
        severity: 'warning',
        message: `High complexity score (${metrics.complexity})`,
        path: `${schemaName}`,
        suggestion: 'Consider breaking down into smaller, more focused schemas',
        tags,
      });
    }
    
    if (metrics && metrics.propertyCount > 30) {
      issues.push({
        severity: 'warning',
        message: `Large number of properties (${metrics.propertyCount})`,
        path: `${schemaName}`,
        suggestion: 'Consider grouping related properties into nested objects',
        tags,
      });
    }
    
    if (metrics && metrics.depth > 5) {
      issues.push({
        severity: 'warning',
        message: `Deep nesting detected (${metrics.depth} levels)`,
        path: `${schemaName}`,
        suggestion: 'Consider flattening the structure or using references',
        tags,
      });
    }
    
    if (resolvedSchema.properties) {
      Object.entries(resolvedSchema.properties).forEach(([propName, propSchema]: [string, any]) => {
        const resolvedProp = resolveSchemaReference(propSchema, schemas);
        
        if (!resolvedProp.description) {
          issues.push({
            severity: 'info',
            message: `Property '${propName}' is missing a description`,
            path: `${schemaName}.${propName}`,
            suggestion: 'Add a description explaining the property purpose and expected values',
            tags,
          });
        }
        
        if (resolvedProp.type === 'string' && !resolvedProp.maxLength && !resolvedProp.enum && !resolvedProp.format) {
          issues.push({
            severity: 'warning',
            message: `String property '${propName}' has no length constraints`,
            path: `${schemaName}.${propName}`,
            suggestion: 'Add maxLength constraint to prevent potential issues',
            tags,
          });
        }
        
        if ((resolvedProp.type === 'number' || resolvedProp.type === 'integer') && 
            resolvedProp.minimum === undefined && resolvedProp.maximum === undefined) {
          issues.push({
            severity: 'info',
            message: `Numeric property '${propName}' has no range constraints`,
            path: `${schemaName}.${propName}`,
            suggestion: 'Consider adding minimum/maximum constraints for better validation',
            tags,
          });
        }
        
        if (resolvedProp.type === 'array' && !resolvedProp.items) {
          issues.push({
            severity: 'error',
            message: `Array property '${propName}' is missing items definition`,
            path: `${schemaName}.${propName}`,
            suggestion: 'Define the type/schema for array items',
            tags,
          });
        }
        
        if (resolvedProp.deprecated && !resolvedProp.description?.includes('use')) {
          issues.push({
            severity: 'warning',
            message: `Deprecated property '${propName}' has no replacement guidance`,
            path: `${schemaName}.${propName}`,
            suggestion: 'Include guidance on what to use instead in the description',
            tags,
          });
        }
      });
    }
    
    if (resolvedSchema.required && resolvedSchema.required.length === 0) {
      issues.push({
        severity: 'info',
        message: 'Schema has no required fields',
        path: `${schemaName}`,
        suggestion: 'Consider marking essential fields as required for better validation',
        tags,
      });
    }
    
    if (resolvedSchema.additionalProperties === undefined && resolvedSchema.type === 'object') {
      issues.push({
        severity: 'info',
        message: 'additionalProperties not explicitly defined',
        path: `${schemaName}`,
        suggestion: 'Explicitly set additionalProperties to true or false for clarity',
        tags,
      });
    }
    
    return issues;
  }, [schemas, schemaMetrics, schemaToTagsMap]);

  const getValidationSummary = useCallback(() => {
    const allIssues = Object.entries(schemas).flatMap(([name, schema]) => 
      validateSingleSchema(name, schema)
    );
    
    const summary = {
      total: allIssues.length,
      errors: allIssues.filter(issue => issue.severity === 'error').length,
      warnings: allIssues.filter(issue => issue.severity === 'warning').length,
      info: allIssues.filter(issue => issue.severity === 'info').length,
      schemasWithIssues: new Set(allIssues.map(issue => issue.path.split('.')[0])).size,
      totalSchemas: Object.keys(schemas).length
    };
    
    return summary;
  }, [schemas, validateSingleSchema]);

  return { validateSingleSchema, getValidationSummary };
};
