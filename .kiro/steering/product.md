# Product Overview

MD2HTML DOCMesh is a markdown-to-HTML converter and document organization web application. Users can upload multiple markdown files, edit them in a live editor, preview the rendered HTML output, export with customizable themes, and organize HTML documents into hierarchical, navigable documentation sites.

The application operates in two modes:

**Markdown Mode**: A full-featured markdown editor with live preview, syntax highlighting, and customizable HTML export. Users can work with multiple files, apply various themes (GitHub, Dracula, Monokai, Nord, etc.), and export individual files or batch export to ZIP archives.

**DocMesh Mode**: A document organization system that allows users to create hierarchical structures from HTML files (either generated from markdown or uploaded directly). Users can arrange documents into tree structures using drag-and-drop, configure navigation metadata, and generate unified index documents that stitch all content together with an integrated navigation sidebar. This enables the creation of complete, navigable documentation sites from multiple HTML sources.

Key capabilities include:
- Seamless switching between markdown editing and document organization
- Automatic integration of markdown exports into DocMesh available files
- Multiple saved mesh configurations for different documentation layouts
- Tree structure validation to prevent cycles and maintain referential integrity
- Complete export packages with index document and all referenced HTML files

## Core Features

### Markdown Editing
- Multi-file markdown editor with live preview
- Syntax highlighting for code blocks (highlight.js)
- Multiple export themes (GitHub, Dracula, Monokai, Nord, etc.)
- HTML sanitization for security (DOMPurify)
- Table of contents generation
- Batch export to ZIP archives
- Dark/light UI modes

### DocMesh Navigator
- Hierarchical document organization with drag-and-drop tree editor
- Create navigable documentation sites from multiple HTML files
- Configurable node titles and descriptions for navigation
- Generate unified index documents with integrated navigation sidebar
- Save and load multiple mesh configurations
- Export complete documentation sites as ZIP archives
- Preview individual nodes or complete index documents
- Seamless integration with markdown exports

## User Workflows

### Markdown Workflow
1. Upload markdown files via drag-and-drop or file picker
2. Edit markdown content in the editor pane
3. Preview rendered HTML with selected theme
4. Configure export settings (theme, fonts, TOC, sanitization)
5. Export individual files or batch export as ZIP

### DocMesh Workflow
1. Switch to DocMesh mode from the left sidebar
2. Select HTML files (from markdown exports or direct uploads)
3. Arrange files into hierarchical tree structure using drag-and-drop
4. Configure display titles and descriptions for each node
5. Preview the navigation structure and individual documents
6. Generate and export unified index document with all referenced files
