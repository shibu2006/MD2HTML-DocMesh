# Design Document

## Overview

The MD2HTML DOCMesh application is a single-page React application that provides real-time Markdown to HTML conversion with live preview capabilities. The architecture follows a component-based design with clear separation between UI presentation, state management, and business logic (Markdown processing, file handling, export generation).

The application uses React 18+ with Vite for fast development and building, Tailwind CSS for styling, and specialized libraries for Markdown parsing (`marked`), syntax highlighting (`highlight.js`), HTML sanitization (`dompurify`), and ZIP generation (`jszip`).

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         App Component                       │
│  ┌────────────┐  ┌───────────────┐  ┌──────────────────┐    │
│  │   Header   │  │  Left Sidebar │  │  Main Content    │    │
│  │            │  │  (File List)  │  │  (Editor/Preview)│    │
│  └────────────┘  └───────────────┘  └──────────────────┘    │
│                                      ┌──────────────────┐   │
│                                      │  Right Sidebar   │   │
│                                      │  (Settings)      │   │
│                                      └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Theme Manager  │  │  File Manager   │  │ Markdown Engine │
│  - UI Mode      │  │  - Upload       │  │ - Parse         │
│  - Theme Styles │  │  - Delete       │  │ - Highlight     │
│  - Sync Logic   │  │  - Search       │  │ - Sanitize      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │  Export Engine  │
                     │  - HTML Gen     │
                     │  - ZIP Gen      │
                     │  - TOC Gen      │
                     └─────────────────┘
```

### Component Hierarchy

- **App**: Root component managing global state
  - **Header**: Logo, theme toggle, download actions
  - **LeftSidebar**: File explorer with search and upload
    - **FileList**: Displays workspace files
    - **FileItem**: Individual file with metadata
  - **MainContent**: Central workspace area
    - **EmptyState**: Shown when no files loaded
    - **ActiveWorkspace**: Shown when file is active
      - **Toolbar**: Filename and view toggle
      - **Editor**: Textarea for Markdown editing
      - **Preview**: Rendered HTML display
        - **TOCSidebar** (optional): Left-positioned TOC
  - **RightSidebar**: Export settings and configuration
    - **SettingsSection**: Groups of related settings
    - **StatusCard**: Version and status display
  - **Tooltip**: Portal-based tooltip component

## Components and Interfaces

### State Management

The application uses React's built-in state management (useState, useEffect) with the following primary state:

```typescript
interface MarkdownFile {
  id: string;              // Unique identifier (UUID or random string)
  name: string;            // Original filename
  content: string;         // Markdown content
  size: number;            // File size in bytes
  uploadDate: Date;        // Upload timestamp
}

interface ExportSettings {
  outputFormat: 'html5-complete' | 'html-fragment';
  theme: 'github-light' | 'github-dark' | 'dracula' | 'monokai' | 'sky-blue' | 'solarized-light' | 'nord';
  fontFamily: 'system' | 'inter' | 'roboto' | 'monospace';
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  includeTOC: boolean;
  tocPosition: 'left-sidebar' | 'top-of-page';
  sanitizeHTML: boolean;
  includeCSS: boolean;
  minifyOutput: boolean;
  highlightCode: boolean;
}

interface AppState {
  files: MarkdownFile[];           // Workspace files
  activeFileId: string | null;     // Currently selected file
  searchQuery: string;              // File search filter
  viewMode: 'editor' | 'preview';   // Current view
  uiMode: 'light' | 'dark';         // UI theme mode
  exportSettings: ExportSettings;   // Export configuration
}
```

### Core Interfaces

#### FileManager

Handles file operations:

```typescript
interface FileManager {
  uploadFiles(files: File[]): Promise<MarkdownFile[]>;
  deleteFile(fileId: string): void;
  clearAllFiles(): void;
  getFile(fileId: string): MarkdownFile | undefined;
  updateFileContent(fileId: string, content: string): void;
  searchFiles(query: string): MarkdownFile[];
}
```

#### MarkdownEngine

Processes Markdown content:

```typescript
interface MarkdownEngine {
  parse(markdown: string, options: ParseOptions): string;
  generateTOC(markdown: string): TOCEntry[];
  injectTOCAnchors(html: string, tocEntries: TOCEntry[]): string;
  sanitize(html: string): string;
}

interface ParseOptions {
  highlightCode: boolean;
  sanitize: boolean;
}

