import React from 'react';
import { BarChart3, TrendingUp, Zap, CheckCircle, Lightbulb } from 'lucide-react';

interface AnalyticsTabProps {
  analytics: {
    summary: {
      totalSchemas: number;
      totalProperties: number;
      avgComplexity: number;
      dependencyRatio: number;
    };
    health: {
      score: number;
      issues: {
        total: number;
        errors: number;
        warnings: number;
        info: number;
        schemasWithIssues: number;
        totalSchemas: number;
      };
      recommendations: string[];
    };
  };
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ analytics }) => (
  <div className="h-full p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Analytics Header */}
      <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          Schema Analytics
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Deep insights into your API's structure and quality.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Schemas */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Schemas</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{analytics.summary.totalSchemas}</p>
        </div>
        {/* Total Properties */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Properties</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{analytics.summary.totalProperties}</p>
        </div>
        {/* Avg Complexity */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Complexity</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{analytics.summary.avgComplexity.toFixed(2)}</p>
        </div>
        {/* Dependency Ratio */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-sm text-gray-600 dark:text-gray-400">Dependency Ratio</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{(analytics.summary.dependencyRatio * 100).toFixed(1)}%</p>
        </div>
      </div>

      {/* Health Score & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Overall Health Score
          </h4>
          <div className="flex items-center justify-center gap-6">
            <div className="relative">
              <svg className="h-40 w-40 transform -rotate-90">
                <circle cx="80" cy="80" r="60" stroke="currentColor" strokeWidth="12" className="text-gray-200 dark:text-gray-700" fill="transparent" />
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray={2 * Math.PI * 60}
                  strokeDashoffset={2 * Math.PI * 60 * (1 - analytics.health.score / 100)}
                  className="text-blue-600"
                  fill="transparent"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-gray-900 dark:text-white">
                {analytics.health.score}%
              </span>
            </div>
            <div className="flex-1">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-600">Errors</span>
                  <span className="font-medium">{analytics.health.issues.errors}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-yellow-600">Warnings</span>
                  <span className="font-medium">{analytics.health.issues.warnings}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-600">Info</span>
                  <span className="font-medium">{analytics.health.issues.info}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-600">Clean Schemas</span>
                  <span className="font-medium">{analytics.health.issues.totalSchemas - analytics.health.issues.schemasWithIssues}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-green-600" />
            Recommendations
          </h4>
          {analytics.health.recommendations.length > 0 ? (
            <div className="space-y-3">
              {analytics.health.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Lightbulb className="h-4 w-4 text-yellow-600 mt-1 flex-shrink-0" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">{rec}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-800 dark:text-green-200">
                Excellent! No critical recommendations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
