import JSZip from 'jszip';
import type { MarkdownFile, ExportSettings, TOCEntry } from '../types';
import { markdownEngine, MarkdownEngine } from './markdownEngine';
import { ThemeManager } from './themeManager';
import { getConfiguredFontSize, resolveAppearance } from './appearanceUtils';
import { getMermaidExportScript } from './mermaidAssets';

/**
 * ExportEngine class for generating HTML exports and ZIP archives
 */
export class ExportEngine {
  /**
   * Generate HTML from a markdown file with export settings
   */
  static generateHTML(file: MarkdownFile, settings: ExportSettings): string {
    // When a TOC is generated, drop the document's own authored "Table of
    // Contents" section so it isn't duplicated alongside the generated one.
    const source = settings.includeTOC
      ? markdownEngine.stripAuthoredTOC(file.content)
      : file.content;

    // Parse markdown to HTML
    const html = markdownEngine.parse(source, {
      highlightCode: settings.highlightCode,
      sanitize: settings.sanitizeHTML
    });

    // Generate TOC if enabled
    let tocHTML = '';
    let processedHTML = html;
    let tocEntries: TOCEntry[] = [];

    if (settings.includeTOC) {
      tocEntries = markdownEngine.generateTOC(source);
      processedHTML = markdownEngine.injectTOCAnchors(html, tocEntries);

      if (settings.tocPosition === 'top-of-page') {
        tocHTML = this.generateTOCHTML(tocEntries, 'top');
      } else if (settings.tocPosition === 'left-sidebar') {
        tocHTML = this.generateTOCHTML(tocEntries, 'sidebar');
      }
    }

    // Combine TOC and content based on position
    let content: string;
    if (settings.includeTOC && settings.tocPosition === 'left-sidebar' && tocEntries.length > 0) {
      // Wrap in flex layout for sidebar TOC
      content = `<div class="toc-layout">
  ${tocHTML}
  <div class="toc-content">
    ${processedHTML}
  </div>
</div>`;
    } else if (settings.includeTOC && settings.tocPosition === 'top-of-page' && tocEntries.length > 0) {
      // Insert TOC after the first h1 header
      content = this.insertTOCAfterHeader(processedHTML, tocHTML);
    } else {
      // No TOC
      content = processedHTML;
    }

    // Generate CSS if needed
    const css = settings.includeCSS ? this.generateCSS(settings) : '';

    let finalOutput: string;

    // Return based on output format
    if (settings.outputFormat === 'html5-complete') {
      finalOutput = this.generateHTML5Complete(file.name, content, css, settings);
    } else {
      // For fragments, still append the mermaid runtime so diagrams render
      // wherever the fragment is embedded.
      finalOutput = content;
      if (MarkdownEngine.containsMermaid(content)) {
        finalOutput += '\n' + this.generateMermaidScript(settings);
      }
    }

    // Minify if enabled
    if (settings.minifyOutput) {
      finalOutput = this.minify(finalOutput);
    }

    return finalOutput;
  }

  /**
   * Generate HTML5 Complete document structure
   */
  private static generateHTML5Complete(filename: string, content: string, css: string, settings: ExportSettings): string {
    const title = filename.replace(/\.md$/, '');
    const mermaidScript = MarkdownEngine.containsMermaid(content)
      ? '\n' + this.generateMermaidScript(settings)
      : '';

    // The light/dark toggle + collapsible TOC controls are only meaningful when
    // we ship our stylesheet (includeCSS), which defines the theme variables.
    const themed = settings.includeCSS;
    const hasClonedStyle = Boolean(settings.clonedStyle);
    const selectedDark = resolveAppearance(settings).isDark;
    const htmlClass = themed && selectedDark ? ' class="dark"' : '';
    const headInit = themed && !hasClonedStyle ? `\n  ${this.generateThemeInitScript(selectedDark)}` : '';
    const themeToggle = themed && !hasClonedStyle ? `${this.generateThemeToggleButton()}\n` : '';
    const controlsScript = themed ? `\n${this.generateControlsScript()}` : '';

    return `<!DOCTYPE html>
<html lang="en"${htmlClass}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>${headInit}${css ? `
  <style>
${css}
  </style>` : ''}
</head>
<body>
${themeToggle}${content}${mermaidScript}${controlsScript}
</body>
</html>`;
  }

