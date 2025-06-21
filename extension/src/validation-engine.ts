export class ValidationEngine {
    async validateAPIDesign(spec: any, endpoints: any[]): Promise<any[]> {
        const results: any[] = [];

        // Check for missing descriptions
        const undocumentedEndpoints = endpoints.filter(ep => !ep.summary && !ep.description);
        if (undocumentedEndpoints.length > 0) {
            results.push({
                type: 'warning',
                category: 'Documentation',
                message: 'Endpoints missing documentation',
                details: `${undocumentedEndpoints.length} endpoints lack summaries or descriptions.`,
                severity: 'medium'
            });
        }

        // Check for deprecated endpoints
        const deprecatedEndpoints = endpoints.filter(ep => ep.deprecated);
        if (deprecatedEndpoints.length > 0) {
            results.push({
                type: 'warning',
                category: 'Lifecycle',
                message: 'Deprecated endpoints found',
                details: `${deprecatedEndpoints.length} endpoints are marked as deprecated.`,
                severity: 'low'
            });
        }

        // Check for proper HTTP methods
        const getEndpointsWithBody = endpoints.filter(ep => 
            ep.method === 'GET' && ep.operation.requestBody
        );
        if (getEndpointsWithBody.length > 0) {
            results.push({
                type: 'error',
                category: 'HTTP Methods',
                message: 'GET endpoints with request body',
                details: `${getEndpointsWithBody.length} GET requests have request bodies.`,
                severity: 'high'
            });
        }

        // Check for response codes
        const endpointsWithoutSuccessResponse = endpoints.filter(ep => 
            !Object.keys(ep.responses).some(code => code.startsWith('2'))
        );
        if (endpointsWithoutSuccessResponse.length > 0) {
            results.push({
                type: 'error',
                category: 'Response Codes',
                message: 'Missing success responses',
                details: `${endpointsWithoutSuccessResponse.length} endpoints don't define success response codes.`,
                severity: 'high'
            });
        }

        // Security validation
        const hasGlobalSecurity = spec.security && spec.security.length > 0;
        const securedEndpoints = endpoints.filter(ep => ep.operation.security && ep.operation.security.length > 0);
        
        if (!hasGlobalSecurity && securedEndpoints.length === 0) {
            results.push({
                type: 'error',
                category: 'Security',
                message: 'No security schemes detected',
                details: 'API has no authentication mechanisms.',
                severity: 'high'
            });
        }

        if (results.length === 0) {
            results.push({
                type: 'success',
                category: 'Design Quality',
                message: 'API design looks excellent!',
                details: 'No major design issues detected.',
                severity: 'low'
            });
        }

        return results;
    }

    async validateSecurity(spec: any, endpoints: any[]): Promise<any[]> {
        const results: any[] = [];

        // Check for security schemes
        const hasGlobalSecurity = spec.security && spec.security.length > 0;
        const securedEndpoints = endpoints.filter(ep => ep.operation.security && ep.operation.security.length > 0);
        
        if (!hasGlobalSecurity && securedEndpoints.length === 0) {
            results.push({
                type: 'error',
                category: 'Authentication',
                message: 'No security schemes detected',
                details: 'API has no authentication or authorization mechanisms.',
                severity: 'high'
            });
        }

        // Check for sensitive endpoints without security
        const sensitiveEndpoints = endpoints.filter(ep => 
            (ep.method === 'POST' || ep.method === 'PUT' || ep.method === 'DELETE') &&
            (!ep.operation.security || ep.operation.security.length === 0) &&
            !hasGlobalSecurity
        );
        
        if (sensitiveEndpoints.length > 0) {
            results.push({
                type: 'warning',
                category: 'Authorization',
                message: 'Sensitive endpoints without security',
                details: `${sensitiveEndpoints.length} POST/PUT/DELETE endpoints lack security.`,
                severity: 'high'
            });
        }

        return results;
    }

    async findUnusedSchemas(spec: any): Promise<string[]> {
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

        // Check all paths for schema references
        findReferences(spec.paths);

        return Object.keys(schemas).filter(name => !usedSchemas.has(name));
    }
}