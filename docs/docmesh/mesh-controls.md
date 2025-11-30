# Mesh Controls

Manage your document meshes using the controls in the right sidebar.

## Control Buttons

### New Mesh
Creates a fresh, empty mesh. If you have unsaved changes, you'll be prompted to confirm.

### Save Mesh
Saves the current mesh to browser storage. Saved meshes persist across sessions.

### Export Mesh
Downloads the mesh as a ZIP archive containing:
- Index document with navigation
- All referenced HTML files
- Proper file structure

Disabled when the mesh is empty or invalid.

## Loading Saved Meshes

### Mesh Selector
Use the dropdown to load a previously saved mesh. Shows:
- Mesh name
- Number of nodes

### Clear All
Removes all saved meshes from storage. Requires confirmation.

### Delete Current
The trash icon next to the selector deletes the currently loaded mesh.

## Current Mesh Info

The info card shows:
- **Mesh name** - Editable text field
- **Node count** - Number of documents
- **Modified date** - Last change timestamp

### Renaming a Mesh
Click the name field and type a new name. Changes are reflected immediately but require saving to persist.

## Confirmation Dialogs

Destructive actions show confirmation dialogs:
- Creating new mesh (if current has changes)
- Loading different mesh (if current has changes)
- Deleting a mesh
- Clearing all meshes

## Validation Warnings

When saving or exporting, you may see warnings about:
- Missing HTML files (referenced but not available)
- Validation issues in tree structure
- Empty meshes

These don't prevent saving but may affect export functionality.
