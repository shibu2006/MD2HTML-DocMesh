import { useState, useEffect } from 'react'
import type { MarkdownFile, ExportSettings } from './types'
import { Header, LeftSidebar, MainContent, Editor, Preview, RightSidebar } from './components'
import { FileManager } from './utils/fileManager'
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
    const fileManager = new FileManager()
    const newFiles = await fileManager.uploadFiles(uploadedFiles)
    addFiles(newFiles)
    // Set first uploaded file as active if no file is active
    if (!activeFileId && newFiles.length > 0) {
      setActiveFileId(newFiles[0].id)
    }
  }

  return (
    <div className="app min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 flex flex-col">
      <Header
        uiMode={uiMode}
        activeFileId={activeFileId}
        files={files}
        exportSettings={exportSettings}
        onToggleUIMode={toggleUIMode}
      />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          files={files}
          activeFileId={activeFileId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onFileSelect={setActiveFileId}
          onFileDelete={deleteFile}
          onUpload={handleFileUpload}
          onClearAll={clearAllFiles}
        />
        <MainContent
          files={files}
          activeFileId={activeFileId}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onUpload={handleFileUpload}
        >
          {viewMode === 'editor' && (
            <Editor
              activeFile={files.find(f => f.id === activeFileId)}
              onContentChange={updateFileContent}
            />
          )}
          {viewMode === 'preview' && (
            <Preview
              activeFile={files.find(f => f.id === activeFileId)}
              exportSettings={exportSettings}
            />
          )}
        </MainContent>
        <RightSidebar
          exportSettings={exportSettings}
          onSettingsChange={updateExportSettings}
        />
      </div>
    </div>
  )
}

export default App
