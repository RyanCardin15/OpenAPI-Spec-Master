import { OpenAPISpec } from '../../types/openapi';

export interface SchemaExplorerProps {
  spec: OpenAPISpec | null;
  allSpecs?: OpenAPISpec[];
  isOpen: boolean;
  onClose: () => void;
}

export interface PropertyResult {
  schema: string;
  property: string;
  type: string;
  path: string;
  required: boolean;
  description?: string;
  format?: string;
  enum?: any[];
  example?: any;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
}

export interface SchemaMetrics {
  complexity: number;
  depth: number;
  propertyCount: number;
  requiredCount: number;
  dependencyCount: number;
  circularRefs: boolean;
  lastModified?: string;
  usage: number;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  path: string;
  suggestion?: string;
  tags?: string[];
}

export type TabType = 'overview' | 'explorer' | 'comparison' | 'validation' | 'analytics' | 'editor' | 'docs' | 'relationships' | 'testing';
export type ViewMode = 'card' | 'list' | 'tree';
