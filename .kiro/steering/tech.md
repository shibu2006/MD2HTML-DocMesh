# Tech Stack

## Core Technologies

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4 with Typography plugin
- **Testing**: Vitest with happy-dom environment

## Key Libraries

- **marked**: Markdown parsing and rendering
- **marked-highlight**: Code syntax highlighting integration
- **highlight.js**: Syntax highlighting for code blocks
- **DOMPurify**: HTML sanitization for security
- **JSZip**: ZIP file generation for batch exports
- **lucide-react**: Icon components

## Development Tools

- **TypeScript**: Strict type checking (~5.9.3)
- **ESLint**: Code linting with React hooks plugin
- **PostCSS**: CSS processing with Autoprefixer

## Common Commands

```bash
# Development server with HMR
npm run dev

# Build for production
npm run build

# Run tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Testing Setup

- Test files use `.test.ts` or `.test.tsx` extensions
- Tests are co-located with source files
- Uses @testing-library/react for component testing
- Uses fast-check for property-based testing
- happy-dom provides lightweight DOM environment
