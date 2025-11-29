import JSZip from 'jszip';
import type { DocMesh, MeshNode, HtmlFile, ExportSettings } from '../types';
import { HtmlFileNotFoundError } from '../types';
import { MeshManager } from './meshManager';
import { ThemeManager } from './themeManager';

/**
 * DocMeshExportEngine handles export operations for DocMesh structures,
 * including index generation, navigation creation, and ZIP packaging.
 */
export class DocMeshExportEngine {
  /**
   * Generate a unified index document from a DocMesh
   */
  static generateIndexDocument(
    mesh: DocMesh,
    htmlFiles: Map<string, HtmlFile>,
    settings: ExportSettings
  ): string {
    // Get all nodes in depth-first order
    const nodes = MeshManager.flattenTree(mesh);

    // Generate anchor IDs for all nodes
    const anchorIds = this.generateAnchorIds(nodes);

    // Generate navigation HTML
    const navigationHTML = this.generateNavigationHTML(mesh, anchorIds, htmlFiles);

    // Stitch together all HTML content
    const contentHTML = this.stitchHtmlContent(nodes, htmlFiles, anchorIds);

    // Generate CSS
    const css = this.generateMeshCSS(settings);

    // Combine everything into a complete HTML5 document
    return this.generateHTML5Document(mesh.name, navigationHTML, contentHTML, css);
  }

  /**
   * Generate a preview document for a single node with styles applied
   */
  static generateNodePreview(
    htmlContent: string,
    title: string,
    settings: ExportSettings
  ): string {
    const css = this.generateMeshCSS(settings);
    const bodyContent = this.extractBodyContent(htmlContent);

    // Wrap in content div to apply styles
    const contentHTML = `<div class="docmesh-content">\n${bodyContent}\n</div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <style>
${css}
/* Override layout for single node preview */
.docmesh-layout {
  display: block;
  min-height: 100vh;
}
.docmesh-nav {
  display: none;
}
  </style>
</head>
<body>
  <div class="docmesh-layout">
    ${contentHTML}
  </div>
</body>
</html>`;
  }

  /**
   * Generate navigation HTML from mesh tree structure
   */
  static generateNavigationHTML(
    mesh: DocMesh,
    anchorIds: Map<string, string>,
    htmlFiles: Map<string, HtmlFile>
  ): string {
    if (mesh.nodes.size === 0) {
      return '<nav class="docmesh-nav"><p>No documents in mesh</p></nav>';
    }

    let navHTML = '<nav class="docmesh-nav">\n';
    navHTML += `<h2>${this.escapeHtml(mesh.name)}</h2>\n`;
    navHTML += '<ul class="docmesh-nav-list">\n';

    // Get root nodes
    const rootNodes = Array.from(mesh.nodes.values())
      .filter(n => n.parentId === null)
      .sort((a, b) => a.order - b.order);

    // Recursively build navigation
    for (const rootNode of rootNodes) {
      navHTML += this.generateNavItem(rootNode, mesh, anchorIds, htmlFiles, 0);
    }

    navHTML += '</ul>\n';
    navHTML += '</nav>';

    return navHTML;
  }

  /**
   * Remove .html extension from filename for display
   */
  private static removeHtmlExtension(name: string): string {
    return name.replace(/\.html$/i, '');
  }

  /**
   * Generate a single navigation item (recursive)
   */
  private static generateNavItem(
    node: MeshNode,
    mesh: DocMesh,
    anchorIds: Map<string, string>,
    htmlFiles: Map<string, HtmlFile>,
    depth: number
  ): string {
    const anchorId = anchorIds.get(node.id) || node.id;
    const htmlFile = htmlFiles.get(node.htmlFileId);

    // Use configured title or fallback to filename (without .html extension)
    const rawTitle = node.title || (htmlFile ? htmlFile.name : 'Untitled');
    const displayTitle = this.removeHtmlExtension(rawTitle);
    const description = node.description;

    let itemHTML = `<li class="docmesh-nav-item docmesh-nav-depth-${depth}">\n`;
    itemHTML += `  <a href="#${anchorId}" class="docmesh-nav-link">`;
    itemHTML += `<span class="docmesh-nav-title">${this.escapeHtml(displayTitle)}</span>`;

    if (description) {
      itemHTML += `<span class="docmesh-nav-desc">${this.escapeHtml(description)}</span>`;
    }

    itemHTML += `</a>\n`;

    // Add children if any
    if (node.children.length > 0) {
      itemHTML += '  <ul class="docmesh-nav-sublist">\n';

      const children = node.children
        .map(childId => mesh.nodes.get(childId))
        .filter((child): child is MeshNode => child !== undefined)
        .sort((a, b) => a.order - b.order);

      for (const child of children) {
        itemHTML += this.generateNavItem(child, mesh, anchorIds, htmlFiles, depth + 1);
      }

      itemHTML += '  </ul>\n';
    }

    itemHTML += '</li>\n';

    return itemHTML;
  }