  /**
   * Inline head script that applies the saved/initial theme before paint to
   * avoid a flash, and records the resolved mode on window.__docThemeDark so
   * the mermaid runtime can render diagrams in the matching theme.
   */
  private static generateThemeInitScript(selectedDark: boolean): string {
    const def = selectedDark ? 'true' : 'false';
    return `<script>(function(){try{var t=localStorage.getItem('md2htmlTheme');var d=(t==='dark')||(t!=='light'&&${def});document.documentElement.classList.toggle('dark',d);window.__docThemeDark=d;}catch(e){window.__docThemeDark=${def};}})();</script>`;
  }

  /**
   * Floating light/dark toggle button (sun/moon icons).
   */
  private static generateThemeToggleButton(): string {
    return `<button id="theme-toggle" type="button" class="doc-theme-toggle" onclick="__toggleTheme()" aria-label="Toggle light and dark mode" title="Toggle light / dark"><svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg><svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg></button>`;
  }

  /**
   * Page control script: theme toggle + TOC collapse. Written as a single line
   * so it survives HTML minification intact.
   */
  private static generateControlsScript(): string {
    return `<script>(function(){var KEY='md2htmlTheme';var root=document.documentElement;window.__toggleTheme=function(){var dark=!root.classList.contains('dark');root.classList.toggle('dark',dark);window.__docThemeDark=dark;try{localStorage.setItem(KEY,dark?'dark':'light');}catch(e){}if(window.__setMermaidTheme){window.__setMermaidTheme(dark);}};window.__toggleTOC=function(btn){var layout=btn.closest('.toc-layout');if(layout){layout.classList.toggle('toc-collapsed');return;}var top=btn.closest('.table-of-contents');if(top){top.classList.toggle('toc-collapsed');}};})();</script>`;
  }

  /**
   * Generate the mermaid runtime script that renders <pre class="mermaid">
   * blocks into interactive diagrams (with the zoom/pan/export toolbar) in the
   * exported HTML, and re-themes them when the page light/dark mode changes.
   */
  private static generateMermaidScript(settings: ExportSettings): string {
    const appearance = resolveAppearance(settings);
    const selectedDark = appearance.isDark;
    const selected = appearance.colors;
    const light = settings.clonedStyle || !selectedDark ? selected : ThemeManager.getThemeStyles('github-light');
    const dark = settings.clonedStyle || selectedDark ? selected : ThemeManager.getThemeStyles('github-dark');
    return getMermaidExportScript(selectedDark, light.backgroundColor, dark.backgroundColor);
  }

  /**
   * Insert TOC after the first h1 header in the HTML content
   */
  private static insertTOCAfterHeader(html: string, tocHTML: string): string {
    // Find the closing tag of the first h1
    const h1Match = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/i);
    
    if (h1Match && h1Match.index !== undefined) {
      const insertPosition = h1Match.index + h1Match[0].length;
      return html.slice(0, insertPosition) + '\n' + tocHTML + html.slice(insertPosition);
    }
    
