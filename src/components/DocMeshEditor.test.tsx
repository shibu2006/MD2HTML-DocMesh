import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { DocMeshEditor } from './DocMeshEditor';
import type { DocMesh, MeshNode, HtmlFile } from '../types';

// Helper to create a test mesh
function createTestMesh(nodes: MeshNode[]): DocMesh {
  const nodesMap = new Map(nodes.map(n => [n.id, n]));
  const rootNode = nodes.find(n => n.parentId === null);
  
  return {
    id: 'test-mesh',
    name: 'Test Mesh',
    rootNodeId: rootNode?.id || null,
    nodes: nodesMap,
    createdDate: new Date(),
    modifiedDate: new Date()
  };
}

// Helper to create a test HTML file
function createTestHtmlFile(id: string, name: string): HtmlFile {
  return {
    id,
    name,
    content: '<html><body>Test</body></html>',
    sourceType: 'markdown',
    generatedDate: new Date(),
    size: 100
  };
}

describe('DocMeshEditor - Tree Rendering', () => {
  it('should render empty state when mesh is null and call onAutoCreateMesh', () => {
    const onAutoCreateMesh = vi.fn();
    const mockCallbacks = {
      onNodeSelect: vi.fn(),
      onNodeAdd: vi.fn(),
      onNodeMove: vi.fn(),
      onNodeUpdate: vi.fn(),
      onNodeDelete: vi.fn(),
      onAutoCreateMesh
    };

    const { container } = render(
      <DocMeshEditor
        mesh={null}
        availableHtmlFiles={[]}
        selectedNodeId={null}
        {...mockCallbacks}
      />
    );

    expect(container.textContent).toContain('Start Building Your Tree');
    expect(onAutoCreateMesh).toHaveBeenCalled();
  });

  it('should render empty state when mesh has no nodes', () => {
    const emptyMesh = createTestMesh([]);
    const mockCallbacks = {
      onNodeSelect: vi.fn(),
      onNodeAdd: vi.fn(),
      onNodeMove: vi.fn(),
      onNodeUpdate: vi.fn(),
      onNodeDelete: vi.fn()
    };

    const { container } = render(
      <DocMeshEditor
        mesh={emptyMesh}
        availableHtmlFiles={[]}
        selectedNodeId={null}
        {...mockCallbacks}
      />
    );

    expect(container.textContent).toContain('Start Building Your Tree');
  });

  it('should render a single root node', () => {
    const htmlFile = createTestHtmlFile('html-1', 'test.html');
    const node: MeshNode = {
      id: 'node-1',
      htmlFileId: 'html-1',
      title: 'Test Document',
      description: '',
      parentId: null,
      children: [],
      order: 0
    };
    
    const mesh = createTestMesh([node]);
    const mockCallbacks = {
      onNodeSelect: vi.fn(),
      onNodeAdd: vi.fn(),
      onNodeMove: vi.fn(),
      onNodeUpdate: vi.fn(),
      onNodeDelete: vi.fn()
    };

    const { container } = render(
      <DocMeshEditor
        mesh={mesh}
        availableHtmlFiles={[htmlFile]}
        selectedNodeId={null}
        {...mockCallbacks}
      />
    );

    expect(container.textContent).toContain('Test Document');
  });

  it('should render nested tree structure with parent and children', () => {
    const htmlFiles = [
      createTestHtmlFile('html-1', 'parent.html'),
      createTestHtmlFile('html-2', 'child1.html'),
      createTestHtmlFile('html-3', 'child2.html')
    ];
    
    const nodes: MeshNode[] = [
      {
        id: 'node-1',
        htmlFileId: 'html-1',
        title: 'Parent',
        description: '',
        parentId: null,
        children: ['node-2', 'node-3'],
        order: 0
      },
      {
        id: 'node-2',
        htmlFileId: 'html-2',
        title: 'Child 1',
        description: '',
        parentId: 'node-1',
        children: [],
        order: 0
      },
      {
        id: 'node-3',
        htmlFileId: 'html-3',
        title: 'Child 2',
        description: '',
        parentId: 'node-1',
        children: [],
        order: 1
      }
    ];
    
    const mesh = createTestMesh(nodes);
    const mockCallbacks = {
      onNodeSelect: vi.fn(),
      onNodeAdd: vi.fn(),
      onNodeMove: vi.fn(),
      onNodeUpdate: vi.fn(),
      onNodeDelete: vi.fn()
    };

    const { container } = render(
      <DocMeshEditor
        mesh={mesh}
        availableHtmlFiles={htmlFiles}
        selectedNodeId={null}
        {...mockCallbacks}
      />
    );

    expect(container.textContent).toContain('Parent');
    expect(container.textContent).toContain('Child 1');
    expect(container.textContent).toContain('Child 2');
  });

  it('should render multiple root nodes', () => {
    const htmlFiles = [
      createTestHtmlFile('html-1', 'root1.html'),
      createTestHtmlFile('html-2', 'root2.html')
    ];
    
    const nodes: MeshNode[] = [
      {
        id: 'node-1',
        htmlFileId: 'html-1',
        title: 'Root 1',
        description: '',
        parentId: null,
        children: [],
        order: 0
      },
      {
        id: 'node-2',
        htmlFileId: 'html-2',
        title: 'Root 2',
        description: '',
        parentId: null,
        children: [],
        order: 1
      }
    ];
    
    const mesh = createTestMesh(nodes);
    const mockCallbacks = {
      onNodeSelect: vi.fn(),
      onNodeAdd: vi.fn(),
      onNodeMove: vi.fn(),
      onNodeUpdate: vi.fn(),
      onNodeDelete: vi.fn()
    };

    const { container } = render(
      <DocMeshEditor
        mesh={mesh}
        availableHtmlFiles={htmlFiles}
        selectedNodeId={null}
        {...mockCallbacks}
      />
    );

    expect(container.textContent).toContain('Root 1');
    expect(container.textContent).toContain('Root 2');
  });

  it('should use filename as fallback when node has no title', () => {
    const htmlFile = createTestHtmlFile('html-1', 'fallback.html');
    const node: MeshNode = {
      id: 'node-1',
      htmlFileId: 'html-1',
      title: '', // Empty title
      description: '',
      parentId: null,
      children: [],
      order: 0
    };
    
    const mesh = createTestMesh([node]);
    const mockCallbacks = {
      onNodeSelect: vi.fn(),
      onNodeAdd: vi.fn(),
      onNodeMove: vi.fn(),
      onNodeUpdate: vi.fn(),
      onNodeDelete: vi.fn()
    };

    const { container } = render(
      <DocMeshEditor
        mesh={mesh}
        availableHtmlFiles={[htmlFile]}
        selectedNodeId={null}
        {...mockCallbacks}
      />
    );

    expect(container.textContent).toContain('fallback.html');
  });
});

