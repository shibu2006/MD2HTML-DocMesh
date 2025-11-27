import JSZip from 'jszip';
import type { MarkdownFile, ExportSettings, TOCEntry } from '../types';
import { markdownEngine } from './markdownEngine';
import { ThemeManager } from './themeManager';

/**
 * ExportEngine class for generating HTML exports and ZIP archives
 */
export class ExportEngine {
  /**
   * Generate HTML from a markdown file with export settings
   */
  static generateHTML(file: MarkdownFile, settings: ExportSettings): string {
    // Parse markdown to HTML
    const html = markdownEngine.parse(file.content, {
      highlightCode: settings.highlightCode,
      sanitize: settings.sanitizeHTML
    });

    // Generate TOC if enabled
    let tocHTML = '';
    let processedHTML = html;
    let tocEntries: TOCEntry[] = [];

    if (settings.includeTOC) {
      tocEntries = markdownEngine.generateTOC(file.content);
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
    } else {
      // Top TOC or no TOC
      content = tocHTML + processedHTML;
    }

    // Generate CSS if needed
    const css = settings.includeCSS ? this.generateCSS(settings) : '';

    let finalOutput: string;

    // Return based on output format
    if (settings.outputFormat === 'html5-complete') {
      finalOutput = this.generateHTML5Complete(file.name, content, css);
    } else {
      finalOutput = content;
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
  private static generateHTML5Complete(filename: string, content: string, css: string): string {
    const title = filename.replace(/\.md$/, '');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>${css ? `
  <style>
${css}
  </style>` : ''}
</head>
<body>
${content}
</body>
</html>`;
  }

  /**
   * Generate TOC HTML
   */
  private static generateTOCHTML(tocEntries: TOCEntry[], position: 'top' | 'sidebar'): string {
    if (tocEntries.length === 0) {
      return '';
    }

    const className = position === 'sidebar' ? 'table-of-contents-sidebar' : 'table-of-contents';
    let tocHTML = `<nav class="${className}">\n<h2>Table of Contents</h2>\n<ul>\n`;

    for (const entry of tocEntries) {
      const indent = entry.level === 3 ? '  ' : '';
      const liClass = entry.level === 3 ? ' class="toc-level-3"' : '';
      tocHTML += `${indent}<li${liClass}><a href="#${entry.id}">${entry.text}</a></li>\n`;
    }

    tocHTML += '</ul>\n</nav>\n';

    return tocHTML;
  }

  /**
   * Generate CSS for themes, fonts, and highlighting
   */
  private static generateCSS(settings: ExportSettings): string {
    let css = '';

    // Theme styles
    const themeStyles = ThemeManager.getThemeStyles(settings.theme);
    css += `body {
  background-color: ${themeStyles.backgroundColor};
  color: ${themeStyles.textColor};
  font-family: ${this.getFontFamily(settings.fontFamily)};
  font-size: ${this.getFontSize(settings.fontSize)};
  line-height: 1.6;
  margin: 0;
  padding: 2rem;
}

body > *:not(.toc-layout) {
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

h1, h2, h3, h4, h5, h6 {
  color: ${themeStyles.accentColor};
  font-weight: 700;
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
  color: ${themeStyles.accentColor};
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

strong, b {
  color: ${themeStyles.accentColor};
  font-weight: 700;
}

p {
  color: ${themeStyles.textColor};
  margin: 1em 0;
}

ul, ol {
  color: ${themeStyles.textColor};
  margin: 1em 0;
  padding-left: 2em;
}

li {
  color: ${themeStyles.textColor};
  margin: 0.5em 0;
}

li::marker {
  color: ${themeStyles.accentColor};
  font-weight: 700;
}

code {
  background-color: ${themeStyles.codeBlockBg};
  color: ${themeStyles.textColor};
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
}

pre {
  background-color: ${themeStyles.codeBlockBg};
  padding: 1rem;
  border-radius: 5px;
  overflow-x: auto;
  ${settings.highlightCode ? `border: 1px solid ${ThemeManager.isDarkTheme(settings.theme) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};` : ''}
}

pre code {
  background-color: transparent;
  padding: 0;
}

blockquote {
  border-left: 4px solid ${themeStyles.accentColor};
  padding-left: 1rem;
  margin-left: 0;
  color: ${themeStyles.textColor};
  opacity: 0.8;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin: 1rem 0;
}

th, td {
  border: 1px solid ${themeStyles.textColor}33;
  padding: 0.5rem;
  text-align: left;
}

th {
  background-color: ${themeStyles.codeBlockBg};
}

.table-of-contents {
  background-color: ${themeStyles.codeBlockBg};
  padding: 1rem;
  border-radius: 5px;
  margin-bottom: 2rem;
}

.table-of-contents h2 {
  margin-top: 0;
}

.table-of-contents ul {
  list-style: none;
  padding-left: 0;
}

.table-of-contents li {
  margin: 0.5rem 0;
}

.table-of-contents a {
  color: ${themeStyles.accentColor};
}

/* Sidebar TOC Layout */
.toc-layout {
  display: flex;
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.table-of-contents-sidebar {
  width: 320px;
  flex-shrink: 0;
  position: sticky;
  top: 2rem;
  align-self: flex-start;
  background-color: ${themeStyles.codeBlockBg};
  padding: 1.5rem;
  border-radius: 5px;
  max-height: calc(100vh - 4rem);
  overflow-y: auto;
}

.table-of-contents-sidebar h2 {
  margin-top: 0;
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: ${themeStyles.accentColor};
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
  color: ${themeStyles.accentColor};
  display: block;
  padding: 0.25rem 0.5rem;
  border-left: 2px solid transparent;
  transition: all 0.2s;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.table-of-contents-sidebar a:hover {
  border-left-color: ${themeStyles.accentColor};
  background-color: ${themeStyles.accentColor}20;
  text-decoration: none;
}

.toc-content {
  flex: 1;
  min-width: 0;
}
`;

    // Syntax highlighting CSS if enabled
    if (settings.highlightCode) {
      css += ThemeManager.getSyntaxHighlightingCSS(settings.theme);
    }

    return css;
  }

  /**
   * Get font family CSS value
   */
  private static getFontFamily(fontFamily: ExportSettings['fontFamily']): string {
    switch (fontFamily) {
      case 'system':
        return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
      case 'inter':
        return 'Inter, -apple-system, BlinkMacSystemFont, sans-serif';
      case 'roboto':
        return 'Roboto, -apple-system, BlinkMacSystemFont, sans-serif';
      case 'monospace':
        return '"Courier New", Courier, monospace';
      default:
        return '-apple-system, BlinkMacSystemFont, sans-serif';
    }
  }

  /**
   * Get font size CSS value
   */
  private static getFontSize(fontSize: ExportSettings['fontSize']): string {
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
  }



  /**
   * Minify HTML by removing unnecessary whitespace
   */
  static minify(html: string): string {
    // Preserve content within pre and code tags
    const preCodeBlocks: string[] = [];
    let preservedHTML = html;

    // Extract and preserve pre/code blocks
    preservedHTML = preservedHTML.replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, (match) => {
      const index = preCodeBlocks.length;
      preCodeBlocks.push(match);
      return `___PRESERVED_BLOCK_${index}___`;
    });

    // Remove newlines and extra spaces
    preservedHTML = preservedHTML
      .replace(/\n/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();

    // Restore pre/code blocks
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
