import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Code, 
  AlertTriangle, 
  Layers, 
  Shield, 
  Tag, 
  Clock, 
  TrendingUp, 
  BarChart3,
  Info,
  Download,
  FileText,
  Eye,
  Users
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
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Focus the close button when modal opens
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'Tab':
        // Focus trapping
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements?.length) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
        break;
    }
  }, [isOpen, onClose]);

  // Click outside to close
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ComponentType<any>;
    color: string;
    subtitle?: string;
    description?: string;
  }> = ({ title, value, icon: Icon, color, subtitle, description }) => (
    <article className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </h3>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white break-words">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${color}`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" aria-hidden="true" />
        </div>
      </div>
      {description && (
        <p className="sr-only">{description}</p>
      )}
    </article>
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
      <section className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700">
        <header className="flex items-center gap-2 mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {showInfo && (
            <div className="relative">
              <button
                onMouseEnter={() => setShowComplexityInfo(true)}
                onMouseLeave={() => setShowComplexityInfo(false)}
                onFocus={() => setShowComplexityInfo(true)}
                onBlur={() => setShowComplexityInfo(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors touch-target-sm focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Show complexity information"
                aria-describedby="complexity-tooltip"
              >
                <Info className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
              </button>
              
              {showComplexityInfo && (
                <div 
                  id="complexity-tooltip"
                  className="absolute left-0 top-8 z-50 w-64 sm:w-80 p-3 sm:p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
                  role="tooltip"
                >
                  {infoContent}
                </div>
              )}
            </div>
          )}
        </header>
        
        <div className="space-y-3" role="list" aria-label={`${title} distribution`}>
          {Object.entries(data).map(([key, count]) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={key} className="space-y-1" role="listitem">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {key}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${colors[key] || 'bg-blue-500'}`}
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${key}: ${percentage.toFixed(1)}%`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const methodColors: { [key: string]: string } = {
    get: 'bg-green-500',
    post: 'bg-blue-500',
    put: 'bg-yellow-500',
    patch: 'bg-orange-500',
    delete: 'bg-red-500',
    head: 'bg-purple-500',
    options: 'bg-indigo-500'
  };

  const complexityColors: { [key: string]: string } = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-red-500'
  };

  const responseCodeColors: { [key: string]: string } = {
    '200': 'bg-green-500',
    '201': 'bg-green-400',
    '400': 'bg-orange-500',
    '401': 'bg-red-400',
    '404': 'bg-red-500',
    '500': 'bg-red-600'
  };

  const complexityInfoContent = (
    <div className="text-sm text-gray-700 dark:text-gray-300">
      <h4 className="font-semibold mb-2">Complexity Levels:</h4>
      <ul className="space-y-1 text-xs">
        <li><span className="font-medium text-green-600">Low:</span> Simple CRUD operations</li>
        <li><span className="font-medium text-yellow-600">Medium:</span> Multiple parameters or complex responses</li>
        <li><span className="font-medium text-red-600">High:</span> Complex business logic or multiple dependencies</li>
      </ul>
    </div>
  );

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="analytics-title"
      onKeyDown={handleKeyDown}
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-7xl my-4 sm:my-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 
              id="analytics-title"
              className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white"
            >
              API Analytics Dashboard
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Comprehensive analysis of your OpenAPI specification
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-target focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-50"
            aria-label="Close analytics dashboard"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {/* Overview Stats */}
          <section aria-labelledby="overview-heading">
            <h3 id="overview-heading" className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Overview Statistics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <StatCard
                title="Total Endpoints"
                value={analytics.totalEndpoints}
                icon={Code}
                color="bg-blue-500"
                description="Total number of API endpoints in the specification"
              />
              <StatCard
                title="Deprecated"
                value={analytics.deprecatedCount}
                icon={AlertTriangle}
                color="bg-orange-500"
                subtitle={`${((analytics.deprecatedCount / analytics.totalEndpoints) * 100).toFixed(1)}% of total`}
                description="Number of deprecated endpoints requiring attention"
              />
              <StatCard
                title="Avg Parameters"
                value={analytics.averageParametersPerEndpoint.toFixed(1)}
                icon={Layers}
                color="bg-purple-500"
                subtitle="per endpoint"
                description="Average number of parameters across all endpoints"
              />
              <StatCard
                title="Security Schemes"
                value={analytics.securitySchemes.length}
                icon={Shield}
                color="bg-green-500"
                description="Number of security schemes configured"
              />
            </div>
          </section>

          {/* Distribution Charts */}
          <section aria-labelledby="distribution-heading">
            <h3 id="distribution-heading" className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Distribution Analysis
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
              <DistributionChart
                title="Response Codes Distribution"
                data={analytics.responseCodeDistribution}
                colors={responseCodeColors}
              />
              
              {/* Tags Distribution */}
              <section className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Top Tags
                </h4>
                <div className="space-y-3 max-h-64 overflow-y-auto" role="list" aria-label="API tags distribution">
                  {Object.entries(analytics.tagDistribution)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 8)
                    .map(([tag, count]) => (
                      <div key={tag} className="flex items-center justify-between py-1" role="listitem">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Tag className="h-4 w-4 text-blue-500 flex-shrink-0" aria-hidden="true" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                            {tag}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400 ml-2 flex-shrink-0">
                          {count} endpoint{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                </div>
              </section>
            </div>
          </section>

          {/* Path Patterns */}
          <section aria-labelledby="patterns-heading">
            <h3 id="patterns-heading" className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Path Patterns Analysis
            </h3>
                         <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list" aria-label="Common path patterns">
                 {analytics.pathPatterns
                   .slice(0, 6)
                   .map((pattern, index) => (
                     <div 
                       key={index} 
                       className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                       role="listitem"
                     >
                       <div className="text-sm font-medium text-gray-900 dark:text-white break-all">
                         {pattern}
                       </div>
                     </div>
                   ))}
               </div>
             </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="flex flex-col sm:flex-row gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-target focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-opacity-50"
            aria-label="Close analytics dashboard"
          >
            Close
          </button>
          <button
            onClick={() => {
              // Export functionality would be implemented here
              console.log('Exporting analytics data...');
            }}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 touch-target focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-50"
            aria-label="Export analytics data"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>Export Data</span>
          </button>
        </footer>
      </div>
    </div>
  );
};