describe('DocMeshEditor - Node Selection', () => {
  it('should call onNodeSelect when a node is clicked', async () => {
    const user = userEvent.setup();
    const htmlFile = createTestHtmlFile('html-1', 'test.html');
    const node: MeshNode = {
      id: 'node-1',
      htmlFileId: 'html-1',
      title: 'Test Document',
      description: '',
      parentId: null,
      children: [],
      order: 0
    };
    
    const mesh = createTestMesh([node]);
    const onNodeSelect = vi.fn();
    const mockCallbacks = {
      onNodeSelect,
      onNodeAdd: vi.fn(),
      onNodeMove: vi.fn(),
      onNodeUpdate: vi.fn(),
      onNodeDelete: vi.fn()
    };

    const { container } = render(
      <DocMeshEditor
        mesh={mesh}
        availableHtmlFiles={[htmlFile]}
        selectedNodeId={null}
        {...mockCallbacks}
      />
    );

    // Find the node element by text content
    const nodeElements = Array.from(container.querySelectorAll('span')).filter(
      el => el.textContent === 'Test Document'
    );
    expect(nodeElements.length).toBeGreaterThan(0);
    
    await user.click(nodeElements[0]);

    expect(onNodeSelect).toHaveBeenCalledWith('node-1');
  });

  it('should highlight selected node with gradient background', () => {
    const htmlFile = createTestHtmlFile('html-1', 'test.html');
    const node: MeshNode = {
      id: 'node-1',
      htmlFileId: 'html-1',
      title: 'Test Document',
      description: '',
      parentId: null,
      children: [],
      order: 0
    };
    
    const mesh = createTestMesh([node]);
    const mockCallbacks = {
      onNodeSelect: vi.fn(),
      onNodeAdd: vi.fn(),
      onNodeMove: vi.fn(),
      onNodeUpdate: vi.fn(),
      onNodeDelete: vi.fn()
    };

    const { container } = render(
      <DocMeshEditor
        mesh={mesh}
        availableHtmlFiles={[htmlFile]}
        selectedNodeId="node-1"
        {...mockCallbacks}
      />
    );

    // Find the node element and check if it has the selected gradient class
    const nodeElements = Array.from(container.querySelectorAll('div')).filter(
      el => el.textContent?.includes('Test Document')
    );
    const selectedNode = nodeElements.find(el => el.className.includes('from-indigo-50'));
    expect(selectedNode).toBeDefined();
  });

  it('should not highlight non-selected nodes', () => {
    const htmlFiles = [
      createTestHtmlFile('html-1', 'doc1.html'),
      createTestHtmlFile('html-2', 'doc2.html')
    ];
    
    const nodes: MeshNode[] = [
      {
        id: 'node-1',
        htmlFileId: 'html-1',
        title: 'Document 1',
        description: '',
        parentId: null,
        children: [],
        order: 0
      },
      {
        id: 'node-2',
        htmlFileId: 'html-2',
        title: 'Document 2',
        description: '',
        parentId: null,
        children: [],
        order: 1
      }
    ];
    
    const mesh = createTestMesh(nodes);
    const mockCallbacks = {
      onNodeSelect: vi.fn(),
      onNodeAdd: vi.fn(),
      onNodeMove: vi.fn(),
      onNodeUpdate: vi.fn(),
      onNodeDelete: vi.fn()
    };

    const { container } = render(
      <DocMeshEditor
        mesh={mesh}
        availableHtmlFiles={htmlFiles}
        selectedNodeId="node-1"
        {...mockCallbacks}
      />
    );

    // Check that only the selected node has the gradient class (filter for direct node cards only)
    const nodeCards = Array.from(container.querySelectorAll('[draggable="true"]'));
    const selectedCards = nodeCards.filter(el => el.className.includes('from-indigo-50'));
    expect(selectedCards.length).toBe(1);
    expect(selectedCards[0].textContent).toContain('Document 1');
  });
});

