import React, { useState } from 'react';
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

  const handleViewDetails = () => {
    if (onSelect) {
      onSelect(endpoint);
    } else {
      // If no onSelect handler is provided, toggle expanded state as fallback
      setIsExpanded(!isExpanded);
    }
  };

  const densityClasses = {
    compact: 'p-3',
    comfortable: 'p-4',
    spacious: 'p-6'
  };

  const cardClasses = view.layout === 'compact' 
    ? 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 hover:border-blue-200 dark:hover:border-blue-600'
    : 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 hover:border-blue-200 dark:hover:border-blue-600';

  if (view.layout === 'table') {
    return (
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
        <td className="px-4 py-3">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getMethodColor(endpoint.method)}`}>
            {endpoint.method}
          </span>
        </td>
        <td className="px-4 py-3">
          <code className="text-sm font-mono text-gray-700 dark:text-gray-300">
            {endpoint.path}
          </code>
        </td>
        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
          {endpoint.summary || 'No summary'}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {endpoint.tags.slice(0, 2).map(tag => (
              <span key={tag} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                {tag}
              </span>
            ))}
            {endpoint.tags.length > 2 && (
              <span className="text-xs text-gray-500">+{endpoint.tags.length - 2}</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          {endpoint.complexity && (
            <span className={`px-2 py-1 rounded text-xs font-medium border ${getComplexityColor(endpoint.complexity)}`}>
              {endpoint.complexity}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          {endpoint.deprecated && (
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          )}
        </td>
      </tr>
    );
  }

  return (
    <div className={cardClasses}>
      {/* Header */}
      <div 
        className={`${densityClasses[view.density]} cursor-pointer`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-md text-sm font-medium ${getMethodColor(endpoint.method)}`}>
                {endpoint.method}
              </span>
              <code className="text-sm font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                {endpoint.path}
              </code>
              {endpoint.deprecated && (
                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs font-medium">DEPRECATED</span>
                </div>
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {endpoint.summary || 'No summary available'}
            </h3>
            
            {view.showDetails && endpoint.description && (
              <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-3">
                {endpoint.description}
              </p>
            )}

            {/* Metadata badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {endpoint.complexity && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getComplexityColor(endpoint.complexity)}`}>
                  <Layers className="h-3 w-3" />
                  {endpoint.complexity}
                </span>
              )}
              
              {endpoint.estimatedResponseTime && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getResponseTimeColor(endpoint.estimatedResponseTime)}`}>
                  <Clock className="h-3 w-3" />
                  {endpoint.estimatedResponseTime}
                </span>
              )}

              {endpoint.security && endpoint.security.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded border border-purple-200 dark:border-purple-700">
                  <Shield className="h-3 w-3" />
                  secured
                </span>
              )}

              {endpoint.parameters.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded border border-gray-200 dark:border-gray-600">
                  <Hash className="h-3 w-3" />
                  {endpoint.parameters.length} param{endpoint.parameters.length !== 1 ? 's' : ''}
                </span>
              )}

              {endpoint.hasRequestBody && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded border border-blue-200 dark:border-blue-700">
                  <FileText className="h-3 w-3" />
                  body
                </span>
              )}
            </div>

            {endpoint.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {endpoint.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button className="ml-4 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Business Context */}
          {view.showBusinessContext && endpoint.businessContext && (
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Business Context</h4>
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                {endpoint.businessContext}
              </p>
            </div>
          )}

          {/* AI Suggestions */}
          {view.showAISuggestions && endpoint.aiSuggestions && endpoint.aiSuggestions.length > 0 && (
            <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border-b border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                AI Suggestions
              </h4>
              <ul className="space-y-2">
                {endpoint.aiSuggestions.map((suggestion, index) => (
                  <li key={index} className="text-yellow-800 dark:text-yellow-200 text-sm flex items-start gap-2">
                    <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Parameters */}
          {endpoint.parameters.length > 0 && (
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Parameters</h4>
              <div className="space-y-3">
                {endpoint.parameters.map((param, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-sm font-mono text-blue-600 dark:text-blue-400">
                        {param.name}
                      </code>
                      <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                        {param.in}
                      </span>
                      {param.required && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          required
                        </span>
                      )}
                    </div>
                    {param.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {param.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Responses */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Responses</h4>
            <div className="space-y-3">
              {Object.entries(endpoint.responses).map(([code, response]) => (
                <div key={code} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      code.startsWith('2') ? 'bg-green-100 text-green-800' :
                      code.startsWith('4') ? 'bg-yellow-100 text-yellow-800' :
                      code.startsWith('5') ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {code}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {response.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Code Examples */}
          {view.showCodeExamples && (
            <div className="p-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Code Example</h4>
              <div className="bg-gray-900 rounded-lg p-4 relative">
                <button
                  onClick={() => copyToClipboard(generateCurlExample(), 'curl')}
                  className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded transition-colors"
                >
                  {copiedText === 'curl' ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                <pre className="text-green-400 text-sm overflow-x-auto">
                  <code>{generateCurlExample()}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            <button
              onClick={handleViewDetails}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View Details
            </button>
            <button
              onClick={() => copyToClipboard(endpoint.path, 'path')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              {copiedText === 'path' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy Path
            </button>
          </div>
        </div>
      )}
    </div>
  );
};