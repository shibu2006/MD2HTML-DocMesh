# Header

The header provides branding and global actions available in both modes.

## Logo & Branding

**MD2HTML DOCMesh** - The application name with gradient styling.

**Subtitle** - "Markdown to HTML Converter" describes the primary function.

## Theme Toggle

**Sun/Moon Icon** - Switches between light and dark UI modes.

- Sun icon → Currently in dark mode, click for light
- Moon icon → Currently in light mode, click for dark

The theme affects the entire application interface, not the export preview (which uses export settings).

## Download HTML Button

**Primary action button** (gradient purple)

- Downloads the currently active markdown file as HTML
- Uses current export settings for styling
- Disabled when no file is selected
- Also registers the export for DocMesh availability

## Download All Button

**Secondary action button** (outlined)

- Exports all uploaded markdown files
- Creates a ZIP archive named `md2html-export.zip`
- Each file uses current export settings
- Disabled when no files are uploaded
- All exports become available in DocMesh

## Button States

### Enabled
- Full color/styling
- Hover effects active
- Cursor: pointer

### Disabled
- Grayed out appearance
- No hover effects
- Cursor: not-allowed
- Tooltip explains why disabled

## Tooltips

Hover over any button to see a description:
- Theme toggle: "Switch to dark/light mode"
- Download HTML: "Download current file as HTML" or "No file selected"
- Download All: "Download all files as ZIP" or "No files to download"
