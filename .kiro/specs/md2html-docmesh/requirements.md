# Requirements Document

## Introduction

The MD2HTML DOCMesh application is a modern, browser-based Markdown to HTML converter designed for developers, writers, and documentation maintainers. The system provides real-time preview capabilities, multiple theming options, and customizable export settings. The application features a three-pane layout with file management, live editing/preview, and comprehensive export configuration options.

## Glossary

- **Application**: The MD2HTML DOCMesh browser-based converter system
- **User**: A developer, writer, or documentation maintainer using the Application
- **Workspace**: The in-memory collection of uploaded Markdown files
- **Active File**: The currently selected file being edited or previewed
- **Theme**: A predefined color scheme applied to rendered HTML output
- **TOC**: Table of Contents generated from Markdown headers
- **Export Format**: The output structure (HTML5 Complete or HTML Fragment)
- **Markdown Engine**: The parsing system that converts Markdown to HTML
- **Preview Pane**: The rendered HTML view of the Markdown content
- **Editor Pane**: The raw Markdown text editing view

## Requirements

### Requirement 1

**User Story:** As a user, I want to upload Markdown files to the workspace, so that I can convert them to HTML.

#### Acceptance Criteria

1. WHEN a user clicks the upload button THEN the Application SHALL open a file picker accepting `.md` and `.markdown` extensions
2. WHEN a user selects one or more Markdown files THEN the Application SHALL read each file content as text and add it to the Workspace
3. WHEN a user drags and drops Markdown files onto the main content area THEN the Application SHALL accept the files and add them to the Workspace
4. WHEN a file is added to the Workspace THEN the Application SHALL generate a unique identifier, calculate file size in KB or MB, and set the upload date to current time
5. WHEN multiple files are uploaded simultaneously THEN the Application SHALL process all files and add them to the Workspace

### Requirement 2

**User Story:** As a user, I want to view and manage my uploaded files in a file explorer, so that I can organize and access my Markdown documents.

#### Acceptance Criteria

1. WHEN files exist in the Workspace THEN the Application SHALL display them in the left sidebar file list with filename, size, and date
2. WHEN a user clicks on a file in the list THEN the Application SHALL set it as the Active File and display its content
3. WHEN a user hovers over a file item THEN the Application SHALL display a delete button
4. WHEN a user clicks the delete button on a file THEN the Application SHALL remove that file from the Workspace
5. WHEN a user types in the search bar THEN the Application SHALL filter the file list to show only files whose names contain the search text
6. WHEN the Active File is displayed in the list THEN the Application SHALL highlight it with a white background and shadow
7. WHEN a user clicks the clear all button THEN the Application SHALL prompt for confirmation before removing all files from the Workspace

### Requirement 3

**User Story:** As a user, I want to edit Markdown content in a text editor, so that I can modify my documents before conversion.

#### Acceptance Criteria

1. WHEN an Active File is selected and editor view is active THEN the Application SHALL display the file content in a full-height textarea
2. WHEN a user types in the editor THEN the Application SHALL update the Active File content in real-time
3. WHEN the editor displays content THEN the Application SHALL use a monospace font
4. WHEN the editor is displayed THEN the Application SHALL show raw Markdown text without syntax highlighting

### Requirement 4

**User Story:** As a user, I want to preview the rendered HTML output of my Markdown, so that I can see how it will look before exporting.

#### Acceptance Criteria

1. WHEN an Active File is selected and preview view is active THEN the Application SHALL render the Markdown content as HTML
2. WHEN the Markdown Engine processes content THEN the Application SHALL parse the Markdown syntax and convert it to valid HTML
3. WHEN code blocks are present in the Markdown THEN the Application SHALL apply syntax highlighting using auto-detected language
4. WHEN the preview is rendered THEN the Application SHALL apply the selected Theme styles to the HTML output
5. WHEN the preview is rendered THEN the Application SHALL apply Tailwind Typography prose styles for consistent formatting