    // If no h1 found, prepend TOC (fallback behavior)
    return tocHTML + html;
  }

  /**
   * Generate TOC HTML with a collapse toggle in the header.
   */
  private static generateTOCHTML(tocEntries: TOCEntry[], position: 'top' | 'sidebar'): string {
    if (tocEntries.length === 0) {
      return '';
    }

    const className = position === 'sidebar' ? 'table-of-contents-sidebar' : 'table-of-contents';
    const chevron = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>';
    let tocHTML = `<nav class="${className}">
<div class="toc-header">
<h2>Table of Contents</h2>
<button type="button" class="toc-collapse-btn" onclick="__toggleTOC(this)" aria-label="Toggle table of contents" title="Collapse / expand">${chevron}</button>
</div>
<ul>
`;

    for (const entry of tocEntries) {
      const indent = entry.level === 3 ? '  ' : '';
      const liClass = entry.level === 3 ? ' class="toc-level-3"' : '';
      tocHTML += `${indent}<li${liClass}><a href="#${entry.id}">${entry.text}</a></li>\n`;
    }

    tocHTML += '</ul>\n</nav>\n';

    return tocHTML;
  }

  /**
   * Generate CSS for themes, fonts, and highlighting.
   *
   * Emits CSS custom properties for both a light and a dark palette so the
   * exported document can be toggled at runtime. The selected theme is used as
   * one of the two modes (its counterpart defaults to github-light/dark).
   */
  private static generateCSS(settings: ExportSettings): string {
    const appearance = resolveAppearance(settings);
    const selectedDark = appearance.isDark;
    const selected = appearance.colors;
    const light = settings.clonedStyle || !selectedDark ? selected : ThemeManager.getThemeStyles('github-light');
    const dark = settings.clonedStyle || selectedDark ? selected : ThemeManager.getThemeStyles('github-dark');
    const hl = settings.highlightCode;

    let css = `:root {
  --bg: ${light.backgroundColor};
  --text: ${light.textColor};
  --accent: ${light.accentColor};
  --heading: ${appearance.headingColor};
  --link: ${appearance.linkColor};
  --code-bg: ${light.codeBlockBg};
  --table-head: ${appearance.tableHeaderBg};
  --table-head-text: ${appearance.tableHeaderColor};
  --table-border: ${appearance.tableBorderColor};
  --border: rgba(0, 0, 0, 0.1);
  --border-soft: rgba(0, 0, 0, 0.2);
  --accent-soft: ${light.accentColor}20;
  color-scheme: light;${hl ? '\n' + this.getSyntaxVars(false) : ''}
}

:root.dark {
  --bg: ${dark.backgroundColor};
  --text: ${dark.textColor};
  --accent: ${dark.accentColor};
  --heading: ${appearance.headingColor};
  --link: ${appearance.linkColor};
  --code-bg: ${dark.codeBlockBg};
  --table-head: ${appearance.tableHeaderBg};
  --table-head-text: ${appearance.tableHeaderColor};
  --table-border: ${appearance.tableBorderColor};
  --border: rgba(255, 255, 255, 0.1);
  --border-soft: rgba(255, 255, 255, 0.2);
  --accent-soft: ${dark.accentColor}33;
  color-scheme: dark;${hl ? '\n' + this.getSyntaxVars(true) : ''}
}

body {
  background-color: var(--bg);
  color: var(--text);
  font-family: ${appearance.fontFamily};
  font-size: ${getConfiguredFontSize(settings.fontSize)};
  line-height: ${appearance.lineHeight};
  margin: 0;
  padding: 2rem;
  transition: background-color 0.2s ease, color 0.2s ease;
}

body > *:not(.toc-layout) {
  /* Fill ~94% of the available width so content uses most of the screen on
     high-resolution displays (a % resolves against body's padded content
     box, so it never overflows on small screens). The 2400px ceiling only
     engages on very large 4K/ultra-wide monitors to keep line length
     readable; on typical 1440-2560px screens the percentage wins and the
     content spans nearly edge to edge. */
  max-width: min(94%, 2400px);
  margin-left: auto;
  margin-right: auto;
}

h1, h2, h3, h4, h5, h6 {
  color: var(--heading);
  font-family: ${appearance.headingFontFamily};
  font-weight: ${appearance.headingFontWeight};
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

h1 {
  font-size: 2.25em;
}

h2 {
  font-size: 1.875em;
}

h3 {
  font-size: 1.5em;
}

a {
  color: var(--link);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

strong, b {
  color: var(--text);
  font-weight: 700;
}

p {
  color: var(--text);
  margin: 1em 0;
}

ul, ol {
  color: var(--text);
  margin: 1em 0;
  padding-left: 2em;
}

li {
  color: var(--text);
  margin: 0.5em 0;
}

li::marker {
  color: var(--link);
  font-weight: 700;
}

code {
  background-color: var(--code-bg);
  color: var(--text);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
}

pre {
  background-color: var(--code-bg);
  padding: 1rem;
  border-radius: ${appearance.borderRadius};
  overflow-x: auto;
  /* Hug the code/diagram's own width instead of stretching the highlighted
     background across the full (wide) reading column. Still capped at the
     column width and scrollable for content that's genuinely wider. */
  width: fit-content;
  max-width: 100%;
  ${hl ? 'border: 1px solid var(--border);' : ''}
}

pre code {
  background-color: transparent;
  padding: 0;
}

pre.mermaid {
  background-color: transparent;
  border: none;
  padding: 0;
  text-align: center;
  overflow-x: auto;
  /* Mermaid's own viewport/canvas elements size themselves as percentages of
     this element for pan/zoom math, so keep it full width (unlike plain
     code blocks) rather than shrink-wrapping. */
  width: 100%;
  max-width: 100%;
}
pre.mermaid:fullscreen {
  background-color: var(--mermaid-surface, var(--bg, #ffffff));
}

pre.mermaid svg {
  max-width: none;
  height: auto;
}

blockquote {
  border-left: 4px solid var(--accent);
  padding-left: 1rem;
  margin-left: 0;
  color: var(--text);
  opacity: 0.8;
}

.table-wrapper {
  overflow-x: auto;
  margin: 1rem 0;
}

table {
  border-collapse: collapse;
  /* Size to content instead of always stretching to the full (wide) reading
     column; the wrapper above handles horizontal scrolling for tables that
     are genuinely too wide to fit. */
  width: auto;
  max-width: 100%;
  margin: 0;
}

th, td {
  border: 1px solid var(--table-border);
  padding: 0.5rem;
  text-align: left;
}

th {
  background-color: var(--table-head);
  color: var(--table-head-text);
}

/* Theme toggle button */
.doc-theme-toggle {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 50;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background-color: var(--code-bg);
  color: var(--accent);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
}

.doc-theme-toggle:hover {
  background-color: var(--accent-soft);
}

.doc-theme-toggle svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.doc-theme-toggle .icon-sun { display: none; }
:root.dark .doc-theme-toggle .icon-sun { display: block; }
:root.dark .doc-theme-toggle .icon-moon { display: none; }

/* TOC header + collapse control */
.toc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.toc-header h2 {
  margin: 0;
}

.toc-collapse-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: none;
  border-radius: 6px;
  background-color: transparent;
  color: var(--accent);
  cursor: pointer;
}

.toc-collapse-btn:hover {
  background-color: var(--accent-soft);
}

.toc-collapse-btn svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 0.2s ease;
}

.table-of-contents {
  background-color: var(--code-bg);
  padding: 1rem;
  border-radius: ${appearance.borderRadius};
  margin-bottom: 2rem;
}

.table-of-contents h2 {
  margin-top: 0;
}

.table-of-contents ul {
  list-style: none;
  padding-left: 0;
  margin-bottom: 0;
}

.table-of-contents li {
  margin: 0.5rem 0;
}

.table-of-contents a {
  color: var(--accent);
}

.table-of-contents.toc-collapsed ul {
  display: none;
}

.table-of-contents.toc-collapsed .toc-collapse-btn svg {
  transform: rotate(-90deg);
}

/* Sidebar TOC Layout */
.toc-layout {
  display: flex;
  gap: 2rem;
  /* Wider ceiling than the plain content column because this layout also
     holds the TOC sidebar; fills ~96% on typical screens and only caps on
     very large monitors. */
  max-width: min(96%, 2800px);
  margin: 0 auto;
}

.table-of-contents-sidebar {
  width: 320px;
  flex-shrink: 0;
  position: sticky;
  top: 2rem;
  align-self: flex-start;
  background-color: var(--code-bg);
  padding: 1.5rem;
  border-radius: ${appearance.borderRadius};
  max-height: calc(100vh - 4rem);
  overflow-y: auto;
  transition: width 0.2s ease, padding 0.2s ease;
}

.table-of-contents-sidebar h2 {
  margin-top: 0;
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: var(--accent);
}

.table-of-contents-sidebar ul {
  list-style: none;
  padding-left: 0;
}

.table-of-contents-sidebar li {
  margin: 0.5rem 0;
}

.table-of-contents-sidebar li::marker {
  content: none;
}

.table-of-contents-sidebar li.toc-level-3 {
  margin-left: 1rem;
  font-size: 0.9rem;
}

.table-of-contents-sidebar a {
  color: var(--accent);
  display: block;
  padding: 0.25rem 0.5rem;
  border-left: 2px solid transparent;
  transition: all 0.2s;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.table-of-contents-sidebar a:hover {
  border-left-color: var(--accent);
  background-color: var(--accent-soft);
  text-decoration: none;
}

.toc-layout.toc-collapsed .table-of-contents-sidebar {
  width: 46px;
  padding: 0.5rem;
  overflow: hidden;
}

.toc-layout.toc-collapsed .table-of-contents-sidebar h2,
.toc-layout.toc-collapsed .table-of-contents-sidebar ul {
  display: none;
}

.toc-layout.toc-collapsed .toc-collapse-btn svg {
  transform: rotate(180deg);
}

.toc-content {
  flex: 1;
  min-width: 0;
}
`;

    // Syntax highlighting CSS if enabled (token colors come from the variables
    // defined above so they switch with the light/dark toggle).
    if (hl) {
      css += this.getSyntaxRules();
    }

    if (appearance.clonedCss) {
      css += `\n\n/* Cloned source styles */\n${appearance.clonedCss}\n`;
    }

    if (appearance.isDark) {
      css += `
/* Readable on dark paper */
a { color: var(--link) !important; }
:not(pre) > code {
  color: var(--text) !important;
  background-color: var(--code-bg) !important;
}
`;
    }

    return css;
  }

  /**
   * CSS custom property declarations for syntax-highlight token colors.
   */
  private static getSyntaxVars(isDark: boolean): string {
    const c = isDark
      ? {
          keyword: '#c678dd',
          string: '#98c379',
          number: '#d19a66',
          builtin: '#e6c07b',
          variable: '#e06c75',
          comment: '#5c6370',
          fn: '#61afef',
        }
      : {
          keyword: '#a626a4',
          string: '#50a14f',
          number: '#986801',
          builtin: '#c18401',
          variable: '#e45649',
          comment: '#a0a1a7',
          fn: '#4078f2',
        };
    return `  --hljs-keyword: ${c.keyword};
  --hljs-string: ${c.string};
  --hljs-number: ${c.number};
  --hljs-builtin: ${c.builtin};
  --hljs-variable: ${c.variable};
  --hljs-comment: ${c.comment};
  --hljs-function: ${c.fn};`;
  }

  /**
   * Syntax-highlight token rules that reference the theme variables, so colors
   * follow the active light/dark mode.
   */
  private static getSyntaxRules(): string {
    return `
/* Syntax Highlighting (token colors via CSS variables) */
.hljs {
  display: block;
  overflow-x: auto;
  padding: 0.5em;
}
.hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-section, .hljs-link { color: var(--hljs-keyword); }
.hljs-string { color: var(--hljs-string); }
.hljs-number, .hljs-regexp, .hljs-addition { color: var(--hljs-number); }
.hljs-built_in, .hljs-builtin-name { color: var(--hljs-builtin); }
.hljs-variable, .hljs-template-variable, .hljs-attribute, .hljs-tag, .hljs-name, .hljs-selector-id, .hljs-selector-class { color: var(--hljs-variable); }
.hljs-comment, .hljs-quote, .hljs-deletion, .hljs-meta { color: var(--hljs-comment); }
.hljs-function { color: var(--hljs-function); }
`;
  }


  /**
   * Minify HTML by removing unnecessary whitespace
   */
  static minify(html: string): string {
    // Preserve content within pre, code, script, and style tags
    const preCodeBlocks: string[] = [];
    let preservedHTML = html;

    const preserve = (regex: RegExp) => {
      preservedHTML = preservedHTML.replace(regex, (match) => {
        const index = preCodeBlocks.length;
        preCodeBlocks.push(match);
        return `___PRESERVED_BLOCK_${index}___`;
      });
    };

    // Extract and preserve blocks whose internal whitespace is significant.
    // CSS in <style> is intentionally left to be minified (whitespace there is
    // insignificant), but <pre> and <script> content must be kept verbatim.
    preserve(/<pre[^>]*>[\s\S]*?<\/pre>/gi);
    preserve(/<script[^>]*>[\s\S]*?<\/script>/gi);

    // Remove newlines and extra spaces
    preservedHTML = preservedHTML
      .replace(/\n/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();

    // Restore preserved blocks
    preCodeBlocks.forEach((block, index) => {
      preservedHTML = preservedHTML.replace(`___PRESERVED_BLOCK_${index}___`, block);
    });

    return preservedHTML;
  }

  /**
   * Generate ZIP archive from multiple files
   */
  static async generateZIP(files: MarkdownFile[], settings: ExportSettings): Promise<Blob> {
    const zip = new JSZip();

    // Add each file to the ZIP
    for (const file of files) {
      const html = this.generateHTML(file, settings);
      const filename = file.name.replace(/\.md$/, '.html');
      zip.file(filename, html);
    }

    // Generate the ZIP blob
    return await zip.generateAsync({ type: 'blob' });
  }

  /**
   * Download a file with given content and filename
   */
  static downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/html' });
    this.downloadBlob(blob, filename);
  }

  /**
   * Download a blob with given filename
   */
  static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
