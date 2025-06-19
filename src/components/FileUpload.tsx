import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Globe, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  onTextUpload: (text: string) => void;
  onUrlUpload: (url: string) => void;
  isLoading?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileUpload, 
  onTextUpload, 
  onUrlUpload, 
  isLoading 
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'file' | 'text' | 'url'>('file');
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');

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
    <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-8">
      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                  ${isActive 
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
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
      </div>

      {/* File Upload Tab */}
      {activeTab === 'file' && (
        <div
          className={`text-center transition-colors ${
            dragActive ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : ''
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Upload OpenAPI Specification
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Drag and drop your OpenAPI spec file, or click to browse
          </p>

          <label className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg cursor-pointer transition-colors">
            <Upload className="h-4 w-4" />
            Choose File
            <input
              type="file"
              accept=".json,.yaml,.yml"
              onChange={handleFileInput}
              className="hidden"
              disabled={isLoading}
            />
          </label>

          <div className="mt-6 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            <AlertCircle className="h-4 w-4 mr-2" />
            Supports OpenAPI 3.0+ and Swagger 2.0 in JSON or YAML format
          </div>
        </div>
      )}

      {/* Text Input Tab */}
      {activeTab === 'text' && (
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Paste OpenAPI Specification
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Paste your OpenAPI spec in JSON or YAML format
          </p>

          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Paste your OpenAPI specification here..."
            className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
          />

          <div className="flex gap-3">
            <button
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Parse Specification
                </>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('file');
                setTextInput('');
              }}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* URL Input Tab */}
      {activeTab === 'url' && (
        <div className="text-center">
          <Globe className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Import from URL
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Enter the URL to your OpenAPI specification or Swagger endpoint
          </p>

          <div className="mb-4">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://petstore.swagger.io/v2/swagger.json"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Common URL Examples */}
          <div className="mb-6 text-left">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Common URL patterns:
            </p>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div>• https://petstore.swagger.io/v2/swagger.json (Swagger 2.0)</div>
              <div>• https://api.example.com/swagger.json</div>
              <div>• https://api.example.com/v1/openapi.yaml</div>
              <div>• https://api.example.com/docs/openapi.json</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim() || !isValidUrl(urlInput) || isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4" />
                  Import from URL
                </>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('file');
                setUrlInput('');
              }}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* URL Validation */}
          {urlInput && !isValidUrl(urlInput) && (
            <div className="mt-4 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              Please enter a valid URL
            </div>
          )}
        </div>
      )}
    </div>
  );
};