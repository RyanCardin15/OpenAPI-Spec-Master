import { useCallback } from 'react';
import { ValidationIssue, SchemaMetrics } from '../types';
import { resolveSchemaReference } from '../utils';

export const useSchemaValidation = (
  schemas: Record<string, any>, 
  schemaMetrics: Map<string, SchemaMetrics>
) => {
  const validateSingleSchema = useCallback((schemaName: string, schema: any): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const resolvedSchema = resolveSchemaReference(schema, schemas);
    const metrics = schemaMetrics.get(schemaName);
    
    if (!resolvedSchema.title) {
      issues.push({
        severity: 'warning',
        message: 'Schema is missing a title',
        path: `${schemaName}`,
        suggestion: 'Add a descriptive title for better API documentation'
      });
    }
    
    if (!resolvedSchema.description) {
      issues.push({
        severity: 'warning',
        message: 'Schema is missing a description',
        path: `${schemaName}`,
        suggestion: 'Add a comprehensive description explaining the purpose and usage'
      });
    }
    
    if (metrics?.circularRefs) {
      issues.push({
        severity: 'error',
        message: 'Circular dependency detected',
        path: `${schemaName}`,
        suggestion: 'Refactor to remove circular references by using composition or inheritance'
      });
    }
    
    if (metrics && metrics.complexity > 100) {
      issues.push({
        severity: 'warning',
        message: `High complexity score (${metrics.complexity})`,
        path: `${schemaName}`,
        suggestion: 'Consider breaking down into smaller, more focused schemas'
      });
    }
    
    if (metrics && metrics.propertyCount > 30) {
      issues.push({
        severity: 'warning',
        message: `Large number of properties (${metrics.propertyCount})`,
        path: `${schemaName}`,
        suggestion: 'Consider grouping related properties into nested objects'
      });
    }
    
    if (metrics && metrics.depth > 5) {
      issues.push({
        severity: 'warning',
        message: `Deep nesting detected (${metrics.depth} levels)`,
        path: `${schemaName}`,
        suggestion: 'Consider flattening the structure or using references'
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
            suggestion: 'Add a description explaining the property purpose and expected values'
          });
        }
        
        if (resolvedProp.type === 'string' && !resolvedProp.maxLength && !resolvedProp.enum && !resolvedProp.format) {
          issues.push({
            severity: 'warning',
            message: `String property '${propName}' has no length constraints`,
            path: `${schemaName}.${propName}`,
            suggestion: 'Add maxLength constraint to prevent potential issues'
          });
        }
        
        if ((resolvedProp.type === 'number' || resolvedProp.type === 'integer') && 
            resolvedProp.minimum === undefined && resolvedProp.maximum === undefined) {
          issues.push({
            severity: 'info',
            message: `Numeric property '${propName}' has no range constraints`,
            path: `${schemaName}.${propName}`,
            suggestion: 'Consider adding minimum/maximum constraints for better validation'
          });
        }
        
        if (resolvedProp.type === 'array' && !resolvedProp.items) {
          issues.push({
            severity: 'error',
            message: `Array property '${propName}' is missing items definition`,
            path: `${schemaName}.${propName}`,
            suggestion: 'Define the type/schema for array items'
          });
        }
        
        if (resolvedProp.deprecated && !resolvedProp.description?.includes('use')) {
          issues.push({
            severity: 'warning',
            message: `Deprecated property '${propName}' has no replacement guidance`,
            path: `${schemaName}.${propName}`,
            suggestion: 'Include guidance on what to use instead in the description'
          });
        }
      });
    }
    
    if (resolvedSchema.required && resolvedSchema.required.length === 0) {
      issues.push({
        severity: 'info',
        message: 'Schema has no required fields',
        path: `${schemaName}`,
        suggestion: 'Consider marking essential fields as required for better validation'
      });
    }
    
    if (resolvedSchema.additionalProperties === undefined && resolvedSchema.type === 'object') {
      issues.push({
        severity: 'info',
        message: 'additionalProperties not explicitly defined',
        path: `${schemaName}`,
        suggestion: 'Explicitly set additionalProperties to true or false for clarity'
      });
    }
    
    return issues;
  }, [schemas, schemaMetrics]);

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