### Requirement 5

**User Story:** As a user, I want to toggle between editor and preview views, so that I can switch between editing and viewing rendered output.

#### Acceptance Criteria

1. WHEN a user clicks the editor button in the view toggle THEN the Application SHALL display the editor pane and hide the preview pane
2. WHEN a user clicks the preview button in the view toggle THEN the Application SHALL display the preview pane and hide the editor pane
3. WHEN the view toggle buttons are displayed THEN the Application SHALL highlight the currently active view

### Requirement 6

**User Story:** As a user, I want to generate a table of contents from my Markdown headers, so that I can provide navigation for long documents.

#### Acceptance Criteria

1. WHEN the "Include Table of Contents" setting is enabled THEN the Application SHALL parse all h2 and h3 headers from the Markdown content
2. WHEN generating TOC entries THEN the Application SHALL create clean IDs by converting header text to lowercase, replacing spaces with hyphens, and removing special characters
3. WHEN the TOC is generated THEN the Application SHALL inject anchor elements into the rendered HTML headers with corresponding IDs
4. WHEN the TOC position is set to "Left Sidebar" and preview is active THEN the Application SHALL display the TOC in a sticky left column with clickable links
5. WHEN the TOC position is set to "Top of Page" THEN the Application SHALL inject the TOC at the beginning of the rendered HTML content
6. WHEN a user clicks a TOC link THEN the Application SHALL scroll to the corresponding header in the preview

### Requirement 7

**User Story:** As a user, I want to select different visual themes for my HTML output, so that I can match my documentation style preferences.

#### Acceptance Criteria

1. WHEN a user selects a theme from the dropdown THEN the Application SHALL apply the theme colors to the preview pane
2. WHEN a theme is applied THEN the Application SHALL use the theme-specific background color, text color, accent color, and code block background
3. WHEN a user selects a light theme (GitHub Light, Sky Blue, Solarized Light) THEN the Application SHALL switch the UI to light mode
4. WHEN a user selects a dark theme (GitHub Dark, Dracula, Monokai, Nord) THEN the Application SHALL switch the UI to dark mode
5. WHEN HTML is exported THEN the Application SHALL include the selected theme CSS in the output

### Requirement 8

**User Story:** As a user, I want to toggle between light and dark UI modes, so that I can work comfortably in different lighting conditions.

#### Acceptance Criteria

1. WHEN a user clicks the theme toggle button THEN the Application SHALL switch between light mode and dark mode
2. WHEN light mode is active THEN the Application SHALL display the sun icon in the toggle button
3. WHEN dark mode is active THEN the Application SHALL display the moon icon in the toggle button
4. WHEN the UI mode changes THEN the Application SHALL apply smooth color transitions with 300ms duration
5. WHEN light mode is active THEN the Application SHALL use white and slate-50 backgrounds with slate-900 text
6. WHEN dark mode is active THEN the Application SHALL use slate-950 and slate-900 backgrounds with slate-100 text

### Requirement 9

**User Story:** As a user, I want to configure export settings, so that I can customize the HTML output format and features.

#### Acceptance Criteria

1. WHEN a user selects "HTML5 Complete" output format THEN the Application SHALL wrap the rendered content in a complete HTML document structure with DOCTYPE, html, head, and body tags
2. WHEN a user selects "HTML Fragment" output format THEN the Application SHALL export only the rendered body content without document structure
3. WHEN a user selects a font family THEN the Application SHALL apply the font styles to the preview and include them in exported HTML
4. WHEN a user selects a font size THEN the Application SHALL apply the size to the preview and include it in exported HTML
5. WHEN "Sanitize HTML" is enabled THEN the Application SHALL process the rendered HTML through DOMPurify before display and export
6. WHEN "Include CSS" is enabled THEN the Application SHALL inject theme and typography styles into the exported HTML
7. WHEN "Minify Output" is enabled THEN the Application SHALL remove newlines and extra spaces from the exported HTML
8. WHEN "Highlight Code" is enabled THEN the Application SHALL include syntax highlighting CSS in the exported HTML