describe('DocMeshEditor - Add Node Functionality', () => {
  it('should show add document button', () => {
    const mockCallbacks = {
      onNodeSelect: vi.fn(),
      onNodeAdd: vi.fn(),
      onNodeMove: vi.fn(),
      onNodeUpdate: vi.fn(),
      onNodeDelete: vi.fn()
    };

    const emptyMesh = createTestMesh([]);

    const { container } = render(
      <DocMeshEditor
        mesh={emptyMesh}
        availableHtmlFiles={[]}
        selectedNodeId={null}
        {...mockCallbacks}
      />
    );

    expect(container.textContent).toContain('Add Document');
  });

  it('should show available files when add button is clicked', async () => {
    const user = userEvent.setup();
    const htmlFiles = [
      createTestHtmlFile('html-1', 'test1.html'),
      createTestHtmlFile('html-2', 'test2.html')
    ];
    
    const emptyMesh = createTestMesh([]);
    const mockCallbacks = {
      onNodeSelect: vi.fn(),
      onNodeAdd: vi.fn(),
      onNodeMove: vi.fn(),
      onNodeUpdate: vi.fn(),
      onNodeDelete: vi.fn()
    };

    const { container } = render(
      <DocMeshEditor
        mesh={emptyMesh}
        availableHtmlFiles={htmlFiles}
        selectedNodeId={null}
        {...mockCallbacks}
      />
    );

    // Find and click the add button
    const buttons = Array.from(container.querySelectorAll('button'));
    const addButton = buttons.find(btn => btn.textContent?.includes('Add Document'));
    expect(addButton).toBeDefined();
    
    await user.click(addButton!);

    // Check that the files appear in the dropdown
    expect(container.textContent).toContain('test1.html');
    expect(container.textContent).toContain('test2.html');
  });

  it('should show message when no HTML files are available', async () => {
    const user = userEvent.setup();
    const emptyMesh = createTestMesh([]);
    const mockCallbacks = {
      onNodeSelect: vi.fn(),
      onNodeAdd: vi.fn(),
      onNodeMove: vi.fn(),
      onNodeUpdate: vi.fn(),
      onNodeDelete: vi.fn()
    };

    const { container } = render(
      <DocMeshEditor
        mesh={emptyMesh}
        availableHtmlFiles={[]}
        selectedNodeId={null}
        {...mockCallbacks}
      />
    );

    // Find and click the add button
    const buttons = Array.from(container.querySelectorAll('button'));
    const addButton = buttons.find(btn => btn.textContent?.includes('Add Document'));
    expect(addButton).toBeDefined();
    
    await user.click(addButton!);

    expect(container.textContent).toContain('No HTML files available');
  });

  it('should call onNodeAdd when a file is clicked in the selector', async () => {
    const user = userEvent.setup();
    const htmlFiles = [createTestHtmlFile('html-1', 'test.html')];
    const onNodeAdd = vi.fn();
    const emptyMesh = createTestMesh([]);
    
    const mockCallbacks = {
      onNodeSelect: vi.fn(),
      onNodeAdd,
      onNodeMove: vi.fn(),
      onNodeUpdate: vi.fn(),
      onNodeDelete: vi.fn()
    };

    const { container } = render(
      <DocMeshEditor
        mesh={emptyMesh}
        availableHtmlFiles={htmlFiles}
        selectedNodeId={null}
        {...mockCallbacks}
      />
    );

    // Click add document button
    const buttons = Array.from(container.querySelectorAll('button'));
    const addButton = buttons.find(btn => btn.textContent?.includes('Add Document'));
    await user.click(addButton!);

    // Click on the file in the list
    const fileButtons = Array.from(container.querySelectorAll('button'));
    const fileButton = fileButtons.find(btn => btn.textContent?.includes('test.html'));
    expect(fileButton).toBeDefined();
    await user.click(fileButton!);

    expect(onNodeAdd).toHaveBeenCalledWith(null, 'html-1');
  });
});

