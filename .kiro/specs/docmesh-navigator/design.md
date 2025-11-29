# Design Document

## Overview

The DocMesh Navigator feature extends the MD2HTML DOCMesh application with document organization and navigation capabilities. It allows users to create hierarchical structures from HTML documents (either uploaded or generated from markdown), arrange them into navigable trees, and export unified documentation sites with integrated navigation.

The feature integrates into the existing application architecture by:
- Adding a new mode to the left sidebar alongside file management
- Introducing new data structures for mesh configurations and node hierarchies
- Extending the export engine to generate index documents with navigation
- Maintaining separation between markdown editing and DocMesh organization

## Architecture

### High-Level Architecture

The DocMesh Navigator follows the existing application architecture patterns:

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                             │
│  (State Management: files, meshes, activeMode, settings)    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌──────▼──────┐
│  LeftSidebar   │   │  MainContent    │   │ RightSidebar│
│  - File List   │   │  - Editor       │   │  - Export   │
│  - DocMesh     │   │  - Preview      │   │    Settings │
│    Tree Editor │   │  - Mesh Preview │   │  - Mesh     │
└────────────────┘   └─────────────────┘   │    Settings │
                                           └─────────────┘
```

### Mode System

The application operates in two modes:
1. **Markdown Mode** (existing): File editing and preview
2. **DocMesh Mode** (new): Document organization and mesh creation

Mode switching preserves state for both modes, allowing users to seamlessly transition between editing markdown and organizing documents.

### Data Flow

```
User Action → Component Event → App State Update → Component Re-render
                                      ↓
                              Persistence Layer
                              (localStorage)
```

## Components and Interfaces

### New Components

#### 1. DocMeshEditor Component

Located in `src/components/DocMeshEditor.tsx`

Displays the tree structure editor for organizing documents into hierarchies.

**Props:**
```typescript
interface DocMeshEditorProps {
  mesh: DocMesh | null;
  availableHtmlFiles: HtmlFile[];
  onNodeSelect: (nodeId: string) => void;
  onNodeAdd: (parentId: string | null, htmlFileId: string) => void;
  onNodeMove: (nodeId: string, newParentId: string | null, newIndex: number) => void;
  onNodeUpdate: (nodeId: string, updates: Partial<MeshNode>) => void;
  onNodeDelete: (nodeId: string) => void;
}
```

**Responsibilities:**
- Render tree structure with drag-and-drop support
- Handle node selection and editing
- Provide UI for adding nodes from available HTML files
- Display node metadata (title, description)

#### 2. DocMeshPreview Component

Located in `src/components/DocMeshPreview.tsx`

Displays the preview of the selected node's HTML content or the generated index document.

**Props:**
```typescript
interface DocMeshPreviewProps {
  mesh: DocMesh | null;
  selectedNodeId: string | null;
  htmlFiles: Map<string, HtmlFile>;
  previewMode: 'node' | 'index';
}
```

**Responsibilities:**
- Render HTML content for selected nodes
- Display generated index document preview
- Handle navigation within preview

#### 3. DocMeshControls Component

Located in `src/components/DocMeshControls.tsx`

Provides controls for mesh management (save, load, new, export).

**Props:**
```typescript
interface DocMeshControlsProps {
  currentMesh: DocMesh | null;
  savedMeshes: DocMesh[];
  onNewMesh: () => void;
  onSaveMesh: (mesh: DocMesh) => void;
  onLoadMesh: (meshId: string) => void;
  onExportMesh: (mesh: DocMesh) => void;
}
```

### Modified Components

#### LeftSidebar

Add mode toggle between "Files" and "DocMesh" views:
- In Files mode: Show existing file list
- In DocMesh mode: Show DocMeshEditor component

#### MainContent

Support new preview mode for DocMesh:
- Existing: editor/preview toggle for markdown
- New: DocMesh preview mode

#### RightSidebar

Add conditional rendering for DocMesh settings when in DocMesh mode:
- Node metadata editor (title, description)
- Mesh export settings
- Preview mode toggle (node/index)

## Data Models

### Core Types

```typescript
// HTML file reference (generated from markdown or uploaded)
interface HtmlFile {
  id: string;
  name: string;
  content: string;
  sourceType: 'markdown' | 'upload';
  sourceId?: string; // Reference to MarkdownFile.id if from markdown
  generatedDate: Date;
  size: number;
}

