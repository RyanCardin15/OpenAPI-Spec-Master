import React from 'react';
import { Edit3, Save } from 'lucide-react';

interface EditorTabProps {
  editingSchema: string | null;
  editedCode: string;
  setEditedCode: (code: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const EditorTab: React.FC<EditorTabProps> = ({
  editingSchema,
  editedCode,
  setEditedCode,
  onCancel,
  onSave
}) => (
  <div className="h-full p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
    {editingSchema ? (
      <div className="h-full flex flex-col max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-blue-600" />
            Editing: <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{editingSchema}</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        </div>
        
        <div className="flex-1 bg-gray-900 rounded-lg p-4 shadow-inner overflow-hidden">
          <textarea
            value={editedCode}
            onChange={(e) => setEditedCode(e.target.value)}
            className="w-full h-full bg-transparent text-green-400 font-mono text-sm border-none focus:ring-0 resize-none outline-none"
            spellCheck="false"
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          Note: Changes are saved locally and will be lost upon closing the modal.
        </p>
      </div>
    ) : (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <Edit3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">No schema selected for editing</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Select a schema from the Explorer tab and click 'Edit' to make changes.
          </p>
        </div>
      </div>
    )}
  </div>
);
