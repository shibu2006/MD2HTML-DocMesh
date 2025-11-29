import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DocMeshExportEngine } from './docMeshExportEngine';
import type { DocMesh, MeshNode, HtmlFile, ExportSettings } from '../types';

// Generators for property-based testing

/**
 * Generate a valid HTML file
 */
const htmlFileArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }).map(s => `file-${s}`),
  name: fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}.html`),
  content: fc.string({ minLength: 10, maxLength: 500 }).map(s => `<div>${s}</div>`),
  sourceType: fc.constantFrom('markdown' as const, 'upload' as const),
  sourceId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  generatedDate: fc.date(),
  size: fc.nat({ max: 10000 })
});

/**
 * Generate export settings
 */
const exportSettingsArb: fc.Arbitrary<ExportSettings> = fc.record({
  outputFormat: fc.constantFrom('html5-complete' as const, 'html-fragment' as const),
  theme: fc.constantFrom(
    'github-light' as const,
    'github-dark' as const,
    'dracula' as const,
    'monokai' as const,
    'sky-blue' as const,
    'solarized-light' as const,
    'nord' as const
  ),
  fontFamily: fc.constantFrom(
    'system' as const,
    'inter' as const,
    'roboto' as const,
    'merriweather' as const,
    'open-sans' as const,
    'fira-code' as const,
    'monospace' as const
  ),
  fontSize: fc.constantFrom('small' as const, 'medium' as const, 'large' as const, 'extra-large' as const),
  includeTOC: fc.boolean(),
  tocPosition: fc.constantFrom('left-sidebar' as const, 'top-of-page' as const),
  sanitizeHTML: fc.boolean(),
  includeCSS: fc.boolean(),
  minifyOutput: fc.boolean(),
  highlightCode: fc.boolean()
});

/**
 * Generate a valid tree structure with corresponding HTML files
 */
const meshWithFilesArb = fc.nat({ min: 1, max: 15 }).chain(nodeCount => {
  return fc.record({
    mesh: fc.record({
      id: fc.string({ minLength: 1, maxLength: 20 }).map(s => `mesh-${s}`),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      rootNodeId: fc.constant<string | null>(null),
      nodes: fc.constant(new Map<string, MeshNode>()),
      createdDate: fc.date(),
      modifiedDate: fc.date()
    }),
    htmlFiles: fc.constant(new Map<string, HtmlFile>())
  }).map(({ mesh, htmlFiles }) => {
    const nodes = new Map<string, MeshNode>();
    const files = new Map<string, HtmlFile>();
    const nodeIds: string[] = [];
    
    // Create nodes and corresponding HTML files
    for (let i = 0; i < nodeCount; i++) {
      const nodeId = `node-${i}`;
      const fileId = `file-${i}`;
      nodeIds.push(nodeId);
      
      // Create HTML file
      files.set(fileId, {
        id: fileId,
        name: `document-${i}.html`,
        content: `<div><h1>Document ${i}</h1><p>Content for document ${i}</p></div>`,
        sourceType: 'markdown',
        sourceId: undefined,
        generatedDate: new Date(),
        size: 100
      });
    }
    
    // First node is always root
    if (nodeIds.length > 0) {
      nodes.set(nodeIds[0], {
        id: nodeIds[0],
        htmlFileId: `file-0`,
        title: `Node 0`,
        description: `Description for node 0`,
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
        htmlFileId: `file-${i}`,
        title: `Node ${i}`,
        description: `Description for node ${i}`,
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
      mesh: {
        ...mesh,
        nodes
      },
      htmlFiles: files
    };
  });
});

describe('DocMeshExportEngine', () => {
  describe('generateAnchorIds', () => {
    it('should generate unique anchor IDs for all nodes', () => {
      const nodes: MeshNode[] = [
        {
          id: 'node-1',
          htmlFileId: 'file-1',
          title: 'Node 1',
          description: '',
          parentId: null,
          children: [],
          order: 0
        },
        {
          id: 'node-2',
          htmlFileId: 'file-2',
          title: 'Node 2',
          description: '',
          parentId: null,
          children: [],
          order: 1
        }
      ];
      
      const anchorIds = DocMeshExportEngine.generateAnchorIds(nodes);
      
      expect(anchorIds.size).toBe(2);
      expect(anchorIds.get('node-1')).toBeDefined();
      expect(anchorIds.get('node-2')).toBeDefined();
      expect(anchorIds.get('node-1')).not.toBe(anchorIds.get('node-2'));
    });
  });
  
  describe('generateNavigationHTML', () => {
    it('should generate navigation with mesh name', () => {
      const mesh: DocMesh = {
        id: 'mesh-1',
        name: 'Test Documentation',
        rootNodeId: 'node-1',
        nodes: new Map([
          ['node-1', {
            id: 'node-1',
            htmlFileId: 'file-1',
            title: 'Introduction',
            description: 'Getting started',
            parentId: null,
            children: [],
            order: 0
          }]
        ]),
        createdDate: new Date(),
        modifiedDate: new Date()
      };
      
      const htmlFiles = new Map<string, HtmlFile>([
        ['file-1', {
          id: 'file-1',
          name: 'intro.html',
          content: '<p>Introduction content</p>',
          sourceType: 'markdown',
          generatedDate: new Date(),
          size: 100
        }]
      ]);
      
      const anchorIds = DocMeshExportEngine.generateAnchorIds([mesh.nodes.get('node-1')!]);
      const navHTML = DocMeshExportEngine.generateNavigationHTML(mesh, anchorIds, htmlFiles);
      
      expect(navHTML).toContain('Test Documentation');
      expect(navHTML).toContain('Introduction');
      expect(navHTML).toContain('Getting started');
    });
  });
  
  describe('stitchHtmlContent', () => {
    it('should combine content from multiple nodes', () => {
      const nodes: MeshNode[] = [
        {
          id: 'node-1',
          htmlFileId: 'file-1',
          title: 'First',
          description: '',
          parentId: null,
          children: [],
          order: 0
        },
        {
          id: 'node-2',
          htmlFileId: 'file-2',
          title: 'Second',
          description: '',
          parentId: null,
          children: [],
          order: 1
        }
      ];
      
      const htmlFiles = new Map<string, HtmlFile>([
        ['file-1', {
          id: 'file-1',
          name: 'first.html',
          content: '<p>First content</p>',
          sourceType: 'markdown',
          generatedDate: new Date(),
          size: 100
        }],
        ['file-2', {
          id: 'file-2',
          name: 'second.html',
          content: '<p>Second content</p>',
          sourceType: 'markdown',
          generatedDate: new Date(),
          size: 100
        }]
      ]);
      
      const anchorIds = DocMeshExportEngine.generateAnchorIds(nodes);
      const content = DocMeshExportEngine.stitchHtmlContent(nodes, htmlFiles, anchorIds);
      
      expect(content).toContain('First content');
      expect(content).toContain('Second content');
    });
  });
  
  describe('generateIndexDocument', () => {
    it('should generate a complete HTML5 document', () => {
      const mesh: DocMesh = {
        id: 'mesh-1',
        name: 'Test Mesh',
        rootNodeId: 'node-1',
        nodes: new Map([
          ['node-1', {
            id: 'node-1',
            htmlFileId: 'file-1',
            title: 'Test Node',
            description: '',
            parentId: null,
            children: [],
            order: 0
          }]
        ]),
        createdDate: new Date(),
        modifiedDate: new Date()
      };
      
      const htmlFiles = new Map<string, HtmlFile>([
        ['file-1', {
          id: 'file-1',
          name: 'test.html',
          content: '<p>Test content</p>',
          sourceType: 'markdown',
          generatedDate: new Date(),
          size: 100
        }]
      ]);
      
      const settings: ExportSettings = {
        outputFormat: 'html5-complete',
        theme: 'github-light',
        fontFamily: 'system',
        fontSize: 'medium',
        includeTOC: false,
        tocPosition: 'top-of-page',
        sanitizeHTML: false,
        includeCSS: true,
        minifyOutput: false,
        highlightCode: false
      };
      
      const indexHTML = DocMeshExportEngine.generateIndexDocument(mesh, htmlFiles, settings);
      
      expect(indexHTML).toContain('<!DOCTYPE html>');
      expect(indexHTML).toContain('<html');
      expect(indexHTML).toContain('</html>');
      expect(indexHTML).toContain('Test Mesh');
      expect(indexHTML).toContain('Test content');
    });
  });
  
  // Property-based tests
  
  /**
   * Feature: docmesh-navigator, Property 10: Index contains all node content
   * Validates: Requirements 6.1
   */
  describe('Property 10: Index contains all node content', () => {
    it('should include content from all nodes in the generated index', () => {
      fc.assert(
        fc.property(meshWithFilesArb, exportSettingsArb, ({ mesh, htmlFiles }, settings) => {
          // Skip empty meshes
          if (mesh.nodes.size === 0) {
            return true;
          }
          
          // Generate the index document
          const indexHTML = DocMeshExportEngine.generateIndexDocument(mesh, htmlFiles, settings);
          
          // Check that content from all nodes is present
          for (const node of mesh.nodes.values()) {
            const htmlFile = htmlFiles.get(node.htmlFileId);
            
            if (htmlFile) {
              // Extract a unique piece of content from the HTML file
              const contentMatch = htmlFile.content.match(/Content for document (\d+)/);
              
              if (contentMatch) {
                // The index should contain this content
                expect(indexHTML).toContain(contentMatch[0]);
              }
            }
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Feature: docmesh-navigator, Property 11: Navigation structure matches tree
   * Validates: Requirements 6.2
   */
  describe('Property 11: Navigation structure matches tree', () => {
    it('should generate navigation that reflects the tree hierarchy', () => {
      fc.assert(
        fc.property(meshWithFilesArb, exportSettingsArb, ({ mesh, htmlFiles }, settings) => {
          // Skip empty meshes
          if (mesh.nodes.size === 0) {
            return true;
          }
          
          // Generate anchor IDs
          const nodes = Array.from(mesh.nodes.values());
          const anchorIds = DocMeshExportEngine.generateAnchorIds(nodes);
          
          // Generate navigation HTML
          const navHTML = DocMeshExportEngine.generateNavigationHTML(mesh, anchorIds, htmlFiles);
          
          // Check that all nodes appear in navigation
          for (const node of mesh.nodes.values()) {
            const anchorId = anchorIds.get(node.id);
            expect(anchorId).toBeDefined();
            
            // Navigation should contain a link to this anchor
            expect(navHTML).toContain(`href="#${anchorId}"`);
          }
          
          // Check parent-child relationships are preserved
          for (const node of mesh.nodes.values()) {
            if (node.children.length > 0) {
              // Parent node should appear before its children in the HTML
              const parentAnchor = anchorIds.get(node.id);
              const parentIndex = navHTML.indexOf(`href="#${parentAnchor}"`);
              
              for (const childId of node.children) {
                const childAnchor = anchorIds.get(childId);
                const childIndex = navHTML.indexOf(`href="#${childAnchor}"`);
                
                // Parent should appear before child in the navigation
                expect(parentIndex).toBeLessThan(childIndex);
              }
            }
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Feature: docmesh-navigator, Property 8: Navigation uses configured metadata
   * Validates: Requirements 4.5, 6.3
   */
  describe('Property 8: Navigation uses configured metadata', () => {
    it('should use configured node titles and descriptions in navigation', () => {
      fc.assert(
        fc.property(meshWithFilesArb, exportSettingsArb, ({ mesh, htmlFiles }, settings) => {
          // Skip empty meshes
          if (mesh.nodes.size === 0) {
            return true;
          }
          
          // Generate anchor IDs
          const nodes = Array.from(mesh.nodes.values());
          const anchorIds = DocMeshExportEngine.generateAnchorIds(nodes);
          
          // Generate navigation HTML
          const navHTML = DocMeshExportEngine.generateNavigationHTML(mesh, anchorIds, htmlFiles);
          
          // Check that configured titles and descriptions appear in navigation
          for (const node of mesh.nodes.values()) {
            // If node has a custom title, it should appear in navigation
            if (node.title) {
              expect(navHTML).toContain(node.title);
            } else {
              // If no custom title, filename should be used
              const htmlFile = htmlFiles.get(node.htmlFileId);
              if (htmlFile) {
                expect(navHTML).toContain(htmlFile.name);
              }
            }
            
            // If node has a description, it should appear in navigation
            if (node.description) {
              expect(navHTML).toContain(node.description);
            }
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Feature: docmesh-navigator, Property 12: Navigation anchors are valid
   * Validates: Requirements 6.4
   */
  describe('Property 12: Navigation anchors are valid', () => {
    it('should ensure all navigation links have corresponding anchor IDs in content', () => {
      fc.assert(
        fc.property(meshWithFilesArb, exportSettingsArb, ({ mesh, htmlFiles }, settings) => {
          // Skip empty meshes
          if (mesh.nodes.size === 0) {
            return true;
          }
          
          // Generate the index document
          const indexHTML = DocMeshExportEngine.generateIndexDocument(mesh, htmlFiles, settings);
          
          // Extract all href="#..." links from navigation
          const hrefPattern = /href="#([^"]+)"/g;
          const hrefs: string[] = [];
          let match;
          
          while ((match = hrefPattern.exec(indexHTML)) !== null) {
            hrefs.push(match[1]);
          }
          
          // Check that each href has a corresponding id in the content
          for (const href of hrefs) {
            // The content should have an element with this ID
            const idPattern = new RegExp(`id="${href}"`);
            expect(indexHTML).toMatch(idPattern);
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Feature: docmesh-navigator, Property 15: Export contains all referenced files
   * Validates: Requirements 8.2
   */
  describe('Property 15: Export contains all referenced files', () => {
    it('should include index document and all referenced HTML files in ZIP export', async () => {
      await fc.assert(
        fc.asyncProperty(meshWithFilesArb, exportSettingsArb, async ({ mesh, htmlFiles }, settings) => {
          // Skip empty meshes
          if (mesh.nodes.size === 0) {
            return true;
          }
          
          // Export mesh to ZIP
          const zipBlob = await DocMeshExportEngine.exportMeshToZip(mesh, htmlFiles, settings);
          
          // Load the ZIP and verify contents
          const JSZip = (await import('jszip')).default;
          const zip = await JSZip.loadAsync(zipBlob);
          
          // Check that index.html exists
          const indexFile = zip.file('index.html');
          expect(indexFile).not.toBeNull();
          
          // Get all unique HTML file IDs referenced by nodes
          const referencedFileIds = new Set<string>();
          for (const node of mesh.nodes.values()) {
            referencedFileIds.add(node.htmlFileId);
          }
          
          // Check that all referenced HTML files are in the ZIP
          for (const fileId of referencedFileIds) {
            const htmlFile = htmlFiles.get(fileId);
            expect(htmlFile).toBeDefined();
            
            if (htmlFile) {
              // The file should exist in the ZIP (with sanitized filename)
              const sanitizedName = htmlFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
              const zipFile = zip.file(sanitizedName);
              expect(zipFile).not.toBeNull();
              
              // Verify the content matches
              if (zipFile) {
                const content = await zipFile.async('string');
                expect(content).toBe(htmlFile.content);
              }
            }
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Feature: docmesh-navigator, Property 16: Export is valid ZIP
   * Validates: Requirements 8.3
   */
  describe('Property 16: Export is valid ZIP', () => {
    it('should produce a valid ZIP archive that can be extracted', async () => {
      await fc.assert(
        fc.asyncProperty(meshWithFilesArb, exportSettingsArb, async ({ mesh, htmlFiles }, settings) => {
          // Skip empty meshes
          if (mesh.nodes.size === 0) {
            return true;
          }
          
          // Export mesh to ZIP
          const zipBlob = await DocMeshExportEngine.exportMeshToZip(mesh, htmlFiles, settings);
          
          // Verify it's a valid ZIP by loading it
          const JSZip = (await import('jszip')).default;
          let zip;
          
          try {
            zip = await JSZip.loadAsync(zipBlob);
          } catch (error) {
            // If loading fails, the ZIP is invalid
            throw new Error(`Invalid ZIP archive: ${error}`);
          }
          
          // Verify the ZIP has files
          const fileNames = Object.keys(zip.files);
          expect(fileNames.length).toBeGreaterThan(0);
          
          // Verify index.html exists and can be extracted
          const indexFile = zip.file('index.html');
          expect(indexFile).not.toBeNull();
          
          if (indexFile) {
            const indexContent = await indexFile.async('string');
            expect(indexContent).toBeTruthy();
            expect(indexContent.length).toBeGreaterThan(0);
            
            // Verify it's valid HTML
            expect(indexContent).toContain('<!DOCTYPE html>');
            expect(indexContent).toContain('<html');
            expect(indexContent).toContain('</html>');
          }
          
          // Verify all files in the ZIP can be extracted
          for (const fileName of fileNames) {
            const file = zip.file(fileName);
            expect(file).not.toBeNull();
            
            if (file) {
              const content = await file.async('string');
              expect(content).toBeTruthy();
            }
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
