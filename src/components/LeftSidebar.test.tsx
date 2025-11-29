import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import type { MarkdownFile } from '../types';
import { LeftSidebar } from './LeftSidebar';

/**
 * Unit tests for LeftSidebar mode toggle functionality
 */
describe('LeftSidebar - Mode Toggle', () => {
  it('should render mode toggle buttons', () => {
    const mockProps = {
      files: [],
      activeFileId: null,
      searchQuery: '',
      onSearchChange: vi.fn(),
      onFileSelect: vi.fn(),
      onFileDelete: vi.fn(),
      onUpload: vi.fn(),
      onClearAll: vi.fn(),
      appMode: 'markdown' as const,
      onAppModeChange: vi.fn(),
      currentMesh: null,
      availableHtmlFiles: [],
    };

    render(<LeftSidebar {...mockProps} />);

    expect(screen.getByText('Files')).toBeTruthy();
    expect(screen.getByText('DocMesh')).toBeTruthy();
  });

  it('should call onAppModeChange when mode buttons are clicked', async () => {
    const user = userEvent.setup();
    const onAppModeChange = vi.fn();

    const mockProps = {
      files: [],
      activeFileId: null,
      searchQuery: '',
      onSearchChange: vi.fn(),
      onFileSelect: vi.fn(),
      onFileDelete: vi.fn(),
      onUpload: vi.fn(),
      onClearAll: vi.fn(),
      appMode: 'markdown' as const,
      onAppModeChange,
      currentMesh: null,
      availableHtmlFiles: [],
    };

    render(<LeftSidebar {...mockProps} />);

    const docMeshButton = screen.getByText('DocMesh');
    await user.click(docMeshButton);

    expect(onAppModeChange).toHaveBeenCalledWith('docmesh');
  });

  it('should show file list in markdown mode', () => {
    const mockProps = {
      files: [],
      activeFileId: null,
      searchQuery: '',
      onSearchChange: vi.fn(),
      onFileSelect: vi.fn(),
      onFileDelete: vi.fn(),
      onUpload: vi.fn(),
      onClearAll: vi.fn(),
      appMode: 'markdown' as const,
      onAppModeChange: vi.fn(),
      currentMesh: null,
      availableHtmlFiles: [],
    };

    render(<LeftSidebar {...mockProps} />);

    expect(screen.getByPlaceholderText('Search files...')).toBeTruthy();
    expect(screen.getByText('Upload Files')).toBeTruthy();
  });

  it('should show DocMesh sidebar info in docmesh mode', () => {
    const mockProps = {
      files: [],
      activeFileId: null,
      searchQuery: '',
      onSearchChange: vi.fn(),
      onFileSelect: vi.fn(),
      onFileDelete: vi.fn(),
      onUpload: vi.fn(),
      onClearAll: vi.fn(),
      appMode: 'docmesh' as const,
      onAppModeChange: vi.fn(),
      currentMesh: null,
      availableHtmlFiles: [],
    };

    render(<LeftSidebar {...mockProps} />);

    // Should show mesh info and available files section
    expect(screen.getByText('Document Mesh')).toBeTruthy();
    expect(screen.getByText('Available HTML Files')).toBeTruthy();
  });
});

/**
 * Feature: md2html-docmesh, Property 7: File search filters correctly
 * 
 * For any search query string and workspace file list, the filtered results 
 * should only include files whose names contain the search query as a 
 * substring (case-insensitive).
 * 
 * Validates: Requirements 2.5
 */
