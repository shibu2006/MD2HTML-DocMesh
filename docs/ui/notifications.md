# Notifications

Toast notifications provide feedback for user actions and system events.

## Toast Types

### Success (Green)
Confirms successful operations:
- "Mesh Saved" - After saving a mesh
- "Node Added" - After adding a document
- "Export Complete" - After downloading

### Error (Red)
Reports failures and problems:
- "Failed to Save Mesh" - Storage error
- "Export Failed" - Generation error
- "File Not Found" - Missing reference

### Warning (Amber)
Alerts about potential issues:
- "Mesh Validation Issues" - Non-critical problems
- "Missing HTML Files" - References to deleted files
- "Empty Mesh" - Attempting to export empty mesh

### Info (Blue)
Provides status updates:
- "Exporting Mesh" - Operation in progress
- "Mesh Nodes Updated" - Content refresh

## Toast Behavior

### Appearance
- Slides in from the right
- Stacks vertically (newest on top)
- Maximum width for readability

### Duration
- Success/Info: 5 seconds
- Warning: 6 seconds
- Error: 7 seconds

### Dismissal
- Auto-dismiss after duration
- Click X button to dismiss immediately
- Multiple toasts can be visible

## Toast Content

Each toast includes:
- **Icon** - Type-specific (checkmark, X, triangle, info)
- **Title** - Brief summary
- **Message** - Optional details
- **Close button** - Manual dismissal

## Accessibility

- `role="alert"` for screen readers
- `aria-live="polite"` container
- Keyboard-accessible close button
- Color + icon for type indication
