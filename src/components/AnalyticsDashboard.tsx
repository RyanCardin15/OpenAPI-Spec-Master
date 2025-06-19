import React, { useState } from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Shield, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Code,
  Tag,
  Layers,
  Info
} from 'lucide-react';
import { AnalyticsData } from '../types/openapi';

interface AnalyticsDashboardProps {
  analytics: AnalyticsData;
  isOpen: boolean;
  onClose: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  analytics,
  isOpen,
  onClose
}) => {
  const [showComplexityInfo, setShowComplexityInfo] = useState(false);

  if (!isOpen) return null;

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ComponentType<any>;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  const DistributionChart: React.FC<{
    title: string;
    data: { [key: string]: number };
    colors: { [key: string]: string };
    showInfo?: boolean;
    infoContent?: React.ReactNode;
  }> = ({ title, data, colors, showInfo, infoContent }) => {
    const total = Object.values(data).reduce((sum, count) => sum + count, 0);
    
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          {showInfo && (
            <div className="relative">
              <button
                onMouseEnter={() => setShowComplexityInfo(true)}
                onMouseLeave={() => setShowComplexityInfo(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <Info className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
              
              {showComplexityInfo && (
                <div className="absolute left-0 top-8 z-50 w-80 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                  {infoContent}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-3">
          {Object.entries(data).map(([key, count]) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-3 h-3 rounded-full ${colors[key] || 'bg-gray-400'}`}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {key.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {count}
                  </span>
                  <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${colors[key] || 'bg-gray-400'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const methodColors = {
    GET: 'bg-green-500',
    POST: 'bg-blue-500',
    PUT: 'bg-orange-500',
    PATCH: 'bg-yellow-500',
    DELETE: 'bg-red-500',
    OPTIONS: 'bg-gray-500',
    HEAD: 'bg-purple-500',
    TRACE: 'bg-pink-500'
  };

  const complexityColors = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-red-500'
  };

  const responseCodeColors = {
    '200': 'bg-green-500',
    '201': 'bg-green-400',
    '204': 'bg-green-300',
    '400': 'bg-yellow-500',
    '401': 'bg-orange-500',
    '403': 'bg-orange-600',
    '404': 'bg-red-400',
    '500': 'bg-red-500'
  };

  const complexityInfoContent = (
    <div className="text-sm">
      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
        🧮 How Complexity is Calculated
      </h4>
      <div className="space-y-2 text-gray-700 dark:text-gray-300">
        <div><strong>Low (≤2 points):</strong> Simple endpoints with few parameters</div>
        <div><strong>Medium (3-5 points):</strong> Moderate complexity with request bodies</div>
        <div><strong>High (&gt;5 points):</strong> Complex endpoints with many parameters, security, etc.</div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
        <h5 className="font-medium text-gray-900 dark:text-white mb-1">Scoring factors:</h5>
        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Parameters: +0.5 each</li>
          <li>• Request body: +2 points</li>
          <li>• Multiple responses: +0.3 each</li>
          <li>• Security: +1 point</li>
          <li>• Multiple tags: +0.5 points</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-xl">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              API Analytics Dashboard
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Endpoints"
              value={analytics.totalEndpoints}
              icon={Code}
              color="bg-blue-500"
            />
            <StatCard
              title="Deprecated"
              value={analytics.deprecatedCount}
              icon={AlertTriangle}
              color="bg-orange-500"
              subtitle={`${((analytics.deprecatedCount / analytics.totalEndpoints) * 100).toFixed(1)}% of total`}
            />
            <StatCard
              title="Avg Parameters"
              value={analytics.averageParametersPerEndpoint.toFixed(1)}
              icon={Layers}
              color="bg-purple-500"
              subtitle="per endpoint"
            />
            <StatCard
              title="Security Schemes"
              value={analytics.securitySchemes.length}
              icon={Shield}
              color="bg-green-500"
            />
          </div>

          {/* Distribution Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DistributionChart
              title="HTTP Methods Distribution"
              data={analytics.methodDistribution}
              colors={methodColors}
            />
            <DistributionChart
              title="Complexity Distribution"
              data={analytics.complexityDistribution}
              colors={complexityColors}
              showInfo={true}
              infoContent={complexityInfoContent}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DistributionChart
              title="Response Codes Distribution"
              data={analytics.responseCodeDistribution}
              colors={responseCodeColors}
            />
            
            {/* Tags Distribution */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Tags
              </h3>
              <div className="space-y-3">
                {Object.entries(analytics.tagDistribution)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 8)
                  .map(([tag, count]) => (
                    <div key={tag} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {tag}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {count} endpoint{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Path Patterns */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Common Path Patterns
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.pathPatterns.slice(0, 9).map((pattern, index) => (
                <div 
                  key={index}
                  className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"
                >
                  <code className="text-sm text-gray-800 dark:text-gray-200">
                    {pattern}
                  </code>
                </div>
              ))}
            </div>
          </div>

          {/* Security Schemes */}
          {analytics.securitySchemes.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Security Schemes
              </h3>
              <div className="flex flex-wrap gap-2">
                {analytics.securitySchemes.map((scheme, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-sm font-medium"
                  >
                    {scheme}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};