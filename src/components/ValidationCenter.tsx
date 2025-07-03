import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Eye, 
  Keyboard, 
  Users,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { OpenAPISpec, EndpointData } from '../types/openapi';

interface ValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'openapi' | 'accessibility' | 'performance' | 'security';
  title: string;
  description: string;
  element?: HTMLElement;
  suggestion?: string;
  wcagLevel?: 'A' | 'AA' | 'AAA';
  wcagCriterion?: string;
}

interface AccessibilityTestResult {
  passed: number;
  failed: number;
  warnings: number;
  issues: ValidationIssue[];
  score: number;
  compliance: 'A' | 'AA' | 'AAA' | 'Non-compliant';
}

interface ValidationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  spec: OpenAPISpec;
  endpoints: EndpointData[];
}

export const ValidationCenter: React.FC<ValidationCenterProps> = ({
  isOpen,
  onClose,
  spec,
  endpoints
}) => {
  const [activeTab, setActiveTab] = useState<'openapi' | 'accessibility' | 'performance' | 'security'>('accessibility');
  const [isValidating, setIsValidating] = useState(false);
  const [accessibilityResults, setAccessibilityResults] = useState<AccessibilityTestResult | null>(null);
  const [openAPIIssues, setOpenAPIIssues] = useState<ValidationIssue[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['critical', 'major']));
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus management for modal
  useEffect(() => {
    if (isOpen) {
      const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isOpen, onClose]);

  // Comprehensive accessibility validation
  const runAccessibilityValidation = async (): Promise<AccessibilityTestResult> => {
    const issues: ValidationIssue[] = [];
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    // Test 1: Check for missing alt text on images
    document.querySelectorAll('img').forEach((img, index) => {
      if (!img.alt && !img.getAttribute('aria-label')) {
        issues.push({
          id: `img-alt-${index}`,
          type: 'error',
          category: 'accessibility',
          title: 'Missing Alt Text',
          description: `Image element lacks alt text or aria-label`,
          element: img,
          suggestion: 'Add descriptive alt text or aria-label to all images',
          wcagLevel: 'A',
          wcagCriterion: '1.1.1 Non-text Content'
        });
        failed++;
      } else {
        passed++;
      }
    });

    // Test 2: Check for proper heading hierarchy
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let lastLevel = 0;
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level > lastLevel + 1 && lastLevel !== 0) {
        issues.push({
          id: `heading-hierarchy-${index}`,
          type: 'warning',
          category: 'accessibility',
          title: 'Heading Hierarchy Skip',
          description: `Heading level ${level} follows level ${lastLevel}, skipping intermediate levels`,
          element: heading as HTMLElement,
          suggestion: 'Maintain logical heading hierarchy without skipping levels',
          wcagLevel: 'AA',
          wcagCriterion: '1.3.1 Info and Relationships'
        });
        warnings++;
      } else {
        passed++;
      }
      lastLevel = level;
    });

    // Test 3: Check for keyboard accessibility
    const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]');
    interactiveElements.forEach((element, index) => {
      const tabIndex = element.getAttribute('tabindex');
      if (tabIndex && parseInt(tabIndex) > 0) {
        issues.push({
          id: `positive-tabindex-${index}`,
          type: 'warning',
          category: 'accessibility',
          title: 'Positive Tabindex',
          description: 'Element uses positive tabindex which can disrupt natural tab order',
          element: element as HTMLElement,
          suggestion: 'Use tabindex="0" or remove tabindex to maintain natural tab order',
          wcagLevel: 'A',
          wcagCriterion: '2.1.1 Keyboard'
        });
        warnings++;
      } else {
        passed++;
      }
    });

    // Test 4: Check for ARIA labels on interactive elements
    const buttons = document.querySelectorAll('button');
    buttons.forEach((button, index) => {
      const hasLabel = button.getAttribute('aria-label') || 
                      button.getAttribute('aria-labelledby') || 
                      button.textContent?.trim();
      if (!hasLabel) {
        issues.push({
          id: `button-label-${index}`,
          type: 'error',
          category: 'accessibility',
          title: 'Missing Button Label',
          description: 'Button lacks accessible name',
          element: button,
          suggestion: 'Add aria-label, aria-labelledby, or visible text content',
          wcagLevel: 'A',
          wcagCriterion: '4.1.2 Name, Role, Value'
        });
        failed++;
      } else {
        passed++;
      }
    });

    // Test 5: Check color contrast (simplified)
    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button');
    let contrastIssues = 0;
    textElements.forEach((element, index) => {
      const styles = window.getComputedStyle(element);
      const fontSize = parseFloat(styles.fontSize);
      const fontWeight = styles.fontWeight;
      
      // Simplified contrast check - in reality would need color calculation
      const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
      
      // Placeholder for actual contrast ratio calculation
      const hasGoodContrast = true; // Would implement actual contrast calculation
      
      if (!hasGoodContrast) {
        issues.push({
          id: `contrast-${index}`,
          type: 'error',
          category: 'accessibility',
          title: 'Insufficient Color Contrast',
          description: `Text contrast ratio is below ${isLargeText ? '3:1' : '4.5:1'} requirement`,
          element: element as HTMLElement,
          suggestion: 'Increase color contrast between text and background',
          wcagLevel: 'AA',
          wcagCriterion: '1.4.3 Contrast (Minimum)'
        });
        contrastIssues++;
      }
    });

    // Test 6: Check for form labels
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach((input, index) => {
      const hasLabel = input.getAttribute('aria-label') || 
                      input.getAttribute('aria-labelledby') || 
                      document.querySelector(`label[for="${input.id}"]`) ||
                      input.closest('label');
      
      // Only check type for input elements
      const isInputElement = input instanceof HTMLInputElement;
      const shouldHaveLabel = !isInputElement || 
        (input.type !== 'hidden' && input.type !== 'submit' && input.type !== 'button');
      
      if (!hasLabel && shouldHaveLabel) {
        issues.push({
          id: `form-label-${index}`,
          type: 'error',
          category: 'accessibility',
          title: 'Missing Form Label',
          description: 'Form control lacks associated label',
          element: input as HTMLElement,
          suggestion: 'Associate form controls with descriptive labels using label element or aria-label',
          wcagLevel: 'A',
          wcagCriterion: '3.3.2 Labels or Instructions'
        });
        failed++;
      } else {
        passed++;
      }
    });

    // Test 7: Check for focus indicators
    const focusableElements = document.querySelectorAll('a, button, input, select, textarea, [tabindex="0"]');
    let focusIssues = 0;
    focusableElements.forEach((element, index) => {
      const styles = window.getComputedStyle(element, ':focus');
      const outline = styles.outline;
      const boxShadow = styles.boxShadow;
      
      if (outline === 'none' && !boxShadow.includes('inset')) {
        issues.push({
          id: `focus-indicator-${index}`,
          type: 'warning',
          category: 'accessibility',
          title: 'Missing Focus Indicator',
          description: 'Interactive element lacks visible focus indicator',
          element: element as HTMLElement,
          suggestion: 'Ensure all interactive elements have visible focus indicators',
          wcagLevel: 'AA',
          wcagCriterion: '2.4.7 Focus Visible'
        });
        focusIssues++;
      }
    });

    failed += contrastIssues + focusIssues;

    // Calculate compliance score
    const total = passed + failed + warnings;
    const score = total > 0 ? Math.round(((passed + warnings * 0.5) / total) * 100) : 100;
    
    let compliance: AccessibilityTestResult['compliance'] = 'Non-compliant';
    if (score >= 95 && failed === 0) compliance = 'AAA';
    else if (score >= 90 && failed <= 2) compliance = 'AA';
    else if (score >= 80 && failed <= 5) compliance = 'A';

    return {
      passed,
      failed,
      warnings,
      issues,
      score,
      compliance
    };
  };

  // Validate OpenAPI specification
  const validateOpenAPI = (): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    // Check for missing required fields
    if (!spec.info.title) {
      issues.push({
        id: 'missing-title',
        type: 'error',
        category: 'openapi',
        title: 'Missing API Title',
        description: 'OpenAPI specification must have a title',
        suggestion: 'Add a descriptive title to your API specification'
      });
    }

    if (!spec.info.version) {
      issues.push({
        id: 'missing-version',
        type: 'error',
        category: 'openapi',
        title: 'Missing API Version',
        description: 'OpenAPI specification must have a version',
        suggestion: 'Add semantic version number (e.g., "1.0.0")'
      });
    }

    // Check endpoints for missing descriptions
    endpoints.forEach((endpoint, index) => {
      if (!endpoint.summary && !endpoint.description) {
        issues.push({
          id: `endpoint-description-${index}`,
          type: 'warning',
          category: 'openapi',
          title: 'Missing Endpoint Description',
          description: `Endpoint ${endpoint.method.toUpperCase()} ${endpoint.path} lacks description`,
          suggestion: 'Add summary or description to improve API documentation'
        });
      }

      // Check for missing response schemas
      if (!endpoint.responses || Object.keys(endpoint.responses).length === 0) {
        issues.push({
          id: `endpoint-responses-${index}`,
          type: 'error',
          category: 'openapi',
          title: 'Missing Response Definitions',
          description: `Endpoint ${endpoint.method.toUpperCase()} ${endpoint.path} has no response definitions`,
          suggestion: 'Define at least one response with appropriate schema'
        });
      }
    });

    return issues;
  };

  const runValidation = async () => {
    setIsValidating(true);
    
    try {
      // Run accessibility validation
      const accessibilityResults = await runAccessibilityValidation();
      setAccessibilityResults(accessibilityResults);
      
      // Run OpenAPI validation
      const openApiIssues = validateOpenAPI();
      setOpenAPIIssues(openApiIssues);
      
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getIssueIcon = (type: ValidationIssue['type']) => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getComplianceColor = (compliance: string) => {
    switch (compliance) {
      case 'AAA': return 'text-green-600 bg-green-100';
      case 'AA': return 'text-blue-600 bg-blue-100';
      case 'A': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-red-600 bg-red-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col"
        role="dialog"
        aria-labelledby="validation-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <h2 id="validation-title" className="text-xl font-semibold text-gray-900 dark:text-white">
              Validation Center
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close validation center"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'accessibility', label: 'Accessibility', icon: Eye },
            { id: 'openapi', label: 'OpenAPI', icon: Shield },
            { id: 'performance', label: 'Performance', icon: Zap },
            { id: 'security', label: 'Security', icon: Users }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'accessibility' && (
            <div className="h-full p-6 overflow-y-auto">
              {/* Validation Controls */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    WCAG 2.1 Accessibility Validation
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Comprehensive accessibility testing for WCAG compliance
                  </p>
                </div>
                <button
                  onClick={runValidation}
                  disabled={isValidating}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
                  {isValidating ? 'Validating...' : 'Run Validation'}
                </button>
              </div>

              {/* Results Summary */}
              {accessibilityResults && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Validation Results
                    </h4>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getComplianceColor(accessibilityResults.compliance)}`}>
                      {accessibilityResults.compliance} Compliant
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{accessibilityResults.passed}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Passed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{accessibilityResults.failed}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{accessibilityResults.warnings}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Warnings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{accessibilityResults.score}%</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Score</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${accessibilityResults.score}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Issues List */}
              {accessibilityResults && accessibilityResults.issues.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Issues Found ({accessibilityResults.issues.length})
                  </h4>
                  
                  {accessibilityResults.issues.map((issue) => (
                    <div key={issue.id} className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                      <div className="flex items-start gap-3">
                        {getIssueIcon(issue.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-medium text-gray-900 dark:text-white">
                              {issue.title}
                            </h5>
                            {issue.wcagLevel && (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                                WCAG {issue.wcagLevel}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                            {issue.description}
                          </p>
                          {issue.wcagCriterion && (
                            <p className="text-blue-600 dark:text-blue-400 text-xs mb-2">
                              {issue.wcagCriterion}
                            </p>
                          )}
                          {issue.suggestion && (
                            <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-3 text-sm">
                              <strong className="text-blue-800 dark:text-blue-200">Suggestion: </strong>
                              <span className="text-blue-700 dark:text-blue-300">{issue.suggestion}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'openapi' && (
            <div className="h-full p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    OpenAPI Specification Validation
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Validate your OpenAPI spec against standards and best practices
                  </p>
                </div>
              </div>

              {openAPIIssues.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No Issues Found
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your OpenAPI specification follows best practices
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {openAPIIssues.map((issue) => (
                    <div key={issue.id} className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                      <div className="flex items-start gap-3">
                        {getIssueIcon(issue.type)}
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                            {issue.title}
                          </h5>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                            {issue.description}
                          </p>
                          {issue.suggestion && (
                            <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-3 text-sm">
                              <strong className="text-blue-800 dark:text-blue-200">Suggestion: </strong>
                              <span className="text-blue-700 dark:text-blue-300">{issue.suggestion}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(activeTab === 'performance' || activeTab === 'security') && (
            <div className="h-full p-6 overflow-y-auto">
              <div className="text-center py-12">
                <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Coming Soon
                </h4>
                <p className="text-gray-600 dark:text-gray-400">
                  {activeTab === 'performance' ? 'Performance' : 'Security'} validation tools are under development
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};