  /**
   * Stitch together HTML content from all nodes
   */
  static stitchHtmlContent(
    nodes: MeshNode[],
    htmlFiles: Map<string, HtmlFile>,
    anchorIds: Map<string, string>
  ): string {
    let contentHTML = '<div class="docmesh-content">\n';

    for (const node of nodes) {
      const htmlFile = htmlFiles.get(node.htmlFileId);

      if (!htmlFile) {
        throw new HtmlFileNotFoundError(node.htmlFileId);
      }

      const anchorId = anchorIds.get(node.id) || node.id;

      // Create a section for this node (without redundant title - HTML content has its own)
      contentHTML += `<section id="${anchorId}" class="docmesh-section">\n`;

      // Only show description if provided (title comes from the HTML content itself)
      if (node.description) {
        contentHTML += `<p class="docmesh-section-desc">${this.escapeHtml(node.description)}</p>\n`;
      }

      // Extract body content from HTML file (remove html/head/body tags if present)
      const bodyContent = this.extractBodyContent(htmlFile.content);
      contentHTML += bodyContent;

      contentHTML += '</section>\n\n';
    }

    contentHTML += '</div>';

    return contentHTML;
  }

  /**
   * Generate anchor IDs for all nodes
   */
  static generateAnchorIds(nodes: MeshNode[]): Map<string, string> {
    const anchorIds = new Map<string, string>();
    const usedIds = new Set<string>();

    for (const node of nodes) {
      // Create a base ID from the node ID
      let baseId = `node-${node.id}`;
      let anchorId = baseId;
      let counter = 1;

      // Ensure uniqueness
      while (usedIds.has(anchorId)) {
        anchorId = `${baseId}-${counter}`;
        counter++;
      }

      usedIds.add(anchorId);
      anchorIds.set(node.id, anchorId);
    }

    return anchorIds;
  }

  /**
   * Extract body content from HTML (remove html/head/body wrapper tags)
   */
  private static extractBodyContent(html: string): string {
    // Try to extract content from body tag
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
      return bodyMatch[1];
    }

    // If no body tag, return as-is (might be a fragment)
    return html;
  }

  /**
   * Generate complete HTML5 document
   */
  private static generateHTML5Document(
    title: string,
    navigationHTML: string,
    contentHTML: string,
    css: string
  ): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <style>
${css}
  </style>
</head>
<body>
  <div class="docmesh-layout">
    ${navigationHTML}
    ${contentHTML}
  </div>
</body>
</html>`;
  }

  /**
   * Generate CSS for DocMesh layout and styling
   */
  private static generateMeshCSS(settings: ExportSettings): string {
    const themeStyles = ThemeManager.getThemeStyles(settings.theme);

    return `/* DocMesh Layout */
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: ${themeStyles.backgroundColor};
  color: ${themeStyles.textColor};
  line-height: 1.6;
}

.docmesh-layout {
  display: flex;
  min-height: 100vh;
}