interface TOCEntry {
  id: string;        // Clean anchor ID
  text: string;      // Header text
  level: number;     // 2 or 3 (h2 or h3)
}
```

#### ExportEngine

Generates export files:

```typescript
interface ExportEngine {
  generateHTML(file: MarkdownFile, settings: ExportSettings): string;
  generateZIP(files: MarkdownFile[], settings: ExportSettings): Promise<Blob>;
  downloadFile(content: string, filename: string): void;
  downloadBlob(blob: Blob, filename: string): void;
}
```

#### ThemeManager

Manages theming:

```typescript
interface ThemeManager {
  getThemeStyles(themeName: string): ThemeStyles;
  syncUIMode(themeName: string): 'light' | 'dark';
  applyUIMode(mode: 'light' | 'dark'): void;
}

interface ThemeStyles {
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  codeBlockBg: string;
}
```

## Data Models

### File Metadata

Files are stored in memory with the following structure:

- **id**: Generated using `crypto.randomUUID()` or fallback random string
- **name**: Original filename from File API
- **content**: Text content read from file
- **size**: Calculated in bytes, displayed as KB/MB
- **uploadDate**: Set to current Date on upload

### Theme Definitions

Themes are defined as constant objects:

```typescript
const THEMES = {
  'github-light': {
    backgroundColor: '#ffffff',
    textColor: '#24292f',
    accentColor: '#0969da',
    codeBlockBg: '#f6f8fa',
    uiMode: 'light'
  },
  'github-dark': {
    backgroundColor: '#0d1117',
    textColor: '#c9d1d9',
    accentColor: '#58a6ff',
    codeBlockBg: '#161b22',
    uiMode: 'dark'
  },
  // ... other themes
};
```

### Export Format Templates

HTML5 Complete template:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{filename}</title>
  <style>
    {theme-css}
    {typography-css}
    {highlight-css if enabled}
    {font-css}
  </style>
</head>
<body>
  {toc if enabled and position is top}
  {rendered-html}
</body>
</html>
```

HTML Fragment template:

```html
{toc if enabled and position is top}
{rendered-html}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: File upload preserves content

*For any* valid Markdown file uploaded to the system, reading the file content and storing it in the workspace should preserve the exact text content without modification.

**Validates: Requirements 1.2**

### Property 2: File metadata generation

*For any* file added to the workspace, the file should have a unique identifier, a calculated size, and an upload date set to the current time.

**Validates: Requirements 1.4**

### Property 3: Batch upload completeness

*For any* set of N files uploaded simultaneously, all N files should be added to the workspace.

**Validates: Requirements 1.5**

### Property 4: File list display completeness

*For any* workspace containing files, all files should be displayed in the file list with their filename, size, and date.

**Validates: Requirements 2.1**

### Property 5: File selection updates active state

*For any* file in the workspace, clicking on it should set it as the active file and display its content.

**Validates: Requirements 2.2**

### Property 6: File deletion removes from workspace

*For any* file in the workspace, clicking its delete button should remove it from the workspace.

**Validates: Requirements 2.4**

### Property 7: File search filters correctly

*For any* search query string and workspace file list, the filtered results should only include files whose names contain the search query as a substring (case-insensitive).

**Validates: Requirements 2.5**

### Property 8: Active file highlighting is exclusive

*For any* workspace with multiple files, exactly one file should be highlighted as active at any given time, or zero files if no file is selected.

**Validates: Requirements 2.6**

### Property 9: Editor displays active file content

*For any* active file with editor view enabled, the editor textarea should display the file's content.

**Validates: Requirements 3.1**

### Property 10: Editor content updates file state

*For any* text input in the editor, the active file's content in the workspace should be updated to match the editor text.

**Validates: Requirements 3.2**

### Property 11: Preview renders markdown as HTML

*For any* active file with preview view enabled, the markdown content should be rendered as valid HTML.

**Validates: Requirements 4.1**

### Property 12: Markdown parsing round-trip preserves structure

*For any* valid Markdown content, parsing it to HTML and then extracting the semantic structure should preserve the document hierarchy (headers, lists, code blocks, etc.).

**Validates: Requirements 4.2**

### Property 13: Code block syntax highlighting

*For any* markdown content containing code blocks, the rendered HTML should include syntax highlighting classes for the detected language.

**Validates: Requirements 4.3**

### Property 14: Theme selection updates preview

*For any* theme selection, the preview pane should apply the theme's background color, text color, accent color, and code block background to the rendered HTML.

**Validates: Requirements 7.1, 7.2**

### Property 15: Light theme triggers light UI mode

*For any* theme classified as "light" (GitHub Light, Sky Blue, Solarized Light), selecting it should set the UI mode to light.

**Validates: Requirements 7.3**

### Property 16: Dark theme triggers dark UI mode

*For any* theme classified as "dark" (GitHub Dark, Dracula, Monokai, Nord), selecting it should set the UI mode to dark.

**Validates: Requirements 7.4**

### Property 17: Theme CSS included in export

*For any* theme selection, the exported HTML should include the theme's CSS styles.

**Validates: Requirements 7.5**

### Property 18: TOC generation includes all headers

*For any* Markdown content, when TOC generation is enabled, all h2 and h3 headers should appear in the generated TOC with correct nesting.

**Validates: Requirements 6.1**

### Property 19: TOC ID generation is consistent

*For any* header text, generating a TOC ID should produce a lowercase, hyphenated string with special characters removed, and generating the ID multiple times for the same text should produce identical results.

**Validates: Requirements 6.2**

### Property 20: TOC anchors injected in HTML

*For any* generated TOC, the rendered HTML should contain anchor elements in headers with IDs matching the TOC entries.

**Validates: Requirements 6.3**

### Property 21: TOC top position placement

*For any* content with TOC enabled and position set to "Top of Page", the TOC should appear at the beginning of the rendered HTML.

**Validates: Requirements 6.5**

### Property 22: HTML5 Complete includes document structure

*For any* file exported with "HTML5 Complete" format, the output should contain DOCTYPE declaration, html tag, head section with meta tags, and body section wrapping the content.

**Validates: Requirements 9.1**

### Property 23: HTML Fragment excludes document structure

*For any* file exported with "HTML Fragment" format, the output should not contain DOCTYPE, html, head, or body tags, only the rendered content.

**Validates: Requirements 9.2**

### Property 24: Font family included in export

*For any* selected font family, the exported HTML should include the corresponding font styles.

**Validates: Requirements 9.3**

### Property 25: Font size included in export

*For any* selected font size, the exported HTML should include the corresponding size styles.

**Validates: Requirements 9.4**

### Property 26: Sanitization removes dangerous content

*For any* HTML containing script tags, event handlers, or other potentially dangerous content, sanitization should remove or neutralize these elements while preserving safe content.

**Validates: Requirements 9.5**

### Property 27: CSS inclusion in export

*For any* export with "Include CSS" enabled, the output should contain theme and typography styles.

**Validates: Requirements 9.6**

### Property 28: Minification removes whitespace

*For any* HTML output with minification enabled, the result should contain no unnecessary newlines or multiple consecutive spaces while preserving content within pre and code tags.

**Validates: Requirements 9.7**

### Property 29: Highlight CSS included when enabled

*For any* export with "Highlight Code" enabled, the output should include syntax highlighting CSS.

**Validates: Requirements 9.8**

### Property 30: Download button disabled when no active file

*For any* application state where activeFileId is null, the download HTML button should be disabled.

**Validates: Requirements 10.2**

### Property 31: Download filename uses HTML extension

*For any* markdown file downloaded as HTML, the filename should use the original name with `.html` extension.

**Validates: Requirements 10.3**

### Property 32: ZIP contains all workspace files

*For any* workspace with N files, generating a ZIP export should produce an archive containing exactly N HTML files with corresponding filenames.

**Validates: Requirements 11.2**

### Property 33: Empty workspace shows empty state

*For any* application state where the files array is empty, the main content area should display the empty state component.

**Validates: Requirements 14.4**

### Property 34: Tooltip positioning avoids viewport edges

*For any* tooltip trigger element, the tooltip should be positioned such that it remains fully visible within the viewport bounds.

**Validates: Requirements 12.2**

## Error Handling

### File Upload Errors

- **Invalid file type**: Display error message "Only .md and .markdown files are supported"
- **File read error**: Display error message "Failed to read file: {filename}"
- **Large file warning**: If file > 10MB, show warning but allow upload
- **Duplicate filename**: Allow upload but append number to filename

### Markdown Parsing Errors

- **Invalid Markdown syntax**: Render as-is, marked library handles gracefully
- **Malformed HTML in Markdown**: Sanitize if enabled, otherwise pass through
- **Missing code language**: Use plain text highlighting

### Export Errors

- **ZIP generation failure**: Display error "Failed to create ZIP archive"
- **Download blocked**: Display message "Download blocked by browser, please check permissions"
- **Empty content**: Allow export of empty file

### UI Errors

- **Tooltip positioning failure**: Fallback to top position
- **Theme loading failure**: Fallback to GitHub Light theme
- **Local storage unavailable**: Continue without persistence (future feature)

## Testing Strategy

### Unit Testing

The application will use Vitest as the testing framework for unit tests. Unit tests will cover:

- **File operations**: Upload, delete, search, content update
- **Markdown parsing**: Basic syntax conversion, code highlighting
- **TOC generation**: Header extraction, ID generation, anchor injection
- **Export generation**: HTML5 Complete format, HTML Fragment format
- **Theme management**: Theme style retrieval, UI mode synchronization
- **Utility functions**: File size formatting, date formatting, filename sanitization

Example unit tests:
- Test that uploading a file with specific content stores that exact content
- Test that searching for "test" in ["test.md", "demo.md", "testing.md"] returns ["test.md", "testing.md"]
- Test that generating ID from "Hello World!" produces "hello-world"
- Test that HTML5 Complete output contains DOCTYPE declaration
- Test that minification removes newlines from simple HTML

### Property-Based Testing

The application will use fast-check as the property-based testing library for JavaScript/TypeScript. Property-based tests will run a minimum of 100 iterations per test.

Each property-based test will be tagged with a comment in this format:
`// Feature: md2html-docmesh, Property {number}: {property_text}`

