# Project Structure

## Directory Organization

```
src/
├── components/     # React components with co-located tests
│   ├── Editor.tsx              # Markdown editor
│   ├── Preview.tsx             # Markdown preview
│   ├── DocMeshEditor.tsx       # Tree structure editor
│   ├── DocMeshPreview.tsx      # Node/index preview
│   ├── DocMeshControls.tsx     # Mesh management controls
│   └── ...
├── hooks/          # Custom React hooks
├── types/          # TypeScript type definitions
├── utils/          # Utility functions and engines
│   ├── markdownEngine.ts       # Markdown parsing
│   ├── exportEngine.ts         # HTML export
│   ├── meshManager.ts          # Tree operations
│   ├── docMeshExportEngine.ts  # Index generation
│   ├── htmlFileManager.ts      # HTML file management
│   └── ...
├── App.tsx         # Root application component
├── main.tsx        # Application entry point
└── index.css       # Global styles
```

## Architecture Patterns

### Component Organization

- Each component has its own file (e.g., `Header.tsx`)
- Tests are co-located (e.g., `Header.test.tsx`)
- Components are exported via `components/index.ts` barrel file
- Components use TypeScript with explicit prop types

#### DocMesh Components

- **DocMeshEditor**: Tree structure editor with drag-and-drop support for organizing documents
- **DocMeshPreview**: Displays selected node content or generated index document
- **DocMeshControls**: Mesh management (save, load, new, export operations)

### State Management

- React useState for local component state
- Props drilling for shared state (no external state library)
- State is lifted to App.tsx for cross-component data
- Callback props for state updates (e.g., `onFileSelect`, `onSettingsChange`, `onNodeMove`)
- Application operates in two modes: 'markdown' and 'docmesh'
- Mode switching preserves state for both modes

### Utility Modules

Each utility module follows a class-based or singleton pattern:

- **FileManager**: File upload, reading, and ID generation
- **MarkdownEngine**: Markdown parsing with marked library
- **ExportEngine**: HTML export with theme application
- **ThemeManager**: Theme definitions and CSS generation
- **MeshManager**: Tree operations, validation, and persistence
- **DocMeshExportEngine**: Index document generation and navigation
- **HtmlFileManager**: HTML file storage and markdown integration

### Type Definitions

All types are centralized in `src/types/index.ts`:
- `MarkdownFile`: File data structure
- `ExportSettings`: Export configuration options
- `AppState`: Application state shape (includes markdown and docmesh state)
- `TOCEntry`: Table of contents structure
- `HtmlFile`: HTML file reference (from markdown or upload)
- `MeshNode`: Node in document mesh tree
- `DocMesh`: Complete mesh configuration with tree structure

## Naming Conventions

- Components: PascalCase (e.g., `LeftSidebar.tsx`)
- Utilities: PascalCase for classes, camelCase for functions
- Types/Interfaces: PascalCase
- Files: Match the primary export name
- Test files: `*.test.ts` or `*.test.tsx`

## Import Patterns

- Use barrel exports from `index.ts` files
- Import types with `type` keyword: `import type { MarkdownFile } from './types'`
- Group imports: React, types, components, utilities, styles
