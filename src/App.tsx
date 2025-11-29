import { useState, useEffect, useCallback } from 'react'
import type { MarkdownFile, ExportSettings, HtmlFile, DocMesh, MeshNode } from './types'
import {
  NodeNotFoundError,
  CyclicDependencyError,
  MeshValidationError,
  HtmlFileNotFoundError
} from './types'
import { Header, LeftSidebar, MainContent, Editor, Preview, RightSidebar, ToastContainer, DocMeshCanvas } from './components'
import type { Toast } from './components'
import { FileManager } from './utils/fileManager'
import { HtmlFileManager } from './utils/htmlFileManager'
import { MeshManager } from './utils/meshManager'
import './App.css'

function App() {
  // File management state
  const [files, setFiles] = useState<MarkdownFile[]>([])
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')

  // View state
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('preview')
  const [uiMode, setUIMode] = useState<'light' | 'dark'>('dark')

  // Export settings state
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    outputFormat: 'html5-complete',
    theme: 'github-dark',
    fontFamily: 'system',
    fontSize: 'medium',
    includeTOC: false,
    tocPosition: 'left-sidebar',
    sanitizeHTML: true,
    includeCSS: true,
    minifyOutput: false,
    highlightCode: true,
  })

  // DocMesh state
  const [appMode, setAppMode] = useState<'markdown' | 'docmesh'>('markdown')
  const [htmlFiles, setHtmlFiles] = useState<Map<string, HtmlFile>>(new Map())
  const [currentMesh, setCurrentMesh] = useState<DocMesh | null>(null)
  const [savedMeshes, setSavedMeshes] = useState<DocMesh[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [meshPreviewMode, setMeshPreviewMode] = useState<'node' | 'index'>('node')

  // HtmlFileManager instance (shared across the app)
  const [htmlFileManager] = useState(() => new HtmlFileManager())

  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([])

  // Toast management functions
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showSuccess = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  const showError = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, duration: 7000 });
  }, [addToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message, duration: 6000 });
  }, [addToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  // State update functions for files
  const addFiles = (newFiles: MarkdownFile[]) => {
    setFiles(prevFiles => [...prevFiles, ...newFiles])
  }

  const updateFileContent = (fileId: string, content: string) => {
    setFiles(prevFiles =>
      prevFiles.map(file =>
        file.id === fileId ? { ...file, content } : file
      )
    )
  }

  const deleteFile = (fileId: string) => {
    setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId))
    if (activeFileId === fileId) {
      setActiveFileId(null)
    }
  }

  const clearAllFiles = () => {
    setFiles([])
    setActiveFileId(null)
  }

  // State update functions for export settings
  const updateExportSettings = (updates: Partial<ExportSettings>) => {
    setExportSettings(prevSettings => ({
      ...prevSettings,
      ...updates,
    }))
  }

  // State update function for UI mode
  const toggleUIMode = () => {
    setUIMode(prevMode => prevMode === 'light' ? 'dark' : 'light')
  }

  // State update functions for DocMesh
  const switchAppMode = (mode: 'markdown' | 'docmesh') => {
    setAppMode(mode)
  }

  const updateSelectedNodeId = (nodeId: string | null) => {
    setSelectedNodeId(nodeId)
  }

  const updateMeshPreviewMode = (mode: 'node' | 'index') => {
    setMeshPreviewMode(mode)
  }

  // Mesh management handlers with error handling
  const handleNewMesh = useCallback((silent = false) => {
    try {
      const newMesh: DocMesh = {
        id: `mesh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `Mesh ${new Date().toLocaleDateString()}`,
        rootNodeId: null,
        nodes: new Map(),
        createdDate: new Date(),
        modifiedDate: new Date()
      };
      setCurrentMesh(newMesh);
      setSelectedNodeId(null);
      if (!silent) {
        showSuccess('New Mesh Created', 'You can now start adding documents to your mesh.');
      }
    } catch (error) {
      showError('Failed to Create Mesh', error instanceof Error ? error.message : 'An unknown error occurred.');
      console.error('Error creating new mesh:', error);
    }
  }, [showSuccess, showError]);

  const handleSaveMesh = useCallback((mesh: DocMesh) => {
    try {
      // Validate mesh before saving
      const validation = MeshManager.validateTree(mesh);
      if (!validation.valid) {
        showWarning(
          'Mesh Validation Issues',
          `The mesh has ${validation.errors.length} issue(s). It will be saved but may not work correctly.`
        );
      }

      MeshManager.saveMesh(mesh);

      // Update saved meshes list
      const updatedSavedMeshes = MeshManager.listSavedMeshes();
      setSavedMeshes(updatedSavedMeshes);

      showSuccess('Mesh Saved', `"${mesh.name}" has been saved successfully.`);
    } catch (error) {
      if (error instanceof MeshValidationError) {
        showError('Validation Failed', `Cannot save mesh: ${error.errors.join(', ')}`);
      } else {
        showError('Failed to Save Mesh', error instanceof Error ? error.message : 'An unknown error occurred.');
      }
      console.error('Error saving mesh:', error);
    }
  }, [showSuccess, showWarning, showError]);

  const handleLoadMesh = useCallback((meshId: string) => {
    try {
      const loadedMesh = MeshManager.loadMesh(meshId);

      if (!loadedMesh) {
        showError('Mesh Not Found', 'The selected mesh could not be loaded.');
        return;
      }

      // Validate that all referenced HTML files exist
      const missingFiles: string[] = [];
      for (const node of loadedMesh.nodes.values()) {
        if (!htmlFiles.has(node.htmlFileId)) {
          missingFiles.push(node.htmlFileId);
        }
      }

      if (missingFiles.length > 0) {
        showWarning(
          'Missing HTML Files',
          `${missingFiles.length} HTML file(s) referenced by this mesh are no longer available. Some nodes may not display correctly.`
        );
      }

      setCurrentMesh(loadedMesh);
      setSelectedNodeId(null);
      showSuccess('Mesh Loaded', `"${loadedMesh.name}" has been loaded successfully.`);
    } catch (error) {
      if (error instanceof MeshValidationError) {
        showError('Invalid Mesh', `The mesh failed validation: ${error.errors.join(', ')}`);
      } else {
        showError('Failed to Load Mesh', error instanceof Error ? error.message : 'An unknown error occurred.');
      }
      console.error('Error loading mesh:', error);
    }
  }, [htmlFiles, showSuccess, showWarning, showError]);

  const handleExportMesh = useCallback(async (mesh: DocMesh) => {
    try {
      if (mesh.nodes.size === 0) {
        showWarning('Empty Mesh', 'The mesh has no nodes to export.');
        return;
      }

      // Validate mesh before export
      const validation = MeshManager.validateTree(mesh);
      if (!validation.valid) {
        showError(
          'Cannot Export Invalid Mesh',
          `The mesh has validation errors: ${validation.errors.join(', ')}`
        );
        return;
      }

      // Check that all referenced HTML files exist
      const missingFiles: string[] = [];
      for (const node of mesh.nodes.values()) {
        if (!htmlFiles.has(node.htmlFileId)) {
          missingFiles.push(node.htmlFileId);
        }
      }

      if (missingFiles.length > 0) {
        showError(
          'Missing HTML Files',
          `Cannot export: ${missingFiles.length} HTML file(s) referenced by this mesh are missing.`
        );
        return;
      }

      showInfo('Exporting Mesh', 'Generating ZIP archive...');

      // Import and use DocMeshExportEngine
      const { DocMeshExportEngine } = await import('./utils/docMeshExportEngine');
      const zipBlob = await DocMeshExportEngine.exportMeshToZip(mesh, htmlFiles, exportSettings);

      // Trigger download
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${mesh.name.replace(/[^a-zA-Z0-9._-]/g, '_')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess('Export Complete', `"${mesh.name}" has been downloaded as a ZIP archive.`);
    } catch (error) {
      showError('Export Failed', error instanceof Error ? error.message : 'An unknown error occurred.');
      console.error('Error exporting mesh:', error);
    }
  }, [htmlFiles, exportSettings, showSuccess, showInfo, showWarning, showError]);

  const handleDeleteMesh = useCallback((meshId: string) => {
    try {
      MeshManager.deleteMesh(meshId);

      // Update saved meshes list
      const updatedSavedMeshes = MeshManager.listSavedMeshes();
      setSavedMeshes(updatedSavedMeshes);

      // If the deleted mesh was currently loaded, we might want to clear it or create a new one
      // For now, we'll just show a success message. The current mesh in memory remains until user creates new or loads another.
      // However, if we want to reflect that it's no longer "saved", we might want to update the UI state if needed.
      // But since currentMesh is just state, it's fine. It just won't be in the saved list anymore.

      showSuccess('Mesh Deleted', 'The mesh has been removed from saved meshes.');
    } catch (error) {
      showError('Failed to Delete Mesh', error instanceof Error ? error.message : 'An unknown error occurred.');
      console.error('Error deleting mesh:', error);
    }
  }, [showSuccess, showError]);

  const handleDeleteAllMeshes = useCallback(() => {
    try {
      MeshManager.deleteAllMeshes();
      setSavedMeshes([]);
      showSuccess('All Meshes Deleted', 'All saved meshes have been removed.');
    } catch (error) {
      showError('Failed to Delete All Meshes', error instanceof Error ? error.message : 'An unknown error occurred.');
      console.error('Error deleting all meshes:', error);
    }
  }, [showSuccess, showError]);

  // Load saved meshes on mount
  useEffect(() => {
    try {
      const savedMeshesList = MeshManager.listSavedMeshes();
      setSavedMeshes(savedMeshesList);
    } catch (error) {
      console.error('Error loading saved meshes:', error);
      showWarning('Failed to Load Saved Meshes', 'Some saved meshes could not be loaded.');
    }
  }, [showWarning]);

  // Apply dark mode class to document element
  useEffect(() => {
    if (uiMode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [uiMode])

  // File upload handler
  const handleFileUpload = async (uploadedFiles: File[]) => {
    // Separate HTML and markdown files
    const htmlFiles = uploadedFiles.filter(f => f.name.toLowerCase().endsWith('.html') || f.name.toLowerCase().endsWith('.htm'));
    const markdownFiles = uploadedFiles.filter(f => !htmlFiles.includes(f));

    // Handle markdown files
    if (markdownFiles.length > 0) {
      const fileManager = new FileManager()
      const newFiles = await fileManager.uploadFiles(markdownFiles)
      addFiles(newFiles)
      // Set first uploaded file as active if no file is active
      if (!activeFileId && newFiles.length > 0) {
        setActiveFileId(newFiles[0].id)
      }
    }

    // Handle HTML files
    if (htmlFiles.length > 0) {
      try {
        for (const file of htmlFiles) {
          const content = await file.text();
          htmlFileManager.createFromUpload(file.name, content);
        }

        // Update state to reflect changes
        const updatedHtmlFiles = new Map<string, HtmlFile>()
        htmlFileManager.listHtmlFiles().forEach(file => {
          updatedHtmlFiles.set(file.id, file)
        })
        setHtmlFiles(updatedHtmlFiles)

        showSuccess(
          'HTML Files Uploaded',
          `${htmlFiles.length} HTML file${htmlFiles.length !== 1 ? 's' : ''} added and available for DocMesh.`
        );
      } catch (error) {
        showError('Upload Failed', error instanceof Error ? error.message : 'Failed to upload HTML files.');
        console.error('Error uploading HTML files:', error);
      }
    }
  }

  // Sync HtmlFileManager with markdown exports
  // This function should be called after exporting markdown to HTML
  const handleMarkdownExport = useCallback((markdownFile: MarkdownFile, htmlContent: string) => {
    try {
      // Check if this markdown file already has an HTML export
      const existingHtmlFile = htmlFileManager.findBySourceId(markdownFile.id)

      let affectedNodes: string[] = [];

      if (existingHtmlFile) {
        // Update existing HTML file
        htmlFileManager.updateFromMarkdownExport(existingHtmlFile.id, htmlContent)

        // Check if this HTML file is used in the current mesh
        if (currentMesh) {
          // Find all nodes that reference this HTML file
          for (const [nodeId, node] of currentMesh.nodes.entries()) {
            if (node.htmlFileId === existingHtmlFile.id) {
              affectedNodes.push(nodeId);
            }
          }

          // Notify user if mesh nodes were affected
          if (affectedNodes.length > 0) {
            showInfo(
              'Mesh Nodes Updated',
              `${affectedNodes.length} node${affectedNodes.length !== 1 ? 's' : ''} in the current mesh now reference the updated HTML content.`
            );
          }
        }
      } else {
        // Create new HTML file from markdown export
        htmlFileManager.createFromMarkdownExport(markdownFile, htmlContent)
        showSuccess('HTML Export Created', `"${markdownFile.name}" is now available for DocMesh.`);
      }

      // Update state to reflect changes
      const updatedHtmlFiles = new Map<string, HtmlFile>()
      htmlFileManager.listHtmlFiles().forEach(file => {
        updatedHtmlFiles.set(file.id, file)
      })
      setHtmlFiles(updatedHtmlFiles)
    } catch (error) {
      showError('Export Failed', error instanceof Error ? error.message : 'Failed to process HTML export.');
      console.error('Error handling markdown export:', error);
    }
  }, [htmlFileManager, currentMesh, exportSettings, showSuccess, showInfo, showError]);

  // DocMesh handlers with error handling
  const handleNodeAdd = useCallback((parentId: string | null, htmlFileId: string) => {
    if (!currentMesh) {
      showWarning('No Active Mesh', 'Please create or load a mesh first.');
      return;
    }

    try {
      // Verify HTML file exists
      const htmlFile = htmlFiles.get(htmlFileId);
      if (!htmlFile) {
        throw new HtmlFileNotFoundError(htmlFileId);
      }

      const updatedMesh = MeshManager.addNode(currentMesh, htmlFileId, parentId);
      setCurrentMesh(updatedMesh);
      showSuccess('Node Added', `Added "${htmlFile.name}" to the mesh.`);
    } catch (error) {
      if (error instanceof NodeNotFoundError) {
        showError('Parent Not Found', 'The parent node no longer exists in the mesh.');
      } else if (error instanceof HtmlFileNotFoundError) {
        showError('File Not Found', 'The selected HTML file could not be found.');
      } else {
        showError('Failed to Add Node', error instanceof Error ? error.message : 'An unknown error occurred.');
      }
      console.error('Error adding node:', error);
    }
  }, [currentMesh, htmlFiles, showSuccess, showError, showWarning]);

  const handleNodeMove = useCallback((nodeId: string, newParentId: string | null, newIndex: number) => {
    if (!currentMesh) return;

    try {
      const updatedMesh = MeshManager.moveNode(currentMesh, nodeId, newParentId, newIndex);
      setCurrentMesh(updatedMesh);
      showSuccess('Node Moved', 'The node has been moved successfully.');
    } catch (error) {
      if (error instanceof NodeNotFoundError) {
        showError('Node Not Found', 'The node or target parent could not be found.');
      } else if (error instanceof CyclicDependencyError) {
        showError('Invalid Move', 'Cannot move a node into its own descendant. This would create a cycle.');
      } else {
        showError('Failed to Move Node', error instanceof Error ? error.message : 'An unknown error occurred.');
      }
      console.error('Error moving node:', error);
    }
  }, [currentMesh, showSuccess, showError]);

  const handleNodeUpdate = useCallback((nodeId: string, updates: Partial<MeshNode>) => {
    if (!currentMesh) return;

    try {
      const updatedMesh = MeshManager.updateNodeMetadata(currentMesh, nodeId, updates);
      setCurrentMesh(updatedMesh);
      // Don't show toast for metadata updates as they happen frequently during typing
    } catch (error) {
      if (error instanceof NodeNotFoundError) {
        showError('Node Not Found', 'The node could not be found in the mesh.');
      } else {
        showError('Failed to Update Node', error instanceof Error ? error.message : 'An unknown error occurred.');
      }
      console.error('Error updating node:', error);
    }
  }, [currentMesh, showError]);

  const handleMeshNameUpdate = useCallback((name: string) => {
    if (!currentMesh) return;

    setCurrentMesh({
      ...currentMesh,
      name,
      modifiedDate: new Date()
    });
  }, [currentMesh]);

  const handleNodeDelete = useCallback((nodeId: string) => {
    if (!currentMesh) return;

    try {
      const node = currentMesh.nodes.get(nodeId);
      if (!node) {
        throw new NodeNotFoundError(nodeId);
      }

      const hasChildren = node.children.length > 0;
      const descendantCount = hasChildren ? MeshManager.getDescendants(currentMesh, nodeId).length : 0;

      // Always cascade delete (delete children too)
      const updatedMesh = MeshManager.deleteNode(currentMesh, nodeId, true);
      setCurrentMesh(updatedMesh);

      // Clear selection if deleted node was selected
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }

      if (hasChildren) {
        showSuccess(
          'Node Deleted',
          `Deleted node and ${descendantCount} descendant${descendantCount !== 1 ? 's' : ''}.`
        );
      } else {
        showSuccess('Node Deleted', 'The node has been removed from the mesh.');
      }
    } catch (error) {
      if (error instanceof NodeNotFoundError) {
        showError('Node Not Found', 'The node could not be found in the mesh.');
      } else {
        showError('Failed to Delete Node', error instanceof Error ? error.message : 'An unknown error occurred.');
      }
      console.error('Error deleting node:', error);
    }
  }, [currentMesh, selectedNodeId, showSuccess, showError]);

  return (
    <div className="app min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 flex flex-col">
      <Header
        uiMode={uiMode}
        activeFileId={activeFileId}
        files={files}
        exportSettings={exportSettings}
        onToggleUIMode={toggleUIMode}
        onMarkdownExport={handleMarkdownExport}
      />
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        <LeftSidebar
          files={files}
          activeFileId={activeFileId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onFileSelect={setActiveFileId}
          onFileDelete={deleteFile}
          onUpload={handleFileUpload}
          onClearAll={clearAllFiles}
          appMode={appMode}
          onAppModeChange={switchAppMode}
          currentMesh={currentMesh}
          availableHtmlFiles={Array.from(htmlFiles.values())}
          onAutoCreateMesh={handleNewMesh}
        />
        <MainContent
          files={files}
          activeFileId={activeFileId}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onUpload={handleFileUpload}
          appMode={appMode}
        >
          {appMode === 'markdown' && viewMode === 'editor' && (
            <Editor
              activeFile={files.find(f => f.id === activeFileId)}
              onContentChange={updateFileContent}
            />
          )}
          {appMode === 'markdown' && viewMode === 'preview' && (
            <Preview
              activeFile={files.find(f => f.id === activeFileId)}
              exportSettings={exportSettings}
            />
          )}
          {appMode === 'docmesh' && (
            <DocMeshCanvas
              mesh={currentMesh}
              selectedNodeId={selectedNodeId}
              htmlFiles={htmlFiles}
              previewMode={meshPreviewMode}
              exportSettings={exportSettings}
              onNodeSelect={updateSelectedNodeId}
              onNodeAdd={handleNodeAdd}
              onNodeMove={handleNodeMove}
              onNodeDelete={handleNodeDelete}
              onPreviewModeChange={updateMeshPreviewMode}
            />
          )}
        </MainContent>
        <RightSidebar
          exportSettings={exportSettings}
          onSettingsChange={updateExportSettings}
          appMode={appMode}
          selectedNodeId={selectedNodeId}
          currentMesh={currentMesh}
          htmlFiles={htmlFiles}
          meshPreviewMode={meshPreviewMode}
          savedMeshes={savedMeshes}
          onNodeMetadataUpdate={handleNodeUpdate}
          onMeshPreviewModeChange={updateMeshPreviewMode}
          onNewMesh={handleNewMesh}
          onSaveMesh={handleSaveMesh}
          onLoadMesh={handleLoadMesh}
          onExportMesh={handleExportMesh}
          onDeleteMesh={handleDeleteMesh}
          onDeleteAllMeshes={handleDeleteAllMeshes}
          onMeshNameUpdate={handleMeshNameUpdate}
        />
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}

export default App