// Node in the document mesh tree
interface MeshNode {
  id: string;
  htmlFileId: string;
  title: string; // Display title (defaults to filename)
  description: string; // Optional description for navigation
  parentId: string | null;
  children: string[]; // Array of child node IDs
  order: number; // Position among siblings
}

// Complete document mesh configuration
interface DocMesh {
  id: string;
  name: string;
  rootNodeId: string | null;
  nodes: Map<string, MeshNode>;
  createdDate: Date;
  modifiedDate: Date;
}

// Application state extension
interface AppState {
  // Existing fields...
  files: MarkdownFile[];
  activeFileId: string | null;
  searchQuery: string;
  viewMode: 'editor' | 'preview';
  uiMode: 'light' | 'dark';
  exportSettings: ExportSettings;
  
  // New fields for DocMesh
  appMode: 'markdown' | 'docmesh';
  htmlFiles: Map<string, HtmlFile>;
  currentMesh: DocMesh | null;
  savedMeshes: DocMesh[];
  selectedNodeId: string | null;
  meshPreviewMode: 'node' | 'index';
}
```

### Tree Structure

The mesh uses a parent-child relationship model:
- Each node has a `parentId` (null for root)
- Each node maintains an ordered array of `children` IDs
- Tree operations maintain referential integrity

Example structure:
```
Root (null parent)
├── Node A (parent: root)
│   ├── Node A1 (parent: A)
│   └── Node A2 (parent: A)
└── Node B (parent: root)
    └── Node B1 (parent: B)