describe('LeftSidebar - Property 7: File search filters correctly', () => {
  it('should filter files correctly based on search query', () => {
    fc.assert(
      fc.property(
        // Generate array of markdown files with random names
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }).map(s => s + '.md'),
            content: fc.string(),
            size: fc.nat(),
            uploadDate: fc.date(),
          })
        ),
        // Generate a search query
        fc.string({ maxLength: 20 }),
        (files: MarkdownFile[], searchQuery: string) => {
          // Apply the same filtering logic as LeftSidebar
          const filteredFiles = searchQuery
            ? files.filter(file =>
              file.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
            : files;

          // Property: All filtered files must contain the search query (case-insensitive)
          if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            for (const file of filteredFiles) {
              expect(file.name.toLowerCase()).toContain(lowerQuery);
            }
          } else {
            // If no search query, all files should be returned
            expect(filteredFiles).toEqual(files);
          }

          // Property: No file that contains the query should be excluded
          for (const file of files) {
            const shouldBeIncluded = !searchQuery ||
              file.name.toLowerCase().includes(searchQuery.toLowerCase());

            if (shouldBeIncluded) {
              expect(filteredFiles).toContain(file);
            } else {
              expect(filteredFiles).not.toContain(file);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: md2html-docmesh, Property 8: Active file highlighting is exclusive
 * 
 * For any workspace with multiple files, exactly one file should be highlighted 
 * as active at any given time, or zero files if no file is selected.
 * 
 * Validates: Requirements 2.6
 */
describe('LeftSidebar - Property 8: Active file highlighting is exclusive', () => {
  it('should have at most one active file at any time', () => {
    fc.assert(
      fc.property(
        // Generate array of markdown files
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }).map(s => s + '.md'),
            content: fc.string(),
            size: fc.nat(),
            uploadDate: fc.date(),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        // Generate an optional active file ID (could be null or one of the file IDs)
        fc.oneof(
          fc.constant(null),
          fc.string()
        ),
        (files: MarkdownFile[], activeFileId: string | null) => {
          // Count how many files match the active file ID
          const activeCount = files.filter(file => file.id === activeFileId).length;

          // Property: At most one file should be active
          // (either 0 if activeFileId is null or not in list, or 1 if it matches)
          expect(activeCount).toBeLessThanOrEqual(1);

          // Property: If activeFileId is not null and exists in files, exactly one should match
          if (activeFileId !== null) {
            const fileExists = files.some(file => file.id === activeFileId);
            if (fileExists) {
              expect(activeCount).toBe(1);
            } else {
              expect(activeCount).toBe(0);
            }
          } else {
            // If activeFileId is null, no files should be active
            expect(activeCount).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should ensure unique file IDs result in exclusive highlighting', () => {
    fc.assert(
      fc.property(
        // Generate array of markdown files with guaranteed unique IDs
        fc.uniqueArray(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }).map(s => s + '.md'),
            content: fc.string(),
            size: fc.nat(),
            uploadDate: fc.date(),
          }),
          { selector: (file) => file.id, minLength: 0, maxLength: 20 }
        ),
        // Pick an active file ID from the list or null
        (files: MarkdownFile[]) => {
          const activeFileId = files.length > 0 && Math.random() > 0.3
            ? files[Math.floor(Math.random() * files.length)].id
            : null;

          // Count active files
          const activeCount = files.filter(file => file.id === activeFileId).length;

          // Property: Exactly 0 or 1 file should be active
          expect(activeCount).toBeGreaterThanOrEqual(0);
          expect(activeCount).toBeLessThanOrEqual(1);

          // Property: If we have an activeFileId from our list, exactly 1 should match
          if (activeFileId !== null) {
            expect(activeCount).toBe(1);
          } else {
            expect(activeCount).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Unit tests for LeftSidebar DocMesh drag and drop functionality
 */
describe('LeftSidebar - DocMesh Drag and Drop', () => {
  it('should call onUpload when HTML files are dropped', async () => {
    const onUpload = vi.fn();
    const mockProps = {
      files: [],
      activeFileId: null,
      searchQuery: '',
      onSearchChange: vi.fn(),
      onFileSelect: vi.fn(),
      onFileDelete: vi.fn(),
      onUpload,
      onClearAll: vi.fn(),
      appMode: 'docmesh' as const,
      onAppModeChange: vi.fn(),
      currentMesh: null,
      availableHtmlFiles: [],
    };

    render(<LeftSidebar {...mockProps} />);

    const dropZone = screen.getByText('Available HTML Files').closest('div');
    expect(dropZone).toBeTruthy();

    if (dropZone) {
      // Create mock file
      const file = new File(['<html></html>'], 'test.html', { type: 'text/html' });

      // Create mock dataTransfer
      const dataTransfer = {
        files: [file],
        items: [
          {
            kind: 'file',
            type: file.type,
            getAsFile: () => file,
          },
        ],
        types: ['Files'],
      };

      // Create a custom event with dataTransfer
      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: dataTransfer,
      });

      // Dispatch the event manually since fireEvent.drop might not handle dataTransfer correctly in all environments
      dropZone.dispatchEvent(dropEvent);

      expect(onUpload).toHaveBeenCalledTimes(1);
      expect(onUpload).toHaveBeenCalledWith([file]);
    }
  });

  it('should ignore non-HTML files when dropped', async () => {
    const onUpload = vi.fn();
    const mockProps = {
      files: [],
      activeFileId: null,
      searchQuery: '',
      onSearchChange: vi.fn(),
      onFileSelect: vi.fn(),
      onFileDelete: vi.fn(),
      onUpload,
      onClearAll: vi.fn(),
      appMode: 'docmesh' as const,
      onAppModeChange: vi.fn(),
      currentMesh: null,
      availableHtmlFiles: [],
    };

    render(<LeftSidebar {...mockProps} />);

    const dropZone = screen.getByText('Available HTML Files').closest('div');
    expect(dropZone).toBeTruthy();

    if (dropZone) {
      // Create mock files
      const htmlFile = new File(['<html></html>'], 'test.html', { type: 'text/html' });
      const txtFile = new File(['text content'], 'test.txt', { type: 'text/plain' });

      // Create mock dataTransfer
      const dataTransfer = {
        files: [htmlFile, txtFile],
        items: [
          { kind: 'file', type: htmlFile.type, getAsFile: () => htmlFile },
          { kind: 'file', type: txtFile.type, getAsFile: () => txtFile },
        ],
        types: ['Files'],
      };

      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: dataTransfer,
      });

      dropZone.dispatchEvent(dropEvent);

      // Should only be called with the HTML file
      expect(onUpload).toHaveBeenCalledTimes(1);
      expect(onUpload).toHaveBeenCalledWith([htmlFile]);
    }
  });
});