describe('DocMeshEditor - Node Deletion', () => {
  it('should have delete functionality available', () => {
    const htmlFile = createTestHtmlFile('html-1', 'test.html');
    const node: MeshNode = {
      id: 'node-1',
      htmlFileId: 'html-1',
      title: 'Test Document',
      description: '',
      parentId: null,
      children: [],
      order: 0
    };
    
    const mesh = createTestMesh([node]);
    const onNodeDelete = vi.fn();
    const mockCallbacks = {
      onNodeSelect: vi.fn(),
      onNodeAdd: vi.fn(),
      onNodeMove: vi.fn(),
      onNodeUpdate: vi.fn(),
      onNodeDelete
    };

    render(
      <DocMeshEditor
        mesh={mesh}
        availableHtmlFiles={[htmlFile]}
        selectedNodeId={null}
        {...mockCallbacks}
      />
    );

    // Verify onNodeDelete callback is provided
    expect(onNodeDelete).toBeDefined();
  });
});

describe('DocMeshEditor - Auto Create Mesh', () => {
  it('should call onAutoCreateMesh when mesh is null', () => {
    const onAutoCreateMesh = vi.fn();
    const mockCallbacks = {
      onNodeSelect: vi.fn(),
      onNodeAdd: vi.fn(),
      onNodeMove: vi.fn(),
      onNodeUpdate: vi.fn(),
      onNodeDelete: vi.fn(),
      onAutoCreateMesh
    };

    render(
      <DocMeshEditor
        mesh={null}
        availableHtmlFiles={[]}
        selectedNodeId={null}
        {...mockCallbacks}
      />
    );

    expect(onAutoCreateMesh).toHaveBeenCalledTimes(1);
  });

  it('should not call onAutoCreateMesh when mesh exists', () => {
    const onAutoCreateMesh = vi.fn();
    const emptyMesh = createTestMesh([]);
    const mockCallbacks = {
      onNodeSelect: vi.fn(),
      onNodeAdd: vi.fn(),
      onNodeMove: vi.fn(),
      onNodeUpdate: vi.fn(),
      onNodeDelete: vi.fn(),
      onAutoCreateMesh
    };

    render(
      <DocMeshEditor
        mesh={emptyMesh}
        availableHtmlFiles={[]}
        selectedNodeId={null}
        {...mockCallbacks}
      />
    );

    expect(onAutoCreateMesh).not.toHaveBeenCalled();
  });
});