```

## Data Models


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Mode switching preserves markdown state

*For any* application state with markdown files and settings, switching to DocMesh mode and remaining in that mode should not modify the markdown files or export settings.

**Validates: Requirements 1.3**

### Property 2: Mode round-trip preserves state

*For any* application state, switching from markdown mode to DocMesh mode and back to markdown mode should restore the exact same markdown editing state.

**Validates: Requirements 1.4**

### Property 3: HTML exports appear in available files

*For any* set of markdown files, after exporting them to HTML, all exported files should appear in the available HTML files list in DocMesh mode.

**Validates: Requirements 2.1**

### Property 4: Node IDs are unique

*For any* DocMesh with multiple nodes, all node IDs should be unique within that mesh.

**Validates: Requirements 2.4**

### Property 5: Tree structure integrity after move

*For any* valid tree structure and any node move operation, the resulting tree should maintain referential integrity (all parent-child references are valid, no cycles exist, and all nodes remain reachable from root).

**Validates: Requirements 3.2, 3.3, 3.4**

### Property 6: Node metadata persistence

*For any* node and any title or description value, after setting the metadata and retrieving the node, the metadata should match the set values.

**Validates: Requirements 4.2, 4.3**

### Property 7: Default title fallback

*For any* node without a custom title, the displayed title should equal the original HTML filename.

**Validates: Requirements 4.4**

### Property 8: Navigation uses configured metadata

*For any* generated navigation structure, all navigation links should use the configured node titles and descriptions, not the original filenames.

**Validates: Requirements 4.5, 6.3**

### Property 9: Preview displays correct content

*For any* node selection in the tree editor, the preview pane should display the HTML content associated with that node's htmlFileId.

**Validates: Requirements 5.1**

### Property 10: Index contains all node content

*For any* DocMesh with nodes, the generated index document should contain the HTML content from all nodes in the mesh.

**Validates: Requirements 6.1**

### Property 11: Navigation structure matches tree

*For any* DocMesh tree structure, the generated navigation sidebar should reflect the same hierarchical structure with the same parent-child relationships.

**Validates: Requirements 6.2**

### Property 12: Navigation anchors are valid

*For any* generated index document, all navigation links should have corresponding anchor IDs in the document content, ensuring clicks navigate to the correct sections.

**Validates: Requirements 6.4**

### Property 13: Mesh configuration round-trip

*For any* DocMesh configuration, saving it and then loading it should restore the complete tree structure, all node metadata, and all file references.

**Validates: Requirements 7.1, 7.2**

### Property 14: Mesh switching loads correct configuration

*For any* set of saved mesh configurations, loading a specific mesh by ID should restore that exact mesh's structure and metadata, not any other mesh.

**Validates: Requirements 7.4**

### Property 15: Export contains all referenced files

*For any* DocMesh, the exported ZIP archive should contain the index document plus all HTML files referenced by nodes in the mesh.

**Validates: Requirements 8.2**

### Property 16: Export is valid ZIP

*For any* DocMesh export, the output should be a valid ZIP archive that can be extracted, and the extracted files should match the expected structure.

**Validates: Requirements 8.3**

### Property 17: Node deletion removes from tree

*For any* tree structure and any node, after deleting that node, the node should not appear in the tree structure.

**Validates: Requirements 9.1**

### Property 18: Cascading deletion removes descendants

*For any* node with children, after confirming deletion, both the node and all its descendants should be removed from the tree.

**Validates: Requirements 9.3**

### Property 19: Markdown export integration

*For any* markdown file, after exporting it to HTML, the resulting HTML file should immediately appear in the available files list for DocMesh inclusion.

**Validates: Requirements 10.1**

### Property 20: Re-export updates mesh nodes

*For any* markdown file that has been exported and added to a mesh, after modifying the markdown and re-exporting, the corresponding mesh node should reference the updated HTML content.

**Validates: Requirements 10.2**

## Utility Functions and Helpers

### MeshManager Class

Located in `src/utils/meshManager.ts`

Handles all mesh operations including tree manipulation, validation, and persistence.

**Key Methods:**
```typescript
class MeshManager {
  // Tree operations
  static addNode(mesh: DocMesh, htmlFileId: string, parentId: string | null): DocMesh
  static moveNode(mesh: DocMesh, nodeId: string, newParentId: string | null, newIndex: number): DocMesh
  static deleteNode(mesh: DocMesh, nodeId: string, cascade: boolean): DocMesh
  static updateNodeMetadata(mesh: DocMesh, nodeId: string, updates: Partial<MeshNode>): DocMesh
  
  // Tree validation
  static validateTree(mesh: DocMesh): { valid: boolean; errors: string[] }
  static detectCycles(mesh: DocMesh): boolean
  static findOrphanedNodes(mesh: DocMesh): string[]
  
  // Tree traversal
  static getNodePath(mesh: DocMesh, nodeId: string): MeshNode[]
  static getDescendants(mesh: DocMesh, nodeId: string): MeshNode[]
  static flattenTree(mesh: DocMesh): MeshNode[]
  
  // Persistence
  static serializeMesh(mesh: DocMesh): string
  static deserializeMesh(data: string): DocMesh
  static saveMesh(mesh: DocMesh): void
  static loadMesh(meshId: string): DocMesh | null
  static listSavedMeshes(): DocMesh[]
}
```

### DocMeshExportEngine Class

Located in `src/utils/docMeshExportEngine.ts`

Extends ExportEngine to handle DocMesh-specific export operations.

**Key Methods:**
```typescript
class DocMeshExportEngine {
  // Index generation
  static generateIndexDocument(
    mesh: DocMesh,
    htmlFiles: Map<string, HtmlFile>,
    settings: ExportSettings
  ): string
  
  // Navigation generation
  static generateNavigationHTML(mesh: DocMesh): string
  
  // Content stitching
  static stitchHtmlContent(
    nodes: MeshNode[],
    htmlFiles: Map<string, HtmlFile>
  ): string
  