Property-based tests will verify:

1. **File content preservation** (Property 1): Generate random Markdown strings, upload them, verify stored content matches
2. **Search filtering** (Property 2): Generate random file lists and search queries, verify all results contain query
3. **Active file exclusivity** (Property 3): Generate random file selections, verify only one or zero files are active
4. **Editor updates** (Property 4): Generate random text inputs, verify file content updates
5. **Markdown structure preservation** (Property 5): Generate random valid Markdown, parse and verify structure
6. **Theme application** (Property 6): Generate random theme selections, verify preview styles match
7. **Light theme UI sync** (Property 7): Test all light themes trigger light mode
8. **Dark theme UI sync** (Property 8): Test all dark themes trigger dark mode
9. **TOC completeness** (Property 9): Generate random Markdown with headers, verify all appear in TOC
10. **TOC ID consistency** (Property 10): Generate random header texts, verify ID generation is deterministic
11. **HTML5 structure** (Property 11): Generate random content, verify complete format has required tags
12. **Fragment structure** (Property 12): Generate random content, verify fragment lacks document tags
13. **Minification** (Property 13): Generate random HTML, verify minified version has no extra whitespace
14. **Sanitization** (Property 14): Generate HTML with dangerous content, verify it's removed
15. **ZIP completeness** (Property 15): Generate random file lists, verify ZIP contains all files
16. **Button state** (Property 16): Test various app states, verify button disabled when no active file
17. **Empty state display** (Property 17): Test with empty file list, verify empty state shown
18. **Tooltip bounds** (Property 18): Generate random element positions, verify tooltips stay in viewport

### Integration Testing

Integration tests will verify:
- Complete file upload → edit → preview → export workflow
- Theme changes propagating to preview and export
- Settings changes affecting export output
- Multi-file ZIP generation with various settings

### End-to-End Testing

E2E tests using Playwright will verify:
- User can upload files via button and drag-and-drop
- User can switch between editor and preview
- User can download individual and all files
- Theme toggle works correctly
- Tooltips appear on hover

## Implementation Notes

### Technology Choices

- **React 18+**: Provides modern hooks, concurrent features, and excellent ecosystem
- **Vite**: Fast development server and optimized production builds
- **Tailwind CSS**: Utility-first CSS for rapid UI development
- **marked**: Mature, fast Markdown parser with extensive options
- **highlight.js**: Comprehensive syntax highlighting with auto-detection
- **dompurify**: Industry-standard HTML sanitization
- **jszip**: Reliable ZIP generation in browser
- **fast-check**: Powerful property-based testing for JavaScript

### Performance Considerations

- **Debounce editor input**: Prevent excessive re-renders during typing
- **Memoize rendered HTML**: Cache parsed output until content or settings change
- **Virtual scrolling**: For large file lists (future enhancement)
- **Web Workers**: For heavy parsing operations (future enhancement)

### Accessibility

- **Keyboard navigation**: All interactive elements accessible via keyboard
- **ARIA labels**: Proper labels for screen readers
- **Focus management**: Visible focus indicators
- **Color contrast**: WCAG AA compliance for all text

### Browser Compatibility

- **Target**: Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
- **Minimum versions**: Last 2 major versions
- **Polyfills**: None required for target browsers
