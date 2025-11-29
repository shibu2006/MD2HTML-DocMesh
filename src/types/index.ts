// Type definitions for MD2HTML DOCMesh
export interface MarkdownFile {
  id: string;
  name: string;
  content: string;
  size: number;
  uploadDate: Date;
}

export interface ExportSettings {
  outputFormat: 'html5-complete' | 'html-fragment';
  theme: 'github-light' | 'github-dark' | 'dracula' | 'monokai' | 'sky-blue' | 'solarized-light' | 'nord';
  fontFamily: 'system' | 'inter' | 'roboto' | 'merriweather' | 'open-sans' | 'fira-code' | 'monospace';
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  includeTOC: boolean;
  tocPosition: 'left-sidebar' | 'top-of-page';
  sanitizeHTML: boolean;
  includeCSS: boolean;
  minifyOutput: boolean;
  highlightCode: boolean;
}

export interface AppState {
  files: MarkdownFile[];
  activeFileId: string | null;
  searchQuery: string;
  viewMode: 'editor' | 'preview';
  uiMode: 'light' | 'dark';
  exportSettings: ExportSettings;
  
  // DocMesh-related state
  appMode: 'markdown' | 'docmesh';
  htmlFiles: Map<string, HtmlFile>;
  currentMesh: DocMesh | null;
  savedMeshes: DocMesh[];
  selectedNodeId: string | null;
  meshPreviewMode: 'node' | 'index';
}

export interface TOCEntry {
  id: string;
  text: string;
  level: number;
}

export interface ThemeStyles {
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  codeBlockBg: string;
}

// DocMesh-related types

// HTML file reference (generated from markdown or uploaded)
export interface HtmlFile {
  id: string;
  name: string;
  content: string;
  sourceType: 'markdown' | 'upload';
  sourceId?: string; // Reference to MarkdownFile.id if from markdown
  generatedDate: Date;
  size: number;
}

// Node in the document mesh tree
export interface MeshNode {
  id: string;
  htmlFileId: string;
  title: string; // Display title (defaults to filename)
  description: string; // Optional description for navigation
  parentId: string | null;
  children: string[]; // Array of child node IDs
  order: number; // Position among siblings
}

// Complete document mesh configuration
export interface DocMesh {
  id: string;
  name: string;
  rootNodeId: string | null;
  nodes: Map<string, MeshNode>;
  createdDate: Date;
  modifiedDate: Date;
}

// Error types for mesh validation and operations

export class MeshValidationError extends Error {
  errors: string[];
  
  constructor(message: string, errors: string[]) {
    super(message);
    this.name = 'MeshValidationError';
    this.errors = errors;
  }
}

export class NodeNotFoundError extends Error {
  constructor(nodeId: string) {
    super(`Node with ID ${nodeId} not found`);
    this.name = 'NodeNotFoundError';
  }
}

export class CyclicDependencyError extends Error {
  constructor(nodeIds: string[]) {
    super(`Cyclic dependency detected: ${nodeIds.join(' -> ')}`);
    this.name = 'CyclicDependencyError';
  }
}

export class HtmlFileNotFoundError extends Error {
  constructor(fileId: string) {
    super(`HTML file with ID ${fileId} not found`);
    this.name = 'HtmlFileNotFoundError';
  }
}
