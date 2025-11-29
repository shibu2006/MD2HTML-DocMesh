import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { MeshManager } from './meshManager';
import type { DocMesh, MeshNode } from '../types';
import { NodeNotFoundError, CyclicDependencyError } from '../types';

// Generators for property-based testing

/**
 * Generate a valid node ID
 */
const nodeIdArb = fc.string({ minLength: 1, maxLength: 20 }).map(s => `node-${s}`);

/**
 * Generate a valid HTML file ID
 */
const htmlFileIdArb = fc.string({ minLength: 1, maxLength: 20 }).map(s => `file-${s}`);

/**
 * Generate a single mesh node
 */
const meshNodeArb = (id: string, parentId: string | null, htmlFileId: string): fc.Arbitrary<MeshNode> => {
  return fc.record({
    id: fc.constant(id),
    htmlFileId: fc.constant(htmlFileId),
    title: fc.string({ maxLength: 50 }),
    description: fc.string({ maxLength: 200 }),
    parentId: fc.constant(parentId),
    children: fc.constant<string[]>([]),
    order: fc.nat({ max: 100 })
  });
};

/**
 * Generate a valid tree structure
 * Creates a tree with a configurable number of nodes
 */
const validTreeArb = fc.nat({ min: 1, max: 20 }).chain(nodeCount => {
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }).map(s => `mesh-${s}`),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    rootNodeId: fc.constant<string | null>(null),
    nodes: fc.constant(new Map<string, MeshNode>()),
    createdDate: fc.date(),
    modifiedDate: fc.date()
  }).map(mesh => {
    // Build a valid tree structure
    const nodes = new Map<string, MeshNode>();
    const nodeIds: string[] = [];
    
    // Create nodes
    for (let i = 0; i < nodeCount; i++) {
      nodeIds.push(`node-${i}`);
    }
    
    // First node is always root
    if (nodeIds.length > 0) {
      nodes.set(nodeIds[0], {
        id: nodeIds[0],
        htmlFileId: `file-${nodeIds[0]}`,
        title: `Node ${nodeIds[0]}`,
        description: '',
        parentId: null,
        children: [],
        order: 0
      });
      
      mesh.rootNodeId = nodeIds[0];
    }
    
    // Add remaining nodes as children of random existing nodes
    for (let i = 1; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      // Pick a random parent from existing nodes
      const parentId = nodeIds[Math.floor(Math.random() * i)];
      const parent = nodes.get(parentId)!;
      
      nodes.set(nodeId, {
        id: nodeId,
        htmlFileId: `file-${nodeId}`,
        title: `Node ${nodeId}`,
        description: '',
        parentId: parentId,
        children: [],
        order: parent.children.length
      });
      
      // Update parent's children
      nodes.set(parentId, {
        ...parent,
        children: [...parent.children, nodeId]
      });
    }
    
    return {
      ...mesh,
      nodes
    };
  });
});

