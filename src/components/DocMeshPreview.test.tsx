import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { DocMeshPreview } from './DocMeshPreview';
import type { DocMesh, HtmlFile, MeshNode } from '../types';

describe('DocMeshPreview', () => {
  describe('Empty States', () => {
    it('should display empty state when no mesh exists', () => {
      const { container } = render(
        <DocMeshPreview
          mesh={null}
          selectedNodeId={null}
          htmlFiles={new Map()}
          previewMode="node"
        />
      );

      expect(screen.getByText('No Mesh Selected')).not.toBeNull();
      expect(screen.getByText('Create or load a document mesh to preview')).not.toBeNull();
    });

    it('should display empty state when no node is selected in node mode', () => {
      const mesh: DocMesh = {
        id: 'mesh-1',
        name: 'Test Mesh',
        rootNodeId: null,
        nodes: new Map(),
        createdDate: new Date(),
        modifiedDate: new Date()
      };

      const { container } = render(
        <DocMeshPreview
          mesh={mesh}
          selectedNodeId={null}
          htmlFiles={new Map()}
          previewMode="node"
        />
      );

      expect(screen.getByText('No Document Selected')).not.toBeNull();
      expect(screen.getByText('Select a document from the tree to preview')).not.toBeNull();
    });

    it('should display error state when HTML file is not available', () => {
      const node: MeshNode = {
        id: 'node-1',
        htmlFileId: 'html-1',
        title: 'Test Node',
        description: 'Test Description',
        parentId: null,
        children: [],
        order: 0
      };

      const mesh: DocMesh = {
        id: 'mesh-1',
        name: 'Test Mesh',
        rootNodeId: 'node-1',
        nodes: new Map([['node-1', node]]),
        createdDate: new Date(),
        modifiedDate: new Date()
      };

      const { container } = render(
        <DocMeshPreview
          mesh={mesh}
          selectedNodeId="node-1"
          htmlFiles={new Map()} // No HTML files available
          previewMode="node"
        />
      );

      expect(screen.getByText('Error Loading Content')).not.toBeNull();
      expect(screen.getByText(/HTML file not found/)).not.toBeNull();
    });
  });

  describe('Content Rendering', () => {
    it('should render HTML content for selected node in iframe', () => {
      const htmlFile: HtmlFile = {
        id: 'html-1',
        name: 'test.html',
        content: '<h1>Test Content</h1><p>This is a test paragraph.</p>',
        sourceType: 'markdown',
        sourceId: 'md-1',
        generatedDate: new Date(),
        size: 100
      };

      const node: MeshNode = {
        id: 'node-1',
        htmlFileId: 'html-1',
        title: 'Test Node',
        description: 'Test Description',
        parentId: null,
        children: [],
        order: 0
      };

      const mesh: DocMesh = {
        id: 'mesh-1',
        name: 'Test Mesh',
        rootNodeId: 'node-1',
        nodes: new Map([['node-1', node]]),
        createdDate: new Date(),
        modifiedDate: new Date()
      };

      const { container } = render(
        <DocMeshPreview
          mesh={mesh}
          selectedNodeId="node-1"
          htmlFiles={new Map([['html-1', htmlFile]])}
          previewMode="node"
        />
      );

      // Check that iframe is rendered with correct content
      const iframe = container.querySelector('iframe');
      expect(iframe).not.toBeNull();
      expect(iframe?.getAttribute('srcdoc')).toBe(htmlFile.content);
      expect(iframe?.getAttribute('title')).toBe('Document Preview');
    });

    it('should show index preview placeholder in index mode', () => {
      const mesh: DocMesh = {
        id: 'mesh-1',
        name: 'Test Mesh',
        rootNodeId: null,
        nodes: new Map(),
        createdDate: new Date(),
        modifiedDate: new Date()
      };

      const { container } = render(
        <DocMeshPreview
          mesh={mesh}
          selectedNodeId={null}
          htmlFiles={new Map()}
          previewMode="index"
        />
      );

      // Check that iframe is rendered with index content
      const iframe = container.querySelector('iframe');
      expect(iframe).not.toBeNull();
      expect(iframe?.getAttribute('srcdoc')).toContain('Index Preview');
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * **Feature: docmesh-navigator, Property 9: Preview displays correct content**
     * **Validates: Requirements 5.1**
     * 
     * For any node selection in the tree editor, the preview pane should display 
     * the HTML content associated with that node's htmlFileId.
     */
    it('property: Preview displays correct content', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary mesh with nodes
          fc.record({
            meshId: fc.uuid(),
            meshName: fc.string({ minLength: 1, maxLength: 50 }),
            nodes: fc.array(
              fc.record({
                nodeId: fc.uuid(),
                htmlFileId: fc.uuid(),
                title: fc.string({ minLength: 1, maxLength: 100 }),
                description: fc.string({ maxLength: 200 }),
                // Generate simple HTML content with unique identifiers
                uniqueText: fc.string({ minLength: 10, maxLength: 50 }).filter(s => !s.includes('<') && !s.includes('>'))
              }),
              { minLength: 1, maxLength: 10 }
            )
          }),
          // Select a random node index
          fc.nat(),
          (meshData, nodeIndexRaw) => {
            // Build the mesh and html files
            const nodeIndex = nodeIndexRaw % meshData.nodes.length;
            const selectedNodeData = meshData.nodes[nodeIndex];
            
            const nodes = new Map<string, MeshNode>();
            const htmlFiles = new Map<string, HtmlFile>();
            
            meshData.nodes.forEach((nodeData, idx) => {
              const node: MeshNode = {
                id: nodeData.nodeId,
                htmlFileId: nodeData.htmlFileId,
                title: nodeData.title,
                description: nodeData.description,
                parentId: null,
                children: [],
                order: idx
              };
              nodes.set(nodeData.nodeId, node);
              
              // Create HTML content with the unique text
              const htmlContent = `<div class="test-content-${nodeData.nodeId}"><p>${nodeData.uniqueText}</p></div>`;
              
              const htmlFile: HtmlFile = {
                id: nodeData.htmlFileId,
                name: `${nodeData.title}.html`,
                content: htmlContent,
                sourceType: 'markdown',
                sourceId: `md-${nodeData.nodeId}`,
                generatedDate: new Date(),
                size: htmlContent.length
              };
              htmlFiles.set(nodeData.htmlFileId, htmlFile);
            });
            
            const mesh: DocMesh = {
              id: meshData.meshId,
              name: meshData.meshName,
              rootNodeId: meshData.nodes[0].nodeId,
              nodes,
              createdDate: new Date(),
              modifiedDate: new Date()
            };
            
            // Render the preview with the selected node
            const { container, unmount } = render(
              <DocMeshPreview
                mesh={mesh}
                selectedNodeId={selectedNodeData.nodeId}
                htmlFiles={htmlFiles}
                previewMode="node"
              />
            );
            
            // Verify the correct HTML content is displayed in iframe
            const iframe = container.querySelector('iframe');
            expect(iframe).not.toBeNull();
            
            const srcDoc = iframe?.getAttribute('srcdoc');
            expect(srcDoc).not.toBeNull();
            
            // Check that the selected node's unique class is present in srcDoc
            const selectedNodeClass = `test-content-${selectedNodeData.nodeId}`;
            expect(srcDoc).toContain(selectedNodeClass);
            
            // Check that the selected node's unique text is present
            expect(srcDoc).toContain(selectedNodeData.uniqueText);
            
            // Verify it's NOT showing content from other nodes
            const otherNodes = meshData.nodes.filter((_, idx) => idx !== nodeIndex);
            if (otherNodes.length > 0) {
              // Check that other nodes' unique classes are NOT present
              for (const otherNode of otherNodes) {
                const otherNodeClass = `test-content-${otherNode.nodeId}`;
                expect(srcDoc).not.toContain(otherNodeClass);
              }
            }
            
            // Cleanup
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Mode Switching', () => {
    it('should switch between node and index preview modes', async () => {
      const htmlFile: HtmlFile = {
        id: 'html-1',
        name: 'test.html',
        content: '<h1>Node Content</h1>',
        sourceType: 'markdown',
        generatedDate: new Date(),
        size: 100
      };

      const node: MeshNode = {
        id: 'node-1',
        htmlFileId: 'html-1',
        title: 'Test Node',
        description: '',
        parentId: null,
        children: [],
        order: 0
      };

      const mesh: DocMesh = {
        id: 'mesh-1',
        name: 'Test Mesh',
        rootNodeId: 'node-1',
        nodes: new Map([['node-1', node]]),
        createdDate: new Date(),
        modifiedDate: new Date()
      };

      // Render in node mode
      const { rerender, container } = render(
        <DocMeshPreview
          mesh={mesh}
          selectedNodeId="node-1"
          htmlFiles={new Map([['html-1', htmlFile]])}
          previewMode="node"
        />
      );

      // Check iframe has node content
      let iframe = container.querySelector('iframe');
      expect(iframe).not.toBeNull();
      expect(iframe?.getAttribute('srcdoc')).toBe('<h1>Node Content</h1>');

      // Switch to index mode
      rerender(
        <DocMeshPreview
          mesh={mesh}
          selectedNodeId="node-1"
          htmlFiles={new Map([['html-1', htmlFile]])}
          previewMode="index"
        />
      );

      // Wait for loading state to complete and check iframe has index content
      await waitFor(() => {
        iframe = container.querySelector('iframe');
        expect(iframe?.getAttribute('srcdoc')).toContain('Index Preview');
      }, { timeout: 500 });
    });
  });
});
