import { useState, useEffect } from 'react';
import { Search, Upload, Trash2, X, ChevronLeft, ChevronRight, FileText, Network, Layers, FolderTree } from 'lucide-react';
import type { MarkdownFile, DocMesh, HtmlFile } from '../types';
import { formatFileSize } from '../utils/fileManager';
import { Tooltip } from './Tooltip';

interface FileItemProps {
  file: MarkdownFile;
  isActive: boolean;
  onSelect: (fileId: string) => void;
  onDelete: (fileId: string) => void;
}

function FileItem({ file, isActive, onSelect, onDelete }: FileItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div
      className={`
        relative p-3 rounded-lg cursor-pointer transition-all duration-200
        ${isActive
          ? 'bg-white dark:bg-slate-800 shadow-md'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }
      `}
      onClick={() => onSelect(file.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate transition-colors duration-300">
            {file.name}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 transition-colors duration-300">
            <span>{formatFileSize(file.size)}</span>
            <span>•</span>
            <span>{formatDate(file.uploadDate)}</span>
          </div>
        </div>

        {/* Delete button - visible on hover */}
        {isHovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(file.id);
            }}
            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
            title="Delete file"
            aria-label={`Delete ${file.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

interface LeftSidebarProps {
  files: MarkdownFile[];
  activeFileId: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFileSelect: (fileId: string) => void;
  onFileDelete: (fileId: string) => void;
  onUpload: (files: File[]) => void;
  onClearAll: () => void;

  // DocMesh mode props
  appMode: 'markdown' | 'docmesh';
  onAppModeChange: (mode: 'markdown' | 'docmesh') => void;
  currentMesh: DocMesh | null;
  availableHtmlFiles: HtmlFile[];
  onAutoCreateMesh?: (silent?: boolean) => void;
}

export function LeftSidebar({
  files,
  activeFileId,
  searchQuery,
  onSearchChange,
  onFileSelect,
  onFileDelete,
  onUpload,
  onClearAll,
  appMode,
  onAppModeChange,
  currentMesh,
  availableHtmlFiles,
  onAutoCreateMesh,
}: LeftSidebarProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      onUpload(Array.from(selectedFiles));
    }
    // Reset input to allow uploading the same file again
    e.target.value = '';
  };

  const handleClearAll = () => {
    if (showClearConfirm) {
      onClearAll();
      setShowClearConfirm(false);
    } else {
      setShowClearConfirm(true);
    }
  };

  // Filter files based on search query
  const filteredFiles = searchQuery
    ? files.filter(file =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : files;

  return (
    <aside className={`border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-full md:w-72'}`}>
      {/* Collapse Toggle Button */}
      <div className="p-2 border-b border-slate-200 dark:border-slate-800 flex justify-end transition-colors duration-300">
        <Tooltip content={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors duration-200"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </Tooltip>
      </div>

      {!isCollapsed && (
        <>
          {/* Mode Toggle */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
            <div className="flex gap-2 p-1 bg-slate-200 dark:bg-slate-800 rounded-lg">
              <button
                onClick={() => onAppModeChange('markdown')}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
                  ${appMode === 'markdown'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }
                `}
                aria-label="Switch to Files mode"
              >
                <FileText className="w-4 h-4" />
                <span>Files</span>
              </button>
              <button
                onClick={() => onAppModeChange('docmesh')}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
                  ${appMode === 'docmesh'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }
                `}
                aria-label="Switch to DocMesh mode"
              >
                <Network className="w-4 h-4" />
                <span>DocMesh</span>
              </button>
            </div>
          </div>

          {/* Conditional Content Based on Mode */}
          {appMode === 'markdown' ? (
            <>
              {/* Search Bar */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors duration-300" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-colors duration-300"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => onSearchChange('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-2 transition-colors duration-300">
                {/* Upload Button */}
                <Tooltip content="Upload markdown files (.md, .markdown)">
                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg shadow-indigo-500/20 font-semibold">
                    <Upload className="w-5 h-5" />
                    <span className="text-sm">Upload Files</span>
                    <input
                      type="file"
                      accept=".md,.markdown"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </Tooltip>

                {/* Clear All Button */}
                {files.length > 0 && (
                  <Tooltip content={showClearConfirm ? 'Confirm deletion of all files' : 'Remove all uploaded files'}>
                    <button
                      onClick={handleClearAll}
                      onBlur={() => setShowClearConfirm(false)}
                      className={`
                    w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium
                    ${showClearConfirm
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                        }
                  `}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{showClearConfirm ? 'Click again to confirm' : 'Clear All'}</span>
                    </button>
                  </Tooltip>
                )}
              </div>

              {/* File List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredFiles.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm transition-colors duration-300">
                    {searchQuery ? 'No files match your search' : 'No files uploaded'}
                  </div>
                ) : (
                  filteredFiles.map(file => (
                    <FileItem
                      key={file.id}
                      file={file}
                      isActive={file.id === activeFileId}
                      onSelect={onFileSelect}
                      onDelete={onFileDelete}
                    />
                  ))
                )}
              </div>
            </>
          ) : (
            /* DocMesh Mode - Simplified sidebar with mesh info */
            <DocMeshSidebar
              currentMesh={currentMesh}
              availableHtmlFiles={availableHtmlFiles}
              onAutoCreateMesh={onAutoCreateMesh}
              onHtmlFileUpload={onUpload}
            />
          )}
        </>
      )}
    </aside>
  );
}


// Simplified DocMesh sidebar component
interface DocMeshSidebarProps {
  currentMesh: DocMesh | null;
  availableHtmlFiles: HtmlFile[];
  onAutoCreateMesh?: (silent?: boolean) => void;
  onHtmlFileUpload?: (files: File[]) => void;
}

function DocMeshSidebar({ currentMesh, availableHtmlFiles, onAutoCreateMesh, onHtmlFileUpload }: DocMeshSidebarProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Auto-create mesh when component mounts if no mesh exists
  useEffect(() => {
    if (!currentMesh && onAutoCreateMesh) {
      onAutoCreateMesh(true); // silent = true for auto-creation
    }
  }, [currentMesh, onAutoCreateMesh]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onHtmlFileUpload) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      // Filter for HTML files
      const htmlFiles = droppedFiles.filter(
        file => file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm')
      );

      if (htmlFiles.length > 0) {
        onHtmlFileUpload(htmlFiles);
      }
    }
  };

  const nodeCount = currentMesh?.nodes.size || 0;

  // Get set of HTML file IDs already used in the mesh
  const usedFileIds = new Set(
    currentMesh ? Array.from(currentMesh.nodes.values()).map(node => node.htmlFileId) : []
  );

  // Helper to remove .html extension for display
  const removeHtmlExtension = (name: string) => name.replace(/\.html$/i, '');

  return (
    <div className="flex flex-col h-full">
      {/* Mesh Info Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {currentMesh?.name || 'Document Mesh'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {nodeCount} {nodeCount === 1 ? 'document' : 'documents'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
          <FolderTree className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          <span className="text-xs text-indigo-700 dark:text-indigo-300">
            Drag files below to the canvas to build your tree
          </span>
        </div>
      </div>

      {/* Available Files Section */}
      <div
        className={`
          flex-1 overflow-y-auto p-4 transition-colors duration-200
          ${isDragging ? 'bg-indigo-50 dark:bg-indigo-900/10 border-2 border-dashed border-indigo-400 dark:border-indigo-600' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex justify-between items-center">
          <span>Available HTML Files</span>
          {isDragging && <span className="text-indigo-600 dark:text-indigo-400 font-bold">Drop to Upload</span>}
        </h4>

        {availableHtmlFiles.length === 0 ? (
          <div className="text-center py-8 pointer-events-none">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No HTML files yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Export markdown or drop HTML here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {availableHtmlFiles.map(file => {
              const isUsed = usedFileIds.has(file.id);
              return (
                <div
                  key={file.id}
                  draggable={!isUsed}
                  onDragStart={(e) => {
                    if (isUsed) {
                      e.preventDefault();
                      return;
                    }
                    e.dataTransfer.setData('text/html-file-id', file.id);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-200 ${isUsed
                      ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md'
                    }`}
                >
                  <div className={`p-1.5 rounded-lg ${isUsed ? 'bg-slate-200 dark:bg-slate-700' : 'bg-blue-100 dark:bg-blue-900/40'}`}>
                    <FileText className={`w-4 h-4 ${isUsed ? 'text-slate-400 dark:text-slate-500' : 'text-blue-600 dark:text-blue-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium truncate block ${isUsed ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                      {removeHtmlExtension(file.name)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {isUsed ? 'In mesh' : file.sourceType === 'markdown' ? 'From Markdown' : 'Uploaded'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
