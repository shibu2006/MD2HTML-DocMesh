import { useMemo, useState, useEffect } from 'react';
import { FileText, Loader2, AlertCircle } from 'lucide-react';
import type { DocMesh, HtmlFile } from '../types';

interface DocMeshPreviewProps {
  mesh: DocMesh | null;
  selectedNodeId: string | null;
  htmlFiles: Map<string, HtmlFile>;
  previewMode: 'node' | 'index';
}

export function DocMeshPreview({
  mesh,
  selectedNodeId,
  htmlFiles,
  previewMode
}: DocMeshPreviewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialMount, setIsInitialMount] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Show loading state only when content actually changes (not on initial mount)
  useEffect(() => {
    if (isInitialMount) {
      setIsInitialMount(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, [selectedNodeId, previewMode]);

  // Get the HTML content for the selected node
  const nodeContent = useMemo(() => {
    if (!mesh || !selectedNodeId || previewMode !== 'node') {
      return null;
    }

    try {
      const node = mesh.nodes.get(selectedNodeId);
      if (!node) {
        setError('Selected node not found in mesh');
        return null;
      }

      const htmlFile = htmlFiles.get(node.htmlFileId);
      if (!htmlFile) {
        setError(`HTML file not found: ${node.htmlFileId}`);
        return null;
      }

      return htmlFile.content;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
      return null;
    }
  }, [mesh, selectedNodeId, htmlFiles, previewMode]);

  // Generate index document preview (placeholder for now)
  const indexContent = useMemo(() => {
    if (!mesh || previewMode !== 'index') {
      return null;
    }

    // TODO: This will be implemented when DocMeshExportEngine is created
    // For now, show a placeholder
    return '<div class="p-8"><h1>Index Preview</h1><p>Index document generation will be implemented in a future task.</p></div>';
  }, [mesh, previewMode]);

  // Determine what to display
  const displayContent = previewMode === 'node' ? nodeContent : indexContent;

  // Empty state when no mesh exists
  if (!mesh) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No Mesh Selected</p>
          <p className="text-sm mt-2">Create or load a document mesh to preview</p>
        </div>
      </div>
    );
  }

  // Empty state when in node mode but no node is selected
  if (previewMode === 'node' && !selectedNodeId) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No Document Selected</p>
          <p className="text-sm mt-2">Select a document from the tree to preview</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50 text-red-500" />
          <p className="text-lg font-medium">Error Loading Content</p>
          <p className="text-sm mt-2 max-w-md">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state when content is not available
  if (!displayContent) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Content Not Available</p>
          <p className="text-sm mt-2">The selected document content could not be loaded</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <Loader2 className="w-12 h-12 mx-auto mb-4 opacity-50 animate-spin" />
          <p className="text-sm">Loading preview...</p>
        </div>
      </div>
    );
  }

  // Wrap content with script to handle link clicks
  const wrappedContent = useMemo(() => {
    if (!displayContent) return null;
    
    // Inject a script that intercepts all link clicks
    const linkHandlerScript = `
      <script>
        document.addEventListener('click', function(e) {
          const link = e.target.closest('a');
          if (link && link.href) {
            e.preventDefault();
            // For external links, open in new tab
            if (link.href.startsWith('http://') || link.href.startsWith('https://')) {
              window.open(link.href, '_blank', 'noopener,noreferrer');
            }
            // For anchor links (same page), scroll to the element
            else if (link.href.includes('#')) {
              const hash = link.href.split('#')[1];
              if (hash) {
                const target = document.getElementById(hash);
                if (target) {
                  target.scrollIntoView({ behavior: 'smooth' });
                }
              }
            }
            // Ignore other links (relative paths, etc.)
          }
        }, true);
      </script>
    `;
    
    // Insert the script before closing body tag, or append if no body tag
    if (displayContent.includes('</body>')) {
      return displayContent.replace('</body>', linkHandlerScript + '</body>');
    } else if (displayContent.includes('</html>')) {
      return displayContent.replace('</html>', linkHandlerScript + '</html>');
    } else {
      return displayContent + linkHandlerScript;
    }
  }, [displayContent]);

  // Render the HTML content
  return (
    <div className="h-full overflow-hidden">
      <iframe
        className="w-full h-full border-0"
        srcDoc={wrappedContent || ''}
        sandbox="allow-same-origin allow-scripts"
        title="Document Preview"
        style={{ backgroundColor: '#ffffff' }}
      />
    </div>
  );
}
