# Export Settings

Configure how your markdown is converted to HTML using the right sidebar settings.

## Output Format

Choose the structure of your exported HTML:

- **HTML5 Complete** - Full HTML document with `<!DOCTYPE>`, `<head>`, and `<body>` tags
- **HTML Fragment** - Just the content, suitable for embedding in existing pages

## Theme

Select a color scheme for your exported HTML:

| Theme | Description |
|-------|-------------|
| GitHub Light | Clean, light theme inspired by GitHub |
| GitHub Dark | Dark version of the GitHub theme |
| Dracula | Popular dark theme with purple accents |
| Monokai | Classic dark theme from Sublime Text |
| Sky Blue | Light theme with blue accents |
| Solarized Light | Warm, low-contrast light theme |
| Nord | Arctic-inspired dark theme |

## Font Family

Choose the typeface for your content:

- **System Default** - Uses the user's system font
- **Inter** - Modern sans-serif, great for readability
- **Roboto** - Google's clean sans-serif
- **Open Sans** - Friendly, neutral sans-serif
- **Merriweather** - Elegant serif font
- **Fira Code** - Monospace with ligatures
- **Monospace** - Standard monospace font

## Font Size

Set the base font size:

- **Small** - 14px
- **Medium** - 16px (default)
- **Large** - 18px
- **Extra Large** - 20px

## Feature Toggles

### Include Table of Contents
Generates a navigation menu from your `h2` headings.

**Position Options:**
- **Left Sidebar** - Fixed sidebar navigation
- **Top of Page** - Inline navigation after the title

### Sanitize HTML
Removes potentially dangerous HTML using DOMPurify. Recommended for security.

### Include CSS
Embeds theme and typography styles in the exported file. Disable for unstyled HTML.

### Minify Output
Removes unnecessary whitespace for smaller file sizes.

### Highlight Code
Applies syntax highlighting to fenced code blocks. Supports many programming languages.
