import { useState, useMemo, type DragEvent } from 'react';
import {
  FileText,
  ChevronRight,
  GripVertical,
  Plus,
  Folder,
  FolderOpen,
  Trash2,
  AlertTriangle,
  Layers,
  Eye,
  LayoutGrid,
} from 'lucide-react';
import type { DocMesh, MeshNode, HtmlFile, ExportSettings } from '../types';
import { DocMeshExportEngine } from '../utils/docMeshExportEngine';

interface DocMeshCanvasProps {
  mesh: DocMesh | null;
  selectedNodeId: string | null;
  htmlFiles: Map<string, HtmlFile>;
  previewMode: 'node' | 'index';
  exportSettings: ExportSettings;
  onNodeSelect: (nodeId: string) => void;
  onNodeAdd: (parentId: string | null, htmlFileId: string) => void;
  onNodeMove: (nodeId: string, newParentId: string | null, newIndex: number) => void;
  onNodeDelete: (nodeId: string) => void;
  onPreviewModeChange: (mode: 'node' | 'index') => void;
}

type DropPosition = 'before' | 'after' | 'inside' | null;
type ViewTab = 'tree' | 'preview';

interface TreeNodeProps {
  node: MeshNode;
  mesh: DocMesh;
  htmlFiles: Map<string, HtmlFile>;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
  onNodeDelete: (nodeId: string) => void;
  onDragStart: (nodeId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: DragEvent, nodeId: string, position: DropPosition) => void;
  onDrop: (e: DragEvent, targetNodeId: string, position: DropPosition) => void;
  draggedNodeId: string | null;
  dragOverNodeId: string | null;
  dropPosition: DropPosition;
  level: number;
  isLast: boolean;
  parentHasMore: boolean[];
}

