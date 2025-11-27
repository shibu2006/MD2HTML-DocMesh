# Implementation Plan

- [x] 1. Set up project structure and dependencies
  - Initialize React + Vite project with TypeScript
  - Install core dependencies: marked, highlight.js, marked-highlight, dompurify, jszip, lucide-react
  - Configure Tailwind CSS with typography plugin
  - Set up basic folder structure (components, utils, types, hooks)
  - _Requirements: All_

- [x] 2. Implement core data models and state management
  - Define TypeScript interfaces for MarkdownFile, ExportSettings, AppState
  - Create initial app state with useState hooks
  - Implement state update functions for files, settings, and UI mode
  - _Requirements: 1.2, 1.4, 9.1-9.8_

- [x] 3. Build file management system
  - Create FileManager utility with upload, delete, search, and update functions
  - Implement file reading from File API
  - Generate unique IDs using crypto.randomUUID with fallback
  - Calculate file sizes and format as KB/MB
  - _Requirements: 1.1-1.5, 2.4_

- [x] 3.1 Write property test for file upload content preservation
  - **Property 1: File upload preserves content**
  - **Validates: Requirements 1.2**

- [x] 3.2 Write property test for file metadata generation
  - **Property 2: File metadata generation**
  - **Validates: Requirements 1.4**

- [x] 3.3 Write property test for batch upload completeness
  - **Property 3: Batch upload completeness**
  - **Validates: Requirements 1.5**

- [x] 4. Create theme system
  - Define theme constants with color values for all 7 themes
  - Implement ThemeManager utility to get theme styles
  - Create theme-to-UI-mode synchronization logic
  - Implement UI mode toggle functionality
  - _Requirements: 7.1-7.5, 8.1-8.6_

- [x] 4.1 Write property test for light theme UI sync
  - **Property 15: Light theme triggers light UI mode**
  - **Validates: Requirements 7.3**

- [x] 4.2 Write property test for dark theme UI sync
  - **Property 16: Dark theme triggers dark UI mode**
  - **Validates: Requirements 7.4**

- [x] 5. Build Markdown processing engine
  - Configure marked library with options
  - Integrate highlight.js with marked-highlight
  - Implement syntax highlighting with auto-detection
  - Integrate dompurify for HTML sanitization
  - Create parse function with configurable options
  - _Requirements: 4.1-4.5_

- [x] 5.1 Write property test for markdown parsing structure preservation
  - **Property 12: Markdown parsing round-trip preserves structure**
  - **Validates: Requirements 4.2**

- [x] 5.2 Write property test for code block syntax highlighting
  - **Property 13: Code block syntax highlighting**
  - **Validates: Requirements 4.3**

- [x] 6. Implement Table of Contents generation
  - Parse h2 and h3 headers from markdown content
  - Generate clean IDs (lowercase, hyphenated, no special chars)
  - Create TOC data structure with entries
  - Inject anchor elements into rendered HTML
  - _Requirements: 6.1-6.3_

- [x] 6.1 Write property test for TOC completeness
  - **Property 18: TOC generation includes all headers**
  - **Validates: Requirements 6.1**

- [x] 6.2 Write property test for TOC ID consistency
  - **Property 19: TOC ID generation is consistent**
  - **Validates: Requirements 6.2**

- [x] 6.3 Write property test for TOC anchor injection
  - **Property 20: TOC anchors injected in HTML**
  - **Validates: Requirements 6.3**

- [x] 7. Create export engine
  - Build HTML5 Complete template with DOCTYPE and full structure
  - Build HTML Fragment template with content only
  - Implement CSS injection for themes, fonts, and highlighting
  - Implement minification logic (remove newlines and extra spaces)
  - Create download functions for single files and blobs
  - _Requirements: 9.1-9.8, 10.1-10.4_

- [x] 7.1 Write property test for HTML5 Complete structure
  - **Property 22: HTML5 Complete includes document structure**
  - **Validates: Requirements 9.1**

- [x] 7.2 Write property test for HTML Fragment structure
  - **Property 23: HTML Fragment excludes document structure**
  - **Validates: Requirements 9.2**

- [x] 7.3 Write property test for minification
  - **Property 28: Minification removes whitespace**
  - **Validates: Requirements 9.7**

- [x] 7.4 Write property test for sanitization
  - **Property 26: Sanitization removes dangerous content**
  - **Validates: Requirements 9.5**

- [x] 8. Implement ZIP generation
  - Integrate jszip library
  - Create function to generate ZIP from multiple files
  - Apply export settings to each file in ZIP
  - Trigger ZIP download with correct filename
  - _Requirements: 11.1-11.5_

- [x] 8.1 Write property test for ZIP completeness
  - **Property 32: ZIP contains all workspace files**
  - **Validates: Requirements 11.2**

- [x] 9. Build Header component
  - Create logo with icon and text
  - Implement theme toggle button with sun/moon icons
  - Create download HTML button with disabled state
  - Create download all ZIP button
  - Add tooltips to all buttons
  - _Requirements: 8.1-8.3, 10.1-10.2, 11.1_

- [x] 9.1 Write property test for download button state
  - **Property 30: Download button disabled when no active file**
  - **Validates: Requirements 10.2**

