import { Info } from 'lucide-react';
import type { ExportSettings } from '../types';
import { Tooltip } from './Tooltip';

interface RightSidebarProps {
  exportSettings: ExportSettings;
  onSettingsChange: (updates: Partial<ExportSettings>) => void;
}

export function RightSidebar({
  exportSettings,
  onSettingsChange,
}: RightSidebarProps) {
  return (
    <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col overflow-y-auto transition-colors duration-300">
      <div className="p-6 space-y-6">
        {/* Export Settings Section */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 transition-colors duration-300">
            Export Settings
          </h2>

          {/* Output Format */}
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 transition-colors duration-300">
              Output Format
              <Tooltip content="Choose between complete HTML document or just the content fragment">
                <button
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200"
                  aria-label="Output format info"
                >
                  <Info className="w-4 h-4" />
                </button>
              </Tooltip>
            </label>
            <select
              value={exportSettings.outputFormat}
              onChange={(e) => onSettingsChange({
                outputFormat: e.target.value as ExportSettings['outputFormat']
              })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-colors duration-300"
            >
              <option value="html5-complete">HTML5 Complete</option>
              <option value="html-fragment">HTML Fragment</option>
            </select>
          </div>

          {/* Theme Selector */}
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 transition-colors duration-300">
              Theme
              <Tooltip content="Select the color theme for your exported HTML">
                <button
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200"
                  aria-label="Theme info"
                >
                  <Info className="w-4 h-4" />
                </button>
              </Tooltip>
            </label>
            <select
              value={exportSettings.theme}
              onChange={(e) => onSettingsChange({
                theme: e.target.value as ExportSettings['theme']
              })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-colors duration-300"
            >
              <option value="github-light">GitHub Light</option>
              <option value="github-dark">GitHub Dark</option>
              <option value="dracula">Dracula</option>
              <option value="monokai">Monokai</option>
              <option value="sky-blue">Sky Blue</option>
              <option value="solarized-light">Solarized Light</option>
              <option value="nord">Nord</option>
            </select>
          </div>

          {/* Font Family */}
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 transition-colors duration-300">
              Font Family
              <Tooltip content="Choose the font family for your exported HTML">
                <button
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200"
                  aria-label="Font family info"
                >
                  <Info className="w-4 h-4" />
                </button>
              </Tooltip>
            </label>
            <select
              value={exportSettings.fontFamily}
              onChange={(e) => onSettingsChange({
                fontFamily: e.target.value as ExportSettings['fontFamily']
              })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-colors duration-300"
            >
              <option value="system">System Default</option>
              <option value="inter">Inter</option>
              <option value="roboto">Roboto</option>
              <option value="open-sans">Open Sans</option>
              <option value="merriweather">Merriweather (Serif)</option>
              <option value="fira-code">Fira Code (Mono)</option>
              <option value="monospace">Monospace</option>
            </select>
          </div>

          {/* Font Size */}
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 transition-colors duration-300">
              Font Size
              <Tooltip content="Choose the base font size for your exported HTML">
                <button
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200"
                  aria-label="Font size info"
                >
                  <Info className="w-4 h-4" />
                </button>
              </Tooltip>
            </label>
            <select
              value={exportSettings.fontSize}
              onChange={(e) => onSettingsChange({
                fontSize: e.target.value as ExportSettings['fontSize']
              })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-colors duration-300"
            >
              <option value="small">Small (14px)</option>
              <option value="medium">Medium (16px)</option>
              <option value="large">Large (18px)</option>
              <option value="extra-large">Extra Large (20px)</option>
            </select>
          </div>

          {/* Feature Toggles */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800 transition-colors duration-300">
            {/* Include TOC */}
            <div className="space-y-3">
              <label className="flex items-start justify-between cursor-pointer group">
                <div className="flex-1">
                  <div className="text-base font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300 mb-1">
                    Include Table of Contents
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors duration-300">
                    Adds a navigation sidebar based on 'h2' headings.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={exportSettings.includeTOC}
                  onClick={() => onSettingsChange({ includeTOC: !exportSettings.includeTOC })}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900 ml-4 ${exportSettings.includeTOC
                    ? 'bg-indigo-600'
                    : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${exportSettings.includeTOC ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </label>

              {/* TOC Position - only show when TOC is enabled */}
              {exportSettings.includeTOC && (
                <div className="pl-0 space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onSettingsChange({ tocPosition: 'left-sidebar' })}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${exportSettings.tocPosition === 'left-sidebar'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-700 dark:bg-slate-800 text-slate-300 hover:bg-slate-600 dark:hover:bg-slate-700'
                        }`}
                    >
                      Left Sidebar
                    </button>
                    <button
                      type="button"
                      onClick={() => onSettingsChange({ tocPosition: 'top-of-page' })}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${exportSettings.tocPosition === 'top-of-page'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-700 dark:bg-slate-800 text-slate-300 hover:bg-slate-600 dark:hover:bg-slate-700'
                        }`}
                    >
                      Top of Page
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sanitize HTML */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">
                Sanitize HTML
                <Tooltip content="Remove potentially dangerous HTML content using DOMPurify">
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200"
                    aria-label="Sanitize HTML info"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </Tooltip>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={exportSettings.sanitizeHTML}
                onClick={() => onSettingsChange({ sanitizeHTML: !exportSettings.sanitizeHTML })}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900 ml-4 ${exportSettings.sanitizeHTML
                  ? 'bg-indigo-600'
                  : 'bg-slate-300 dark:bg-slate-700'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${exportSettings.sanitizeHTML ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>

            {/* Include CSS */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">
                Include CSS
                <Tooltip content="Include theme and typography styles in the exported HTML">
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200"
                    aria-label="Include CSS info"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </Tooltip>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={exportSettings.includeCSS}
                onClick={() => onSettingsChange({ includeCSS: !exportSettings.includeCSS })}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900 ml-4 ${exportSettings.includeCSS
                  ? 'bg-indigo-600'
                  : 'bg-slate-300 dark:bg-slate-700'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${exportSettings.includeCSS ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>

            {/* Minify Output */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">
                Minify Output
                <Tooltip content="Remove unnecessary whitespace from the exported HTML">
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200"
                    aria-label="Minify output info"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </Tooltip>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={exportSettings.minifyOutput}
                onClick={() => onSettingsChange({ minifyOutput: !exportSettings.minifyOutput })}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900 ml-4 ${exportSettings.minifyOutput
                  ? 'bg-indigo-600'
                  : 'bg-slate-300 dark:bg-slate-700'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${exportSettings.minifyOutput ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>

            {/* Highlight Code */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">
                Highlight Code
                <Tooltip content="Apply syntax highlighting to code blocks">
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200"
                    aria-label="Highlight code info"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </Tooltip>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={exportSettings.highlightCode}
                onClick={() => onSettingsChange({ highlightCode: !exportSettings.highlightCode })}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900 ml-4 ${exportSettings.highlightCode
                  ? 'bg-indigo-600'
                  : 'bg-slate-300 dark:bg-slate-700'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${exportSettings.highlightCode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 transition-colors duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 transition-colors duration-300">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2 transition-colors duration-300">
              Status
            </h3>
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 transition-colors duration-300">
              <div className="flex justify-between">
                <span>Version:</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-medium text-green-600 dark:text-green-400 transition-colors duration-300">Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
