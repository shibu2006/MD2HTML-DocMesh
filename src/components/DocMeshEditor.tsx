import { useState, useEffect, type DragEvent } from 'react';
import { FileText, ChevronRight, GripVertical, Plus, Folder, FolderOpen, Trash2, AlertTriangle, FileUp, Layers } from 'lucide-react';
import type { DocMesh, MeshNode, HtmlFile } from '../types';

interface DocMeshEditorProps {
  mesh: DocMesh | null;
  availableHtmlFiles: HtmlFile[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
  onNodeAdd: (parentId: string | null, htmlFileId: string) => void;
  onNodeMove: (nodeId: string, newParentId: string | null, newIndex: number) => void;
  onNodeUpdate: (nodeId: string, updates: Partial<MeshNode>) => void;
  onNodeDelete: (nodeId: string) => void;
  onAutoCreateMesh?: () => void;
}

type DropPosition = 'before' | 'after' | 'inside' | null;

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
  parentHasMore
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedNodeId === node.id;
  const isDragging = draggedNodeId === node.id;
  const isDragOver = dragOverNodeId === node.id;
  
  const htmlFile = htmlFiles.get(node.htmlFileId);
  const displayTitle = node.title || htmlFile?.name || 'Untitled';

  const getDropPosition = (e: DragEvent): DropPosition => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    if (y < height * 0.25) return 'before';
    if (y > height * 0.75) return 'after';
    return 'inside';
  };

  return (
    <div className={`relative ${isDragging ? 'opacity-40' : ''}`}>
      {/* Tree connection lines */}
      <div className="absolute left-0 top-0 bottom-0 pointer-events-none" style={{ width: `${level * 24}px` }}>
        {parentHasMore.map((hasMore, idx) => (
          hasMore && idx < level && (
            <div
              key={idx}
              className="absolute top-0 bottom-0 w-px bg-slate-300 dark:bg-slate-600"
              style={{ left: `${idx * 24 + 12}px` }}
            />
          )
        ))}
        {level > 0 && (
          <>
            <div
              className="absolute w-px bg-slate-300 dark:bg-slate-600"
              style={{ 
                left: `${(level - 1) * 24 + 12}px`,
                top: 0,
                height: isLast ? '20px' : '100%'
              }}
            />
            <div
              className="absolute h-px bg-slate-300 dark:bg-slate-600"
              style={{ 
                left: `${(level - 1) * 24 + 12}px`,
                top: '20px',
                width: '12px'
              }}
            />
          </>
        )}
      </div>

      {/* Drop indicator - before */}
      {isDragOver && dropPosition === 'before' && (
        <div 
          className="absolute left-0 right-0 h-0.5 bg-indigo-500 rounded-full z-10 animate-pulse"
          style={{ top: '-1px', marginLeft: `${level * 24}px` }}
        >
          <div className="absolute -left-1 -top-1 w-2 h-2 bg-indigo-500 rounded-full" />
        </div>
      )}

      {/* Node card */}
      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.effectAllowed = 'move';
          onDragStart(node.id);
        }}
        onDragEnd={onDragEnd}
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
        onClick={() => onNodeSelect(node.id)}
        className={`
          group relative flex items-center gap-2 px-3 py-2.5 my-1 rounded-xl cursor-pointer
          transition-all duration-200 ease-out
          border-2 border-transparent
          ${isSelected
            ? 'bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/40 dark:to-violet-900/40 border-indigo-300 dark:border-indigo-600 shadow-lg shadow-indigo-500/10'
            : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-200 dark:hover:border-slate-600 shadow-sm hover:shadow-md'
          }
          ${isDragOver && dropPosition === 'inside' ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-[1.02]' : ''}
        `}
        style={{ marginLeft: `${level * 24}px` }}
      >
        {/* Drag Handle */}
        <div className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <GripVertical className="w-4 h-4 text-slate-400" />
        </div>
        
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex-shrink-0 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200"
          >
            <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
          </button>
        ) : (
          <div className="w-6" />
        )}
        
        {/* Node Icon */}
        <div className={`flex-shrink-0 p-1.5 rounded-lg ${
          hasChildren 
            ? 'bg-amber-100 dark:bg-amber-900/30' 
            : 'bg-blue-100 dark:bg-blue-900/30'
        }`}>
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            ) : (
              <Folder className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            )
          ) : (
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          )}
        </div>
        
        {/* Node Title */}
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium truncate block ${
            isSelected 
              ? 'text-indigo-900 dark:text-indigo-100' 
              : 'text-slate-700 dark:text-slate-200'
          }`}>
            {displayTitle}
          </span>
          {node.description && (
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
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
          className="flex-shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200"
          title="Delete node"
        >
          <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
        </button>
      </div>

      {/* Drop indicator - after */}
      {isDragOver && dropPosition === 'after' && !hasChildren && (
        <div 
          className="absolute left-0 right-0 h-0.5 bg-indigo-500 rounded-full z-10 animate-pulse"
          style={{ bottom: '-1px', marginLeft: `${level * 24}px` }}
        >
          <div className="absolute -left-1 -top-1 w-2 h-2 bg-indigo-500 rounded-full" />
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

export function DocMeshEditor({
  mesh,
  availableHtmlFiles,
  selectedNodeId,
  onNodeSelect,
  onNodeAdd,
  onNodeMove,
  onNodeDelete,
  onAutoCreateMesh
}: DocMeshEditorProps) {
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    nodeId: string;
    nodeName: string;
    hasChildren: boolean;
  } | null>(null);

  // Auto-create mesh when component mounts if no mesh exists
  useEffect(() => {
    if (!mesh && onAutoCreateMesh) {
      onAutoCreateMesh();
    }
  }, [mesh, onAutoCreateMesh]);

  const handleDragStart = (nodeId: string) => {
    setDraggedNodeId(nodeId);
  };

  const handleDragEnd = () => {
    setDraggedNodeId(null);
    setDragOverNodeId(null);
    setDropPosition(null);
  };

  const handleDragOver = (_e: DragEvent, nodeId: string, position: DropPosition) => {
    if (draggedNodeId === nodeId) return;
    setDragOverNodeId(nodeId);
    setDropPosition(position);
  };

  const handleDrop = (_e: DragEvent, targetNodeId: string, position: DropPosition) => {
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
      // Make dragged node a child of target
      onNodeMove(draggedNodeId, targetNodeId, targetNode.children.length);
    } else {
      // Place before or after target at same level
      const parentId = targetNode.parentId;
      const siblings = parentId 
        ? mesh.nodes.get(parentId)?.children || []
        : Array.from(mesh.nodes.values()).filter(n => n.parentId === null).map(n => n.id);
      
      const targetIndex = siblings.indexOf(targetNodeId);
      const newIndex = position === 'before' ? targetIndex : targetIndex + 1;
      
      onNodeMove(draggedNodeId, parentId, newIndex);
    }
    
    handleDragEnd();
  };

  const handleDropOnCanvas = (e: DragEvent) => {
    e.preventDefault();
    
    if (!draggedNodeId || !mesh) return;
    
    const rootNodes = Array.from(mesh.nodes.values()).filter(n => n.parentId === null);
    onNodeMove(draggedNodeId, null, rootNodes.length);
    
    handleDragEnd();
  };

  const handleAddFile = (htmlFileId: string) => {
    onNodeAdd(null, htmlFileId);
    setShowFileSelector(false);
  };

  const handleDeleteRequest = (nodeId: string) => {
    if (!mesh) return;
    
    const node = mesh.nodes.get(nodeId);
    if (!node) return;
    
    const htmlFile = htmlFilesMap.get(node.htmlFileId);
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
        .filter(n => n.parentId === null)
        .sort((a, b) => a.order - b.order)
    : [];

  const htmlFilesMap = new Map(availableHtmlFiles.map(f => [f.id, f]));
  const hasNodes = rootNodes.length > 0;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {mesh?.name || 'Document Tree'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {hasNodes ? `${mesh?.nodes.size || 0} documents` : 'No documents yet'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Add Document Button */}
        <button
          onClick={() => setShowFileSelector(!showFileSelector)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 transition-all duration-200 text-sm font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Document</span>
        </button>
      </div>

      {/* File Selector Dropdown */}
      {showFileSelector && (
        <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 animate-slideDown">
          {availableHtmlFiles.length === 0 ? (
            <div className="text-center py-6">
              <FileUp className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No HTML files available</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Export markdown files first</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {availableHtmlFiles.map(file => (
                <button
                  key={file.id}
                  onClick={() => handleAddFile(file.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left group"
                >
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate block">
                      {file.name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {file.sourceType === 'markdown' ? 'From Markdown' : 'Uploaded'}
                    </span>
                  </div>
                  <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowFileSelector(false)}
            className="w-full mt-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Tree Canvas */}
      <div
        className="flex-1 overflow-y-auto p-4"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={handleDropOnCanvas}
      >
        {!hasNodes ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-20 h-20 mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
              <Layers className="w-10 h-10 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-base font-medium text-slate-700 dark:text-slate-300 mb-1">
              Start Building Your Tree
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px]">
              Add documents and drag them to organize your documentation structure
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {rootNodes.map((node, index) => (
              <TreeNode
                key={node.id}
                node={node}
                mesh={mesh!}
                htmlFiles={htmlFilesMap}
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

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-scaleIn">
            <div className="flex items-start gap-4 mb-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Delete Document
                </h3>
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
