import { FileText, Eye } from 'lucide-react';
import type { MarkdownFile } from '../types';
import { Tooltip } from './Tooltip';

interface MainContentProps {
  files: MarkdownFile[];
  activeFileId: string | null;
  viewMode: 'editor' | 'preview';
  onViewModeChange: (mode: 'editor' | 'preview') => void;
  onUpload: (files: File[]) => void;
  children?: React.ReactNode;
  appMode?: 'markdown' | 'docmesh';
}

export function MainContent({
  files,
  activeFileId,
  viewMode,
  onViewModeChange,
  onUpload,
  children,
  appMode = 'markdown',
}: MainContentProps) {
  const activeFile = files.find(f => f.id === activeFileId);

  const handleBrowseClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = appMode === 'docmesh' ? '.html,.htm' : '.md,.markdown';
    input.multiple = true;
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        onUpload(Array.from(target.files));
      }
    };
    input.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => {
      if (appMode === 'docmesh') {
        return file.name.endsWith('.html') || file.name.endsWith('.htm');
      }
      return file.name.endsWith('.md') || file.name.endsWith('.markdown');
    });

    if (droppedFiles.length > 0) {
      onUpload(droppedFiles);
    }
  };

  // Show empty state when no files exist (only in markdown mode)
  if (files.length === 0 && appMode === 'markdown') {
    return (
      <main
        className="flex-1 flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 transition-colors duration-300"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <EmptyState onBrowseClick={handleBrowseClick} />
      </main>
    );
  }

  // Show active workspace when files exist or in docmesh mode
  return (
    <main
      className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 dot-pattern dark:dot-pattern-dark transition-colors duration-300 overflow-hidden"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ActiveWorkspace
        activeFile={activeFile}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        appMode={appMode}
      >
        {children}
      </ActiveWorkspace>
    </main>
  );
}

// EmptyState component
interface EmptyStateProps {
  onBrowseClick: () => void;
}

function EmptyState({ onBrowseClick }: EmptyStateProps) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-16 text-center bg-slate-900/5 dark:bg-slate-800/20 transition-colors duration-300">
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-indigo-500/20 dark:bg-indigo-500/30 flex items-center justify-center transition-colors duration-300">
            <svg
              className="w-10 h-10 text-indigo-500 dark:text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 transition-colors duration-300">
          Start Converting
        </h2>

        <p className="text-lg text-slate-500 dark:text-slate-400 mb-8 max-w-2xl mx-auto transition-colors duration-300">
          Select a markdown file from the sidebar or drag and drop a new file here to generate HTML.
        </p>

        <button
          onClick={onBrowseClick}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transform hover:-translate-y-0.5 transition-all duration-200 font-medium text-base"
          aria-label="Browse files to upload"
        >
          <span>Browse Files</span>
        </button>
      </div>
    </div>
  );
}

// ActiveWorkspace component
interface ActiveWorkspaceProps {
  activeFile: MarkdownFile | undefined;
  viewMode: 'editor' | 'preview';
  onViewModeChange: (mode: 'editor' | 'preview') => void;
  children?: React.ReactNode;
}

interface ActiveWorkspaceProps {
  activeFile: MarkdownFile | undefined;
  viewMode: 'editor' | 'preview';
  onViewModeChange: (mode: 'editor' | 'preview') => void;
  children?: React.ReactNode;
  appMode: 'markdown' | 'docmesh';
}

function ActiveWorkspace({
  activeFile,
  viewMode,
  onViewModeChange,
  children,
  appMode,
}: ActiveWorkspaceProps) {
  return (
    <div className="flex-1 flex flex-col">
      <Toolbar
        filename={activeFile?.name}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        appMode={appMode}
      />

      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

// Toolbar component
interface ToolbarProps {
  filename?: string;
  viewMode: 'editor' | 'preview';
  onViewModeChange: (mode: 'editor' | 'preview') => void;
  appMode: 'markdown' | 'docmesh';
}

function Toolbar({ filename, viewMode, onViewModeChange, appMode }: ToolbarProps) {
  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-3 transition-colors duration-300">
      <div className="flex items-center justify-between">
        {/* Filename display */}
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400 transition-colors duration-300" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">
            {appMode === 'docmesh' ? 'Document Mesh Preview' : (filename || 'No file selected')}
          </span>
        </div>

        {/* View toggle - only show in markdown mode */}
        {appMode === 'markdown' && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 transition-colors duration-300">
            <Tooltip content="Edit markdown content">
              <button
                onClick={() => onViewModeChange('editor')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'editor'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                aria-label="Switch to editor view"
                aria-pressed={viewMode === 'editor'}
              >
                <FileText className="w-4 h-4 inline mr-1.5" />
                Editor
              </button>
            </Tooltip>

            <Tooltip content="Preview rendered HTML">
              <button
                onClick={() => onViewModeChange('preview')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'preview'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                aria-label="Switch to preview view"
                aria-pressed={viewMode === 'preview'}
              >
                <Eye className="w-4 h-4 inline mr-1.5" />
                Preview
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}
