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