### Requirement 10

**User Story:** As a user, I want to download individual HTML files, so that I can export specific documents.

#### Acceptance Criteria

1. WHEN a user clicks the "Download HTML" button and an Active File exists THEN the Application SHALL convert the Active File to HTML and trigger a download
2. WHEN no Active File exists THEN the Application SHALL disable the "Download HTML" button
3. WHEN downloading HTML THEN the Application SHALL use the original Markdown filename with `.html` extension
4. WHEN downloading HTML THEN the Application SHALL apply all current export settings to the output

### Requirement 11

**User Story:** As a user, I want to download all files as a ZIP archive, so that I can export my entire workspace at once.

#### Acceptance Criteria

1. WHEN a user clicks the "Download All" button THEN the Application SHALL convert all files in the Workspace to HTML
2. WHEN generating the ZIP archive THEN the Application SHALL create a file for each Workspace file with corresponding HTML filename
3. WHEN generating the ZIP archive THEN the Application SHALL apply all current export settings to each file
4. WHEN the ZIP is ready THEN the Application SHALL trigger a download with filename "md2html-export.zip"
5. WHEN generating the ZIP THEN the Application SHALL use JSZip library for archive creation

### Requirement 12

**User Story:** As a user, I want to see tooltips on UI elements, so that I can understand the purpose of buttons and settings.

#### Acceptance Criteria

1. WHEN a user hovers over a button or setting with a tooltip THEN the Application SHALL display the tooltip after a brief delay
2. WHEN displaying a tooltip THEN the Application SHALL position it dynamically based on available space using getBoundingClientRect
3. WHEN displaying a tooltip THEN the Application SHALL render it to document.body using a React Portal
4. WHEN displaying a tooltip THEN the Application SHALL use a dark slate background with white text and an arrow pointer
5. WHEN displaying a tooltip THEN the Application SHALL ensure it appears above all other elements with high z-index

### Requirement 13

**User Story:** As a user, I want to see visual feedback on interactive elements, so that I can understand which elements are clickable and active.

#### Acceptance Criteria

1. WHEN a user hovers over a button THEN the Application SHALL display a light gray background fade
2. WHEN a user hovers over a file list item THEN the Application SHALL highlight the item
3. WHEN a user hovers over a TOC link THEN the Application SHALL change the link color and border
4. WHEN a file item is hovered THEN the Application SHALL display the delete button
5. WHEN a file item is not hovered THEN the Application SHALL hide the delete button

### Requirement 14

**User Story:** As a user, I want to see an empty state when no files are loaded, so that I understand how to get started.

#### Acceptance Criteria

1. WHEN the Workspace is empty THEN the Application SHALL display a centered card with a large icon
2. WHEN the empty state is displayed THEN the Application SHALL show the text "Start Converting" and instructions to drag and drop or upload files
3. WHEN the empty state is displayed THEN the Application SHALL show a "Browse Files" button that triggers the file upload
4. WHEN files exist in the Workspace THEN the Application SHALL hide the empty state and show the active workspace

### Requirement 15

**User Story:** As a user, I want the application to maintain a consistent visual design, so that I have a cohesive user experience.

#### Acceptance Criteria

1. WHEN the Application is displayed THEN the Application SHALL use a three-pane layout with sticky header
2. WHEN the header is displayed THEN the Application SHALL apply glassmorphism effect with backdrop blur and semi-transparent background
3. WHEN the main content area is displayed THEN the Application SHALL show a subtle radial dot pattern background
4. WHEN the left sidebar is displayed THEN the Application SHALL set width to 288 pixels
5. WHEN the right sidebar is displayed THEN the Application SHALL set width to 320 pixels
6. WHEN the Application uses colors THEN the Application SHALL use slate scale for structure and indigo for primary actions
