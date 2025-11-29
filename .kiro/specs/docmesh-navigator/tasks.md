# Implementation Plan

- [x] 1. Define core data structures and types
  - Create TypeScript interfaces for HtmlFile, MeshNode, and DocMesh in types/index.ts
  - Extend AppState interface to include DocMesh-related state fields
  - Add error types for mesh validation and operations
  - _Requirements: 1.1, 2.1, 3.2, 7.1_

- [x] 1.1 Write property test for node ID uniqueness
  - **Feature: docmesh-navigator, Property 4: Node IDs are unique**
  - **Validates: Requirements 2.4**

- [x] 2. Implement HtmlFileManager utility class
  - Create src/utils/htmlFileManager.ts with file storage and retrieval methods
  - Implement HTML file upload functionality with validation
  - Add integration with markdown export to create HtmlFile entries
  - Implement file size validation and sanitization
  - _Requirements: 2.1, 2.2, 10.1_

- [x] 2.1 Write property test for HTML export integration
  - **Feature: docmesh-navigator, Property 3: HTML exports appear in available files**
  - **Validates: Requirements 2.1**

- [x] 2.2 Write property test for markdown export integration
  - **Feature: docmesh-navigator, Property 19: Markdown export integration**
  - **Validates: Requirements 10.1**

- [x] 3. Implement MeshManager utility class for tree operations
  - Create src/utils/meshManager.ts with tree manipulation methods
  - Implement addNode, moveNode, deleteNode, and updateNodeMetadata methods
  - Add tree validation methods (validateTree, detectCycles, findOrphanedNodes)
  - Implement tree traversal utilities (getNodePath, getDescendants, flattenTree)
  - _Requirements: 2.3, 2.4, 3.2, 3.3, 3.4, 9.1, 9.3_

- [x] 3.1 Write property test for tree structure integrity after move
  - **Feature: docmesh-navigator, Property 5: Tree structure integrity after move**
  - **Validates: Requirements 3.2, 3.3, 3.4**

- [x] 3.2 Write property test for node deletion
  - **Feature: docmesh-navigator, Property 17: Node deletion removes from tree**
  - **Validates: Requirements 9.1**

- [x] 3.3 Write property test for cascading deletion
  - **Feature: docmesh-navigator, Property 18: Cascading deletion removes descendants**
  - **Validates: Requirements 9.3**

- [x] 4. Implement mesh persistence functionality
  - Add serializeMesh and deserializeMesh methods to MeshManager
  - Implement localStorage integration for saving and loading meshes
  - Add listSavedMeshes method to retrieve all saved configurations
  - Implement mesh validation on load with error handling
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 4.1 Write property test for mesh configuration round-trip
  - **Feature: docmesh-navigator, Property 13: Mesh configuration round-trip**
  - **Validates: Requirements 7.1, 7.2**

- [x] 4.2 Write property test for mesh switching
  - **Feature: docmesh-navigator, Property 14: Mesh switching loads correct configuration**
  - **Validates: Requirements 7.4**

- [x] 5. Extend App.tsx with DocMesh state management
  - Add DocMesh-related state fields (appMode, htmlFiles, currentMesh, savedMeshes, selectedNodeId, meshPreviewMode)
  - Implement mode switching logic between markdown and docmesh modes
  - Add state update functions for mesh operations
  - Integrate HtmlFileManager to sync with markdown exports
  - _Requirements: 1.2, 1.3, 1.4, 10.4_

- [x] 5.1 Write property test for mode switching preserves state
  - **Feature: docmesh-navigator, Property 1: Mode switching preserves markdown state**
  - **Validates: Requirements 1.3**

- [x] 5.2 Write property test for mode round-trip
  - **Feature: docmesh-navigator, Property 2: Mode round-trip preserves state**
  - **Validates: Requirements 1.4**

- [x] 6. Create DocMeshEditor component
  - Create src/components/DocMeshEditor.tsx with tree visualization
  - Implement drag-and-drop functionality for node reordering and nesting
  - Add UI for selecting HTML files and adding them as nodes
  - Implement node selection and highlighting
  - Add visual feedback for drag operations
  - _Requirements: 2.3, 2.5, 3.1, 3.2, 3.3, 3.5_

- [x] 6.1 Write unit tests for DocMeshEditor component
  - Test tree rendering with various structures
  - Test node selection behavior
  - Test add node functionality
  - _Requirements: 2.3, 3.5_

- [x] 7. Create DocMeshPreview component
  - Create src/components/DocMeshPreview.tsx for displaying node content
  - Implement preview mode toggle (node view vs index view)
  - Add HTML content rendering with proper styling
  - Implement empty state placeholder
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7.1 Write property test for preview displays correct content
  - **Feature: docmesh-navigator, Property 9: Preview displays correct content**
  - **Validates: Requirements 5.1**