  // Link processing
  static processRelativeLinks(html: string, baseNodeId: string): string
  static generateAnchorIds(nodes: MeshNode[]): Map<string, string>
  
  // Export packaging
  static exportMeshToZip(
    mesh: DocMesh,
    htmlFiles: Map<string, HtmlFile>,
    settings: ExportSettings
  ): Promise<Blob>
}
```

### HtmlFileManager Class

Located in `src/utils/htmlFileManager.ts`

Manages HTML file storage, retrieval, and synchronization with markdown exports.

**Key Methods:**
```typescript
class HtmlFileManager {
  // File operations
  static addHtmlFile(file: HtmlFile): void
  static getHtmlFile(id: string): HtmlFile | null
  static listHtmlFiles(): HtmlFile[]
  static deleteHtmlFile(id: string): void
  
  // Markdown integration
  static createFromMarkdownExport(
    markdownFile: MarkdownFile,
    htmlContent: string,
    settings: ExportSettings
  ): HtmlFile
  
  static updateFromMarkdownExport(
    htmlFileId: string,
    htmlContent: string
  ): void
  
  // Upload handling
  static uploadHtmlFiles(files: File[]): Promise<HtmlFile[]>
  
  // Validation
  static validateHtmlFile(content: string): { valid: boolean; errors: string[] }
}
```

## Error Handling

### Error Types

```typescript
class MeshValidationError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message);
    this.name = 'MeshValidationError';
  }
}

class NodeNotFoundError extends Error {
  constructor(nodeId: string) {
    super(`Node with ID ${nodeId} not found`);
    this.name = 'NodeNotFoundError';
  }
}

class CyclicDependencyError extends Error {
  constructor(nodeIds: string[]) {
    super(`Cyclic dependency detected: ${nodeIds.join(' -> ')}`);
    this.name = 'CyclicDependencyError';
  }
}

