import React, { useState, useRef, useCallback } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Tag, 
  AlertTriangle, 
  Lightbulb, 
  Copy, 
  ExternalLink, 
  CheckCircle,
  Shield,
  Clock,
  Layers,
  Hash,
  FileText
} from 'lucide-react';
import { EndpointData, ViewState } from '../types/openapi';

interface EndpointCardProps {
  endpoint: EndpointData;
  view: ViewState;
  onSelect?: (endpoint: EndpointData) => void;
}

export const EndpointCard: React.FC<EndpointCardProps> = ({ endpoint, view, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIsExpanded(!isExpanded);
        break;
      case 'Escape':
        if (isExpanded) {
          e.preventDefault();
          setIsExpanded(false);
          expandButtonRef.current?.focus();
        }
        break;
    }
  }, [isExpanded]);

  // Copy functionality with keyboard support
  const handleCopyKeyDown = useCallback((e: React.KeyboardEvent, text: string, label: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      copyToClipboard(text, label);
    }
  }, []);

  const getMethodColor = (method: string) => {
    const colors = {
      GET: 'bg-green-500 text-white',
      POST: 'bg-blue-500 text-white',
      PUT: 'bg-orange-500 text-white',
      PATCH: 'bg-yellow-500 text-white',
      DELETE: 'bg-red-500 text-white',
      OPTIONS: 'bg-gray-500 text-white',
      HEAD: 'bg-purple-500 text-white',
      TRACE: 'bg-pink-500 text-white'
    };
    return colors[method as keyof typeof colors] || 'bg-gray-500 text-white';
  };

  const getComplexityColor = (complexity?: string) => {
    switch (complexity) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700';
      case 'high': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600';
    }
  };

  const getResponseTimeColor = (time?: string) => {
    switch (time) {
      case 'fast': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700';
      case 'slow': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600';
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const generateCurlExample = () => {
    const method = endpoint.method.toLowerCase();
    let curl = `curl -X ${endpoint.method} "${endpoint.path}"`;
    
    if (endpoint.parameters?.some(p => p.in === 'header')) {
      curl += ` \\\n  -H "Content-Type: application/json"`;
    }
    
    if (endpoint.requestBody && (method === 'post' || method === 'put' || method === 'patch')) {
      curl += ` \\\n  -d '{"example": "data"}'`;
    }
    
    return curl;
  };

  const densityClasses = {
    compact: 'p-3 sm:p-4',
    comfortable: 'p-4 sm:p-5',
    spacious: 'p-6 sm:p-8'
  };

  const cardClasses = view.layout === 'compact' 
    ? 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 hover:border-blue-200 dark:hover:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-50'
    : 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 hover:border-blue-200 dark:hover:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-50';

  if (view.layout === 'table') {
    return (
      <tr 
        className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 focus-within:bg-blue-50 dark:focus-within:bg-blue-900/20"
        role="row"
      >
        <td className="px-3 py-3 sm:px-4" role="gridcell">
          <span 
            className={`px-2 py-1 rounded text-xs font-medium ${getMethodColor(endpoint.method)} touch-target-sm`}
            role="status"
            aria-label={`HTTP method ${endpoint.method}`}
          >
            {endpoint.method}
          </span>
        </td>
        <td className="px-3 py-3 sm:px-4" role="gridcell">
          <code 
            className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all"
            aria-label={`API endpoint path ${endpoint.path}`}
          >
            {endpoint.path}
          </code>
        </td>
        <td className="px-3 py-3 sm:px-4 text-sm text-gray-900 dark:text-white" role="gridcell">
          {endpoint.summary || 'No summary'}
        </td>
        <td className="px-3 py-3 sm:px-4" role="gridcell">
          <div className="flex flex-wrap gap-1" role="list" aria-label="Endpoint tags">
            {endpoint.tags.slice(0, 2).map(tag => (
              <span 
                key={tag} 
                className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded touch-target-sm"
                role="listitem"
              >
                {tag}
              </span>
            ))}
            {endpoint.tags.length > 2 && (
              <span 
                className="text-xs text-gray-500"
                aria-label={`${endpoint.tags.length - 2} more tags`}
              >
                +{endpoint.tags.length - 2}
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-3 sm:px-4" role="gridcell">
          {endpoint.complexity && (
            <span 
              className={`px-2 py-1 rounded text-xs font-medium border ${getComplexityColor(endpoint.complexity)} touch-target-sm`}
              role="status"
              aria-label={`Complexity level: ${endpoint.complexity}`}
            >
              {endpoint.complexity}
            </span>
          )}
        </td>
        <td className="px-3 py-3 sm:px-4" role="gridcell">
          {endpoint.deprecated && (
            <AlertTriangle 
              className="h-4 w-4 text-orange-500" 
              aria-label="This endpoint is deprecated"
              role="img"
            />
          )}
        </td>
      </tr>
    );
  }

  return (
    <article 
      ref={cardRef}
      className={cardClasses}
      role="article"
      aria-labelledby={`endpoint-title-${endpoint.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
      aria-describedby={`endpoint-desc-${endpoint.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
    >
      {/* Header */}
      <header className={densityClasses[view.density]}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span 
                className={`px-3 py-1 rounded-md text-sm font-medium ${getMethodColor(endpoint.method)} touch-target-sm`}
                role="status"
                aria-label={`HTTP method ${endpoint.method}`}
              >
                {endpoint.method}
              </span>
              <code 
                className="text-sm font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded break-all"
                aria-label={`API endpoint path ${endpoint.path}`}
              >
                {endpoint.path}
              </code>
              {endpoint.deprecated && (
                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  <span className="text-xs font-medium" role="status">DEPRECATED</span>
                </div>
              )}
            </div>
            
            <h3 
              id={`endpoint-title-${endpoint.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
              className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1 break-words"
            >
              {endpoint.summary || 'No summary available'}
            </h3>
            
            {view.showDetails && endpoint.description && (
              <p 
                id={`endpoint-desc-${endpoint.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
                className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-3"
              >
                {endpoint.description}
              </p>
            )}

            {/* Metadata badges */}
            <div className="flex flex-wrap gap-2 mb-3" role="list" aria-label="Endpoint metadata">
              {endpoint.complexity && (
                <span 
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getComplexityColor(endpoint.complexity)} touch-target-sm`}
                  role="listitem"
                  aria-label={`Complexity level: ${endpoint.complexity}`}
                >
                  <Layers className="h-3 w-3" aria-hidden="true" />
                  {endpoint.complexity}
                </span>
              )}
              
              {endpoint.estimatedResponseTime && (
                <span 
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getResponseTimeColor(endpoint.estimatedResponseTime)} touch-target-sm`}
                  role="listitem"
                  aria-label={`Response time: ${endpoint.estimatedResponseTime}`}
                >
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {endpoint.estimatedResponseTime}
                </span>
              )}

              {endpoint.security && endpoint.security.length > 0 && (
                <span 
                  className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded border border-purple-200 dark:border-purple-700 touch-target-sm"
                  role="listitem"
                  aria-label="This endpoint requires authentication"
                >
                  <Shield className="h-3 w-3" aria-hidden="true" />
                  secured
                </span>
              )}

              {endpoint.parameters.length > 0 && (
                <span 
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded border border-gray-200 dark:border-gray-600 touch-target-sm"
                  role="listitem"
                  aria-label={`${endpoint.parameters.length} parameter${endpoint.parameters.length !== 1 ? 's' : ''}`}
                >
                  <Hash className="h-3 w-3" aria-hidden="true" />
                  {endpoint.parameters.length} param{endpoint.parameters.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Tags */}
            {endpoint.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3" role="list" aria-label="Endpoint tags">
                {endpoint.tags.map(tag => (
                  <span 
                    key={tag} 
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded touch-target-sm"
                    role="listitem"
                  >
                    <Tag className="h-3 w-3" aria-hidden="true" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Expand/Collapse Button */}
          <button
            ref={expandButtonRef}
            onClick={() => setIsExpanded(!isExpanded)}
            onKeyDown={handleKeyDown}
            className="flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-target focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-50"
            aria-expanded={isExpanded}
            aria-controls={`endpoint-details-${endpoint.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} endpoint details`}
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-500" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-500" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* Expanded Content */}
      {isExpanded && (
        <section 
          id={`endpoint-details-${endpoint.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
          className="border-t border-gray-200 dark:border-gray-700"
          aria-label="Endpoint detailed information"
        >
          {/* Business Context */}
          {view.showBusinessContext && endpoint.businessContext && (
            <div className="p-4 sm:p-6 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-sm sm:text-base">
                Business Context
              </h4>
              <p className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
                {endpoint.businessContext}
              </p>
            </div>
          )}

          {/* AI Suggestions */}
          {view.showAISuggestions && endpoint.aiSuggestions && endpoint.aiSuggestions.length > 0 && (
            <div className="p-4 sm:p-6 bg-yellow-50 dark:bg-yellow-900/20 border-b border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-3 flex items-center gap-2 text-sm sm:text-base">
                <Lightbulb className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                AI Suggestions
              </h4>
              <ul className="space-y-2" role="list">
                {endpoint.aiSuggestions.map((suggestion, index) => (
                  <li 
                    key={index} 
                    className="text-yellow-800 dark:text-yellow-200 text-sm flex items-start gap-2"
                    role="listitem"
                  >
                    <span className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" aria-hidden="true">•</span>
                    <span className="break-words">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Parameters */}
          {endpoint.parameters.length > 0 && (
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm sm:text-base">
                Parameters ({endpoint.parameters.length})
              </h4>
              <div className="space-y-3" role="list" aria-label="API parameters">
                {endpoint.parameters.map((param, index) => (
                  <div 
                    key={index} 
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                    role="listitem"
                  >
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <code 
                        className="text-sm font-mono text-blue-600 dark:text-blue-400 break-all"
                        aria-label={`Parameter name: ${param.name}`}
                      >
                        {param.name}
                      </code>
                      <span 
                        className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded touch-target-sm"
                        role="status"
                        aria-label={`Parameter location: ${param.in}`}
                      >
                        {param.in}
                      </span>
                      {param.required && (
                        <span 
                          className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded border border-red-200 dark:border-red-700 touch-target-sm"
                          role="status"
                          aria-label="Required parameter"
                        >
                          required
                        </span>
                      )}
                    </div>
                    {param.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed break-words">
                        {param.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Responses */}
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm sm:text-base">
              Response Codes
            </h4>
            <div className="space-y-3" role="list" aria-label="Response codes and descriptions">
              {Object.entries(endpoint.responses).map(([code, response]) => (
                <div 
                  key={code} 
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                  role="listitem"
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span 
                      className={`px-2 py-1 rounded text-xs font-medium touch-target-sm ${
                        code.startsWith('2') ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700' :
                        code.startsWith('4') ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700' :
                        code.startsWith('5') ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600'
                      }`}
                      role="status"
                      aria-label={`Response code ${code}`}
                    >
                      {code}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white break-words">
                      {typeof response === 'string' ? response : response.description || 'No description'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Code Examples */}
          <div className="p-4 sm:p-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm sm:text-base">
              Code Examples
            </h4>
            
            {/* cURL Example */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">cURL</span>
                <button
                  onClick={() => copyToClipboard(generateCurlExample(), 'curl')}
                  onKeyDown={(e) => handleCopyKeyDown(e, generateCurlExample(), 'curl')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors touch-target focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-50"
                  aria-label="Copy cURL example to clipboard"
                >
                  {copiedText === 'curl' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-500" aria-hidden="true" />
                  )}
                </button>
              </div>
              <div className="relative">
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto border border-gray-700">
                  <code>{generateCurlExample()}</code>
                </pre>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => copyToClipboard(endpoint.path, 'path')}
                onKeyDown={(e) => handleCopyKeyDown(e, endpoint.path, 'path')}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-target focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-50"
                aria-label="Copy endpoint path to clipboard"
              >
                {copiedText === 'path' ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
                    <span className="text-sm font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    <span className="text-sm font-medium">Copy Path</span>
                  </>
                )}
              </button>
              
              {onSelect && (
                <button
                  onClick={() => onSelect(endpoint)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors touch-target focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-50"
                  aria-label="Select this endpoint for detailed analysis"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  <span className="text-sm font-medium">Analyze</span>
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </article>
  );
};