import type { MarkdownFile } from '../types';

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
 * Format file size as KB or MB
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
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
 * FileManager handles file operations for the workspace
 */
export class FileManager {
  private files: MarkdownFile[] = [];

  /**
   * Upload files to the workspace
   */
  async uploadFiles(files: File[]): Promise<MarkdownFile[]> {
    const uploadedFiles: MarkdownFile[] = [];

    for (const file of files) {
      try {
        const content = await readFileContent(file);
        const markdownFile: MarkdownFile = {
          id: generateUniqueId(),
          name: file.name,
          content,
          size: file.size,
          uploadDate: new Date(),
        };
        this.files.push(markdownFile);
        uploadedFiles.push(markdownFile);
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        throw error;
      }
    }

    return uploadedFiles;
  }

  /**
   * Delete a file from the workspace
   */
  deleteFile(fileId: string): void {
    const index = this.files.findIndex((f) => f.id === fileId);
    if (index !== -1) {
      this.files.splice(index, 1);
    }
  }

  /**
   * Clear all files from the workspace
   */
  clearAllFiles(): void {
    this.files = [];
  }

  /**
   * Get a file by ID
   */
  getFile(fileId: string): MarkdownFile | undefined {
    return this.files.find((f) => f.id === fileId);
  }

  /**
   * Update file content
   */
  updateFileContent(fileId: string, content: string): void {
    const file = this.files.find((f) => f.id === fileId);
    if (file) {
      file.content = content;
    }
  }

  /**
   * Search files by name (case-insensitive)
   */
  searchFiles(query: string): MarkdownFile[] {
    if (!query) {
      return [...this.files];
    }
    const lowerQuery = query.toLowerCase();
    return this.files.filter((f) => f.name.toLowerCase().includes(lowerQuery));
  }

  /**
   * Get all files
   */
  getAllFiles(): MarkdownFile[] {
    return [...this.files];
  }
}

// Export utility functions for testing
export { generateUniqueId, formatFileSize, readFileContent };
