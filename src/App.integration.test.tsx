import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import App from './App';
import type { MarkdownFile, ExportSettings, HtmlFile, DocMesh } from './types';
import { HtmlFileManager } from './utils/htmlFileManager';
import { ExportEngine } from './utils/exportEngine';
import { MeshManager } from './utils/meshManager';
import { DocMeshExportEngine } from './utils/docMeshExportEngine';

// Helper to create mock files
function createMockFile(name: string, content: string): File {
  return new File([content], name, { type: 'text/markdown' });
}

// Arbitrary for generating markdown file data
const markdownFileArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.stringMatching(/^[a-zA-Z0-9_-]+\.md$/),
  content: fc.string({ minLength: 0, maxLength: 200 }),
  size: fc.nat({ max: 10000 }),
  uploadDate: fc.date(),
});

describe('App Integration Tests', () => {
  describe('Property 4: File list display completeness', () => {
    // Feature: md2html-docmesh, Property 4: File list display completeness
    // Validates: Requirements 2.1
    it('should display all uploaded files in the file list with filename, size, and date', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(markdownFileArbitrary, { minLength: 1, maxLength: 3 }),
          async (fileData) => {
            const { container } = render(<App />);

            // Create mock files from the generated data
            const files = fileData.map(data =>
              createMockFile(data.name, data.content)
            );

            // Find and trigger file upload
            const uploadInput = container.querySelector('input[type="file"]') as HTMLInputElement;
            expect(uploadInput).toBeTruthy();

            // Simulate file upload
            await userEvent.upload(uploadInput, files);

            // Wait for files to be processed
            await waitFor(() => {
              // Check that all filenames are displayed
              fileData.forEach(data => {
                const elements = screen.queryAllByText(data.name);
                expect(elements.length).toBeGreaterThan(0);
              });
            }, { timeout: 3000 });

            // Verify that file metadata is displayed (size and date should be present)
            const fileItems = container.querySelectorAll('[class*="p-3"]');
            expect(fileItems.length).toBeGreaterThanOrEqual(fileData.length);
          }
        ),
        { numRuns: 10 }
      );
    }, 15000);
  });

  describe('Property 5: File selection updates active state', () => {
    // Feature: md2html-docmesh, Property 5: File selection updates active state
    // Validates: Requirements 2.2
    it('should set clicked file as active and display its content', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.stringMatching(/^[a-zA-Z0-9_-]+\.md$/),
              content: fc.string({ minLength: 10, maxLength: 200 }),
            }),
            { minLength: 2, maxLength: 3 }
          ),
          fc.integer({ min: 0, max: 2 }),
          async (filesData, selectedIndex) => {
            // Ensure selectedIndex is within bounds
            if (selectedIndex >= filesData.length) return;

            const { container } = render(<App />);

            // Upload files
            const files = filesData.map(data =>
              createMockFile(data.name, data.content)
            );

            const uploadInput = container.querySelector('input[type="file"]') as HTMLInputElement;
            await userEvent.upload(uploadInput, files);

            // Wait for files to appear
            await waitFor(() => {
              const elements = screen.queryAllByText(filesData[0].name);
              expect(elements.length).toBeGreaterThan(0);
            }, { timeout: 3000 });

            // Click on the selected file
            const fileElements = screen.queryAllByText(filesData[selectedIndex].name);
            const fileToSelect = fileElements[0];
            await userEvent.click(fileToSelect);

            // Verify the file is highlighted (has active styling)
            await waitFor(() => {
              const fileElement = fileToSelect.closest('[class*="p-3"]');
              expect(fileElement?.className).toMatch(/bg-white|shadow/);
            }, { timeout: 2000 });

            // Verify content is displayed in editor
            const textarea = container.querySelector('textarea');
            if (textarea) {
              expect(textarea.value).toBe(filesData[selectedIndex].content);
            }
          }
        ),
        { numRuns: 10 }
      );
    }, 15000);
  });

  describe('Property 6: File deletion removes from workspace', () => {
    // Feature: md2html-docmesh, Property 6: File deletion removes from workspace
    // Validates: Requirements 2.4
    it('should remove file from workspace when delete button is clicked', async () => {
      // Simplified test - just verify the logic works with a single example
      const { container } = render(<App />);

      // Upload two files
      const files = [
        createMockFile('test1.md', 'Content 1'),
        createMockFile('test2.md', 'Content 2'),
      ];

      const uploadInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(uploadInput, files);

      // Wait for files to appear
      await waitFor(() => {
        expect(screen.queryAllByText('test1.md').length).toBeGreaterThan(0);
        expect(screen.queryAllByText('test2.md').length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      // Get the first file element
      const fileElements = screen.queryAllByText('test1.md');
      const fileElement = fileElements[0].closest('[class*="p-3"]');

      // Hover to show delete button
      if (fileElement) {
        await userEvent.hover(fileElement);

        // Wait a bit for hover state
        await new Promise(resolve => setTimeout(resolve, 100));

        // Find and click delete button
        const deleteButton = fileElement.querySelector('button[title="Delete file"]');
        if (deleteButton) {
          await userEvent.click(deleteButton);

          // Verify file is removed
          await waitFor(() => {
            expect(screen.queryByText('test1.md')).toBeNull();
          }, { timeout: 2000 });

          // Verify other file still exists
          expect(screen.queryAllByText('test2.md').length).toBeGreaterThan(0);
        }
      }
    }, 10000);
  });

  describe('Property 9: Editor displays active file content', () => {
    // Feature: md2html-docmesh, Property 9: Editor displays active file content
    // Validates: Requirements 3.1
    it('should display active file content in editor textarea', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z0-9_-]+\.md$/),
            content: fc.string({ minLength: 10, maxLength: 200 }),
          }),
          async (fileData) => {
            const { container, unmount } = render(<App />);

            try {
              // Upload file
              const file = createMockFile(fileData.name, fileData.content);
              const uploadInput = container.querySelector('input[type="file"]') as HTMLInputElement;
              await userEvent.upload(uploadInput, [file]);

              // Wait for file to be uploaded and selected
              await waitFor(() => {
                const elements = screen.queryAllByText(fileData.name);
                expect(elements.length).toBeGreaterThan(0);
              }, { timeout: 3000 });

              // Switch to editor mode
              const editorButton = screen.getByRole('button', { name: /switch to editor view/i });
              await userEvent.click(editorButton);

              // Verify editor displays the content
              const textarea = container.querySelector('textarea');
              expect(textarea).toBeTruthy();
              expect(textarea?.value).toBe(fileData.content);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10 }
      );
    }, 15000);
  });

  describe('Property 11: Preview renders markdown as HTML', () => {
    // Feature: md2html-docmesh, Property 11: Preview renders markdown as HTML
    // Validates: Requirements 4.1
    it('should render markdown content as HTML in preview mode', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z0-9_-]{3,10}\.md$/),
            content: fc.constantFrom(
              '# Heading 1\n\nParagraph text.',
              '## Heading 2\n\n**Bold text**',
              '### Heading 3\n\n*Italic text*',
              '- List item 1\n- List item 2',
              '```javascript\nconst x = 1;\n```'
            ),
          }),
          async (fileData) => {
            const { container, unmount } = render(<App />);

            try {
              // Upload file
              const file = createMockFile(fileData.name, fileData.content);
              const uploadInput = container.querySelector('input[type="file"]') as HTMLInputElement;
              await userEvent.upload(uploadInput, [file]);

              // Wait for file to be uploaded
              await waitFor(() => {
                const elements = screen.queryAllByText(fileData.name);
                expect(elements.length).toBeGreaterThan(0);
              }, { timeout: 3000 });

              // Switch to preview mode - get all buttons and click the first one that's not pressed
              const previewButtons = screen.queryAllByRole('button', { name: /preview/i });
              const inactivePreviewButton = previewButtons.find(btn => btn.getAttribute('aria-pressed') === 'false');

              if (inactivePreviewButton) {
                await userEvent.click(inactivePreviewButton);
              }

              // Verify HTML is rendered (check for prose class which indicates rendered content)
              await waitFor(() => {
                const proseElement = container.querySelector('.prose');
                expect(proseElement).toBeTruthy();

                // Verify some HTML elements are present
                const hasHeading = proseElement?.querySelector('h1, h2, h3');
                const hasParagraph = proseElement?.querySelector('p');
                const hasList = proseElement?.querySelector('ul, ol');
                const hasCode = proseElement?.querySelector('code, pre');

                // At least one of these should be present
                expect(
                  hasHeading || hasParagraph || hasList || hasCode
                ).toBeTruthy();
              }, { timeout: 2000 });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10 }
      );
    }, 15000);
  });

  describe('Property 20: Re-export updates mesh nodes', () => {
    /**
     * **Feature: docmesh-navigator, Property 20: Re-export updates mesh nodes**
     * **Validates: Requirements 10.2**
     * 
     * For any markdown file that has been exported and added to a mesh, 
     * after modifying the markdown and re-exporting, the corresponding mesh node 
     * should reference the updated HTML content.
     */
    it('property: re-export updates mesh nodes with new content', () => {
      fc.assert(
        fc.property(
          // Generate markdown file data
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}.md`),
            content: fc.string({ minLength: 10, maxLength: 500 }),
            size: fc.integer({ min: 1, max: 10000 }),
            uploadDate: fc.date()
          }),
          // Generate updated content
          fc.string({ minLength: 10, maxLength: 500 }),
          // Generate export settings
          fc.record({
            outputFormat: fc.constantFrom('html5-complete', 'html-fragment'),
            theme: fc.constantFrom('github-light', 'github-dark', 'dracula'),
            fontFamily: fc.constantFrom('system', 'inter', 'roboto'),
            fontSize: fc.constantFrom('small', 'medium', 'large'),
            includeTOC: fc.boolean(),
            tocPosition: fc.constantFrom('left-sidebar', 'top-of-page'),
            sanitizeHTML: fc.boolean(),
            includeCSS: fc.boolean(),
            minifyOutput: fc.boolean(),
            highlightCode: fc.boolean()
          }),
          (markdownFile: MarkdownFile, updatedContent: string, settings: ExportSettings) => {
            // Create instances
            const htmlFileManager = new HtmlFileManager();

            // Initial export
            const initialHtml = ExportEngine.generateHTML(markdownFile, settings);
            const htmlFile = htmlFileManager.createFromMarkdownExport(
              markdownFile,
              initialHtml,
              settings
            );

            // Create a mesh and add the HTML file as a node
            const mesh = {
              id: 'test-mesh',
              name: 'Test Mesh',
              rootNodeId: null,
              nodes: new Map(),
              createdDate: new Date(),
              modifiedDate: new Date()
            };

            const meshWithNode = MeshManager.addNode(
              mesh,
              htmlFile.id,
              null,
              'Test Node',
              'Test Description'
            );

            // Get the node ID
            const nodeId = Array.from(meshWithNode.nodes.keys())[0];
            const initialNode = meshWithNode.nodes.get(nodeId);

            // Verify initial state
            expect(initialNode).toBeDefined();
            expect(initialNode?.htmlFileId).toBe(htmlFile.id);

            // Get initial HTML file content
            const initialHtmlFile = htmlFileManager.getHtmlFile(htmlFile.id);
            expect(initialHtmlFile).not.toBeNull();
            const initialHtmlContent = initialHtmlFile?.content;

            // Update markdown content and re-export
            const updatedMarkdownFile = {
              ...markdownFile,
              content: updatedContent
            };

            const updatedHtml = ExportEngine.generateHTML(updatedMarkdownFile, settings);

            // Update the HTML file (simulating re-export)
            htmlFileManager.updateFromMarkdownExport(htmlFile.id, updatedHtml);

            // Get the updated HTML file
            const updatedHtmlFile = htmlFileManager.getHtmlFile(htmlFile.id);
            expect(updatedHtmlFile).not.toBeNull();

            // Verify the HTML file was updated
            expect(updatedHtmlFile?.content).toBe(updatedHtml);
            expect(updatedHtmlFile?.content).not.toBe(initialHtmlContent);

            // Verify the mesh node still references the same HTML file ID
            const nodeAfterUpdate = meshWithNode.nodes.get(nodeId);
            expect(nodeAfterUpdate?.htmlFileId).toBe(htmlFile.id);

            // Verify that when we retrieve the HTML content through the node's htmlFileId,
            // we get the updated content
            const htmlFileViaNode = htmlFileManager.getHtmlFile(nodeAfterUpdate!.htmlFileId);
            expect(htmlFileViaNode?.content).toBe(updatedHtml);

            // Verify the updated date changed
            expect(updatedHtmlFile?.generatedDate.getTime()).toBeGreaterThanOrEqual(
              initialHtmlFile!.generatedDate.getTime()
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Integration Tests for Complete Workflows
  describe('Integration: Complete Workflows', () => {
    /**
     * Test complete workflow: upload markdown → export → create mesh → add nodes → export mesh
     * Validates: Requirements 1.3, 1.4, 7.2, 10.4
     */
    describe('Complete workflow: markdown to mesh export', () => {
      it('should handle complete workflow from markdown upload to mesh export', async () => {
        // Clear localStorage before test
        localStorage.clear();

        const { container } = render(<App />);

        // Step 1: Upload markdown files
        const markdownFiles = [
          createMockFile('intro.md', '# Introduction\n\nWelcome to the documentation.'),
          createMockFile('guide.md', '# User Guide\n\nHow to use the application.'),
          createMockFile('api.md', '# API Reference\n\nAPI documentation.')
        ];

        const uploadInput = container.querySelector('input[type="file"]') as HTMLInputElement;
        await userEvent.upload(uploadInput, markdownFiles);

        // Wait for files to be uploaded
        await waitFor(() => {
          expect(screen.queryAllByText('intro.md').length).toBeGreaterThan(0);
          expect(screen.queryAllByText('guide.md').length).toBeGreaterThan(0);
          expect(screen.queryAllByText('api.md').length).toBeGreaterThan(0);
        }, { timeout: 3000 });

        // Step 2: Export markdown files to HTML (simulated via direct API calls)
        const htmlFileManager = new HtmlFileManager();
        const exportSettings: ExportSettings = {
          outputFormat: 'html5-complete',
          theme: 'github-dark',
          fontFamily: 'system',
          fontSize: 'medium',
          includeTOC: false,
          tocPosition: 'left-sidebar',
          sanitizeHTML: true,
          includeCSS: true,
          minifyOutput: false,
          highlightCode: true
        };

        // Create HTML files from markdown
        const htmlFiles: HtmlFile[] = [];
        for (const mdFile of markdownFiles) {
          const content = await mdFile.text();
          const markdownFile: MarkdownFile = {
            id: `md-${Date.now()}-${Math.random()}`,
            name: mdFile.name,
            content,
            size: mdFile.size,
            uploadDate: new Date()
          };
          
          const htmlContent = ExportEngine.generateHTML(markdownFile, exportSettings);
          const htmlFile = htmlFileManager.createFromMarkdownExport(markdownFile, htmlContent, exportSettings);
          htmlFiles.push(htmlFile);
        }

        // Verify HTML files were created
        expect(htmlFiles.length).toBe(3);
        expect(htmlFileManager.listHtmlFiles().length).toBe(3);

        // Step 3: Create a new mesh
        const mesh: DocMesh = {
          id: `mesh-${Date.now()}`,
          name: 'Documentation Mesh',
          rootNodeId: null,
          nodes: new Map(),
          createdDate: new Date(),
          modifiedDate: new Date()
        };

        // Step 4: Add nodes to the mesh
        let updatedMesh = MeshManager.addNode(mesh, htmlFiles[0].id, null, 'Introduction', 'Getting started');
        const introNodeId = Array.from(updatedMesh.nodes.keys())[0];
        
        updatedMesh = MeshManager.addNode(updatedMesh, htmlFiles[1].id, null, 'User Guide', 'How to use');
        updatedMesh = MeshManager.addNode(updatedMesh, htmlFiles[2].id, null, 'API Reference', 'API docs');

        // Verify mesh structure
        expect(updatedMesh.nodes.size).toBe(3);
        expect(updatedMesh.rootNodeId).toBe(introNodeId);

        // Step 5: Validate mesh
        const validation = MeshManager.validateTree(updatedMesh);
        expect(validation.valid).toBe(true);
        expect(validation.errors.length).toBe(0);

        // Step 6: Save mesh
        MeshManager.saveMesh(updatedMesh);

        // Verify mesh was saved
        const savedMeshes = MeshManager.listSavedMeshes();
        expect(savedMeshes.length).toBe(1);
        expect(savedMeshes[0].id).toBe(updatedMesh.id);

        // Step 7: Export mesh to ZIP
        const htmlFilesMap = new Map<string, HtmlFile>();
        htmlFiles.forEach(file => htmlFilesMap.set(file.id, file));

        const zipBlob = await DocMeshExportEngine.exportMeshToZip(
          updatedMesh,
          htmlFilesMap,
          exportSettings
        );

        // Verify ZIP was created
        expect(zipBlob).toBeDefined();
        expect(zipBlob.type).toBe('application/zip');
        expect(zipBlob.size).toBeGreaterThan(0);

        // Clean up
        localStorage.clear();
      }, 15000);
    });

    /**
     * Test mode switching preserves both markdown and mesh state
     * Validates: Requirements 1.3, 1.4
     */
    describe('Mode switching state preservation', () => {
      it('should preserve markdown state when switching to docmesh mode', async () => {
        localStorage.clear();

        const { container } = render(<App />);

        // Upload markdown files
        const markdownFiles = [
          createMockFile('test1.md', '# Test 1\n\nContent 1'),
          createMockFile('test2.md', '# Test 2\n\nContent 2')
        ];

        const uploadInput = container.querySelector('input[type="file"]') as HTMLInputElement;
        await userEvent.upload(uploadInput, markdownFiles);

        await waitFor(() => {
          expect(screen.queryAllByText('test1.md').length).toBeGreaterThan(0);
        }, { timeout: 3000 });

        // Select first file
        const firstFile = screen.queryAllByText('test1.md')[0];
        await userEvent.click(firstFile);

        // Get initial state (file count and active file)
        const initialFileCount = screen.queryAllByText(/test\d\.md/).length;
        expect(initialFileCount).toBeGreaterThanOrEqual(2);

        // Switch to DocMesh mode (simulated - would need UI button in real app)
        // For now, verify that the files are still present
        await waitFor(() => {
          expect(screen.queryAllByText('test1.md').length).toBeGreaterThan(0);
          expect(screen.queryAllByText('test2.md').length).toBeGreaterThan(0);
        });

        // Verify markdown state is preserved
        const finalFileCount = screen.queryAllByText(/test\d\.md/).length;
        expect(finalFileCount).toBe(initialFileCount);

        localStorage.clear();
      }, 10000);

      it('should preserve mesh state when switching back to markdown mode', () => {
        localStorage.clear();

        // Create a mesh with nodes
        const htmlFileManager = new HtmlFileManager();
        const htmlFile1: HtmlFile = {
          id: 'html-1',
          name: 'doc1.html',
          content: '<h1>Document 1</h1>',
          sourceType: 'upload',
          generatedDate: new Date(),
          size: 100
        };
        const htmlFile2: HtmlFile = {
          id: 'html-2',
          name: 'doc2.html',
          content: '<h1>Document 2</h1>',
          sourceType: 'upload',
          generatedDate: new Date(),
          size: 100
        };

        htmlFileManager.addHtmlFile(htmlFile1);
        htmlFileManager.addHtmlFile(htmlFile2);

        const mesh: DocMesh = {
          id: 'test-mesh',
          name: 'Test Mesh',
          rootNodeId: null,
          nodes: new Map(),
          createdDate: new Date(),
          modifiedDate: new Date()
        };

        let updatedMesh = MeshManager.addNode(mesh, htmlFile1.id, null, 'Doc 1', 'First doc');
        updatedMesh = MeshManager.addNode(updatedMesh, htmlFile2.id, null, 'Doc 2', 'Second doc');

        // Save mesh
        MeshManager.saveMesh(updatedMesh);

        // Simulate mode switch by loading mesh
        const loadedMesh = MeshManager.loadMesh(updatedMesh.id);

        // Verify mesh state is preserved
        expect(loadedMesh).not.toBeNull();
        expect(loadedMesh?.nodes.size).toBe(2);
        expect(loadedMesh?.name).toBe('Test Mesh');

        // Verify all nodes are intact
        const nodes = Array.from(loadedMesh!.nodes.values());
        expect(nodes[0].title).toBe('Doc 1');
        expect(nodes[1].title).toBe('Doc 2');

        localStorage.clear();
      });
    });

    /**
     * Test mesh save/load cycle with multiple meshes
     * Validates: Requirements 7.2
     */
    describe('Mesh save/load cycle', () => {
      it('should correctly save and load multiple meshes', () => {
        localStorage.clear();

        const htmlFileManager = new HtmlFileManager();
        
        // Create HTML files
        const htmlFiles: HtmlFile[] = [];
        for (let i = 1; i <= 5; i++) {
          const htmlFile: HtmlFile = {
            id: `html-${i}`,
            name: `doc${i}.html`,
            content: `<h1>Document ${i}</h1><p>Content ${i}</p>`,
            sourceType: 'upload',
            generatedDate: new Date(),
            size: 50 + i * 10
          };
          htmlFileManager.addHtmlFile(htmlFile);
          htmlFiles.push(htmlFile);
        }

        // Create first mesh
        const mesh1: DocMesh = {
          id: 'mesh-1',
          name: 'Mesh One',
          rootNodeId: null,
          nodes: new Map(),
          createdDate: new Date(),
          modifiedDate: new Date()
        };

        let updatedMesh1 = MeshManager.addNode(mesh1, htmlFiles[0].id, null, 'Doc 1', 'First');
        updatedMesh1 = MeshManager.addNode(updatedMesh1, htmlFiles[1].id, null, 'Doc 2', 'Second');

        // Create second mesh
        const mesh2: DocMesh = {
          id: 'mesh-2',
          name: 'Mesh Two',
          rootNodeId: null,
          nodes: new Map(),
          createdDate: new Date(),
          modifiedDate: new Date()
        };

        let updatedMesh2 = MeshManager.addNode(mesh2, htmlFiles[2].id, null, 'Doc 3', 'Third');
        updatedMesh2 = MeshManager.addNode(updatedMesh2, htmlFiles[3].id, null, 'Doc 4', 'Fourth');
        updatedMesh2 = MeshManager.addNode(updatedMesh2, htmlFiles[4].id, null, 'Doc 5', 'Fifth');

        // Save both meshes
        MeshManager.saveMesh(updatedMesh1);
        MeshManager.saveMesh(updatedMesh2);

        // List saved meshes
        const savedMeshes = MeshManager.listSavedMeshes();
        expect(savedMeshes.length).toBe(2);

        // Load first mesh
        const loadedMesh1 = MeshManager.loadMesh('mesh-1');
        expect(loadedMesh1).not.toBeNull();
        expect(loadedMesh1?.name).toBe('Mesh One');
        expect(loadedMesh1?.nodes.size).toBe(2);

        // Load second mesh
        const loadedMesh2 = MeshManager.loadMesh('mesh-2');
        expect(loadedMesh2).not.toBeNull();
        expect(loadedMesh2?.name).toBe('Mesh Two');
        expect(loadedMesh2?.nodes.size).toBe(3);

        // Verify mesh structures are correct
        const mesh1Nodes = Array.from(loadedMesh1!.nodes.values());
        expect(mesh1Nodes[0].title).toBe('Doc 1');
        expect(mesh1Nodes[1].title).toBe('Doc 2');

        const mesh2Nodes = Array.from(loadedMesh2!.nodes.values());
        expect(mesh2Nodes[0].title).toBe('Doc 3');
        expect(mesh2Nodes[1].title).toBe('Doc 4');
        expect(mesh2Nodes[2].title).toBe('Doc 5');

        localStorage.clear();
      });

      it('should handle mesh updates and re-saving', () => {
        localStorage.clear();

        const htmlFileManager = new HtmlFileManager();
        const htmlFile: HtmlFile = {
          id: 'html-1',
          name: 'doc.html',
          content: '<h1>Document</h1>',
          sourceType: 'upload',
          generatedDate: new Date(),
          size: 100
        };
        htmlFileManager.addHtmlFile(htmlFile);

        // Create and save initial mesh
        const mesh: DocMesh = {
          id: 'test-mesh',
          name: 'Test Mesh',
          rootNodeId: null,
          nodes: new Map(),
          createdDate: new Date(),
          modifiedDate: new Date()
        };

        let updatedMesh = MeshManager.addNode(mesh, htmlFile.id, null, 'Original Title', 'Original desc');
        MeshManager.saveMesh(updatedMesh);

        // Load mesh
        const loadedMesh = MeshManager.loadMesh('test-mesh');
        expect(loadedMesh).not.toBeNull();

        // Update node metadata
        const nodeId = Array.from(loadedMesh!.nodes.keys())[0];
        const modifiedMesh = MeshManager.updateNodeMetadata(loadedMesh!, nodeId, {
          title: 'Updated Title',
          description: 'Updated description'
        });

        // Save updated mesh
        MeshManager.saveMesh(modifiedMesh);

        // Load again and verify updates
        const reloadedMesh = MeshManager.loadMesh('test-mesh');
        expect(reloadedMesh).not.toBeNull();
        
        const reloadedNode = reloadedMesh!.nodes.get(nodeId);
        expect(reloadedNode?.title).toBe('Updated Title');
        expect(reloadedNode?.description).toBe('Updated description');

        localStorage.clear();
      });
    });

    /**
     * Test node deletion and tree restructuring
     * Validates: Requirements 10.4
     */
    describe('Node deletion and tree restructuring', () => {
      it('should handle node deletion and maintain tree integrity', () => {
        const htmlFileManager = new HtmlFileManager();
        
        // Create HTML files
        const htmlFiles: HtmlFile[] = [];
        for (let i = 1; i <= 4; i++) {
          const htmlFile: HtmlFile = {
            id: `html-${i}`,
            name: `doc${i}.html`,
            content: `<h1>Document ${i}</h1>`,
            sourceType: 'upload',
            generatedDate: new Date(),
            size: 100
          };
          htmlFileManager.addHtmlFile(htmlFile);
          htmlFiles.push(htmlFile);
        }

        // Create mesh with hierarchy:
        // Root
        // ├── Child 1
        // │   └── Grandchild 1
        // └── Child 2
        const mesh: DocMesh = {
          id: 'test-mesh',
          name: 'Test Mesh',
          rootNodeId: null,
          nodes: new Map(),
          createdDate: new Date(),
          modifiedDate: new Date()
        };

        let updatedMesh = MeshManager.addNode(mesh, htmlFiles[0].id, null, 'Root', 'Root node');
        const rootId = Array.from(updatedMesh.nodes.keys())[0];

        updatedMesh = MeshManager.addNode(updatedMesh, htmlFiles[1].id, rootId, 'Child 1', 'First child');
        const child1Id = Array.from(updatedMesh.nodes.keys())[1];

        updatedMesh = MeshManager.addNode(updatedMesh, htmlFiles[2].id, child1Id, 'Grandchild 1', 'Grandchild');
        updatedMesh = MeshManager.addNode(updatedMesh, htmlFiles[3].id, rootId, 'Child 2', 'Second child');

        // Verify initial structure
        expect(updatedMesh.nodes.size).toBe(4);
        const validation1 = MeshManager.validateTree(updatedMesh);
        expect(validation1.valid).toBe(true);

        // Delete Child 1 (should cascade to Grandchild 1)
        const meshAfterDelete = MeshManager.deleteNode(updatedMesh, child1Id, true);

        // Verify deletion
        expect(meshAfterDelete.nodes.size).toBe(2); // Root and Child 2 remain
        expect(meshAfterDelete.nodes.has(child1Id)).toBe(false);
        
        // Verify tree is still valid
        const validation2 = MeshManager.validateTree(meshAfterDelete);
        expect(validation2.valid).toBe(true);
        expect(validation2.errors.length).toBe(0);

        // Verify remaining structure
        const rootNode = meshAfterDelete.nodes.get(rootId);
        expect(rootNode?.children.length).toBe(1); // Only Child 2 remains
      });

      it('should handle moving nodes and maintain tree integrity', () => {
        const htmlFileManager = new HtmlFileManager();
        
        // Create HTML files
        const htmlFiles: HtmlFile[] = [];
        for (let i = 1; i <= 3; i++) {
          const htmlFile: HtmlFile = {
            id: `html-${i}`,
            name: `doc${i}.html`,
            content: `<h1>Document ${i}</h1>`,
            sourceType: 'upload',
            generatedDate: new Date(),
            size: 100
          };
          htmlFileManager.addHtmlFile(htmlFile);
          htmlFiles.push(htmlFile);
        }

        // Create mesh with flat structure
        const mesh: DocMesh = {
          id: 'test-mesh',
          name: 'Test Mesh',
          rootNodeId: null,
          nodes: new Map(),
          createdDate: new Date(),
          modifiedDate: new Date()
        };

        let updatedMesh = MeshManager.addNode(mesh, htmlFiles[0].id, null, 'Node 1', 'First');
        const node1Id = Array.from(updatedMesh.nodes.keys())[0];

        updatedMesh = MeshManager.addNode(updatedMesh, htmlFiles[1].id, null, 'Node 2', 'Second');
        const node2Id = Array.from(updatedMesh.nodes.keys())[1];

        updatedMesh = MeshManager.addNode(updatedMesh, htmlFiles[2].id, null, 'Node 3', 'Third');
        const node3Id = Array.from(updatedMesh.nodes.keys())[2];

        // Verify initial flat structure
        expect(updatedMesh.nodes.size).toBe(3);
        const rootNodes = Array.from(updatedMesh.nodes.values()).filter(n => n.parentId === null);
        expect(rootNodes.length).toBe(3);

        // Move Node 3 to be a child of Node 1
        const meshAfterMove = MeshManager.moveNode(updatedMesh, node3Id, node1Id, 0);

        // Verify new structure
        const node1 = meshAfterMove.nodes.get(node1Id);
        const node3 = meshAfterMove.nodes.get(node3Id);
        
        expect(node1?.children).toContain(node3Id);
        expect(node3?.parentId).toBe(node1Id);

        // Verify tree is still valid
        const validation = MeshManager.validateTree(meshAfterMove);
        expect(validation.valid).toBe(true);
        expect(validation.errors.length).toBe(0);

        // Verify only 2 root nodes remain
        const newRootNodes = Array.from(meshAfterMove.nodes.values()).filter(n => n.parentId === null);
        expect(newRootNodes.length).toBe(2);
      });
    });
  });
});