describe('MeshManager', () => {
  describe('addNode', () => {
    it('should add a node to an empty mesh', () => {
      const mesh: DocMesh = {
        id: 'mesh-1',
        name: 'Test Mesh',
        rootNodeId: null,
        nodes: new Map(),
        createdDate: new Date(),
        modifiedDate: new Date()
      };
      
      const result = MeshManager.addNode(mesh, 'file-1', null, 'Test Node', 'Description');
      
      expect(result.nodes.size).toBe(1);
      expect(result.rootNodeId).not.toBeNull();
      const node = result.nodes.get(result.rootNodeId!);
      expect(node?.htmlFileId).toBe('file-1');
      expect(node?.title).toBe('Test Node');
      expect(node?.parentId).toBeNull();
    });
    
    it('should add a child node', () => {
      const mesh: DocMesh = {
        id: 'mesh-1',
        name: 'Test Mesh',
        rootNodeId: 'node-1',
        nodes: new Map([
          ['node-1', {
            id: 'node-1',
            htmlFileId: 'file-1',
            title: 'Root',
            description: '',
            parentId: null,
            children: [],
            order: 0
          }]
        ]),
        createdDate: new Date(),
        modifiedDate: new Date()
      };
      
      const result = MeshManager.addNode(mesh, 'file-2', 'node-1', 'Child Node');
      
      expect(result.nodes.size).toBe(2);
      const parent = result.nodes.get('node-1');
      expect(parent?.children.length).toBe(1);
    });
  });
  
  describe('deleteNode', () => {
    it('should delete a leaf node', () => {
      const mesh: DocMesh = {
        id: 'mesh-1',
        name: 'Test Mesh',
        rootNodeId: 'node-1',
        nodes: new Map([
          ['node-1', {
            id: 'node-1',
            htmlFileId: 'file-1',
            title: 'Root',
            description: '',
            parentId: null,
            children: ['node-2'],
            order: 0
          }],
          ['node-2', {
            id: 'node-2',
            htmlFileId: 'file-2',
            title: 'Child',
            description: '',
            parentId: 'node-1',
            children: [],
            order: 0
          }]
        ]),
        createdDate: new Date(),
        modifiedDate: new Date()
      };
      
      const result = MeshManager.deleteNode(mesh, 'node-2', false);
      
      expect(result.nodes.size).toBe(1);
      expect(result.nodes.has('node-2')).toBe(false);
      const parent = result.nodes.get('node-1');
      expect(parent?.children.length).toBe(0);
    });
  });
  
  describe('updateNodeMetadata', () => {
    it('should update node title and description', () => {
      const mesh: DocMesh = {
        id: 'mesh-1',
        name: 'Test Mesh',
        rootNodeId: 'node-1',
        nodes: new Map([
          ['node-1', {
            id: 'node-1',
            htmlFileId: 'file-1',
            title: 'Old Title',
            description: 'Old Description',
            parentId: null,
            children: [],
            order: 0
          }]
        ]),
        createdDate: new Date(),
        modifiedDate: new Date()
      };
      
      const result = MeshManager.updateNodeMetadata(mesh, 'node-1', {
        title: 'New Title',
        description: 'New Description'
      });
      
      const node = result.nodes.get('node-1');
      expect(node?.title).toBe('New Title');
      expect(node?.description).toBe('New Description');
    });
  });
  
  describe('validateTree', () => {
    it('should validate a correct tree', () => {
      const mesh: DocMesh = {
        id: 'mesh-1',
        name: 'Test Mesh',
        rootNodeId: 'node-1',
        nodes: new Map([
          ['node-1', {
            id: 'node-1',
            htmlFileId: 'file-1',
            title: 'Root',
            description: '',
            parentId: null,
            children: ['node-2'],
            order: 0
          }],
          ['node-2', {
            id: 'node-2',
            htmlFileId: 'file-2',
            title: 'Child',
            description: '',
            parentId: 'node-1',
            children: [],
            order: 0
          }]
        ]),
        createdDate: new Date(),
        modifiedDate: new Date()
      };
      
      const result = MeshManager.validateTree(mesh);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });
  
  describe('getDescendants', () => {
    it('should get all descendants of a node', () => {
      const mesh: DocMesh = {
        id: 'mesh-1',
        name: 'Test Mesh',
        rootNodeId: 'node-1',
        nodes: new Map([
          ['node-1', {
            id: 'node-1',
            htmlFileId: 'file-1',
            title: 'Root',
            description: '',
            parentId: null,
            children: ['node-2', 'node-3'],
            order: 0
          }],
          ['node-2', {
            id: 'node-2',
            htmlFileId: 'file-2',
            title: 'Child 1',
            description: '',
            parentId: 'node-1',
            children: ['node-4'],
            order: 0
          }],
          ['node-3', {
            id: 'node-3',
            htmlFileId: 'file-3',
            title: 'Child 2',
            description: '',
            parentId: 'node-1',
            children: [],
            order: 1
          }],
          ['node-4', {
            id: 'node-4',
            htmlFileId: 'file-4',
            title: 'Grandchild',
            description: '',
            parentId: 'node-2',
            children: [],
            order: 0
          }]
        ]),
        createdDate: new Date(),
        modifiedDate: new Date()
      };
      
      const descendants = MeshManager.getDescendants(mesh, 'node-1');
      expect(descendants.length).toBe(3);
      expect(descendants.map(d => d.id).sort()).toEqual(['node-2', 'node-3', 'node-4']);
    });
  });
  
  // Property-based tests
  
  /**
   * Feature: docmesh-navigator, Property 5: Tree structure integrity after move
   * Validates: Requirements 3.2, 3.3, 3.4
   */
  describe('Property 5: Tree structure integrity after move', () => {
    it('should maintain tree integrity after any valid move operation', () => {
      fc.assert(
        fc.property(validTreeArb, (mesh) => {
          // Skip if tree is too small
          if (mesh.nodes.size < 2) {
            return true;
          }
          
          // Pick a random node to move (not the root)
          const nodeIds = Array.from(mesh.nodes.keys()).filter(id => id !== mesh.rootNodeId);
          if (nodeIds.length === 0) {
            return true;
          }
          
          const nodeToMove = nodeIds[Math.floor(Math.random() * nodeIds.length)];
          
          // Pick a random new parent (could be null for root level, or any node except descendants)
          const descendants = MeshManager.getDescendants(mesh, nodeToMove);
          const descendantIds = new Set(descendants.map(d => d.id));
          const validParents = Array.from(mesh.nodes.keys()).filter(
            id => id !== nodeToMove && !descendantIds.has(id)
          );
          
          // Add null as a valid parent (move to root level)
          const allValidParents = [null, ...validParents];
          const newParent = allValidParents[Math.floor(Math.random() * allValidParents.length)];
          
          // Perform the move
          let movedMesh: DocMesh;
          try {
            movedMesh = MeshManager.moveNode(mesh, nodeToMove, newParent, 0);
          } catch (error) {
            // If move throws an error, it should be a valid error (cycle detection)
            if (error instanceof CyclicDependencyError) {
              return true;
            }
            throw error;
          }
          
          // Validate the resulting tree
          const validation = MeshManager.validateTree(movedMesh);
          
          // Tree should be valid (no cycles, no orphans, valid references)
          expect(validation.valid).toBe(true);
          
          // All nodes should still be present
          expect(movedMesh.nodes.size).toBe(mesh.nodes.size);
          
          // No cycles should exist
          expect(MeshManager.detectCycles(movedMesh)).toBe(false);
          
          // No orphaned nodes should exist
          expect(MeshManager.findOrphanedNodes(movedMesh).length).toBe(0);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Feature: docmesh-navigator, Property 17: Node deletion removes from tree
   * Validates: Requirements 9.1
   */
  describe('Property 17: Node deletion removes from tree', () => {
    it('should remove any node from the tree after deletion', () => {
      fc.assert(
        fc.property(validTreeArb, (mesh) => {
          // Skip empty trees
          if (mesh.nodes.size === 0) {
            return true;
          }
          
          // Pick a random node to delete
          const nodeIds = Array.from(mesh.nodes.keys());
          const nodeToDelete = nodeIds[Math.floor(Math.random() * nodeIds.length)];
          
          // Delete the node (without cascade for this test)
          const deletedMesh = MeshManager.deleteNode(mesh, nodeToDelete, false);
          
          // The node should not appear in the tree
          expect(deletedMesh.nodes.has(nodeToDelete)).toBe(false);
          
          // The node should not appear in any parent's children array
          for (const node of deletedMesh.nodes.values()) {
            expect(node.children.includes(nodeToDelete)).toBe(false);
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Feature: docmesh-navigator, Property 18: Cascading deletion removes descendants
   * Validates: Requirements 9.3
   */
  describe('Property 18: Cascading deletion removes descendants', () => {
    it('should remove node and all descendants when cascade is true', () => {
      fc.assert(
        fc.property(validTreeArb, (mesh) => {
          // Skip empty trees
          if (mesh.nodes.size === 0) {
            return true;
          }
          
          // Pick a random node to delete
          const nodeIds = Array.from(mesh.nodes.keys());
          const nodeToDelete = nodeIds[Math.floor(Math.random() * nodeIds.length)];
          
          // Get descendants before deletion
          const descendants = MeshManager.getDescendants(mesh, nodeToDelete);
          const descendantIds = new Set(descendants.map(d => d.id));
          
          // Delete the node with cascade
          const deletedMesh = MeshManager.deleteNode(mesh, nodeToDelete, true);
          
          // The node should not appear in the tree
          expect(deletedMesh.nodes.has(nodeToDelete)).toBe(false);
          
          // All descendants should also be removed
          for (const descendantId of descendantIds) {
            expect(deletedMesh.nodes.has(descendantId)).toBe(false);
          }
          
          // Verify tree is still valid
          const validation = MeshManager.validateTree(deletedMesh);
          expect(validation.valid).toBe(true);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Feature: docmesh-navigator, Property 13: Mesh configuration round-trip
   * Validates: Requirements 7.1, 7.2
   */
  describe('Property 13: Mesh configuration round-trip', () => {
    it('should preserve complete mesh structure after serialize and deserialize', () => {
      fc.assert(
        fc.property(validTreeArb, (mesh) => {
          // Ensure dates are valid before serialization
          const now = new Date();
          const validMesh = {
            ...mesh,
            createdDate: isNaN(mesh.createdDate.getTime()) ? now : mesh.createdDate,
            modifiedDate: isNaN(mesh.modifiedDate.getTime()) ? now : mesh.modifiedDate
          };
          
          // Serialize the mesh
          const serialized = MeshManager.serializeMesh(validMesh);
          
          // Deserialize it back
          const deserialized = MeshManager.deserializeMesh(serialized);
          
          // Check that all basic properties are preserved
          expect(deserialized.id).toBe(validMesh.id);
          expect(deserialized.name).toBe(validMesh.name);
          expect(deserialized.rootNodeId).toBe(validMesh.rootNodeId);
          
          // Check that dates are preserved (as Date objects)
          expect(deserialized.createdDate).toBeInstanceOf(Date);
          expect(deserialized.modifiedDate).toBeInstanceOf(Date);
          expect(deserialized.createdDate.getTime()).toBe(validMesh.createdDate.getTime());
          expect(deserialized.modifiedDate.getTime()).toBe(validMesh.modifiedDate.getTime());
          
          // Check that all nodes are preserved
          expect(deserialized.nodes.size).toBe(validMesh.nodes.size);
          
          // Check each node is identical
          for (const [nodeId, originalNode] of validMesh.nodes.entries()) {
            const deserializedNode = deserialized.nodes.get(nodeId);
            expect(deserializedNode).toBeDefined();
            expect(deserializedNode?.id).toBe(originalNode.id);
            expect(deserializedNode?.htmlFileId).toBe(originalNode.htmlFileId);
            expect(deserializedNode?.title).toBe(originalNode.title);
            expect(deserializedNode?.description).toBe(originalNode.description);
            expect(deserializedNode?.parentId).toBe(originalNode.parentId);
            expect(deserializedNode?.order).toBe(originalNode.order);
            expect(deserializedNode?.children).toEqual(originalNode.children);
          }
          
          // Verify the deserialized tree is valid
          const validation = MeshManager.validateTree(deserialized);
          expect(validation.valid).toBe(true);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Feature: docmesh-navigator, Property 6: Node metadata persistence
   * Validates: Requirements 4.2, 4.3
   */
  describe('Property 6: Node metadata persistence', () => {
    it('should persist node metadata after setting title and description', () => {
      fc.assert(
        fc.property(
          validTreeArb,
          fc.string({ maxLength: 100 }),
          fc.string({ maxLength: 500 }),
          (mesh, newTitle, newDescription) => {
            // Skip empty trees
            if (mesh.nodes.size === 0) {
              return true;
            }
            
            // Pick a random node to update
            const nodeIds = Array.from(mesh.nodes.keys());
            const nodeToUpdate = nodeIds[Math.floor(Math.random() * nodeIds.length)];
            
            // Update the node metadata
            const updatedMesh = MeshManager.updateNodeMetadata(mesh, nodeToUpdate, {
              title: newTitle,
              description: newDescription
            });
            
            // Retrieve the node
            const retrievedNode = updatedMesh.nodes.get(nodeToUpdate);
            
            // The metadata should match the set values
            expect(retrievedNode).toBeDefined();
            expect(retrievedNode?.title).toBe(newTitle);
            expect(retrievedNode?.description).toBe(newDescription);
            
            // Other node properties should remain unchanged
            const originalNode = mesh.nodes.get(nodeToUpdate);
            expect(retrievedNode?.id).toBe(originalNode?.id);
            expect(retrievedNode?.htmlFileId).toBe(originalNode?.htmlFileId);
            expect(retrievedNode?.parentId).toBe(originalNode?.parentId);
            expect(retrievedNode?.children).toEqual(originalNode?.children);
            expect(retrievedNode?.order).toBe(originalNode?.order);
            
            // Other nodes should remain unchanged
            for (const [nodeId, originalNode] of mesh.nodes.entries()) {
              if (nodeId !== nodeToUpdate) {
                const unchangedNode = updatedMesh.nodes.get(nodeId);
                expect(unchangedNode).toEqual(originalNode);
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Feature: docmesh-navigator, Property 14: Mesh switching loads correct configuration
   * Validates: Requirements 7.4
   */
  describe('Property 14: Mesh switching loads correct configuration', () => {
    it('should load the correct mesh when switching between multiple saved meshes', () => {
      fc.assert(
        fc.property(
          fc.array(validTreeArb, { minLength: 2, maxLength: 5 }),
          (meshes) => {
            // Clear localStorage before test
            localStorage.clear();
            
            // Ensure each mesh has a unique ID and valid dates
            const now = new Date();
            const uniqueMeshes = meshes.map((mesh, index) => ({
              ...mesh,
              id: `test-mesh-${index}-${Date.now()}`,
              name: `Test Mesh ${index}`,
              // Ensure dates are valid
              createdDate: isNaN(mesh.createdDate.getTime()) ? now : mesh.createdDate,
              modifiedDate: isNaN(mesh.modifiedDate.getTime()) ? now : mesh.modifiedDate
            }));
            
            // Save all meshes
            uniqueMeshes.forEach(mesh => {
              MeshManager.saveMesh(mesh);
            });
            
            // Pick a random mesh to load
            const targetIndex = Math.floor(Math.random() * uniqueMeshes.length);
            const targetMesh = uniqueMeshes[targetIndex];
            
            // Load the target mesh
            const loadedMesh = MeshManager.loadMesh(targetMesh.id);
            
            // Verify we got the correct mesh
            expect(loadedMesh).not.toBeNull();
            expect(loadedMesh?.id).toBe(targetMesh.id);
            expect(loadedMesh?.name).toBe(targetMesh.name);
            expect(loadedMesh?.rootNodeId).toBe(targetMesh.rootNodeId);
            expect(loadedMesh?.nodes.size).toBe(targetMesh.nodes.size);
            
            // Verify all nodes match
            for (const [nodeId, originalNode] of targetMesh.nodes.entries()) {
              const loadedNode = loadedMesh?.nodes.get(nodeId);
              expect(loadedNode).toBeDefined();
              expect(loadedNode?.id).toBe(originalNode.id);
              expect(loadedNode?.htmlFileId).toBe(originalNode.htmlFileId);
              expect(loadedNode?.title).toBe(originalNode.title);
              expect(loadedNode?.description).toBe(originalNode.description);
              expect(loadedNode?.parentId).toBe(originalNode.parentId);
              expect(loadedNode?.order).toBe(originalNode.order);
              expect(loadedNode?.children).toEqual(originalNode.children);
            }
            
            // Verify we didn't accidentally load a different mesh
            const otherMeshIds = uniqueMeshes
              .filter((_, index) => index !== targetIndex)
              .map(m => m.id);
            
            for (const otherId of otherMeshIds) {
              expect(loadedMesh?.id).not.toBe(otherId);
            }
            
            // Clean up
            localStorage.clear();
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
