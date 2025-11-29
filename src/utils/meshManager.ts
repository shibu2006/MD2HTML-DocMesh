import type { DocMesh, MeshNode } from '../types';
import { NodeNotFoundError, CyclicDependencyError, MeshValidationError } from '../types';

/**
 * MeshManager handles all mesh operations including tree manipulation,
 * validation, and persistence.
 */
export class MeshManager {
  /**
   * Add a new node to the mesh
   */
  static addNode(
    mesh: DocMesh,
    htmlFileId: string,
    parentId: string | null,
    title?: string,
    description?: string
  ): DocMesh {
    // Generate unique ID for the new node
    const nodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Determine order (position among siblings)
    let order = 0;
    if (parentId === null) {
      // Root level - count existing root nodes
      const rootNodes = Array.from(mesh.nodes.values()).filter(n => n.parentId === null);
      order = rootNodes.length;
    } else {
      // Child node - get parent's children count
      const parent = mesh.nodes.get(parentId);
      if (!parent) {
        throw new NodeNotFoundError(parentId);
      }
      order = parent.children.length;
    }

    // Create new node
    const newNode: MeshNode = {
      id: nodeId,
      htmlFileId,
      title: title || '',
      description: description || '',
      parentId,
      children: [],
      order
    };

    // Create updated nodes map
    const updatedNodes = new Map(mesh.nodes);
    updatedNodes.set(nodeId, newNode);

    // Update parent's children array if not root
    if (parentId !== null) {
      const parent = updatedNodes.get(parentId);
      if (parent) {
        updatedNodes.set(parentId, {
          ...parent,
          children: [...parent.children, nodeId]
        });
      }
    }

    // Update rootNodeId if this is the first node
    const newRootNodeId = mesh.rootNodeId || (parentId === null ? nodeId : mesh.rootNodeId);

    return {
      ...mesh,
      nodes: updatedNodes,
      rootNodeId: newRootNodeId,
      modifiedDate: new Date()
    };
  }

  /**
   * Move a node to a new parent and position
   */
  static moveNode(
    mesh: DocMesh,
    nodeId: string,
    newParentId: string | null,
    newIndex: number
  ): DocMesh {
    const node = mesh.nodes.get(nodeId);
    if (!node) {
      throw new NodeNotFoundError(nodeId);
    }

    // Check if moving to itself or its own descendant (would create cycle)
    if (newParentId !== null) {
      const descendants = this.getDescendants(mesh, nodeId);
      if (descendants.some(d => d.id === newParentId)) {
        throw new CyclicDependencyError([nodeId, newParentId]);
      }
    }

    const updatedNodes = new Map(mesh.nodes);

    // Remove from old parent's children
    if (node.parentId !== null) {
      const oldParent = updatedNodes.get(node.parentId);
      if (oldParent) {
        updatedNodes.set(node.parentId, {
          ...oldParent,
          children: oldParent.children.filter(id => id !== nodeId)
        });
      }
    }

    // Update node with new parent
    updatedNodes.set(nodeId, {
      ...node,
      parentId: newParentId
      // order will be set during normalization
    });

    // Get siblings at destination (excluding the moved node itself)
    let siblings: string[] = [];
    if (newParentId !== null) {
      const newParent = updatedNodes.get(newParentId);
      if (!newParent) {
        throw new NodeNotFoundError(newParentId);
      }
      siblings = [...newParent.children]; // Already excludes nodeId if we moved within same parent because we filtered oldParent above
      // Wait, if newParentId === node.parentId, we filtered it out from oldParent (which is newParent).
      // So siblings here does NOT contain nodeId. Correct.
    } else {
      // Root nodes
      siblings = Array.from(updatedNodes.values())
        .filter(n => n.parentId === null && n.id !== nodeId)
        .sort((a, b) => a.order - b.order)
        .map(n => n.id);
    }

    // Insert at new index
    if (newIndex < 0) newIndex = 0;
    if (newIndex > siblings.length) newIndex = siblings.length;

    siblings.splice(newIndex, 0, nodeId);

    // Update new parent's children array
    if (newParentId !== null) {
      const newParent = updatedNodes.get(newParentId)!;
      updatedNodes.set(newParentId, {
        ...newParent,
        children: siblings
      });
    }

    // Normalize order for ALL siblings
    siblings.forEach((siblingId, index) => {
      const sibling = updatedNodes.get(siblingId);
      if (sibling) {
        updatedNodes.set(siblingId, { ...sibling, order: index });
      }
    });

    return {
      ...mesh,
      nodes: updatedNodes,
      modifiedDate: new Date()
    };
  }

