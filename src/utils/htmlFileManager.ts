import DOMPurify from 'dompurify';
import type { HtmlFile, MarkdownFile } from '../types';

/**
 * Generate a unique ID using crypto.randomUUID with fallback
 */
function generateUniqueId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Read file content from File API or Blob
 */
async function readFileContent(file: File | Blob): Promise<string> {
  // For testing: if file has a text() method, use it
  if ('text' in file && typeof file.text === 'function') {
    return file.text();
  }
  
  // For browser: use FileReader
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        resolve(content);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(new Error(`Failed to read file`));
    reader.readAsText(file);
  });
}

/**
 * HtmlFileManager handles HTML file operations for DocMesh
 */
export class HtmlFileManager {
  private htmlFiles: Map<string, HtmlFile> = new Map();
  
  // File size limits
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly WARN_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  /**
   * Add an HTML file to the manager
   */
  addHtmlFile(file: HtmlFile): void {
    this.htmlFiles.set(file.id, file);
  }

  /**
   * Get an HTML file by ID
   */
  getHtmlFile(id: string): HtmlFile | null {
    return this.htmlFiles.get(id) || null;
  }

  /**
   * List all HTML files
   */
  listHtmlFiles(): HtmlFile[] {
    return Array.from(this.htmlFiles.values());
  }

  /**
   * Delete an HTML file by ID
   */
  deleteHtmlFile(id: string): void {
    this.htmlFiles.delete(id);
  }

  /**
   * Create HtmlFile from markdown export
   */
  createFromMarkdownExport(
    markdownFile: MarkdownFile,
    htmlContent: string
  ): HtmlFile {
    const htmlFile: HtmlFile = {
      id: generateUniqueId(),
      name: markdownFile.name.replace(/\.md$/, '.html'),
      content: htmlContent,
      sourceType: 'markdown',
      sourceId: markdownFile.id,
      generatedDate: new Date(),
      size: new Blob([htmlContent]).size
    };

    this.addHtmlFile(htmlFile);
    return htmlFile;
  }

  /**
   * Update HtmlFile from markdown re-export
   */
  updateFromMarkdownExport(
    htmlFileId: string,
    htmlContent: string
  ): void {
    const htmlFile = this.getHtmlFile(htmlFileId);
    if (htmlFile) {
      htmlFile.content = htmlContent;
      htmlFile.generatedDate = new Date();
      htmlFile.size = new Blob([htmlContent]).size;
    }
  }

  /**
   * Upload HTML files from File objects
   */
  async uploadHtmlFiles(files: File[]): Promise<HtmlFile[]> {
    const uploadedFiles: HtmlFile[] = [];

    for (const file of files) {
      try {
        // Validate file size
        if (file.size > HtmlFileManager.MAX_FILE_SIZE) {
          throw new Error(`File ${file.name} exceeds maximum size of 10MB`);
        }

        // Read file content
        const content = await readFileContent(file);

        // Validate HTML content
        const validation = this.validateHtmlFile(content);
        if (!validation.valid) {
          throw new Error(`File ${file.name} validation failed: ${validation.errors.join(', ')}`);
        }

        // Sanitize HTML content
        const sanitizedContent = DOMPurify.sanitize(content);

        // Create HtmlFile entry
        const htmlFile: HtmlFile = {
          id: generateUniqueId(),
          name: file.name.endsWith('.html') ? file.name : `${file.name}.html`,
          content: sanitizedContent,
          sourceType: 'upload',
          generatedDate: new Date(),
          size: new Blob([sanitizedContent]).size
        };

        this.addHtmlFile(htmlFile);
        uploadedFiles.push(htmlFile);

        // Warn about large files
        if (file.size > HtmlFileManager.WARN_FILE_SIZE) {
          console.warn(`File ${file.name} is large (${(file.size / 1024 / 1024).toFixed(2)}MB) and may impact performance`);
        }
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        throw error;
      }
    }

    return uploadedFiles;
  }

  /**
   * Validate HTML file content
   */
  validateHtmlFile(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if content is empty
    if (!content || content.trim().length === 0) {
      errors.push('HTML content is empty');
      return { valid: false, errors };
    }

    // Check for basic HTML structure (should contain some HTML tags)
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content);
    if (!hasHtmlTags) {
      errors.push('Content does not appear to be valid HTML');
    }

    // Check for potentially dangerous content before sanitization
    const hasDangerousScripts = /<script[\s\S]*?>[\s\S]*?<\/script>/gi.test(content);
    if (hasDangerousScripts) {
      // This is just a warning, DOMPurify will handle it
      console.warn('HTML contains script tags that will be removed during sanitization');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Find HTML file by source markdown file ID
   */
  findBySourceId(sourceId: string): HtmlFile | null {
    for (const htmlFile of this.htmlFiles.values()) {
      if (htmlFile.sourceType === 'markdown' && htmlFile.sourceId === sourceId) {
        return htmlFile;
      }
    }
    return null;
  }

  /**
   * Get all HTML files from markdown exports
   */
  getMarkdownExports(): HtmlFile[] {
    return Array.from(this.htmlFiles.values()).filter(
      file => file.sourceType === 'markdown'
    );
  }

  /**
   * Get all uploaded HTML files
   */
  getUploadedFiles(): HtmlFile[] {
    return Array.from(this.htmlFiles.values()).filter(
      file => file.sourceType === 'upload'
    );
  }

  /**
   * Create HtmlFile from direct upload (synchronous)
   */
  createFromUpload(filename: string, htmlContent: string): HtmlFile {
    // Validate HTML content
    const validation = this.validateHtmlFile(htmlContent);
    if (!validation.valid) {
      throw new Error(`File ${filename} validation failed: ${validation.errors.join(', ')}`);
    }

    // Sanitize HTML content
    const sanitizedContent = DOMPurify.sanitize(htmlContent);

    const htmlFile: HtmlFile = {
      id: generateUniqueId(),
      name: filename.endsWith('.html') || filename.endsWith('.htm') ? filename : `${filename}.html`,
      content: sanitizedContent,
      sourceType: 'upload',
      generatedDate: new Date(),
      size: new Blob([sanitizedContent]).size
    };

    this.addHtmlFile(htmlFile);
    return htmlFile;
  }

  /**
   * Clear all HTML files
   */
  clearAllFiles(): void {
    this.htmlFiles.clear();
  }
}

// Export utility functions for testing
export { generateUniqueId, readFileContent };
