# MD2HTML DOCMesh

A markdown-to-HTML converter and document organization web application built with React, TypeScript, and Vite. Upload multiple markdown files, edit them in a live editor, preview the rendered HTML output, export with customizable themes, and organize HTML documents into hierarchical, navigable documentation sites.

<img src="https://raw.githubusercontent.com/shibu2006/MD2HTML-DocMesh/main/docs/demo/MD2HTML_DocMesh_001.png" width="720" alt="MD2HTML DocMesh Demo Screenshot">

[![MarkdownHtml Demo](https://raw.githubusercontent.com/shibu2006/MD2HTML-DocMesh/main/docs/MD2HTML_DocMesh_001.png)](https://raw.githubusercontent.com/shibu2006/MD2HTML-DocMesh/main/docs/demo/MarkdownHtml.mp4)


## Features

### Markdown Mode

- Multi-file markdown editor with live preview
- Syntax highlighting for code blocks (auto-detected language)
- Multiple export themes (GitHub Light/Dark, Dracula, Monokai, Nord, Sky Blue, Solarized Light)
- HTML sanitization for security (DOMPurify)
- Table of contents generation with configurable positioning
- Customizable fonts and font sizes
- Output format options (HTML5 Complete or HTML Fragment)
- Minification and CSS inclusion options
- Batch export to ZIP archives
- Dark/light UI modes

### DocMesh Mode

- Hierarchical document organization with drag-and-drop tree editor
- Create navigable documentation sites from multiple HTML files
- Use markdown exports or upload HTML files directly
- Configurable node titles and descriptions for navigation
- Generate unified index documents with integrated navigation sidebar
- Save and load multiple mesh configurations
- Export complete documentation sites as ZIP archives
- Preview individual nodes or complete index documents
- Automatic integration with markdown exports

## Quick Start

### Using Shell Scripts

```bash
# Start the development server
./start.sh

# Stop the development server (in another terminal)
./stop.sh
```

### Using npm Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Tech Stack

- React 19 with TypeScript
- Vite 7 for build tooling
- Tailwind CSS 4 for styling
- Vitest for testing
- marked for markdown parsing
- highlight.js for syntax highlighting
- DOMPurify for HTML sanitization

---

## Development Notes

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

To understand each feature functionality of the app please go through the docs folder. 

The structure of docs folder is as follows:

```
docs/
├── README.md              # Documentation index
├── getting-started.md     # Quick start guide
├── markdown/              # Markdown mode docs
│   ├── file-management.md
│   ├── editor-preview.md
│   ├── export-settings.md
│   └── themes-styling.md
├── docmesh/               # DocMesh mode docs
│   ├── overview.md
│   ├── building-trees.md
│   ├── mesh-controls.md
│   └── exporting.md
└── ui/                    # UI element reference
    ├── header.md
    ├── left-sidebar.md
    ├── main-content.md
    ├── right-sidebar.md
    └── notifications.md
```
