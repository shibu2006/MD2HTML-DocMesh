import { useState } from 'react';
import { Search, Upload, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MarkdownFile } from '../types';
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
    <aside className={`border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-72'}`}>
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
      )}
    </aside>
  );
}