  /**
   * Delete a node from the mesh
   */
  static deleteNode(mesh: DocMesh, nodeId: string, cascade: boolean): DocMesh {
    const node = mesh.nodes.get(nodeId);
    if (!node) {
      throw new NodeNotFoundError(nodeId);
    }

    const updatedNodes = new Map(mesh.nodes);

    // If cascade, delete all descendants
    if (cascade && node.children.length > 0) {
      const descendants = this.getDescendants(mesh, nodeId);
      descendants.forEach(descendant => {
        updatedNodes.delete(descendant.id);
      });
    }

    // Remove from parent's children array
    if (node.parentId !== null) {
      const parent = updatedNodes.get(node.parentId);
      if (parent) {
        const newChildren = parent.children.filter(id => id !== nodeId);
        updatedNodes.set(node.parentId, {
          ...parent,
          children: newChildren
        });

        // Normalize orders for remaining siblings
        newChildren.forEach((childId, index) => {
          const child = updatedNodes.get(childId);
          if (child) {
            updatedNodes.set(childId, { ...child, order: index });
          }
        });
      }
    } else {
      // If root node, normalize orders of remaining root nodes
      const remainingRoots = Array.from(updatedNodes.values())
        .filter(n => n.parentId === null && n.id !== nodeId)
        .sort((a, b) => a.order - b.order);

      remainingRoots.forEach((root, index) => {
        updatedNodes.set(root.id, { ...root, order: index });
      });
    }

    // Delete the node itself
    updatedNodes.delete(nodeId);

    // Update rootNodeId if we deleted the root
    let newRootNodeId = mesh.rootNodeId;
    if (mesh.rootNodeId === nodeId) {
      // Find a new root (first remaining root-level node)
      const rootNodes = Array.from(updatedNodes.values())
        .filter(n => n.parentId === null)
        .sort((a, b) => a.order - b.order);
      newRootNodeId = rootNodes.length > 0 ? rootNodes[0].id : null;
    }

    return {
      ...mesh,
      nodes: updatedNodes,
      rootNodeId: newRootNodeId,
      modifiedDate: new Date()
    };
  }

  /**
   * Update node metadata (title, description)
   */
  static updateNodeMetadata(
    mesh: DocMesh,
    nodeId: string,
    updates: Partial<Pick<MeshNode, 'title' | 'description'>>
  ): DocMesh {
    const node = mesh.nodes.get(nodeId);
    if (!node) {
      throw new NodeNotFoundError(nodeId);
    }

    const updatedNodes = new Map(mesh.nodes);
    updatedNodes.set(nodeId, {
      ...node,
      ...updates
    });

    return {
      ...mesh,
      nodes: updatedNodes,
      modifiedDate: new Date()
    };
  }

  /**
   * Validate tree structure
   */
  static validateTree(mesh: DocMesh): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for cycles
    if (this.detectCycles(mesh)) {
      errors.push('Tree contains cycles');
    }

    // Check for orphaned nodes
    const orphaned = this.findOrphanedNodes(mesh);
    if (orphaned.length > 0) {
      errors.push(`Found ${orphaned.length} orphaned nodes: ${orphaned.join(', ')}`);
    }

    // Check that all parent references are valid
    for (const node of mesh.nodes.values()) {
      if (node.parentId !== null && !mesh.nodes.has(node.parentId)) {
        errors.push(`Node ${node.id} references non-existent parent ${node.parentId}`);
      }
    }

    // Check that all children references are valid
    for (const node of mesh.nodes.values()) {
      for (const childId of node.children) {
        if (!mesh.nodes.has(childId)) {
          errors.push(`Node ${node.id} references non-existent child ${childId}`);
        }
      }
    }

