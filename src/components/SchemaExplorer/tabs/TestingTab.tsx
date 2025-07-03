import React from 'react';
import { Zap } from 'lucide-react';

interface TestingTabProps {
  // Add any props needed for the testing tab
}

export const TestingTab: React.FC<TestingTabProps> = (props) => (
  <div className="h-full p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-center">
        <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Testing Center
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          This feature is under construction. Come back soon for automated contract testing and mock data generation!
        </p>
      </div>
    </div>
  </div>
);