- [x] 10. Build LeftSidebar component
  - Create search bar with filter functionality
  - Implement upload button with file picker
  - Create clear all button with confirmation
  - Build file list display
  - Create FileItem component with metadata and delete button
  - Implement active file highlighting
  - Add hover effects for delete button visibility
  - _Requirements: 2.1-2.7_

- [x] 10.1 Write property test for file search filtering
  - **Property 7: File search filters correctly**
  - **Validates: Requirements 2.5**

- [x] 10.2 Write property test for active file exclusivity
  - **Property 8: Active file highlighting is exclusive**
  - **Validates: Requirements 2.6**

- [x] 11. Build MainContent component
  - Create EmptyState component with icon, text, and browse button
  - Create ActiveWorkspace container
  - Build Toolbar with filename display and view toggle
  - Implement conditional rendering based on file presence
  - _Requirements: 14.1-14.4_

- [x] 11.1 Write property test for empty state display
  - **Property 33: Empty workspace shows empty state**
  - **Validates: Requirements 14.4**

- [x] 12. Build Editor component
  - Create full-height textarea
  - Apply monospace font styling
  - Implement real-time content updates
  - Handle text input and sync with file state
  - _Requirements: 3.1-3.4_

- [x] 12.1 Write property test for editor content updates
  - **Property 10: Editor content updates file state**
  - **Validates: Requirements 3.2**

- [x] 13. Build Preview component
  - Render HTML from markdown using the engine
  - Apply selected theme styles dynamically
  - Apply Tailwind Typography prose classes
  - Implement TOC sidebar (optional, conditional)
  - Handle TOC positioning (left sidebar vs top of page)
  - _Requirements: 4.1-4.5, 6.4-6.6_

- [x] 13.1 Write property test for theme application
  - **Property 14: Theme selection updates preview**
  - **Validates: Requirements 7.1, 7.2**

- [x] 13.2 Write property test for TOC top position
  - **Property 21: TOC top position placement**
  - **Validates: Requirements 6.5**

- [x] 14. Build RightSidebar component
  - Create export settings section with dropdowns
  - Implement output format selector
  - Create theme selector dropdown
  - Create font family and size selectors
  - Build feature toggles (TOC, sanitize, CSS, minify, highlight)
  - Add TOC position sub-option
  - Create status card with version display
  - Add info icon tooltips for settings
  - _Requirements: 9.1-9.8, 6.1, 6.4-6.5_

- [x] 14.1 Write property test for font family export
  - **Property 24: Font family included in export**
  - **Validates: Requirements 9.3**

- [x] 14.2 Write property test for font size export
  - **Property 25: Font size included in export**
  - **Validates: Requirements 9.4**

- [x] 14.3 Write property test for CSS inclusion
  - **Property 27: CSS inclusion in export**
  - **Validates: Requirements 9.6**

- [x] 14.4 Write property test for highlight CSS inclusion
  - **Property 29: Highlight CSS included when enabled**
  - **Validates: Requirements 9.8**

- [x] 15. Build Tooltip component
  - Create portal-based tooltip using React Portal
  - Implement dynamic positioning with getBoundingClientRect
  - Calculate placement (top, bottom, left, right) based on space
  - Apply dark slate styling with arrow pointer
  - Set high z-index for visibility
  - _Requirements: 12.1-12.5_

- [x] 15.1 Write property test for tooltip viewport bounds
  - **Property 34: Tooltip positioning avoids viewport edges**
  - **Validates: Requirements 12.2**

- [x] 16. Implement drag and drop functionality
  - Add drag-and-drop event handlers to main content area
  - Handle file drop events
  - Validate file types on drop
  - Integrate with file upload system
  - _Requirements: 1.3_

- [x] 17. Add hover effects and micro-interactions
  - Implement button hover effects with background fade
  - Add file list item hover highlighting
  - Create TOC link hover effects
  - Apply smooth transitions for theme mode changes
  - _Requirements: 13.1-13.5_

- [x] 18. Implement global styling and layout
  - Create three-pane layout with proper widths
  - Style header with glassmorphism effect
  - Add radial dot pattern background to main content
  - Apply color scheme (slate for structure, indigo for accents)
  - Ensure responsive behavior
  - _Requirements: 15.1-15.6_

- [x] 19. Wire up all components and state
  - Connect all components to app state
  - Implement event handlers for all user interactions
  - Ensure proper data flow between components
  - Test complete user workflows
  - _Requirements: All_

- [x] 19.1 Write property test for file list display
  - **Property 4: File list display completeness**
  - **Validates: Requirements 2.1**

- [x] 19.2 Write property test for file selection
  - **Property 5: File selection updates active state**
  - **Validates: Requirements 2.2**

- [x] 19.3 Write property test for file deletion
  - **Property 6: File deletion removes from workspace**
  - **Validates: Requirements 2.4**

- [x] 19.4 Write property test for editor display
  - **Property 9: Editor displays active file content**
  - **Validates: Requirements 3.1**

- [x] 19.5 Write property test for preview rendering
  - **Property 11: Preview renders markdown as HTML**
  - **Validates: Requirements 4.1**

- [x] 19.6 Write property test for theme CSS export
  - **Property 17: Theme CSS included in export**
  - **Validates: Requirements 7.5**

- [x] 19.7 Write property test for download filename
  - **Property 31: Download filename uses HTML extension**
  - **Validates: Requirements 10.3**

- [x] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
