# Editor & Preview

The main content area provides two views for working with your markdown files.

## View Toggle

Use the toggle buttons in the toolbar to switch between views:

- **Editor** - Edit raw markdown content
- **Preview** - See rendered HTML output

## Editor View

The editor provides a clean, distraction-free writing environment.

### Features
- Monospace font for easy markdown editing
- Full-height textarea that fills available space
- Auto-saves content as you type (within session)
- Placeholder text when empty

### Keyboard Support
Standard text editing shortcuts work:
- `Ctrl/Cmd + A` - Select all
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Shift + Z` - Redo
- `Tab` - Insert tab character

## Preview View

The preview shows your markdown rendered as HTML with your selected theme applied.

### Live Updates
Changes in the editor are reflected immediately in the preview.

### Theme Application
The preview respects all export settings:
- Color theme (GitHub, Dracula, etc.)
- Font family and size
- Code syntax highlighting
- Table of contents (if enabled)

### Table of Contents

When TOC is enabled in export settings:

**Left Sidebar Position**
- TOC appears as a fixed sidebar on the left
- Click entries to scroll to that section
- Smooth scrolling animation

**Top of Page Position**
- TOC appears after the first heading
- Styled as a bordered navigation box
- Hover effects on links

### Link Handling
- Internal anchor links scroll smoothly to the target
- External links open in a new tab
