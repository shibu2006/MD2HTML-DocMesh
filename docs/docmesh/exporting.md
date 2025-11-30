# Exporting Documentation

Export your DocMesh as a complete, navigable documentation site.

## Export Process

1. Build and organize your document tree
2. Configure node titles and descriptions
3. Click **Export Mesh** in the right sidebar
4. A ZIP file downloads automatically

## ZIP Contents

The exported archive contains:

```
mesh-name.zip
├── index.html      # Main navigation document
├── doc1.html       # First document
├── doc2.html       # Second document
└── ...             # Additional documents
```

## Index Document

The generated index.html includes:
- Navigation sidebar with tree structure
- Links to all documents
- Titles and descriptions from node metadata
- Styling based on export settings

## Export Settings

DocMesh exports use the same settings as markdown exports:
- Theme (colors, styling)
- Font family and size
- Code highlighting

Configure these in the right sidebar under "Export Settings" (visible in markdown mode, applied to DocMesh exports).

## Preview Before Export

### Node View
Select a node in the tree to preview its HTML content.

### Index View
Click "Index View" in Preview Settings to see the generated index document with navigation.

## Requirements for Export

Export is enabled when:
- Mesh has at least one node
- All referenced HTML files exist
- Tree structure is valid (no cycles)

## Troubleshooting

### "Missing HTML Files" Error
Some nodes reference files that no longer exist. Re-export the markdown or re-upload the HTML.

### "Cannot Export Invalid Mesh"
The tree has structural issues. Check for:
- Orphaned nodes
- Circular references
- Missing parent references

### Empty Export
Ensure you've added documents to the tree, not just uploaded HTML files.
