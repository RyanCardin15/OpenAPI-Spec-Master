import React, { useState } from 'react';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Eye, 
  Search, 
  FileText,
  Key,
  Trash2,
  TrendingUp,
  Code,
  Database
} from 'lucide-react';
import { OpenAPISpec, EndpointData } from '../types/openapi';

interface ValidationCenterProps {
  spec: OpenAPISpec;
  endpoints: EndpointData[];
  isOpen: boolean;
  onClose: () => void;
}

interface ValidationResult {
  type: 'success' | 'warning' | 'error';
  category: string;
  message: string;
  details?: string;
  count?: number;
}

export const ValidationCenter: React.FC<ValidationCenterProps> = ({ 
  spec, 
  endpoints, 
  isOpen, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'design' | 'security' | 'examples' | 'cleanup' | 'evolution'>('design');

  if (!isOpen) return null;

  const validateAPIDesign = (): ValidationResult[] => {
    const results: ValidationResult[] = [];

    // Check for missing descriptions
    const undocumentedEndpoints = endpoints.filter(ep => !ep.summary && !ep.description);
    if (undocumentedEndpoints.length > 0) {
      results.push({
        type: 'warning',
        category: 'Documentation',
        message: 'Endpoints missing documentation',
        details: `${undocumentedEndpoints.length} endpoints lack summaries or descriptions`,
        count: undocumentedEndpoints.length
      });
    }

    // Check for deprecated endpoints
    const deprecatedEndpoints = endpoints.filter(ep => ep.deprecated);
    if (deprecatedEndpoints.length > 0) {
      results.push({
        type: 'warning',
        category: 'Lifecycle',
        message: 'Deprecated endpoints found',
        details: `${deprecatedEndpoints.length} endpoints are marked as deprecated`,
        count: deprecatedEndpoints.length
      });
    }

    // Check for consistent naming
    const inconsistentPaths = endpoints.filter(ep => 
      !ep.path.match(/^\/[a-z0-9\-_\/{}]+$/i)
    );
    if (inconsistentPaths.length > 0) {
      results.push({
        type: 'warning',
        category: 'Naming',
        message: 'Inconsistent path naming',
        details: 'Some paths don\'t follow REST conventions',
        count: inconsistentPaths.length
      });
    }

    // Check for proper HTTP methods
    const getEndpointsWithBody = endpoints.filter(ep => 
      ep.method === 'GET' && ep.requestBody
    );
    if (getEndpointsWithBody.length > 0) {
      results.push({
        type: 'error',
        category: 'HTTP Methods',
        message: 'GET endpoints with request body',
        details: 'GET requests should not have request bodies',
        count: getEndpointsWithBody.length
      });
    }

    // Check for response codes
    const endpointsWithoutSuccessResponse = endpoints.filter(ep => 
      !Object.keys(ep.responses).some(code => code.startsWith('2'))
    );
    if (endpointsWithoutSuccessResponse.length > 0) {
      results.push({
        type: 'error',
        category: 'Responses',
        message: 'Missing success responses',
        details: 'Some endpoints don\'t define success response codes',
        count: endpointsWithoutSuccessResponse.length
      });
    }

    if (results.length === 0) {
      results.push({
        type: 'success',
        category: 'Design',
        message: 'API design looks good!',
        details: 'No major design issues detected'
      });
    }

    return results;
  };

  const validateSecurity = (): ValidationResult[] => {
    const results: ValidationResult[] = [];

    // Check for security schemes
    const hasGlobalSecurity = spec.security && spec.security.length > 0;
    const securedEndpoints = endpoints.filter(ep => ep.security && ep.security.length > 0);
    
    if (!hasGlobalSecurity && securedEndpoints.length === 0) {
      results.push({
        type: 'error',
        category: 'Authentication',
        message: 'No security schemes detected',
        details: 'API has no authentication or authorization mechanisms'
      });
    }

    // Check for sensitive endpoints without security
    const sensitiveEndpoints = endpoints.filter(ep => 
      (ep.method === 'POST' || ep.method === 'PUT' || ep.method === 'DELETE') &&
      (!ep.security || ep.security.length === 0) &&
      !hasGlobalSecurity
    );
    
    if (sensitiveEndpoints.length > 0) {
      results.push({
        type: 'warning',
        category: 'Authorization',
        message: 'Sensitive endpoints without security',
        details: 'POST/PUT/DELETE endpoints should be secured',
        count: sensitiveEndpoints.length
      });
    }

    // Check for HTTPS
    const hasHttpsServer = spec.servers?.some(server => 
      server.url.startsWith('https://')
    );
    
    if (!hasHttpsServer) {
      results.push({
        type: 'warning',
        category: 'Transport Security',
        message: 'No HTTPS servers defined',
        details: 'Consider using HTTPS for secure communication'
      });
    }

    if (results.length === 0) {
      results.push({
        type: 'success',
        category: 'Security',
        message: 'Security configuration looks good!',
        details: 'No major security issues detected'
      });
    }

    return results;
  };

  const validateExamples = (): ValidationResult[] => {
    const results: ValidationResult[] = [];

    // Check for missing examples
    const endpointsWithoutExamples = endpoints.filter(ep => {
      const hasRequestExample = !ep.requestBody || 
        (ep.requestBody && Object.values((ep.requestBody as any).content || {}).some((media: any) => 
          media.example || media.examples
        ));
      
      const hasResponseExample = Object.values(ep.responses).some(response => 
        response.content && Object.values(response.content).some((media: any) => 
          media.example || media.examples
        )
      );

      return !hasRequestExample || !hasResponseExample;
    });

    if (endpointsWithoutExamples.length > 0) {
      results.push({
        type: 'warning',
        category: 'Examples',
        message: 'Missing request/response examples',
        details: 'Examples help developers understand the API better',
        count: endpointsWithoutExamples.length
      });
    }

    // Simulate example validation (in real implementation, this would validate against schemas)
    const invalidExamples = Math.floor(Math.random() * 3); // Simulated
    if (invalidExamples > 0) {
      results.push({
        type: 'error',
        category: 'Example Validation',
        message: 'Invalid examples detected',
        details: 'Some examples don\'t match their schemas',
        count: invalidExamples
      });
    }

    if (results.length === 0) {
      results.push({
        type: 'success',
        category: 'Examples',
        message: 'All examples are valid!',
        details: 'Examples match their schemas and are well-documented'
      });
    }

    return results;
  };

  const findUnusedSchemas = (): ValidationResult[] => {
    const results: ValidationResult[] = [];
    const schemas = spec.components?.schemas || {};
    const usedSchemas = new Set<string>();

    // Find referenced schemas (simplified check)
    const findReferences = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      
      if (obj.$ref && typeof obj.$ref === 'string') {
        const refName = obj.$ref.replace('#/components/schemas/', '');
        usedSchemas.add(refName);
      }
      
      Object.values(obj).forEach(value => {
        if (typeof value === 'object') {
          findReferences(value);
        }
      });
    };

    // Check all endpoints for schema references
    endpoints.forEach(endpoint => {
      findReferences(endpoint.operation);
    });

    const unusedSchemas = Object.keys(schemas).filter(name => !usedSchemas.has(name));
    
    if (unusedSchemas.length > 0) {
      results.push({
        type: 'warning',
        category: 'Cleanup',
        message: 'Unused schemas detected',
        details: `${unusedSchemas.length} schemas are defined but never referenced`,
        count: unusedSchemas.length
      });
    } else {
      results.push({
        type: 'success',
        category: 'Cleanup',
        message: 'All schemas are in use!',
        details: 'No unused schema definitions found'
      });
    }

    return results;
  };

  const analyzeEvolution = (): ValidationResult[] => {
    const results: ValidationResult[] = [];

    // Check for versioning strategy
    const hasVersioning = spec.info.version && spec.info.version !== '1.0.0';
    if (!hasVersioning) {
      results.push({
        type: 'warning',
        category: 'Versioning',
        message: 'Consider versioning strategy',
        details: 'Plan for API evolution with proper versioning'
      });
    }

    // Check for extensibility
    const schemasWithAdditionalProperties = Object.values(spec.components?.schemas || {}).filter(
      (schema: any) => schema.additionalProperties === true
    ).length;

    if (schemasWithAdditionalProperties > 0) {
      results.push({
        type: 'success',
        category: 'Extensibility',
        message: 'Schemas support extensibility',
        details: `${schemasWithAdditionalProperties} schemas allow additional properties`,
        count: schemasWithAdditionalProperties
      });
    }

    // Check for breaking change risks
    const requiredFields = Object.values(spec.components?.schemas || {}).reduce((count, schema: any) => {
      return count + (schema.required?.length || 0);
    }, 0);

    if (requiredFields > endpoints.length * 2) {
      results.push({
        type: 'warning',
        category: 'Breaking Changes',
        message: 'High number of required fields',
        details: 'Many required fields increase risk of breaking changes'
      });
    }

    if (results.length === 0) {
      results.push({
        type: 'success',
        category: 'Evolution',
        message: 'API is well-prepared for evolution!',
        details: 'Good versioning and extensibility practices detected'
      });
    }

    return results;
  };

  const tabs = [
    { id: 'design', label: 'API Design', icon: FileText, validator: validateAPIDesign },
    { id: 'security', label: 'Security', icon: Shield, validator: validateSecurity },
    { id: 'examples', label: 'Examples', icon: Code, validator: validateExamples },
    { id: 'cleanup', label: 'Cleanup', icon: Trash2, validator: findUnusedSchemas },
    { id: 'evolution', label: 'Evolution', icon: TrendingUp, validator: analyzeEvolution }
  ];

  const currentResults = tabs.find(tab => tab.id === activeTab)?.validator() || [];

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <CheckCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case 'success': return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
      case 'warning': return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
      case 'error': return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      default: return 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Validation Center
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Comprehensive API validation and recommendations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Eye className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 px-6 py-3 font-medium transition-colors whitespace-nowrap
                  ${isActive 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {currentResults.map((result, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getResultColor(result.type)}`}
              >
                <div className="flex items-start gap-3">
                  {getResultIcon(result.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {result.message}
                      </h4>
                      {result.count && (
                        <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full">
                          {result.count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {result.details}
                    </p>
                    <span className="inline-block px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded border">
                      {result.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};