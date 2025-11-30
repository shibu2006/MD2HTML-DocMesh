# Main Content Area

The central workspace that displays different content based on mode and view.

## Toolbar

The toolbar appears at the top of the content area.

### File Indicator
Shows the current context:
- **Markdown mode** - Active filename or "No file selected"
- **DocMesh mode** - "Document Mesh Preview"

### View Toggle (Markdown Mode Only)
Switch between:
- **Editor** - Raw markdown editing
- **Preview** - Rendered HTML output

---

## Markdown Mode Views

### Empty State
When no files are uploaded:
- Large icon with grid pattern
- "Start Converting" heading
- Instruction text
- **Browse Files** button to upload

Supports drag-and-drop onto the empty state.

### Editor View
Full-height textarea for markdown editing:
- Monospace font
- Dark/light theme aware
- Placeholder text when empty
- Auto-saves to session

### Preview View
Rendered HTML with theme applied:
- Respects all export settings
- Optional TOC sidebar or inline
- Smooth scroll for anchor links
- Code syntax highlighting

---

## DocMesh Mode

### DocMesh Canvas
The tree editor and preview split view:

**Left Panel - Tree Editor**
- Document hierarchy visualization
- Drag-and-drop organization
- Add document button
- Node selection

**Right Panel - Preview**
- Shows selected node content
- Or index document preview
- Loading and error states

### Preview Modes
Toggle in right sidebar:
- **Node View** - Single document preview
- **Index View** - Full navigation preview

---

## Drag and Drop

The main content area accepts file drops:
- **Markdown mode** - `.md`, `.markdown` files
- **DocMesh mode** - `.html`, `.htm` files

Files are filtered by type based on current mode.
