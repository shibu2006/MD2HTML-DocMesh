import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe2, LoaderCircle, Palette, RotateCcw, Upload } from 'lucide-react';
import type { ClonedStyle } from '../types';
import { cloneStyleFromFiles, cloneStyleFromUrl } from '../utils/styleCloneEngine';

interface CloneStyleSectionProps {
  value?: ClonedStyle;
  onChange: (style: ClonedStyle | undefined) => void;
}

export function CloneStyleSection({ value, onChange }: CloneStyleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => () => abortController.current?.abort(), []);

  const preferDark = () => document.documentElement.classList.contains('dark');

  const applyStyle = async (loadStyle: (signal: AbortSignal) => Promise<ClonedStyle>) => {
    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;
    setIsLoading(true);
    setError(null);

    try {
      const clonedStyle = await loadStyle(controller.signal);
      if (!controller.signal.aborted && abortController.current === controller) {
        onChange(clonedStyle);
      }
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === 'AbortError') return;
      setError(caughtError instanceof Error ? caughtError.message : 'Could not clone the selected style.');
    } finally {
      if (abortController.current === controller) {
        abortController.current = null;
        setIsLoading(false);
      }
    }
  };

  const handleUrlSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void applyStyle(signal => cloneStyleFromUrl(url, signal, { preferDark: preferDark() }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;
    void applyStyle(() => cloneStyleFromFiles(files, { preferDark: preferDark() }));
  };

  return (
    <section className="border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
      <button
        type="button"
        onClick={() => setIsExpanded(current => !current)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
        aria-expanded={isExpanded}
        aria-controls="clone-style-panel"
      >
        <span className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300">
          <Palette className="w-4 h-4" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Clone Style</span>
          <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
            {value ? value.sourceLabel : 'From a URL or HTML file'}
          </span>
        </span>
        {value && !isExpanded && (
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Cloned style active" />
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div id="clone-style-panel" className="px-4 pb-4 space-y-3">
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            Apply the source page&apos;s colors, fonts, and visual theme to previews and exports. Custom layout (cards, grids, section chrome) stays in the source page.
          </p>

          <form onSubmit={handleUrlSubmit} className="space-y-2">
            <label htmlFor="clone-style-url" className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5" /> Webpage URL
            </label>
            <input
              id="clone-style-url"
              type="text"
              inputMode="url"
              value={url}
              onChange={event => setUrl(event.target.value)}
              placeholder="https://example.com"
              disabled={isLoading}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Palette className="w-3.5 h-3.5" />}
              Clone from URL
            </button>
          </form>

          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-400">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />or<span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          <label className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-300 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <Upload className="w-3.5 h-3.5" />
            Upload HTML + CSS
            <input type="file" accept=".html,.htm,.css,text/html,text/css" multiple disabled={isLoading} onChange={handleFileChange} className="hidden" />
          </label>

          <p className="text-[11px] leading-4 text-slate-400 dark:text-slate-500">
            Some websites block direct browser access. If a URL fails, save the page as HTML and upload it here.
          </p>

          {error && (
            <div role="alert" className="p-2.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-[11px] leading-4 text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {value && (
            <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/20 space-y-2">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 truncate">{value.sourceLabel}</p>
                  <p className="text-[10px] text-emerald-700/70 dark:text-emerald-300/70">
                    {value.stylesheetCount} style source{value.stylesheetCount === 1 ? '' : 's'} detected
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5" aria-label="Detected color palette">
                {([
                  ['Bg', value.colors.backgroundColor],
                  ['Text', value.colors.textColor],
                  ['Accent', value.colors.accentColor],
                  ['Heading', value.headingColor || value.colors.accentColor],
                  ['Link', value.linkColor || value.colors.accentColor],
                  ['Table', value.tableHeaderBg || value.colors.codeBlockBg],
                ] as const).map(([label, color]) => (
                  <span key={label} className="space-y-1" title={`${label}: ${color}`}>
                    <span className="block h-5 rounded border border-black/10" style={{ backgroundColor: color }} />
                    <span className="block text-[9px] text-emerald-800/80 dark:text-emerald-200/80 truncate">{label}</span>
                  </span>
                ))}
              </div>
              {value.warnings?.map(warning => (
                <p key={warning} className="text-[10px] leading-4 text-amber-700 dark:text-amber-300">{warning}</p>
              ))}
              <button
                type="button"
                onClick={() => {
                  onChange(undefined);
                  setError(null);
                }}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Restore selected theme
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
