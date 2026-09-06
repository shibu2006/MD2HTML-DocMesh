import { useMemo, useEffect, useRef } from 'react';
import type { MarkdownFile, ExportSettings } from '../types';
import { markdownEngine, ThemeManager, renderMermaid, MarkdownEngine, resolveAppearance, scopeClonedStylesheet } from '../utils';

interface PreviewProps {
  activeFile: MarkdownFile | undefined;
  exportSettings: ExportSettings;
}

export function Preview({ activeFile, exportSettings }: PreviewProps) {
  // When a TOC is generated, drop the document's own authored "Table of
  // Contents" section so it isn't duplicated alongside the generated one.
  const sourceContent = useMemo(() => {
    if (!activeFile) {
      return '';
    }
    return exportSettings.includeTOC
      ? markdownEngine.stripAuthoredTOC(activeFile.content)
      : activeFile.content;
  }, [activeFile, exportSettings.includeTOC]);

  // Generate TOC entries if enabled
  const tocEntries = useMemo(() => {
    if (!activeFile || !exportSettings.includeTOC) {
      return [];
    }
    return markdownEngine.generateTOC(sourceContent);
  }, [activeFile, exportSettings.includeTOC, sourceContent]);

  // Parse markdown and inject TOC anchors
  const renderedHTML = useMemo(() => {
    if (!activeFile) {
      return '';
    }

    let html = markdownEngine.parse(sourceContent, {
      highlightCode: exportSettings.highlightCode,
      sanitize: exportSettings.sanitizeHTML,
    });

    // Inject TOC anchors if TOC is enabled
    if (exportSettings.includeTOC && tocEntries.length > 0) {
      html = markdownEngine.injectTOCAnchors(html, tocEntries);
    }

    return html;
  }, [activeFile, sourceContent, exportSettings.highlightCode, exportSettings.sanitizeHTML, exportSettings.includeTOC, tocEntries]);

  // Resolve the selected base theme together with any cloned appearance.
  const appearance = useMemo(() => resolveAppearance(exportSettings), [exportSettings]);
  const themeStyles = appearance.colors;

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
    const fontSize = getFontSize(exportSettings.fontSize);

    const clonedCss = appearance.clonedCss;
    let css = clonedCss ? `
      .preview-content {
        font-family: ${appearance.fontFamily};
        font-size: ${fontSize};
        line-height: ${appearance.lineHeight};
        color: var(--ink, ${themeStyles.textColor});
      }
      .preview-content :is(h1, h2, h3, h4, h5, h6) {
        color: var(--ink, ${appearance.headingColor});
        font-family: var(--heading-font, ${appearance.headingFontFamily});
      }
      .preview-content :is(p, li, td) {
        color: var(--ink-soft, var(--ink, ${themeStyles.textColor}));
      }
    ` : `
      .preview-content {
        font-family: ${appearance.fontFamily} !important;
        font-size: ${fontSize} !important;
        line-height: ${appearance.lineHeight} !important;
      }
      .preview-content h1,
      .preview-content h2,
      .preview-content h3,
      .preview-content h4,
      .preview-content h5,
      .preview-content h6 {
        color: ${appearance.headingColor} !important;
        font-family: ${appearance.headingFontFamily} !important;
        font-weight: ${appearance.headingFontWeight} !important;
      }
      .preview-content a {
        color: ${appearance.linkColor} !important;
      }
      .preview-content code {
        background-color: ${themeStyles.codeBlockBg} !important;
        color: ${themeStyles.textColor} !important;
        font-family: monospace !important;
      }
      .preview-content pre {
        background-color: ${themeStyles.codeBlockBg} !important;
        ${exportSettings.highlightCode ? `border: 1px solid ${appearance.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} !important;` : ''}
        border-radius: ${appearance.borderRadius} !important;
        /* Hug the code block's own width instead of stretching the
           highlighted background across the full reading column. */
        width: fit-content !important;
        max-width: 100% !important;
      }
      .preview-content pre code {
        font-family: monospace !important;
      }
      .preview-content .table-wrapper {
        overflow-x: auto;
        margin: 1em 0;
      }
      .preview-content table {
        /* Size to content instead of always stretching full width; the
           wrapper above scrolls horizontally for genuinely wide tables. */
        width: auto !important;
        max-width: 100%;
        border-collapse: collapse !important;
      }
      .preview-content th,
      .preview-content td {
        border: 1px solid ${appearance.tableBorderColor} !important;
        padding: 0.55rem 0.75rem !important;
        color: ${themeStyles.textColor} !important;
      }
      .preview-content th {
        background-color: ${appearance.tableHeaderBg} !important;
        color: ${appearance.tableHeaderColor} !important;
      }
      .preview-content blockquote {
        border-left-color: ${themeStyles.accentColor} !important;
      }
      .preview-content strong,
      .preview-content b {
        color: ${themeStyles.textColor} !important;
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
        color: ${appearance.linkColor} !important;
      }
      .preview-content p {
        color: ${themeStyles.textColor} !important;
      }
    `;

    css += `
      .preview-content pre.mermaid {
        background-color: transparent !important;
        border: none !important;
        padding: 0 !important;
        text-align: center;
        overflow-x: auto;
        /* Mermaid's viewport/canvas elements size themselves as percentages
           of this element for pan/zoom math, so keep it full width (unlike
           plain code blocks) rather than shrink-wrapping. */
        width: 100% !important;
        max-width: 100% !important;
      }
      /* Fullscreen must not stay transparent — that lets the browser's
         black fullscreen backdrop show through. Use the same paper color
         as the unzoomed diagram. */
      .preview-content pre.mermaid:fullscreen {
        background-color: var(--mermaid-surface, ${themeStyles.backgroundColor}) !important;
      }
      .preview-content pre.mermaid svg {
        max-width: none;
        height: auto;
      }
      .preview-content .mermaid-error {
        color: #b91c1c !important;
        background-color: rgba(239, 68, 68, 0.08) !important;
        border: 1px solid rgba(239, 68, 68, 0.4) !important;
        border-radius: 6px !important;
        padding: 12px 16px !important;
        text-align: left !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        white-space: normal !important;
      }
      .preview-content .mermaid-error-detail {
        display: block;
        margin-top: 6px;
        font-family: monospace !important;
        font-size: 0.85em;
        opacity: 0.85;
        word-break: break-word;
      }
    `;

    if (exportSettings.highlightCode) {
      css += ThemeManager.getSyntaxHighlightingCSS(appearance.isDark
        ? 'github-dark'
        : 'github-light');
    }

    if (appearance.clonedCss) {
      css += `\n${scopeClonedStylesheet(appearance.clonedCss, '.preview-content')}\n`;
    }

    if (appearance.isDark) {
      css += `
      /* Readable on dark paper — beat Tailwind prose-slate and light-theme cloned links/code */
      .preview-content a {
        color: ${appearance.linkColor} !important;
      }
      .preview-content :not(pre) > code {
        color: ${themeStyles.textColor} !important;
        background-color: ${themeStyles.codeBlockBg} !important;
      }
    `;
    }

    return css;
  }, [appearance, themeStyles, exportSettings.fontSize, exportSettings.highlightCode]);

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

  // Container ref for the rendered markdown, used to render mermaid diagrams.
  const contentRef = useRef<HTMLDivElement>(null);

  // Render mermaid diagrams after every commit. React manages this container's
  // innerHTML via dangerouslySetInnerHTML and may reset it on re-render (e.g.
  // when unrelated export settings such as "Minify Output" change), which wipes
  // the imperatively injected SVG/toolbar. Running on every render (guarded by
  // the cheap mmd-state check inside renderMermaid, which skips already-rendered
  // blocks) makes the preview self-heal whenever the DOM is reset.
  useEffect(() => {
    if (!MarkdownEngine.containsMermaid(finalHTML) && !MarkdownEngine.containsMermaid(renderedHTML)) {
      return;
    }
    renderMermaid(contentRef.current, exportSettings.theme);
  });

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
          className={`flex-1 p-6 overflow-y-auto prose ${appearance.isDark ? 'prose-invert' : 'prose-slate'} max-w-none transition-colors duration-300 preview-content`}
          style={{
            backgroundColor: themeStyles.backgroundColor,
            color: themeStyles.textColor,
          }}
        >
          <style>{customCSS}</style>
          <div ref={contentRef} key={exportSettings.theme} dangerouslySetInnerHTML={{ __html: renderedHTML }} />
        </div>
      </div>
    );
  }

  // Render with top TOC or no TOC
  return (
    <div
      className={`p-6 overflow-y-auto prose ${appearance.isDark ? 'prose-invert' : 'prose-slate'} max-w-none transition-colors duration-300 preview-content`}
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
      <div ref={contentRef} key={exportSettings.theme} dangerouslySetInnerHTML={{ __html: finalHTML }} />
    </div>
  );
}
