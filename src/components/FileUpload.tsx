import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Globe, Loader2, Zap } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  onTextUpload: (text: string) => void;
  onUrlUpload: (url: string) => void;
  isLoading?: boolean;
  parseProgress?: { progress: number; message: string } | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileUpload, 
  onTextUpload, 
  onUrlUpload, 
  isLoading,
  parseProgress
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'file' | 'text' | 'url'>('file');
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Focus management for tab switching
  useEffect(() => {
    switch (activeTab) {
      case 'text':
        textAreaRef.current?.focus();
        break;
      case 'url':
        urlInputRef.current?.focus();
        break;
    }
  }, [activeTab]);

  // Keyboard navigation for tabs
  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, tabId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveTab(tabId as any);
    }
  }, []);

  // Keyboard navigation for file upload
  const handleFileKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, []);

  // Keyboard navigation for demo button
  const handleDemoKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleDemoClick();
    }
  }, []);

  // Keyboard navigation for text submit
  const handleTextKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleTextSubmit();
    }
  }, [textInput]);

  // Keyboard navigation for URL submit
  const handleUrlKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUrlSubmit();
    }
  }, [urlInput]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  }, [onFileUpload]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      onTextUpload(textInput);
      setTextInput('');
      setActiveTab('file');
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onUrlUpload(urlInput);
      setUrlInput('');
      setActiveTab('file');
    }
  };

  const handleDemoClick = () => {
    const petstoreUrl = 'https://petstore.swagger.io/v2/swagger.json';
    onUrlUpload(petstoreUrl);
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const tabs = [
    { id: 'file', label: 'Upload File', icon: Upload },
    { id: 'text', label: 'Paste Text', icon: FileText },
    { id: 'url', label: 'From URL', icon: Globe }
  ];

  return (
    <section 
      className="bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 sm:p-8"
      aria-label="OpenAPI specification upload"
    >
      {/* Progress Display */}
      {parseProgress && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {parseProgress.message}
            </span>
            <span className="text-sm text-blue-600 dark:text-blue-400">
              {Math.round(parseProgress.progress)}%
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
            <div
              className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${parseProgress.progress}%` }}
              role="progressbar"
              aria-valuenow={parseProgress.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Parsing progress: ${Math.round(parseProgress.progress)}%`}
            />
          </div>
        </div>
      )}
      {/* Tab Navigation */}
      <nav className="flex justify-center mb-6 sm:mb-8" role="tablist" aria-label="Upload methods">
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tab.id}-panel`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id as any)}
                onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                className={`
                  flex items-center gap-2 px-3 py-2 sm:px-4 rounded-md text-sm font-medium transition-all touch-target-sm
                  ${isActive 
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-50'
                  }
                `}
                aria-label={`${tab.label} tab`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* File Upload Tab */}
      {activeTab === 'file' && (
        <div
          id="file-panel"
          role="tabpanel"
          aria-labelledby="file-tab"
          ref={dropZoneRef}
          className={`text-center transition-colors ${
            dragActive ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : ''
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-4" aria-hidden="true" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Upload OpenAPI Specification
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm sm:text-base">
            Drag and drop your OpenAPI spec file, or click to browse
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <div
              role="button"
              tabIndex={0}
              onKeyDown={handleFileKeyDown}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 sm:px-6 rounded-lg cursor-pointer transition-colors touch-target focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-50"
              aria-label="Choose file to upload"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span>Choose File</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.yaml,.yml"
                onChange={handleFileInput}
                className="sr-only"
                disabled={isLoading}
                aria-describedby="file-types"
              />
            </div>

            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400" aria-hidden="true">
              <div className="h-px bg-gray-300 dark:bg-gray-600 w-6 sm:w-8"></div>
              <span className="text-sm font-medium">OR</span>
              <div className="h-px bg-gray-300 dark:bg-gray-600 w-6 sm:w-8"></div>
            </div>

            <button
              onClick={handleDemoClick}
              onKeyDown={handleDemoKeyDown}
              disabled={isLoading}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-3 px-4 sm:px-6 rounded-lg transition-all transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg hover:shadow-xl touch-target focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-opacity-50"
              aria-label="Load Petstore API demo"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Loading Demo...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" aria-hidden="true" />
                  <span>Try Demo</span>
                </>
              )}
            </button>
          </div>

          {/* Demo Info */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3 text-left">
              <div className="p-2 bg-green-500 rounded-lg flex-shrink-0">
                <Zap className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-semibold text-green-900 dark:text-green-100 text-sm mb-1">
                  🚀 Try the Demo
                </h4>
                <p className="text-green-800 dark:text-green-200 text-sm leading-relaxed">
                  Click "Try Demo" to instantly load the Petstore API example and explore all features
                </p>
              </div>
            </div>
          </div>

          <div 
            id="file-types"
            className="mt-6 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400"
            role="note"
          >
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" aria-hidden="true" />
            <span>Supports OpenAPI 3.0+ and Swagger 2.0 in JSON or YAML format</span>
          </div>
        </div>
      )}

      {/* Text Input Tab */}
      {activeTab === 'text' && (
        <div
          id="text-panel"
          role="tabpanel"
          aria-labelledby="text-tab"
          className="text-center"
        >
          <FileText className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-4" aria-hidden="true" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Paste OpenAPI Specification
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm sm:text-base">
            Paste your OpenAPI specification text below
          </p>

          <div className="space-y-4">
            <div className="text-left">
              <label 
                htmlFor="spec-text"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                OpenAPI Specification
              </label>
              <textarea
                id="spec-text"
                ref={textAreaRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleTextKeyDown}
                placeholder="Paste your OpenAPI specification here..."
                className="w-full h-32 sm:h-40 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                aria-describedby="text-help"
              />
              <p 
                id="text-help"
                className="mt-2 text-xs text-gray-500 dark:text-gray-400"
              >
                Press Ctrl+Enter (or Cmd+Enter on Mac) to submit
              </p>
            </div>

            <button
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || isLoading}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors touch-target focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-50"
              aria-label="Submit pasted specification text"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                  Processing...
                </>
              ) : (
                'Upload Text'
              )}
            </button>
          </div>
        </div>
      )}

      {/* URL Input Tab */}
      {activeTab === 'url' && (
        <div
          id="url-panel"
          role="tabpanel"
          aria-labelledby="url-tab"
          className="text-center"
        >
          <Globe className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-4" aria-hidden="true" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Load from URL
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm sm:text-base">
            Enter a URL to load an OpenAPI specification
          </p>

          <div className="space-y-4">
            <div className="text-left">
              <label 
                htmlFor="spec-url"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Specification URL
              </label>
              <input
                id="spec-url"
                ref={urlInputRef}
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={handleUrlKeyDown}
                placeholder="https://example.com/api-spec.json"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-describedby="url-help"
              />
              <p 
                id="url-help"
                className="mt-2 text-xs text-gray-500 dark:text-gray-400"
              >
                Press Enter to submit. Must be a valid URL to a JSON or YAML file.
              </p>
            </div>

            <button
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim() || !isValidUrl(urlInput) || isLoading}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors touch-target focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-50"
              aria-label="Load specification from URL"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                  Loading...
                </>
              ) : (
                'Load from URL'
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};