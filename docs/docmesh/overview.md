# DocMesh Overview

DocMesh mode lets you organize multiple HTML documents into hierarchical, navigable documentation sites.

## What is DocMesh?

DocMesh is a document organization system that:
- Creates tree structures from HTML files
- Generates unified index documents with navigation
- Exports complete documentation sites as ZIP archives

## Accessing DocMesh Mode

Click the **DocMesh** button in the mode toggle (left sidebar) to switch from Files mode.

## Key Concepts

### HTML Files
Source documents that can be:
- **From Markdown** - Exported from markdown files in Files mode
- **Uploaded** - HTML files dropped directly into DocMesh

### Mesh
A saved configuration containing:
- Tree structure of documents
- Node metadata (titles, descriptions)
- Creation and modification dates

### Nodes
Individual documents in the tree with:
- Reference to an HTML file
- Custom display title
- Optional description
- Parent/child relationships
- Sort order among siblings

### Index Document
A generated HTML file that:
- Combines all documents in the mesh
- Provides navigation sidebar
- Links between sections

## Workflow Summary

1. **Prepare HTML files** - Export markdown or upload HTML
2. **Build tree structure** - Drag files to create hierarchy
3. **Configure nodes** - Set titles and descriptions
4. **Preview** - Check individual nodes or full index
5. **Export** - Download as ZIP with all files

## Integration with Markdown Mode

When you export a markdown file to HTML:
- The HTML is automatically available in DocMesh
- Updates to the markdown re-export update the HTML
- Mesh nodes referencing that file show updated content
