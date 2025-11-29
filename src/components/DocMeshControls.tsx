import { useState } from 'react';
import { Plus, Save, FolderOpen, Download, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import type { DocMesh } from '../types';
import { Tooltip } from './Tooltip';

interface DocMeshControlsProps {
  currentMesh: DocMesh | null;
  savedMeshes: DocMesh[];
  onNewMesh: () => void;
  onSaveMesh: (mesh: DocMesh) => void;
  onLoadMesh: (meshId: string) => void;
  onExportMesh: (mesh: DocMesh) => void;
  onDeleteMesh: (meshId: string) => void;
  onDeleteAllMeshes: () => void;
  onMeshNameUpdate?: (name: string) => void;
}

interface ConfirmationDialog {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DocMeshControls({
  currentMesh,
  savedMeshes,
  onNewMesh,
  onSaveMesh,
  onLoadMesh,
  onExportMesh,
  onDeleteMesh,
  onDeleteAllMeshes,
  onMeshNameUpdate,
}: DocMeshControlsProps) {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmationDialog | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleNewMesh = () => {
    if (currentMesh && currentMesh.nodes.size > 0) {
      // Show confirmation if current mesh has unsaved changes
      setConfirmDialog({
        isOpen: true,
        title: 'Create New Mesh',
        message: 'Creating a new mesh will discard any unsaved changes to the current mesh. Continue?',
        onConfirm: () => {
          onNewMesh();
          setConfirmDialog(null);
        },
        onCancel: () => setConfirmDialog(null),
      });
    } else {
      onNewMesh();
    }
  };

  const handleSaveMesh = async () => {
    if (currentMesh) {
      setIsSaving(true);
      try {
        onSaveMesh(currentMesh);
      } finally {
        setTimeout(() => setIsSaving(false), 500);
      }
    }
  };

  const handleLoadMesh = (meshId: string) => {
    if (currentMesh && currentMesh.id !== meshId) {
      // Show confirmation if switching meshes with unsaved changes
      setConfirmDialog({
        isOpen: true,
        title: 'Load Mesh',
        message: 'Loading a different mesh will discard any unsaved changes to the current mesh. Continue?',
        onConfirm: () => {
          onLoadMesh(meshId);
          setConfirmDialog(null);
        },
        onCancel: () => setConfirmDialog(null),
      });
    } else {
      onLoadMesh(meshId);
    }
  };

  const handleExportMesh = async () => {
    if (currentMesh) {
      setIsExporting(true);
      try {
        onExportMesh(currentMesh);
      } finally {
        setTimeout(() => setIsExporting(false), 1000);
      }
    }
  };

  const handleDeleteCurrentMesh = () => {
    if (currentMesh) {
      setConfirmDialog({
        isOpen: true,
        title: 'Delete Mesh',
        message: `Are you sure you want to delete "${currentMesh.name}"? This action cannot be undone.`,
        onConfirm: () => {
          onDeleteMesh(currentMesh.id);
          setConfirmDialog(null);
        },
        onCancel: () => setConfirmDialog(null),
      });
    }
  };

  const handleDeleteAllMeshes = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete All Meshes',
      message: 'Are you sure you want to delete ALL saved meshes? This action cannot be undone.',
      onConfirm: () => {
        onDeleteAllMeshes();
        setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  // Check if current mesh is a saved mesh
  const isCurrentMeshSaved = currentMesh && savedMeshes.some(m => m.id === currentMesh.id);

  return (
    <>
      <div className="flex flex-col gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
          Mesh Controls
        </h3>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {/* New Mesh Button - only show when there's an existing mesh */}
          {currentMesh && (
            <Tooltip content="Create a new empty mesh">
              <button
                onClick={handleNewMesh}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md hover:shadow-lg transition-all duration-200 text-sm font-medium"
                aria-label="New Mesh"
              >
                <Plus className="w-4 h-4" />
                <span>New Mesh</span>
              </button>
            </Tooltip>
          )}

          {/* Save Mesh Button */}
          <Tooltip content={currentMesh ? 'Save current mesh configuration' : 'No mesh to save'}>
            <button
              onClick={handleSaveMesh}
              disabled={!currentMesh || isSaving}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
              aria-label="Save Mesh"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Mesh</span>
                </>
              )}
            </button>
          </Tooltip>

          {/* Export Mesh Button */}
          <Tooltip content={currentMesh ? 'Export mesh as ZIP archive' : 'No mesh to export'}>
            <button
              onClick={handleExportMesh}
              disabled={!currentMesh || currentMesh.nodes.size === 0 || isExporting}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
              aria-label="Export Mesh"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export Mesh</span>
                </>
              )}
            </button>
          </Tooltip>
        </div>

        {/* Mesh Selection Dropdown */}
        {savedMeshes.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="mesh-selector"
                className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide"
              >
                Load Saved Mesh
              </label>
              <button
                onClick={handleDeleteAllMeshes}
                className="text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:underline transition-colors"
              >
                Clear All
              </button>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <FolderOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  id="mesh-selector"
                  value={currentMesh?.id || ''}
                  onChange={(e) => handleLoadMesh(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm transition-all duration-200"
                  aria-label="Select saved mesh"
                >
                  <option value="" disabled>
                    Select a mesh...
                  </option>
                  {savedMeshes.map((mesh) => (
                    <option key={mesh.id} value={mesh.id}>
                      {mesh.name} ({mesh.nodes.size} nodes)
                    </option>
                  ))}
                </select>
              </div>

              {/* Delete Current Mesh Button */}
              {isCurrentMeshSaved && (
                <Tooltip content="Delete currently loaded mesh">
                  <button
                    onClick={handleDeleteCurrentMesh}
                    className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-400 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                    aria-label="Delete current mesh"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        )}

        {/* Current Mesh Info */}
        {currentMesh && (
          <div className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              Current Mesh
            </div>

            {/* Editable Mesh Name */}
            <input
              type="text"
              value={currentMesh.name}
              onChange={(e) => onMeshNameUpdate?.(e.target.value)}
              className="w-full px-2 py-1 mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="Enter mesh name..."
            />

            <div className="text-xs text-slate-500 dark:text-slate-400">
              {currentMesh.nodes.size} node{currentMesh.nodes.size !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Modified: {new Date(currentMesh.modifiedDate).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && confirmDialog.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-backdrop-fade-in"
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dialog Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {confirmDialog.title}
              </h3>
            </div>

            {/* Dialog Content */}
            <div className="px-6 py-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {confirmDialog.message}
              </p>
            </div>

            {/* Dialog Actions */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={confirmDialog.onCancel}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