function TreeNode({
  node,
  mesh,
  htmlFiles,
  selectedNodeId,
  onNodeSelect,
  onNodeDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  draggedNodeId,
  dragOverNodeId,
  dropPosition,
  level,
  isLast,
  parentHasMore,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedNodeId === node.id;
  const isDragging = draggedNodeId === node.id;
  const isDragOver = dragOverNodeId === node.id;

  const htmlFile = htmlFiles.get(node.htmlFileId);
  const rawTitle = node.title || htmlFile?.name || 'Untitled';
  // Remove .html extension for cleaner display
  const displayTitle = rawTitle.replace(/\.html$/i, '');

  const getDropPosition = (e: DragEvent): DropPosition => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    // Adjusted zones: Top 30% -> before, Bottom 30% -> after, Middle 40% -> inside
    // This makes reordering easier and nesting intentional
    if (y < height * 0.3) return 'before';
    if (y > height * 0.7) return 'after';
    return 'inside';
  };

  return (
    <div className={`relative ${isDragging ? 'opacity-40' : ''}`}>
      {/* Tree connection lines */}
      <div
        className="absolute left-0 top-0 bottom-0 pointer-events-none"
        style={{ width: `${level * 28}px` }}
      >
        {parentHasMore.map(
          (hasMore, idx) =>
            hasMore &&
            idx < level && (
              <div
                key={idx}
                className="absolute top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700"
                style={{ left: `${idx * 28 + 16}px` }}
              />
            )
        )}
        {level > 0 && (
          <>
            <div
              className="absolute w-px bg-slate-200 dark:bg-slate-700"
              style={{
                left: `${(level - 1) * 28 + 16}px`,
                top: 0,
                height: isLast ? '24px' : '100%',
              }}
            />
            <div
              className="absolute h-px bg-slate-200 dark:bg-slate-700"
              style={{
                left: `${(level - 1) * 28 + 16}px`,
                top: '24px',
                width: '12px',
              }}
            />
          </>
        )}
      </div>

      {/* Drop indicator - before */}
      {isDragOver && dropPosition === 'before' && (
        <div
          className="absolute left-0 right-0 h-0.5 bg-indigo-500 rounded-full z-10 animate-zoom-in"
          style={{ top: '-2px', marginLeft: `${level * 28}px` }}
        >
          <div className="absolute -left-1.5 -top-1.5 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center shadow-sm">
            <Plus className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
      )}

      {/* Node Wrapper for Hit Area - eliminates dead zones between nodes */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const pos = getDropPosition(e);
          onDragOver(e, node.id, pos);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const pos = getDropPosition(e);
          onDrop(e, node.id, pos);
        }}
        className="py-1.5"
        style={{ marginLeft: `${level * 28}px` }}
      >
        {/* Node card */}
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.effectAllowed = 'move';
            onDragStart(node.id);
          }}
          onDragEnd={onDragEnd}
          onClick={() => onNodeSelect(node.id)}
          className={`
            group relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer
            transition-all duration-300 ease-out
            border-2
            ${isSelected
              ? 'bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/40 dark:to-violet-900/40 border-indigo-400 dark:border-indigo-500 shadow-lg shadow-indigo-500/20'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 shadow-sm hover:shadow-md'
            }
            ${isDragOver && dropPosition === 'inside'
              ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-[1.02] border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
              : ''
            }
          `}
        >
          {/* Drag Handle */}
          <div className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <GripVertical className="w-5 h-5 text-slate-400" />
          </div>

          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="flex-shrink-0 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200"
            >
              <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            </button>
          ) : (
            <div className="w-8" />
          )}

          {/* Node Icon */}
          <div
            className={`flex-shrink-0 p-2 rounded-xl transition-colors duration-300 ${hasChildren ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-blue-100 dark:bg-blue-900/40'
              }`}
          >
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <Folder className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              )
            ) : (
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            )}
          </div>

          {/* Node Title */}
          <div className="flex-1 min-w-0">
            <span
              className={`text-sm font-semibold truncate block transition-colors duration-300 ${isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-800 dark:text-slate-100'
                }`}
            >
              {displayTitle}
            </span>
            {node.description && (
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                {node.description}
              </span>
            )}
          </div>

          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNodeDelete(node.id);
            }}
            className="flex-shrink-0 p-2 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200"
            title="Delete node"
          >
            <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
          </button>
        </div>
      </div>

      {/* Drop indicator - after */}
      {isDragOver && dropPosition === 'after' && !hasChildren && (
        <div
          className="absolute left-0 right-0 h-0.5 bg-indigo-500 rounded-full z-10 animate-zoom-in"
          style={{ bottom: '-2px', marginLeft: `${level * 28}px` }}
        >
          <div className="absolute -left-1.5 -top-1.5 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center shadow-sm">
            <Plus className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
      )}

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {node.children.map((childId, index) => {
            const childNode = mesh.nodes.get(childId);
            if (!childNode) return null;

            const isLastChild = index === node.children.length - 1;

            return (
              <TreeNode
                key={childId}
                node={childNode}
                mesh={mesh}
                htmlFiles={htmlFiles}
                selectedNodeId={selectedNodeId}
                onNodeSelect={onNodeSelect}
                onNodeDelete={onNodeDelete}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDrop={onDrop}
                draggedNodeId={draggedNodeId}
                dragOverNodeId={dragOverNodeId}
                dropPosition={dropPosition}
                level={level + 1}
                isLast={isLastChild}
                parentHasMore={[...parentHasMore, !isLast]}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DocMeshCanvas({
  mesh,
  selectedNodeId,
  htmlFiles,
  previewMode,
  exportSettings,
  onNodeSelect,
  onNodeAdd,
  onNodeMove,
  onNodeDelete,
  onPreviewModeChange,
}: DocMeshCanvasProps) {
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);
  const [viewTab, setViewTab] = useState<ViewTab>('tree');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    nodeId: string;
    nodeName: string;
    hasChildren: boolean;
  } | null>(null);

  const handleDragStart = (nodeId: string) => {
    setDraggedNodeId(nodeId);
  };

  const handleDragEnd = () => {
    setDraggedNodeId(null);
    setDragOverNodeId(null);
    setDropPosition(null);
  };

  const handleDragOver = (e: DragEvent, nodeId: string, position: DropPosition) => {
    // Allow drop for both node drags and file drags from sidebar
    const isFileDrag = e.dataTransfer.types.includes('text/html-file-id');

    if (!isFileDrag && draggedNodeId === nodeId) return;

    setDragOverNodeId(nodeId);
    setDropPosition(position);
  };

  const handleDrop = (e: DragEvent, targetNodeId: string, position: DropPosition) => {
    // Check if this is a file drop from the sidebar
    const htmlFileId = e.dataTransfer.getData('text/html-file-id');
    if (htmlFileId && mesh) {
      // Add file as child of target node (or sibling based on position)
      const targetNode = mesh.nodes.get(targetNodeId);
      if (!targetNode) return;

      if (position === 'inside') {
        // Add as child of target
        onNodeAdd(targetNodeId, htmlFileId);
      } else {
        // Add as sibling (at same level as target)
        onNodeAdd(targetNode.parentId, htmlFileId);
      }
      return;
    }

    // Handle node-to-node drops (reordering)
    if (!draggedNodeId || !mesh) return;

    if (draggedNodeId === targetNodeId) {
      handleDragEnd();
      return;
    }

    const targetNode = mesh.nodes.get(targetNodeId);
    if (!targetNode) {
      handleDragEnd();
      return;
    }

    if (position === 'inside') {
      onNodeMove(draggedNodeId, targetNodeId, targetNode.children.length);
    } else {
      const parentId = targetNode.parentId;
      const siblings = parentId
        ? mesh.nodes.get(parentId)?.children || []
        : Array.from(mesh.nodes.values())
          .filter((n) => n.parentId === null)
          .sort((a, b) => a.order - b.order)
          .map((n) => n.id);

      const targetIndex = siblings.indexOf(targetNodeId);
      const newIndex = position === 'before' ? targetIndex : targetIndex + 1;

      onNodeMove(draggedNodeId, parentId, newIndex);
    }

    handleDragEnd();
  };

  const handleDropOnCanvas = (e: DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);

    // Check if this is a file drop from the sidebar
    const htmlFileId = e.dataTransfer.getData('text/html-file-id');
    if (htmlFileId) {
      onNodeAdd(null, htmlFileId);
      return;
    }

    // Otherwise handle node reordering
    if (!draggedNodeId || !mesh) return;

    // Check if drop is at the top of the canvas
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const isTopDrop = y < 50; // 50px threshold to detect drops at the top

    const rootNodes = Array.from(mesh.nodes.values()).filter((n) => n.parentId === null);
    const newIndex = isTopDrop ? 0 : rootNodes.length;

    onNodeMove(draggedNodeId, null, newIndex);

    handleDragEnd();
  };

  const handleCanvasDragOver = (e: DragEvent) => {
    e.preventDefault();
    // Check if dragging a file from sidebar
    if (e.dataTransfer.types.includes('text/html-file-id')) {
      setIsDraggingFile(true);
      e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleCanvasDragLeave = (e: DragEvent) => {
    // Only reset if leaving the canvas entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingFile(false);
    }
  };

  const handleDeleteRequest = (nodeId: string) => {
    if (!mesh) return;

    const node = mesh.nodes.get(nodeId);
    if (!node) return;

    const htmlFile = htmlFiles.get(node.htmlFileId);
    const nodeName = node.title || htmlFile?.name || 'Untitled';
    const hasChildren = node.children.length > 0;

    setDeleteConfirmation({ nodeId, nodeName, hasChildren });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmation) return;
    onNodeDelete(deleteConfirmation.nodeId);
    setDeleteConfirmation(null);
  };

  const rootNodes = mesh
    ? Array.from(mesh.nodes.values())
      .filter((n) => n.parentId === null)
      .sort((a, b) => a.order - b.order)
    : [];

  const hasNodes = rootNodes.length > 0;

  // Get selected node content for preview
  const selectedNode = selectedNodeId && mesh ? mesh.nodes.get(selectedNodeId) : null;
  const selectedHtmlFile = selectedNode ? htmlFiles.get(selectedNode.htmlFileId) : null;

  // Script to intercept link clicks and prevent navigation outside iframe
  const linkInterceptScript = `
    <script>
      document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link) {
          const href = link.getAttribute('href');
          if (!href) return;

          // For anchor links (same page), scroll to the element
          if (href.startsWith('#')) {
            e.preventDefault();
            const hash = href.substring(1);
            if (hash) {
              const target = document.getElementById(hash);
              if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }
          }
          // For external links, open in new tab
          else if (href.startsWith('http://') || href.startsWith('https://')) {
            e.preventDefault();
            window.open(href, '_blank', 'noopener,noreferrer');
          }
        }
      }, true);
    </script>
  `;

  // Helper to wrap HTML content with link intercept script
  const wrapWithLinkIntercept = (html: string): string => {
    if (html.includes('</body>')) {
      return html.replace('</body>', linkInterceptScript + '</body>');
    } else if (html.includes('</html>')) {
      return html.replace('</html>', linkInterceptScript + '</html>');
    }
    return html + linkInterceptScript;
  };

  // Generate index document preview (memoized to avoid regenerating on every render)
  const indexDocumentPreview = useMemo(() => {
    if (!mesh || mesh.nodes.size === 0) return null;

    try {
      const indexHtml = DocMeshExportEngine.generateIndexDocument(mesh, htmlFiles, exportSettings);
      return wrapWithLinkIntercept(indexHtml);
    } catch (error) {
      console.error('Error generating index preview:', error);
      return null;
    }
  }, [mesh, htmlFiles, exportSettings]);

  // Wrap selected node content with link intercept and styles
  const wrappedNodeContent = useMemo(() => {
    if (!selectedHtmlFile?.content) return null;

    try {
      const styledHtml = DocMeshExportEngine.generateNodePreview(
        selectedHtmlFile.content,
        selectedNode?.title || selectedHtmlFile.name,
        exportSettings
      );
      return wrapWithLinkIntercept(styledHtml);
    } catch (error) {
      console.error('Error generating node preview:', error);
      return wrapWithLinkIntercept(selectedHtmlFile.content);
    }
  }, [selectedHtmlFile?.content, selectedNode?.title, selectedHtmlFile?.name, exportSettings]);

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900">
      {/* Tab Bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-xl p-1">
          <button
            onClick={() => setViewTab('tree')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${viewTab === 'tree'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Tree Editor
          </button>
          <button
            onClick={() => setViewTab('preview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${viewTab === 'preview'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
        </div>

        {viewTab === 'preview' && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
            <button
              onClick={() => onPreviewModeChange('node')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${previewMode === 'node'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
                }`}
            >
              Node
            </button>
            <button
              onClick={() => onPreviewModeChange('index')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${previewMode === 'index'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
                }`}
            >
              Index
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {viewTab === 'tree' ? (
          /* Tree Editor View */
          <div
            className={`h-full overflow-y-auto p-6 transition-colors duration-200 ${isDraggingFile ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
              }`}
            onDragOver={handleCanvasDragOver}
            onDragLeave={handleCanvasDragLeave}
            onDrop={handleDropOnCanvas}
          >
            <div className="max-w-3xl mx-auto">
              {!hasNodes ? (
                <div
                  className={`h-full min-h-[400px] flex flex-col items-center justify-center text-center px-4 py-16 border-2 border-dashed rounded-2xl transition-all duration-200 ${isDraggingFile
                    ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/80 dark:bg-indigo-900/20 scale-[1.01]'
                    : 'border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50'
                    }`}
                >
                  <div className={`w-24 h-24 mb-6 rounded-3xl flex items-center justify-center transition-all duration-200 ${isDraggingFile
                    ? 'bg-gradient-to-br from-indigo-200 to-violet-200 dark:from-indigo-800/60 dark:to-violet-800/60 scale-110'
                    : 'bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/40 dark:to-violet-900/40'
                    }`}>
                    <Layers className={`w-12 h-12 transition-colors duration-200 ${isDraggingFile ? 'text-indigo-600 dark:text-indigo-300' : 'text-indigo-500 dark:text-indigo-400'
                      }`} />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
                    {isDraggingFile ? 'Drop to Add Document' : 'Build Your Document Tree'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                    {isDraggingFile
                      ? 'Release to add this document to your mesh'
                      : 'Drag documents from the sidebar to build your documentation structure'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1 pb-8">
                  {rootNodes.map((node, index) => (
                    <TreeNode
                      key={node.id}
                      node={node}
                      mesh={mesh!}
                      htmlFiles={htmlFiles}
                      selectedNodeId={selectedNodeId}
                      onNodeSelect={onNodeSelect}
                      onNodeDelete={handleDeleteRequest}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      draggedNodeId={draggedNodeId}
                      dragOverNodeId={dragOverNodeId}
                      dropPosition={dropPosition}
                      level={0}
                      isLast={index === rootNodes.length - 1}
                      parentHasMore={[]}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Preview View */
          <div className="h-full bg-white dark:bg-slate-900 overflow-hidden">
            {previewMode === 'node' && !selectedNodeId ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-500 dark:text-slate-400">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No Document Selected</p>
                  <p className="text-sm mt-2">Select a document from the Tree Editor to preview</p>
                </div>
              </div>
            ) : previewMode === 'node' && wrappedNodeContent ? (
              <iframe
                className="w-full h-full border-0 bg-white"
                srcDoc={wrappedNodeContent}
                sandbox="allow-same-origin allow-scripts"
                title="Document Preview"
                style={{ colorScheme: 'light dark' }}
              />
            ) : previewMode === 'index' && indexDocumentPreview ? (
              <iframe
                className="w-full h-full border-0 bg-white"
                srcDoc={indexDocumentPreview}
                sandbox="allow-same-origin allow-scripts"
                title="Index Document Preview"
                style={{ colorScheme: 'light dark' }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-500 dark:text-slate-400">
                  <Layers className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">
                    {previewMode === 'index' ? 'No Documents in Mesh' : 'No Preview Available'}
                  </p>
                  <p className="text-sm mt-2">
                    {previewMode === 'index'
                      ? 'Add documents to your mesh to generate an index preview'
                      : 'Select a document from the Tree Editor to preview'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-scaleIn">
            <div className="flex items-start gap-4 mb-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">Delete Document</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Are you sure you want to delete "{deleteConfirmation.nodeName}"?
                </p>
                {deleteConfirmation.hasChildren && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                      ⚠️ This will also delete all nested documents
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm font-medium transition-colors shadow-lg shadow-red-500/25"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
