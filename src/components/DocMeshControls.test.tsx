import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocMeshControls } from './DocMeshControls';
import type { DocMesh } from '../types';

describe('DocMeshControls', () => {
  const mockMesh: DocMesh = {
    id: 'mesh-1',
    name: 'Test Mesh',
    rootNodeId: 'node-1',
    nodes: new Map([
      ['node-1', {
        id: 'node-1',
        htmlFileId: 'file-1',
        title: 'Node 1',
        description: 'Test node',
        parentId: null,
        children: [],
        order: 0,
      }],
    ]),
    createdDate: new Date('2024-01-01'),
    modifiedDate: new Date('2024-01-02'),
  };

  const mockSavedMeshes: DocMesh[] = [
    mockMesh,
    {
      id: 'mesh-2',
      name: 'Another Mesh',
      rootNodeId: 'node-2',
      nodes: new Map([
        ['node-2', {
          id: 'node-2',
          htmlFileId: 'file-2',
          title: 'Node 2',
          description: 'Another node',
          parentId: null,
          children: [],
          order: 0,
        }],
      ]),
      createdDate: new Date('2024-01-03'),
      modifiedDate: new Date('2024-01-04'),
    },
  ];

  it('renders all control buttons', () => {
    const mockHandlers = {
      onNewMesh: vi.fn(),
      onSaveMesh: vi.fn(),
      onLoadMesh: vi.fn(),
      onExportMesh: vi.fn(),
    };

    render(
      <DocMeshControls
        currentMesh={mockMesh}
        savedMeshes={mockSavedMeshes}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('New Mesh')).not.toBeNull();
    expect(screen.getByText('Save Mesh')).not.toBeNull();
    expect(screen.getByText('Export Mesh')).not.toBeNull();
  });

  it('calls onNewMesh when New Mesh button is clicked', () => {
    const onNewMesh = vi.fn();
    const mockHandlers = {
      onNewMesh,
      onSaveMesh: vi.fn(),
      onLoadMesh: vi.fn(),
      onExportMesh: vi.fn(),
    };

    render(
      <DocMeshControls
        currentMesh={null}
        savedMeshes={[]}
        {...mockHandlers}
      />
    );

    const newMeshButton = screen.getByText('New Mesh');
    fireEvent.click(newMeshButton);

    expect(onNewMesh).toHaveBeenCalledTimes(1);
  });

  it('calls onSaveMesh when Save Mesh button is clicked', () => {
    const onSaveMesh = vi.fn();
    const mockHandlers = {
      onNewMesh: vi.fn(),
      onSaveMesh,
      onLoadMesh: vi.fn(),
      onExportMesh: vi.fn(),
    };

    render(
      <DocMeshControls
        currentMesh={mockMesh}
        savedMeshes={[]}
        {...mockHandlers}
      />
    );

    const saveMeshButton = screen.getByText('Save Mesh');
    fireEvent.click(saveMeshButton);

    expect(onSaveMesh).toHaveBeenCalledWith(mockMesh);
  });

  it('disables Save Mesh button when no current mesh', () => {
    const mockHandlers = {
      onNewMesh: vi.fn(),
      onSaveMesh: vi.fn(),
      onLoadMesh: vi.fn(),
      onExportMesh: vi.fn(),
    };

    render(
      <DocMeshControls
        currentMesh={null}
        savedMeshes={[]}
        {...mockHandlers}
      />
    );

    const saveMeshButton = screen.getByText('Save Mesh').closest('button') as HTMLButtonElement;
    expect(saveMeshButton).not.toBeNull();
    expect(saveMeshButton.disabled).toBe(true);
  });

  it('calls onExportMesh when Export Mesh button is clicked', () => {
    const onExportMesh = vi.fn();
    const mockHandlers = {
      onNewMesh: vi.fn(),
      onSaveMesh: vi.fn(),
      onLoadMesh: vi.fn(),
      onExportMesh,
    };

    render(
      <DocMeshControls
        currentMesh={mockMesh}
        savedMeshes={[]}
        {...mockHandlers}
      />
    );

    const exportMeshButton = screen.getByText('Export Mesh');
    fireEvent.click(exportMeshButton);

    expect(onExportMesh).toHaveBeenCalledWith(mockMesh);
  });

  it('disables Export Mesh button when no current mesh', () => {
    const mockHandlers = {
      onNewMesh: vi.fn(),
      onSaveMesh: vi.fn(),
      onLoadMesh: vi.fn(),
      onExportMesh: vi.fn(),
    };

    render(
      <DocMeshControls
        currentMesh={null}
        savedMeshes={[]}
        {...mockHandlers}
      />
    );

    const exportMeshButton = screen.getByText('Export Mesh').closest('button') as HTMLButtonElement;
    expect(exportMeshButton).not.toBeNull();
    expect(exportMeshButton.disabled).toBe(true);
  });

  it('renders mesh selection dropdown when saved meshes exist', () => {
    const mockHandlers = {
      onNewMesh: vi.fn(),
      onSaveMesh: vi.fn(),
      onLoadMesh: vi.fn(),
      onExportMesh: vi.fn(),
    };

    render(
      <DocMeshControls
        currentMesh={mockMesh}
        savedMeshes={mockSavedMeshes}
        {...mockHandlers}
      />
    );

    expect(screen.getByLabelText('Select saved mesh')).not.toBeNull();
    expect(screen.getByText('Test Mesh (1 nodes)')).not.toBeNull();
    expect(screen.getByText('Another Mesh (1 nodes)')).not.toBeNull();
  });

  it('calls onLoadMesh when selecting a different mesh from dropdown', () => {
    const onLoadMesh = vi.fn();
    const mockHandlers = {
      onNewMesh: vi.fn(),
      onSaveMesh: vi.fn(),
      onLoadMesh,
      onExportMesh: vi.fn(),
    };

    render(
      <DocMeshControls
        currentMesh={mockMesh}
        savedMeshes={mockSavedMeshes}
        {...mockHandlers}
      />
    );

    const dropdown = screen.getByLabelText('Select saved mesh');
    fireEvent.change(dropdown, { target: { value: 'mesh-2' } });

    // Should show confirmation dialog first
    expect(screen.getByText('Load Mesh')).not.toBeNull();
    expect(screen.getByText(/Loading a different mesh will discard/)).not.toBeNull();

    // Click Continue button
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);

    expect(onLoadMesh).toHaveBeenCalledWith('mesh-2');
  });

  it('displays current mesh information', () => {
    const mockHandlers = {
      onNewMesh: vi.fn(),
      onSaveMesh: vi.fn(),
      onLoadMesh: vi.fn(),
      onExportMesh: vi.fn(),
    };

    render(
      <DocMeshControls
        currentMesh={mockMesh}
        savedMeshes={[]}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Current Mesh')).not.toBeNull();
    expect(screen.getByText('Test Mesh')).not.toBeNull();
    expect(screen.getByText('1 node')).not.toBeNull();
  });

  it('shows confirmation dialog when creating new mesh with existing mesh', () => {
    const onNewMesh = vi.fn();
    const mockHandlers = {
      onNewMesh,
      onSaveMesh: vi.fn(),
      onLoadMesh: vi.fn(),
      onExportMesh: vi.fn(),
    };

    render(
      <DocMeshControls
        currentMesh={mockMesh}
        savedMeshes={[]}
        {...mockHandlers}
      />
    );

    const newMeshButton = screen.getByText('New Mesh');
    fireEvent.click(newMeshButton);

    // Should show confirmation dialog
    expect(screen.getByText('Create New Mesh')).not.toBeNull();
    expect(screen.getByText(/Creating a new mesh will discard/)).not.toBeNull();

    // Click Continue button
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);

    expect(onNewMesh).toHaveBeenCalledTimes(1);
  });

  it('allows canceling confirmation dialog', () => {
    const onNewMesh = vi.fn();
    const mockHandlers = {
      onNewMesh,
      onSaveMesh: vi.fn(),
      onLoadMesh: vi.fn(),
      onExportMesh: vi.fn(),
    };

    render(
      <DocMeshControls
        currentMesh={mockMesh}
        savedMeshes={[]}
        {...mockHandlers}
      />
    );

    const newMeshButton = screen.getByText('New Mesh');
    fireEvent.click(newMeshButton);

    // Click Cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onNewMesh).not.toHaveBeenCalled();
    expect(screen.queryByText('Create New Mesh')).toBeNull();
  });
});
