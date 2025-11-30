# Building Document Trees

Learn how to create and organize hierarchical document structures in DocMesh.

## The Document Tree Editor

The tree editor appears in the main content area when in DocMesh mode. It shows your document hierarchy with visual connection lines.

## Adding Documents

### From Available Files
1. Click **Add Document** button in the tree editor header
2. Select an HTML file from the dropdown
3. The file is added as a root-level node

### Drag from Sidebar
1. Find the file in "Available HTML Files" list (left sidebar)
2. Drag it onto the tree canvas
3. Drop to add as a root node, or onto an existing node to nest it

Files already in the mesh appear grayed out and cannot be added again.

## Organizing with Drag and Drop

### Moving Nodes
1. Grab the grip handle (⋮⋮) on any node
2. Drag to a new position
3. Drop indicators show where the node will land:
   - **Blue line above** - Insert before target
   - **Blue line below** - Insert after target
   - **Blue ring around** - Make child of target

### Creating Hierarchy
- Drop a node onto another to make it a child
- Children appear indented with tree lines
- Folders show expand/collapse arrows

### Reordering Siblings
Drag nodes up or down among siblings to change their order.

## Node Display

Each node shows:
- **Drag handle** - For repositioning
- **Expand/collapse** - For nodes with children
- **Icon** - Folder (has children) or document (leaf)
- **Title** - Custom title or filename
- **Description** - If configured
- **Delete button** - Appears on hover

## Deleting Nodes

1. Hover over a node
2. Click the red trash icon
3. Confirm deletion in the dialog

**Warning:** Deleting a node with children removes all descendants.

## Tree Validation

The system prevents invalid operations:
- Cannot create circular references
- Cannot add the same file twice
- Parent-child relationships are validated
