import { Sun, Moon, Download, FileArchive, FileText } from 'lucide-react';
import type { MarkdownFile, ExportSettings } from '../types';
import { ExportEngine } from '../utils/exportEngine';
import { Tooltip } from './Tooltip';

interface HeaderProps {
  uiMode: 'light' | 'dark';
  activeFileId: string | null;
  files: MarkdownFile[];
  exportSettings: ExportSettings;
  onToggleUIMode: () => void;
}

export function Header({
  uiMode,
  activeFileId,
  files,
  exportSettings,
  onToggleUIMode,
}: HeaderProps) {
  const activeFile = files.find(f => f.id === activeFileId);

  const handleDownloadHTML = () => {
    if (!activeFile) return;

    const html = ExportEngine.generateHTML(activeFile, exportSettings);
    const filename = activeFile.name.replace(/\.md$/, '.html');
    ExportEngine.downloadFile(html, filename);
  };

  const handleDownloadAll = async () => {
    if (files.length === 0) return;

    const zipBlob = await ExportEngine.generateZIP(files, exportSettings);
    ExportEngine.downloadBlob(zipBlob, 'md2html-export.zip');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors duration-300">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-400 transition-colors duration-300" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent transition-all duration-300">
              MD2HTML DOCMesh
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 transition-colors duration-300 tracking-wide uppercase">
              Markdown to HTML Converter
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <Tooltip content={uiMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            <button
              onClick={onToggleUIMode}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
              aria-label={uiMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {uiMode === 'light' ? (
                <Sun className="w-5 h-5 text-slate-700 dark:text-slate-300 transition-colors duration-300" />
              ) : (
                <Moon className="w-5 h-5 text-slate-700 dark:text-slate-300 transition-colors duration-300" />
              )}
            </button>
          </Tooltip>

          {/* Download HTML Button */}
          <Tooltip content={activeFile ? 'Download current file as HTML' : 'No file selected'}>
            <button
              onClick={handleDownloadHTML}
              disabled={!activeFile}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md hover:shadow-lg shadow-indigo-500/20 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-700 dark:disabled:to-slate-700 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200"
              aria-label="Download HTML"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Download HTML</span>
            </button>
          </Tooltip>

          {/* Download All ZIP Button */}
          <Tooltip content={files.length > 0 ? 'Download all files as ZIP' : 'No files to download'}>
            <button
              onClick={handleDownloadAll}
              disabled={files.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              aria-label="Download All as ZIP"
            >
              <FileArchive className="w-4 h-4" />
              <span className="text-sm font-medium">Download All</span>
            </button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
