import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RightSidebar } from './RightSidebar';
import type { ExportSettings, DocMesh, HtmlFile, MeshNode } from '../types';

describe('RightSidebar', () => {
  const defaultSettings: ExportSettings = {
    outputFormat: 'html5-complete',
    theme: 'github-dark',
    fontFamily: 'system',
    fontSize: 'medium',
    includeTOC: false,
    tocPosition: 'left-sidebar',
    sanitizeHTML: true,
    includeCSS: true,
    minifyOutput: false,
    highlightCode: true,
  };

  it('renders export settings section', () => {
    const onSettingsChange = vi.fn();
    render(
      <RightSidebar
        exportSettings={defaultSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    expect(screen.getByText('Export Settings')).not.toBeNull();
  });

  it('renders all setting controls', () => {
    const onSettingsChange = vi.fn();
    render(
      <RightSidebar
        exportSettings={defaultSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    expect(screen.getByText('Output Format')).not.toBeNull();
    expect(screen.getByText('Theme')).not.toBeNull();
    expect(screen.getByText('Font Family')).not.toBeNull();
    expect(screen.getByText('Font Size')).not.toBeNull();
    expect(screen.getByText('Include Table of Contents')).not.toBeNull();
    expect(screen.getByText('Sanitize HTML')).not.toBeNull();
    expect(screen.getByText('Include CSS')).not.toBeNull();
    expect(screen.getByText('Minify Output')).not.toBeNull();
    expect(screen.getByText('Highlight Code')).not.toBeNull();
  });

  it('shows TOC position when TOC is enabled', () => {
    const onSettingsChange = vi.fn();
    const settingsWithTOC = { ...defaultSettings, includeTOC: true };

    render(
      <RightSidebar
        exportSettings={settingsWithTOC}
        onSettingsChange={onSettingsChange}
      />
    );

    expect(screen.getByText('Left Sidebar')).not.toBeNull();
  });

  it('renders all font family options', () => {
    const onSettingsChange = vi.fn();
    render(
      <RightSidebar
        exportSettings={defaultSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    expect(screen.getByText('Inter')).not.toBeNull();
    expect(screen.getByText('Roboto')).not.toBeNull();
    expect(screen.getByText('Open Sans')).not.toBeNull();
    expect(screen.getByText('Merriweather (Serif)')).not.toBeNull();
    expect(screen.getByText('Fira Code (Mono)')).not.toBeNull();
  });

  it('hides TOC position when TOC is disabled', () => {
    const onSettingsChange = vi.fn();
    render(
      <RightSidebar
        exportSettings={defaultSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    expect(screen.queryByText('Left Sidebar')).toBeNull();
  });

  it('calls onSettingsChange when output format changes', () => {
    const onSettingsChange = vi.fn();
    render(
      <RightSidebar
        exportSettings={defaultSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    const select = screen.getByDisplayValue('HTML5 Complete');
    fireEvent.change(select, { target: { value: 'html-fragment' } });

    expect(onSettingsChange).toHaveBeenCalledWith({ outputFormat: 'html-fragment' });
  });

  it('calls onSettingsChange when theme changes', () => {
    const onSettingsChange = vi.fn();
    render(
      <RightSidebar
        exportSettings={defaultSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    const select = screen.getByDisplayValue('GitHub Dark');
    fireEvent.change(select, { target: { value: 'dracula' } });

    expect(onSettingsChange).toHaveBeenCalledWith({ theme: 'dracula' });
  });

  it('renders status card with version', () => {
    const onSettingsChange = vi.fn();
    render(
      <RightSidebar
        exportSettings={defaultSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    expect(screen.getByText('Status')).not.toBeNull();
    expect(screen.getByText('1.0.0')).not.toBeNull();
    expect(screen.getByText('Ready')).not.toBeNull();
  });

  describe('DocMesh mode', () => {
    const mockHtmlFile: HtmlFile = {
      id: 'html-1',
      name: 'test.html',
      content: '<h1>Test</h1>',
      sourceType: 'markdown',
      sourceId: 'md-1',
      generatedDate: new Date(),
      size: 100
    };

    const mockNode: MeshNode = {
      id: 'node-1',
      htmlFileId: 'html-1',
      title: 'Custom Title',
      description: 'Test description',
      parentId: null,
      children: [],
      order: 0
    };

    const mockMesh: DocMesh = {
      id: 'mesh-1',
      name: 'Test Mesh',
      rootNodeId: 'node-1',
      nodes: new Map([['node-1', mockNode]]),
      createdDate: new Date(),
      modifiedDate: new Date()
    };

    it('renders preview mode toggle in docmesh mode', () => {
      const onSettingsChange = vi.fn();
      const onMeshPreviewModeChange = vi.fn();
      
      render(
        <RightSidebar
          exportSettings={defaultSettings}
          onSettingsChange={onSettingsChange}
          appMode="docmesh"
          meshPreviewMode="node"
          onMeshPreviewModeChange={onMeshPreviewModeChange}
        />
      );

      expect(screen.getByText('Preview Settings')).not.toBeNull();
      expect(screen.getByText('Node View')).not.toBeNull();
      expect(screen.getByText('Index View')).not.toBeNull();
    });

    it('renders node metadata editor when node is selected', () => {
      const onSettingsChange = vi.fn();
      const onNodeMetadataUpdate = vi.fn();
      const htmlFiles = new Map([['html-1', mockHtmlFile]]);
      
      render(
        <RightSidebar
          exportSettings={defaultSettings}
          onSettingsChange={onSettingsChange}
          appMode="docmesh"
          selectedNodeId="node-1"
          currentMesh={mockMesh}
          htmlFiles={htmlFiles}
          onNodeMetadataUpdate={onNodeMetadataUpdate}
        />
      );

      expect(screen.getByText('Node Settings')).not.toBeNull();
      expect(screen.getByText('Display Title')).not.toBeNull();
      expect(screen.getByText('Description')).not.toBeNull();
    });

    it('calls onNodeMetadataUpdate when title changes', () => {
      const onSettingsChange = vi.fn();
      const onNodeMetadataUpdate = vi.fn();
      const htmlFiles = new Map([['html-1', mockHtmlFile]]);
      
      render(
        <RightSidebar
          exportSettings={defaultSettings}
          onSettingsChange={onSettingsChange}
          appMode="docmesh"
          selectedNodeId="node-1"
          currentMesh={mockMesh}
          htmlFiles={htmlFiles}
          onNodeMetadataUpdate={onNodeMetadataUpdate}
        />
      );

      const titleInput = screen.getByDisplayValue('Custom Title');
      fireEvent.change(titleInput, { target: { value: 'New Title' } });

      expect(onNodeMetadataUpdate).toHaveBeenCalledWith('node-1', { title: 'New Title' });
    });

    it('calls onNodeMetadataUpdate when description changes', () => {
      const onSettingsChange = vi.fn();
      const onNodeMetadataUpdate = vi.fn();
      const htmlFiles = new Map([['html-1', mockHtmlFile]]);
      
      render(
        <RightSidebar
          exportSettings={defaultSettings}
          onSettingsChange={onSettingsChange}
          appMode="docmesh"
          selectedNodeId="node-1"
          currentMesh={mockMesh}
          htmlFiles={htmlFiles}
          onNodeMetadataUpdate={onNodeMetadataUpdate}
        />
      );

      const descriptionInput = screen.getByDisplayValue('Test description');
      fireEvent.change(descriptionInput, { target: { value: 'New description' } });

      expect(onNodeMetadataUpdate).toHaveBeenCalledWith('node-1', { description: 'New description' });
    });

    it('calls onMeshPreviewModeChange when preview mode changes', () => {
      const onSettingsChange = vi.fn();
      const onMeshPreviewModeChange = vi.fn();
      
      render(
        <RightSidebar
          exportSettings={defaultSettings}
          onSettingsChange={onSettingsChange}
          appMode="docmesh"
          meshPreviewMode="node"
          onMeshPreviewModeChange={onMeshPreviewModeChange}
        />
      );

      const indexViewButton = screen.getByText('Index View');
      fireEvent.click(indexViewButton);

      expect(onMeshPreviewModeChange).toHaveBeenCalledWith('index');
    });

    it('shows filename as placeholder when title is empty', () => {
      const nodeWithoutTitle: MeshNode = {
        ...mockNode,
        title: ''
      };
      
      const meshWithEmptyTitle: DocMesh = {
        ...mockMesh,
        nodes: new Map([['node-1', nodeWithoutTitle]])
      };
      
      const onSettingsChange = vi.fn();
      const onNodeMetadataUpdate = vi.fn();
      const htmlFiles = new Map([['html-1', mockHtmlFile]]);
      
      render(
        <RightSidebar
          exportSettings={defaultSettings}
          onSettingsChange={onSettingsChange}
          appMode="docmesh"
          selectedNodeId="node-1"
          currentMesh={meshWithEmptyTitle}
          htmlFiles={htmlFiles}
          onNodeMetadataUpdate={onNodeMetadataUpdate}
        />
      );

      const titleInput = screen.getByPlaceholderText('test.html');
      expect(titleInput).not.toBeNull();
      expect(screen.getByText('Default: test.html')).not.toBeNull();
    });

    it('does not render node metadata editor when no node is selected', () => {
      const onSettingsChange = vi.fn();
      
      render(
        <RightSidebar
          exportSettings={defaultSettings}
          onSettingsChange={onSettingsChange}
          appMode="docmesh"
          selectedNodeId={null}
          currentMesh={mockMesh}
        />
      );

      expect(screen.queryByText('Node Settings')).toBeNull();
    });

    it('hides export settings in docmesh mode', () => {
      const onSettingsChange = vi.fn();
      
      render(
        <RightSidebar
          exportSettings={defaultSettings}
          onSettingsChange={onSettingsChange}
          appMode="docmesh"
        />
      );

      // Should not show the detailed export settings
      expect(screen.queryByText('Output Format')).toBeNull();
      expect(screen.queryByText('Theme')).toBeNull();
    });

    it('shows export settings in markdown mode', () => {
      const onSettingsChange = vi.fn();
      
      render(
        <RightSidebar
          exportSettings={defaultSettings}
          onSettingsChange={onSettingsChange}
          appMode="markdown"
        />
      );

      expect(screen.getByText('Export Settings')).not.toBeNull();
      expect(screen.getByText('Output Format')).not.toBeNull();
      expect(screen.getByText('Theme')).not.toBeNull();
    });

    /**
     * Feature: docmesh-navigator, Property 7: Default title fallback
     * Validates: Requirements 4.4
     */
    it('Property 7: uses filename as default title when node title is empty', () => {
      const onSettingsChange = vi.fn();
      const onNodeMetadataUpdate = vi.fn();
      
      // Test with various filenames
      const testCases = [
        'document.html',
        'my-file.html',
        'test_file.html',
        'README.html',
        'index.html',
        'file-with-long-name.html'
      ];
      
      testCases.forEach(filename => {
        const htmlFile: HtmlFile = {
          id: 'html-1',
          name: filename,
          content: '<h1>Test</h1>',
          sourceType: 'markdown',
          sourceId: 'md-1',
          generatedDate: new Date(),
          size: 100
        };

        const nodeWithoutTitle: MeshNode = {
          id: 'node-1',
          htmlFileId: 'html-1',
          title: '', // Empty title
          description: 'Test description',
          parentId: null,
          children: [],
          order: 0
        };

        const mesh: DocMesh = {
          id: 'mesh-1',
          name: 'Test Mesh',
          rootNodeId: 'node-1',
          nodes: new Map([['node-1', nodeWithoutTitle]]),
          createdDate: new Date(),
          modifiedDate: new Date()
        };

        const htmlFiles = new Map([['html-1', htmlFile]]);
        
        const { unmount } = render(
          <RightSidebar
            exportSettings={defaultSettings}
            onSettingsChange={onSettingsChange}
            appMode="docmesh"
            selectedNodeId="node-1"
            currentMesh={mesh}
            htmlFiles={htmlFiles}
            onNodeMetadataUpdate={onNodeMetadataUpdate}
          />
        );

        // The filename should appear as placeholder
        const titleInput = screen.getByPlaceholderText(filename);
        expect(titleInput).not.toBeNull();
        
        // The default text should show the filename
        expect(screen.getByText(`Default: ${filename}`)).not.toBeNull();
        
        unmount();
      });
    });
  });
});