class HtmlFileNotFoundError extends Error {
  constructor(fileId: string) {
    super(`HTML file with ID ${fileId} not found`);
    this.name = 'HtmlFileNotFoundError';
  }
}
```

### Error Handling Strategy

1. **Validation Errors**: Display user-friendly messages in the UI, prevent invalid operations
2. **Missing References**: Warn users about missing files, offer to remove invalid nodes
3. **Tree Integrity**: Automatically fix minor issues (orphaned nodes), block major issues (cycles)
4. **Export Errors**: Show detailed error messages, allow partial exports when possible
5. **Persistence Errors**: Fallback to in-memory state, warn about unsaved changes

### User Feedback

- **Success**: Toast notifications for successful operations (save, export, etc.)
- **Warnings**: Yellow alerts for non-critical issues (missing files, validation warnings)
- **Errors**: Red alerts with actionable messages (what went wrong, how to fix)
- **Confirmations**: Modal dialogs for destructive operations (delete with children, clear mesh)

## Testing Strategy

### Unit Testing

Unit tests will cover:
- Individual utility functions (tree operations, validation, serialization)
- Component rendering with specific props
- Event handlers and callbacks
- Edge cases (empty trees, single nodes, deep hierarchies)

**Example unit tests:**
- `MeshManager.addNode` adds node with correct parent
- `MeshManager.deleteNode` removes node from tree
- `DocMeshEditor` renders tree structure correctly
- `DocMeshExportEngine.generateNavigationHTML` creates valid HTML

### Property-Based Testing

Property-based tests will verify universal properties across many randomly generated inputs using the **fast-check** library (already in the project).

**Configuration:**
- Each property test will run a minimum of 100 iterations
- Tests will use custom generators for complex types (DocMesh, MeshNode, HtmlFile)
- Each test will be tagged with the format: `**Feature: docmesh-navigator, Property {number}: {property_text}**`

**Property test coverage:**
- Tree operations maintain integrity (no cycles, valid references)
- Serialization round-trips preserve all data
- Node operations preserve tree structure invariants
- Export includes all required content
- Metadata operations preserve other node data

**Example property tests:**
- For any tree and any valid move, tree remains valid
- For any mesh, save then load produces equivalent mesh
- For any mesh, generated index contains all node content
- For any node metadata update, other nodes remain unchanged

### Integration Testing

Integration tests will verify:
- Mode switching preserves state correctly
- Markdown export creates HTML files available in DocMesh
- Re-exporting markdown updates mesh nodes
- Complete export workflow (create mesh → export → validate ZIP)

### Test Organization

- Unit tests: Co-located with source files (`.test.ts`, `.test.tsx`)
- Property tests: Co-located with source files, clearly marked with property tags
- Integration tests: In `src/App.integration.test.tsx` and component-specific integration tests
- Test utilities: Shared generators and helpers in `src/utils/testHelpers.ts`

## Implementation Phases

### Phase 1: Core Data Structures and State Management

- Define TypeScript types for DocMesh, MeshNode, HtmlFile
- Extend AppState to include DocMesh-related state
- Implement basic state management in App.tsx
- Add mode switching logic

### Phase 2: HTML File Management

- Implement HtmlFileManager utility class
- Add HTML file upload functionality
- Integrate with existing markdown export to create HtmlFile entries
- Implement file validation

### Phase 3: Tree Operations

- Implement MeshManager utility class
- Add tree manipulation methods (add, move, delete, update)
- Implement tree validation and integrity checks
- Add tree traversal utilities

### Phase 4: UI Components

- Create DocMeshEditor component with tree visualization
- Implement drag-and-drop functionality
- Create DocMeshPreview component
- Add DocMeshControls component
- Modify LeftSidebar for mode switching
- Extend RightSidebar with mesh settings

### Phase 5: Index Generation and Export

- Implement DocMeshExportEngine class
- Add navigation HTML generation
- Implement content stitching
- Add anchor ID generation and link processing
- Implement ZIP export for complete mesh

### Phase 6: Persistence

- Implement mesh serialization/deserialization
- Add localStorage integration for saved meshes
- Implement save/load/list operations
- Add mesh validation on load

### Phase 7: Polish and Integration

- Add error handling and user feedback
- Implement confirmation dialogs
- Add loading states and transitions
- Ensure consistent styling with existing UI
- Add keyboard shortcuts for common operations

## Performance Considerations

### Optimization Strategies

1. **Tree Operations**: Use immutable updates with structural sharing to avoid unnecessary re-renders
2. **Large Trees**: Implement virtual scrolling for trees with many nodes
3. **HTML Content**: Lazy load HTML content for preview, cache rendered output
4. **Export Generation**: Use Web Workers for large index document generation
5. **Persistence**: Debounce auto-save operations, use incremental saves

### Scalability Limits

- **Recommended**: Up to 100 nodes per mesh
- **Maximum**: 500 nodes per mesh (with performance degradation warnings)
- **HTML File Size**: Warn for files > 5MB, block files > 10MB
- **Total Mesh Size**: Warn when total size exceeds 50MB

## Security Considerations

1. **HTML Sanitization**: All uploaded HTML files must be sanitized using DOMPurify
2. **XSS Prevention**: Sanitize user-provided titles and descriptions
3. **File Validation**: Validate HTML structure before allowing upload
4. **Link Safety**: Validate and sanitize all links in generated index documents
5. **Storage Limits**: Enforce size limits to prevent localStorage exhaustion

## Accessibility

1. **Keyboard Navigation**: Full keyboard support for tree navigation and editing
2. **Screen Readers**: Proper ARIA labels for tree structure and drag-drop operations
3. **Focus Management**: Maintain logical focus order during operations
4. **Color Contrast**: Ensure all UI elements meet WCAG AA standards
5. **Announcements**: Use ARIA live regions for dynamic updates

## Future Enhancements

Potential future additions (not in current scope):
- Collaborative editing with real-time sync
- Version history for mesh configurations
- Templates for common documentation structures
- Search within mesh content
- Custom CSS themes for generated index documents
- Export to other formats (PDF, EPUB)
- Import from existing documentation sites