/* Navigation Sidebar */
.docmesh-nav {
  width: 320px;
  flex-shrink: 0;
  background-color: ${themeStyles.codeBlockBg};
  padding: 2rem 1.5rem;
  overflow-y: auto;
  position: sticky;
  top: 0;
  height: 100vh;
  border-right: 1px solid ${ThemeManager.isDarkTheme(settings.theme) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
}

.docmesh-nav h2 {
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  color: ${themeStyles.accentColor};
  font-weight: 700;
}

.docmesh-nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.docmesh-nav-sublist {
  list-style: none;
  padding-left: 1rem;
  margin: 0.25rem 0 0 0;
}

.docmesh-nav-item {
  margin: 0.25rem 0;
}

.docmesh-nav-link {
  display: block;
  padding: 0.5rem 0.75rem;
  color: ${themeStyles.textColor};
  text-decoration: none;
  border-radius: 4px;
  border-left: 3px solid transparent;
  transition: all 0.2s;
}

.docmesh-nav-link:hover {
  background-color: ${themeStyles.accentColor}20;
  border-left-color: ${themeStyles.accentColor};
}

.docmesh-nav-title {
  display: block;
  font-weight: 600;
  color: ${themeStyles.accentColor};
}

.docmesh-nav-desc {
  display: block;
  font-size: 0.875rem;
  color: ${themeStyles.textColor};
  opacity: 0.7;
  margin-top: 0.25rem;
}

/* Content Area */
.docmesh-content {
  flex: 1;
  padding: 3rem;
  max-width: 900px;
  margin: 0 auto;
}

.docmesh-section {
  margin-bottom: 4rem;
  scroll-margin-top: 2rem;
}

.docmesh-section-desc {
  font-size: 1.125rem;
  color: ${themeStyles.textColor};
  opacity: 0.8;
  margin: 0 0 2rem 0;
  font-style: italic;
}

/* Content Styling */
.docmesh-content h1,
.docmesh-content h2,
.docmesh-content h3,
.docmesh-content h4,
.docmesh-content h5,
.docmesh-content h6 {
  color: ${themeStyles.accentColor};
  font-weight: 700;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.docmesh-content h1 { font-size: 2rem; }
.docmesh-content h2 { font-size: 1.75rem; }
.docmesh-content h3 { font-size: 1.5rem; }
.docmesh-content h4 { font-size: 1.25rem; }

.docmesh-content p {
  margin: 1rem 0;
}

.docmesh-content a {
  color: ${themeStyles.accentColor};
  text-decoration: none;
}

.docmesh-content a:hover {
  text-decoration: underline;
}

.docmesh-content code {
  background-color: ${themeStyles.codeBlockBg};
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

.docmesh-content pre {
  background-color: ${themeStyles.codeBlockBg};
  padding: 1rem;
  border-radius: 5px;
  overflow-x: auto;
  border: 1px solid ${ThemeManager.isDarkTheme(settings.theme) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
}

.docmesh-content pre code {
  background-color: transparent;
  padding: 0;
}

.docmesh-content ul,
.docmesh-content ol {
  margin: 1rem 0;
  padding-left: 2rem;
}

.docmesh-content li {
  margin: 0.5rem 0;
}

.docmesh-content blockquote {
  border-left: 4px solid ${themeStyles.accentColor};
  padding-left: 1rem;
  margin: 1rem 0;
  opacity: 0.8;
}

.docmesh-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 1rem 0;
}

.docmesh-content th,
.docmesh-content td {
  border: 1px solid ${themeStyles.textColor}33;
  padding: 0.5rem;
  text-align: left;
}

.docmesh-content th {
  background-color: ${themeStyles.codeBlockBg};
  font-weight: 700;
}

/* Responsive Design */
@media (max-width: 768px) {
  .docmesh-layout {
    flex-direction: column;
  }
  
  .docmesh-nav {
    width: 100%;
    height: auto;
    position: static;
    border-right: none;
    border-bottom: 1px solid ${ThemeManager.isDarkTheme(settings.theme) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
  }
  
  .docmesh-content {
    padding: 2rem 1rem;
  }
}`;
  }

  /**
   * Export mesh to ZIP archive
   */
  static async exportMeshToZip(
    mesh: DocMesh,
    htmlFiles: Map<string, HtmlFile>,
    settings: ExportSettings
  ): Promise<Blob> {
    const zip = new JSZip();

    // Generate and add index document
    const indexHTML = this.generateIndexDocument(mesh, htmlFiles, settings);
    zip.file('index.html', indexHTML);

    // Add all referenced HTML files
    const nodes = MeshManager.flattenTree(mesh);
    const addedFiles = new Set<string>();

    for (const node of nodes) {
      const htmlFile = htmlFiles.get(node.htmlFileId);

      if (!htmlFile) {
        throw new HtmlFileNotFoundError(node.htmlFileId);
      }

      // Avoid adding duplicate files
      if (!addedFiles.has(htmlFile.id)) {
        const filename = this.sanitizeFilename(htmlFile.name);
        zip.file(filename, htmlFile.content);
        addedFiles.add(htmlFile.id);
      }
    }

    // Generate the ZIP blob
    return await zip.generateAsync({ type: 'blob' });
  }

  /**
   * Sanitize filename for safe file system usage
   */
  private static sanitizeFilename(filename: string): string {
    // Remove or replace unsafe characters
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  /**
   * Escape HTML special characters
   */
  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