    // Check bidirectional consistency (if A is parent of B, B should be in A's children)
    for (const node of mesh.nodes.values()) {
      if (node.parentId !== null) {
        const parent = mesh.nodes.get(node.parentId);
        if (parent && !parent.children.includes(node.id)) {
          errors.push(`Node ${node.id} has parent ${node.parentId}, but parent doesn't list it as child`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Detect cycles in the tree
   */
  static detectCycles(mesh: DocMesh): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = mesh.nodes.get(nodeId);
      if (!node) return false;

      for (const childId of node.children) {
        if (!visited.has(childId)) {
          if (hasCycle(childId)) {
            return true;
          }
        } else if (recursionStack.has(childId)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    // Check all nodes (in case of disconnected components)
    for (const nodeId of mesh.nodes.keys()) {
      if (!visited.has(nodeId)) {
        if (hasCycle(nodeId)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Find orphaned nodes (nodes not reachable from any root)
   */
  static findOrphanedNodes(mesh: DocMesh): string[] {
    if (mesh.nodes.size === 0) {
      return [];
    }

    // Find all root nodes (nodes with parentId === null)
    const rootNodes = Array.from(mesh.nodes.values()).filter(n => n.parentId === null);

    if (rootNodes.length === 0 && mesh.nodes.size > 0) {
      // All nodes are orphaned if there are no roots
      return Array.from(mesh.nodes.keys());
    }

    // Traverse from each root to find all reachable nodes
    const reachable = new Set<string>();

    const traverse = (nodeId: string) => {
      if (reachable.has(nodeId)) return;
      reachable.add(nodeId);

      const node = mesh.nodes.get(nodeId);
      if (node) {
        node.children.forEach(childId => traverse(childId));
      }
    };

    rootNodes.forEach(root => traverse(root.id));

    // Find nodes that are not reachable
    const orphaned: string[] = [];
    for (const nodeId of mesh.nodes.keys()) {
      if (!reachable.has(nodeId)) {
        orphaned.push(nodeId);
      }
    }

    return orphaned;
  }

  /**
   * Get the path from root to a specific node
   */
  static getNodePath(mesh: DocMesh, nodeId: string): MeshNode[] {
    const node = mesh.nodes.get(nodeId);
    if (!node) {
      throw new NodeNotFoundError(nodeId);
    }

    const path: MeshNode[] = [node];
    let currentNode = node;

    while (currentNode.parentId !== null) {
      const parent = mesh.nodes.get(currentNode.parentId);
      if (!parent) {
        throw new NodeNotFoundError(currentNode.parentId);
      }
      path.unshift(parent);
      currentNode = parent;
    }

    return path;
  }

  /**
   * Get all descendants of a node
   */
  static getDescendants(mesh: DocMesh, nodeId: string): MeshNode[] {
    const node = mesh.nodes.get(nodeId);
    if (!node) {
      throw new NodeNotFoundError(nodeId);
    }

    const descendants: MeshNode[] = [];

    const traverse = (currentNodeId: string) => {
      const currentNode = mesh.nodes.get(currentNodeId);
      if (!currentNode) return;

      for (const childId of currentNode.children) {
        const child = mesh.nodes.get(childId);
        if (child) {
          descendants.push(child);
          traverse(childId);
        }
      }
    };

    traverse(nodeId);
    return descendants;
  }

  /**
   * Flatten the tree into a list of nodes in depth-first order
   */
  static flattenTree(mesh: DocMesh): MeshNode[] {
    const flattened: MeshNode[] = [];

    const traverse = (nodeId: string) => {
      const node = mesh.nodes.get(nodeId);
      if (!node) return;

      flattened.push(node);
      node.children.forEach(childId => traverse(childId));
    };

    // Start from all root nodes
    const rootNodes = Array.from(mesh.nodes.values())
      .filter(n => n.parentId === null)
      .sort((a, b) => a.order - b.order);

    rootNodes.forEach(root => traverse(root.id));

    return flattened;
  }

  /**
   * Serialize mesh to JSON string
   */
  static serializeMesh(mesh: DocMesh): string {
    const serializable = {
      ...mesh,
      nodes: Array.from(mesh.nodes.entries()),
      createdDate: mesh.createdDate.toISOString(),
      modifiedDate: mesh.modifiedDate.toISOString()
    };
    return JSON.stringify(serializable);
  }

  /**
   * Deserialize mesh from JSON string
   */
  static deserializeMesh(data: string): DocMesh {
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      nodes: new Map(parsed.nodes),
      createdDate: new Date(parsed.createdDate),
      modifiedDate: new Date(parsed.modifiedDate)
    };
  }

  /**
   * Save mesh to localStorage
   */
  static saveMesh(mesh: DocMesh): void {
    const serialized = this.serializeMesh(mesh);
    localStorage.setItem(`docmesh-${mesh.id}`, serialized);

    // Update the list of saved mesh IDs
    const savedIds = this.getSavedMeshIds();
    if (!savedIds.includes(mesh.id)) {
      savedIds.push(mesh.id);
      localStorage.setItem('docmesh-saved-ids', JSON.stringify(savedIds));
    }
  }

  /**
   * Load mesh from localStorage
   */
  static loadMesh(meshId: string): DocMesh | null {
    const data = localStorage.getItem(`docmesh-${meshId}`);
    if (!data) {
      return null;
    }

    try {
      const mesh = this.deserializeMesh(data);

      // Validate the loaded mesh
      const validation = this.validateTree(mesh);
      if (!validation.valid) {
        console.error('Loaded mesh failed validation:', validation.errors);
        throw new MeshValidationError('Loaded mesh is invalid', validation.errors);
      }

      return mesh;
    } catch (error) {
      console.error('Failed to load mesh:', error);
      return null;
    }
  }

  /**
   * List all saved meshes
   */
  static listSavedMeshes(): DocMesh[] {
    const savedIds = this.getSavedMeshIds();
    const meshes: DocMesh[] = [];

    for (const id of savedIds) {
      const mesh = this.loadMesh(id);
      if (mesh) {
        meshes.push(mesh);
      }
    }

    return meshes;
  }

  /**
   * Delete a saved mesh from localStorage
   */
  static deleteMesh(meshId: string): void {
    localStorage.removeItem(`docmesh-${meshId}`);

    // Update the list of saved mesh IDs
    const savedIds = this.getSavedMeshIds();
    const updatedIds = savedIds.filter(id => id !== meshId);
    localStorage.setItem('docmesh-saved-ids', JSON.stringify(updatedIds));
  }

  /**
   * Delete all saved meshes from localStorage
   */
  static deleteAllMeshes(): void {
    const savedIds = this.getSavedMeshIds();

    // Remove each mesh
    savedIds.forEach(id => {
      localStorage.removeItem(`docmesh-${id}`);
    });

    // Clear the list of saved IDs
    localStorage.removeItem('docmesh-saved-ids');
  }

  /**
   * Get list of saved mesh IDs from localStorage
   */
  private static getSavedMeshIds(): string[] {
    const data = localStorage.getItem('docmesh-saved-ids');
    if (!data) {
      return [];
    }

    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
}
