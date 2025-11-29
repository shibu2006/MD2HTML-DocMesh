import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MarkdownFile, ExportSettings, DocMesh } from './types';
import { HtmlFileManager } from './utils/htmlFileManager';
import { ExportEngine } from './utils/exportEngine';
import { MeshManager } from './utils/meshManager';

describe('Markdown Re-export Integration', () => {
  let htmlFileManager: HtmlFileManager;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    htmlFileManager = new HtmlFileManager();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  it('should update HTML file and notify when markdown is re-exported', () => {
    const markdownFile: MarkdownFile = {
      id: 'md-1',
      name: 'test.md',
      content: '# Original Content',
      size: 100,
      uploadDate: new Date()
    };

    const settings: ExportSettings = {
      outputFormat: 'html5-complete',
      theme: 'github-light',
      fontFamily: 'system',
      fontSize: 'medium',
      includeTOC: false,
      tocPosition: 'top-of-page',
      sanitizeHTML: true,
      includeCSS: true,
      minifyOutput: false,
      highlightCode: true
    };

    // Initial export
    const initialHtml = ExportEngine.generateHTML(markdownFile, settings);
    const htmlFile = htmlFileManager.createFromMarkdownExport(markdownFile, initialHtml, settings);

    // Create a mesh and add the HTML file as a node
    let currentMesh: DocMesh = {
      id: 'test-mesh',
      name: 'Test Mesh',
      rootNodeId: null,
      nodes: new Map(),
      createdDate: new Date(),
      modifiedDate: new Date()
    };

    currentMesh = MeshManager.addNode(currentMesh, htmlFile.id, null, 'Test Node');
    const nodeId = Array.from(currentMesh.nodes.keys())[0];

    // Simulate the handleMarkdownExport logic
    const existingHtmlFile = htmlFileManager.findBySourceId(markdownFile.id);
    expect(existingHtmlFile).not.toBeNull();

    // Update markdown and re-export
    const updatedMarkdownFile = {
      ...markdownFile,
      content: '# Updated Content'
    };
    const updatedHtml = ExportEngine.generateHTML(updatedMarkdownFile, settings);

    // Update the HTML file
    htmlFileManager.updateFromMarkdownExport(existingHtmlFile!.id, updatedHtml);

    // Check if this HTML file is used in the current mesh
    const affectedNodes: string[] = [];
    for (const [nId, node] of currentMesh.nodes.entries()) {
      if (node.htmlFileId === existingHtmlFile!.id) {
        affectedNodes.push(nId);
      }
    }

    // Verify that the node was identified as affected
    expect(affectedNodes).toContain(nodeId);
    expect(affectedNodes.length).toBe(1);

    // Verify the HTML file was updated
    const updatedHtmlFile = htmlFileManager.getHtmlFile(existingHtmlFile!.id);
    expect(updatedHtmlFile?.content).toBe(updatedHtml);
    expect(updatedHtmlFile?.content).toContain('Updated Content');
  });

  it('should handle re-export when HTML file is used in multiple nodes', () => {
    const markdownFile: MarkdownFile = {
      id: 'md-1',
      name: 'test.md',
      content: '# Shared Content',
      size: 100,
      uploadDate: new Date()
    };

    const settings: ExportSettings = {
      outputFormat: 'html5-complete',
      theme: 'github-light',
      fontFamily: 'system',
      fontSize: 'medium',
      includeTOC: false,
      tocPosition: 'top-of-page',
      sanitizeHTML: true,
      includeCSS: true,
      minifyOutput: false,
      highlightCode: true
    };

    // Initial export
    const initialHtml = ExportEngine.generateHTML(markdownFile, settings);
    const htmlFile = htmlFileManager.createFromMarkdownExport(markdownFile, initialHtml, settings);

    // Create a mesh with multiple nodes referencing the same HTML file
    let currentMesh: DocMesh = {
      id: 'test-mesh',
      name: 'Test Mesh',
      rootNodeId: null,
      nodes: new Map(),
      createdDate: new Date(),
      modifiedDate: new Date()
    };

    // Add first node
    currentMesh = MeshManager.addNode(currentMesh, htmlFile.id, null, 'Node 1');
    const node1Id = Array.from(currentMesh.nodes.keys())[0];

    // Add second node with same HTML file
    currentMesh = MeshManager.addNode(currentMesh, htmlFile.id, null, 'Node 2');
    const node2Id = Array.from(currentMesh.nodes.keys())[1];

    // Update markdown and re-export
    const updatedMarkdownFile = {
      ...markdownFile,
      content: '# Updated Shared Content'
    };
    const updatedHtml = ExportEngine.generateHTML(updatedMarkdownFile, settings);

    const existingHtmlFile = htmlFileManager.findBySourceId(markdownFile.id);
    htmlFileManager.updateFromMarkdownExport(existingHtmlFile!.id, updatedHtml);

    // Check affected nodes
    const affectedNodes: string[] = [];
    for (const [nId, node] of currentMesh.nodes.entries()) {
      if (node.htmlFileId === existingHtmlFile!.id) {
        affectedNodes.push(nId);
      }
    }

    // Both nodes should be affected
    expect(affectedNodes).toContain(node1Id);
    expect(affectedNodes).toContain(node2Id);
    expect(affectedNodes.length).toBe(2);

    // Verify both nodes still reference the updated HTML file
    const updatedHtmlFile = htmlFileManager.getHtmlFile(existingHtmlFile!.id);
    expect(updatedHtmlFile?.content).toContain('Updated Shared Content');
  });

  it('should not affect nodes when re-exporting markdown not in mesh', () => {
    const markdownFile: MarkdownFile = {
      id: 'md-1',
      name: 'test.md',
      content: '# Content',
      size: 100,
      uploadDate: new Date()
    };

    const settings: ExportSettings = {
      outputFormat: 'html5-complete',
      theme: 'github-light',
      fontFamily: 'system',
      fontSize: 'medium',
      includeTOC: false,
      tocPosition: 'top-of-page',
      sanitizeHTML: true,
      includeCSS: true,
      minifyOutput: false,
      highlightCode: true
    };

    // Export markdown but don't add to mesh
    const html = ExportEngine.generateHTML(markdownFile, settings);
    const htmlFile = htmlFileManager.createFromMarkdownExport(markdownFile, html, settings);

    // Create an empty mesh
    const currentMesh: DocMesh = {
      id: 'test-mesh',
      name: 'Test Mesh',
      rootNodeId: null,
      nodes: new Map(),
      createdDate: new Date(),
      modifiedDate: new Date()
    };

    // Re-export
    const updatedHtml = ExportEngine.generateHTML(
      { ...markdownFile, content: '# Updated' },
      settings
    );
    htmlFileManager.updateFromMarkdownExport(htmlFile.id, updatedHtml);

    // Check affected nodes
    const affectedNodes: string[] = [];
    for (const [nId, node] of currentMesh.nodes.entries()) {
      if (node.htmlFileId === htmlFile.id) {
        affectedNodes.push(nId);
      }
    }

    // No nodes should be affected
    expect(affectedNodes.length).toBe(0);
  });
});
