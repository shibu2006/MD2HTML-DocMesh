import { useMemo } from 'react';
import type { MarkdownFile, ExportSettings } from '../types';
import { markdownEngine, ThemeManager } from '../utils';

interface PreviewProps {
  activeFile: MarkdownFile | undefined;
  exportSettings: ExportSettings;
}

export function Preview({ activeFile, exportSettings }: PreviewProps) {
  // Generate TOC entries if enabled
  const tocEntries = useMemo(() => {
    if (!activeFile || !exportSettings.includeTOC) {
      return [];
    }
    return markdownEngine.generateTOC(activeFile.content);
  }, [activeFile, exportSettings.includeTOC]);

  // Parse markdown and inject TOC anchors
  const renderedHTML = useMemo(() => {
    if (!activeFile) {
      return '';
    }

    let html = markdownEngine.parse(activeFile.content, {
      highlightCode: exportSettings.highlightCode,
      sanitize: exportSettings.sanitizeHTML,
    });

    // Inject TOC anchors if TOC is enabled
    if (exportSettings.includeTOC && tocEntries.length > 0) {
      html = markdownEngine.injectTOCAnchors(html, tocEntries);
    }

    return html;
  }, [activeFile, exportSettings.highlightCode, exportSettings.sanitizeHTML, exportSettings.includeTOC, tocEntries]);

  // Get theme styles
  const themeStyles = useMemo(() => {
    return ThemeManager.getThemeStyles(exportSettings.theme);
  }, [exportSettings.theme]);

  // Get font family CSS value
  const getFontFamily = (fontFamily: ExportSettings['fontFamily']): string => {
    switch (fontFamily) {
      case 'system':
        return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
      case 'inter':
        return '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      case 'roboto':
        return '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      case 'open-sans':
        return '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      case 'merriweather':
        return '"Merriweather", Georgia, Cambria, "Times New Roman", Times, serif';
      case 'fira-code':
        return '"Fira Code", "Courier New", Courier, monospace';
      case 'monospace':
        return '"Courier New", Courier, monospace';
      default:
        return '-apple-system, BlinkMacSystemFont, sans-serif';
    }
  };

  // Get font size CSS value
  const getFontSize = (fontSize: ExportSettings['fontSize']): string => {
    switch (fontSize) {
      case 'small':
        return '14px';
      case 'medium':
        return '16px';
      case 'large':
        return '18px';
      case 'extra-large':
        return '20px';
      default:
        return '16px';
    }
  };

  // Generate custom CSS for theme colors, fonts, and sizes
  const customCSS = useMemo(() => {
    const fontFamily = getFontFamily(exportSettings.fontFamily);
    const fontSize = getFontSize(exportSettings.fontSize);

    let css = `
      .preview-content {
        font-family: ${fontFamily} !important;
        font-size: ${fontSize} !important;
        line-height: 1.6 !important;
      }
      .preview-content h1,
      .preview-content h2,
      .preview-content h3,
      .preview-content h4,
      .preview-content h5,
      .preview-content h6 {
        color: ${themeStyles.accentColor} !important;
      }
      .preview-content a {
        color: ${themeStyles.accentColor} !important;
      }
      .preview-content code {
        background-color: ${themeStyles.codeBlockBg} !important;
        color: ${themeStyles.textColor} !important;
        font-family: monospace !important;
      }
      .preview-content pre {
        background-color: ${themeStyles.codeBlockBg} !important;
        ${exportSettings.highlightCode ? `border: 1px solid ${ThemeManager.isDarkTheme(exportSettings.theme) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} !important;` : ''}
        border-radius: 5px !important;
      }
      .preview-content pre code {
        font-family: monospace !important;
      }
      .preview-content blockquote {
        border-left-color: ${themeStyles.accentColor} !important;
      }
      .preview-content strong,
      .preview-content b {
        color: ${themeStyles.accentColor} !important;
        font-weight: 700 !important;
      }
      .preview-content ol,
      .preview-content ul {
        color: ${themeStyles.textColor} !important;
      }
      .preview-content li {
        color: ${themeStyles.textColor} !important;
      }
      .preview-content li::marker {
        color: ${themeStyles.accentColor} !important;
      }
      .preview-content p {
        color: ${themeStyles.textColor} !important;
      }
    `;

    if (exportSettings.highlightCode) {
      css += ThemeManager.getSyntaxHighlightingCSS(exportSettings.theme);
    }

    return css;
  }, [themeStyles, exportSettings.fontFamily, exportSettings.fontSize, exportSettings.highlightCode, exportSettings.theme]);

  // Generate TOC HTML for top position
  const tocHTML = useMemo(() => {
    if (!exportSettings.includeTOC || tocEntries.length === 0 || exportSettings.tocPosition !== 'top-of-page') {
      return '';
    }

    const tocItems = tocEntries.map(entry => {
      const indent = entry.level === 3 ? 'ml-4' : '';
      return `<li class="${indent}">
        <a href="#${entry.id}" 
           class="block py-1 px-2 -mx-2 rounded border-l-2 border-transparent hover:border-current transition-all duration-200"
           style="color: ${themeStyles.textColor};"
           onmouseenter="this.style.color='${themeStyles.accentColor}'; this.style.borderColor='${themeStyles.accentColor}';"
           onmouseleave="this.style.color='${themeStyles.textColor}'; this.style.borderColor='transparent';">
          ${entry.text}
        </a>
      </li>`;
    }).join('');

    return `<nav class="toc mb-8 p-4 rounded border transition-colors duration-300" style="border-color: ${themeStyles.accentColor}20;">
      <h2 class="text-xl font-bold mb-4 transition-colors duration-300">Table of Contents</h2>
      <ul class="space-y-2">${tocItems}</ul>
    </nav>`;
  }, [exportSettings.includeTOC, exportSettings.tocPosition, tocEntries, themeStyles.accentColor, themeStyles.textColor]);

  // Combine content and TOC for top position
  const finalHTML = useMemo(() => {
    if (!exportSettings.includeTOC || exportSettings.tocPosition !== 'top-of-page' || !tocHTML) {
      return renderedHTML;
    }

    const h1ClosingTag = '</h1>';
    const h1Index = renderedHTML.indexOf(h1ClosingTag);

    if (h1Index !== -1) {
      const splitIndex = h1Index + h1ClosingTag.length;
      return renderedHTML.slice(0, splitIndex) + tocHTML + renderedHTML.slice(splitIndex);
    }

    return tocHTML + renderedHTML;
  }, [renderedHTML, tocHTML, exportSettings.includeTOC, exportSettings.tocPosition]);

  // Handle TOC link clicks
  const handleTOCClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!activeFile) {
    return null;
  }

  // Render with left sidebar TOC
  if (exportSettings.includeTOC && exportSettings.tocPosition === 'left-sidebar' && tocEntries.length > 0) {
    return (
      <div className="flex h-full">
        {/* TOC Sidebar */}
        <nav
          className="w-64 p-6 overflow-y-auto sticky top-0 h-full border-r bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 transition-colors duration-300"
        >
          <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100 transition-colors duration-300">
            Table of Contents
          </h2>
          <ul className="space-y-2">
            {tocEntries.map((entry) => (
              <li key={entry.id} className={entry.level === 3 ? 'ml-4' : ''}>
                <a
                  href={`#${entry.id}`}
                  onClick={(e) => handleTOCClick(e, entry.id)}
                  className="block py-1 px-2 -mx-2 rounded border-l-2 border-transparent hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200"
                >
                  {entry.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div
          className="flex-1 p-6 overflow-y-auto prose prose-slate max-w-none transition-colors duration-300 preview-content"
          style={{
            backgroundColor: themeStyles.backgroundColor,
            color: themeStyles.textColor,
          }}
        >
          <style>{customCSS}</style>
          <div dangerouslySetInnerHTML={{ __html: renderedHTML }} />
        </div>
      </div>
    );
  }

  // Render with top TOC or no TOC
  return (
    <div
      className="p-6 overflow-y-auto prose prose-slate max-w-none transition-colors duration-300 preview-content"
      style={{
        backgroundColor: themeStyles.backgroundColor,
        color: themeStyles.textColor,
      }}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest('a');
        if (anchor) {
          const href = anchor.getAttribute('href');
          if (href && href.startsWith('#')) {
            e.preventDefault();
            const id = href.substring(1);
            const element = document.getElementById(id);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        }
      }}
    >
      <style>{customCSS}</style>
      <div dangerouslySetInnerHTML={{ __html: finalHTML }} />
    </div>
  );
}
