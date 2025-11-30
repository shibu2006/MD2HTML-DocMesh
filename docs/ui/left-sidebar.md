# Left Sidebar

The left sidebar provides navigation and file management, adapting to the current mode.

## Collapse Toggle

Click the chevron button to collapse/expand the sidebar. When collapsed, only the toggle button is visible.

## Mode Toggle

Switch between application modes:

- **Files** - Markdown editing mode (FileText icon)
- **DocMesh** - Document organization mode (Network icon)

The active mode is highlighted with a white/dark background.

---

## Files Mode (Markdown)

### Search Bar
- Type to filter files by name
- Case-insensitive matching
- X button clears the search

### Upload Files Button
- Opens file picker for `.md` and `.markdown` files
- Supports multiple file selection
- Gradient purple styling

### Clear All Button
- Removes all uploaded files
- First click shows confirmation state (red)
- Second click confirms deletion
- Click elsewhere to cancel

### File List
Each file shows:
- **Name** - Original filename
- **Size** - Human-readable (KB, MB)
- **Date** - Upload date
- **Delete** - Trash icon on hover

Click a file to select it. Active file has elevated styling.

---

## DocMesh Mode

### Mesh Info Header
- Mesh name and document count
- Tip about dragging files to canvas

### Available HTML Files
Lists all HTML files that can be added to the mesh:

**File Sources:**
- "From Markdown" - Exported from markdown files
- "Uploaded" - Directly uploaded HTML

**File States:**
- **Available** - Can be dragged to tree
- **In mesh** - Grayed out, already used

### Drag to Add
Drag available files onto the tree canvas to add them to your mesh.

### Upload HTML
Drop `.html` or `.htm` files onto the sidebar to upload them directly.
