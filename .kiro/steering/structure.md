# Project Structure

## Directory Organization

```
src/
├── components/     # React components with co-located tests
├── hooks/          # Custom React hooks
├── types/          # TypeScript type definitions
├── utils/          # Utility functions and engines
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

### State Management

- React useState for local component state
- Props drilling for shared state (no external state library)
- State is lifted to App.tsx for cross-component data
- Callback props for state updates (e.g., `onFileSelect`, `onSettingsChange`)

### Utility Modules

Each utility module follows a class-based or singleton pattern:

- **FileManager**: File upload, reading, and ID generation
- **MarkdownEngine**: Markdown parsing with marked library
- **ExportEngine**: HTML export with theme application
- **ThemeManager**: Theme definitions and CSS generation

### Type Definitions

All types are centralized in `src/types/index.ts`:
- `MarkdownFile`: File data structure
- `ExportSettings`: Export configuration options
- `AppState`: Application state shape
- `TOCEntry`: Table of contents structure

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