- [x] 8. Create DocMeshControls component
  - Create src/components/DocMeshControls.tsx for mesh management
  - Add buttons for new mesh, save mesh, load mesh, and export mesh
  - Implement mesh selection dropdown for switching between saved meshes
  - Add confirmation dialogs for destructive operations
  - _Requirements: 7.3, 7.4, 8.1_

- [x] 9. Modify LeftSidebar for DocMesh mode
  - Add mode toggle button between "Files" and "DocMesh" views
  - Conditionally render file list or DocMeshEditor based on mode
  - Preserve existing file management functionality
  - Ensure smooth transitions between modes
  - _Requirements: 1.1, 1.2_

- [x] 10. Extend RightSidebar with DocMesh settings
  - Add conditional rendering for DocMesh mode
  - Create node metadata editor (title and description fields)
  - Add preview mode toggle (node/index)
  - Implement mesh export settings section
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 10.1 Write property test for node metadata persistence
  - **Feature: docmesh-navigator, Property 6: Node metadata persistence**
  - **Validates: Requirements 4.2, 4.3**

- [x] 10.2 Write property test for default title fallback
  - **Feature: docmesh-navigator, Property 7: Default title fallback**
  - **Validates: Requirements 4.4**

- [x] 11. Implement DocMeshExportEngine utility class
  - Create src/utils/docMeshExportEngine.ts for index generation
  - Implement generateIndexDocument method to create unified HTML
  - Add generateNavigationHTML method for sidebar navigation
  - Implement stitchHtmlContent to combine all node content
  - Add generateAnchorIds for navigation links
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 11.1 Write property test for index contains all content
  - **Feature: docmesh-navigator, Property 10: Index contains all node content**
  - **Validates: Requirements 6.1**

- [x] 11.2 Write property test for navigation structure matches tree
  - **Feature: docmesh-navigator, Property 11: Navigation structure matches tree**
  - **Validates: Requirements 6.2**

- [x] 11.3 Write property test for navigation uses configured metadata
  - **Feature: docmesh-navigator, Property 8: Navigation uses configured metadata**
  - **Validates: Requirements 4.5, 6.3**

- [x] 11.4 Write property test for navigation anchors are valid
  - **Feature: docmesh-navigator, Property 12: Navigation anchors are valid**
  - **Validates: Requirements 6.4**

- [x] 12. Implement mesh export to ZIP functionality
  - Add exportMeshToZip method to DocMeshExportEngine
  - Implement packaging of index document and all referenced HTML files
  - Add relative link processing to ensure links work in exported structure
  - Integrate with existing ExportEngine download functionality
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 12.1 Write property test for export contains all files
  - **Feature: docmesh-navigator, Property 15: Export contains all referenced files**
  - **Validates: Requirements 8.2**

- [x] 12.2 Write property test for export is valid ZIP
  - **Feature: docmesh-navigator, Property 16: Export is valid ZIP**
  - **Validates: Requirements 8.3**

- [x] 13. Implement node deletion with confirmation
  - Add delete functionality to MeshManager with cascade option
  - Implement confirmation dialog for nodes with children
  - Update preview pane when deleted node was selected
  - Handle empty tree state after last node deletion
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 14. Integrate markdown re-export with mesh updates
  - Modify export workflow to update existing HtmlFile entries
  - Implement mesh node content synchronization when markdown is re-exported
  - Add notifications when mesh nodes are updated
  - _Requirements: 10.2_

- [x] 14.1 Write property test for re-export updates mesh nodes
  - **Feature: docmesh-navigator, Property 20: Re-export updates mesh nodes**
  - **Validates: Requirements 10.2**

- [x] 15. Add error handling and user feedback
  - Implement error types (MeshValidationError, NodeNotFoundError, etc.)
  - Add toast notifications for successful operations
  - Implement warning alerts for non-critical issues
  - Add error alerts with actionable messages
  - Create confirmation modals for destructive operations
  - _Requirements: 7.5, 9.2_

- [x] 16. Add styling and polish
  - Ensure DocMesh components match existing UI theme (light/dark mode)
  - Add smooth transitions for mode switching
  - Implement loading states for async operations
  - Add hover effects and visual feedback for interactive elements
  - Ensure responsive design for different screen sizes
  - _Requirements: 1.1, 10.3_

- [x] 17. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Write integration tests for complete workflows
  - Test complete workflow: upload markdown → export → create mesh → add nodes → export mesh
  - Test mode switching preserves both markdown and mesh state
  - Test mesh save/load cycle with multiple meshes
  - Test node deletion and tree restructuring
  - _Requirements: 1.3, 1.4, 7.2, 10.4_
