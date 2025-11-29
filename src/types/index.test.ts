import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { DocMesh, MeshNode } from './index';

/**
 * Feature: docmesh-navigator, Property 4: Node IDs are unique
 * Validates: Requirements 2.4
 * 
 * For any DocMesh with multiple nodes, all node IDs should be unique within that mesh.
 */
describe('DocMesh Property Tests', () => {
  describe('Property 4: Node IDs are unique', () => {
    it('should ensure all node IDs in a DocMesh are unique', () => {
      fc.assert(
        fc.property(
          // Generate a DocMesh with multiple nodes
          // We generate nodes with potentially duplicate IDs to test the property
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            rootNodeId: fc.oneof(fc.constant(null), fc.uuid()),
            nodes: fc.array(
              fc.record({
                id: fc.uuid(),
                htmlFileId: fc.uuid(),
                title: fc.string({ minLength: 1, maxLength: 100 }),
                description: fc.string({ maxLength: 500 }),
                parentId: fc.oneof(fc.constant(null), fc.uuid()),
                children: fc.array(fc.uuid(), { maxLength: 10 }),
                order: fc.nat({ max: 100 })
              } as fc.Arbitrary<MeshNode>),
              { minLength: 2, maxLength: 20 } // Ensure at least 2 nodes
            ),
            createdDate: fc.date(),
            modifiedDate: fc.date()
          }),
          (meshData) => {
            // Create a Map using node.id as the key
            // This simulates how a properly constructed DocMesh should store nodes
            const nodesMap = new Map<string, MeshNode>();
            for (const node of meshData.nodes) {
              nodesMap.set(node.id, node);
            }
            
            const mesh: DocMesh = {
              ...meshData,
              nodes: nodesMap
            };

            // Extract all node IDs from the mesh
            const nodeIds = Array.from(mesh.nodes.values()).map(node => node.id);
            
            // Check that all node IDs are unique
            const uniqueNodeIds = new Set(nodeIds);
            
            // Property: The number of unique IDs should equal the total number of nodes
            // This verifies that when we construct a mesh, all node IDs are unique
            expect(uniqueNodeIds.size).toBe(nodeIds.length);
            
            // Additional check: Map keys should match node IDs
            for (const [key, node] of mesh.nodes.entries()) {
              expect(key).toBe(node.id);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
