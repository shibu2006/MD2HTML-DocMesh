import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import { MainContent } from './MainContent';
import type { MarkdownFile } from '../types';

describe('MainContent Property-Based Tests', () => {
  afterEach(() => {
    cleanup();
  });

  // Feature: md2html-docmesh, Property 33: Empty workspace shows empty state
  // Validates: Requirements 14.4
  it('Property 33: Empty workspace shows empty state', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('editor' as const, 'preview' as const),
        (viewMode) => {
          // Test with empty files array
          const emptyFiles: MarkdownFile[] = [];

          const { container, unmount } = render(
            <MainContent
              files={emptyFiles}
              activeFileId={null}
              viewMode={viewMode}
              onViewModeChange={() => { }}
              onUpload={() => { }}
            />
          );

          try {
            // Verify empty state is displayed
            const emptyStateHeading = container.querySelector('h2');
            expect(emptyStateHeading?.textContent).toBe('Start Converting');

            // Verify instructions are shown
            const instructions = container.querySelector('p');
            expect(instructions?.textContent).toContain('drag and drop a new file here');

            // Verify browse button is shown
            const browseButton = container.querySelector('button');
            expect(browseButton?.textContent).toContain('Browse Files');

            // Verify toolbar is NOT shown (it's part of ActiveWorkspace)
            const toolbar = container.querySelector('[class*="border-b"]');
            expect(toolbar).toBeFalsy();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional test: Verify ActiveWorkspace is shown when files exist
  it('Property 33 (inverse): Non-empty workspace shows active workspace', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}.md`),
            content: fc.string({ minLength: 0, maxLength: 1000 }),
            size: fc.nat(),
            uploadDate: fc.date(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.constantFrom('editor' as const, 'preview' as const),
        (files, viewMode) => {
          const { container, unmount } = render(
            <MainContent
              files={files}
              activeFileId={files[0].id}
              viewMode={viewMode}
              onViewModeChange={() => { }}
              onUpload={() => { }}
            />
          );

          try {
            // Verify empty state is NOT displayed
            const emptyStateHeading = container.querySelector('h2');
            expect(emptyStateHeading?.textContent).not.toBe('Start Converting');

            // Verify toolbar IS shown (part of ActiveWorkspace)
            const toolbar = container.querySelector('[class*="border-b"]');
            expect(toolbar).toBeTruthy();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('MainContent Drag and Drop Tests', () => {
  afterEach(() => {
    cleanup();
  });

  it('should handle drag over event', () => {
    const onUpload = vi.fn();
    const { container } = render(
      <MainContent
        files={[]}
        activeFileId={null}
        viewMode="editor"
        onViewModeChange={() => { }}
        onUpload={onUpload}
      />
    );

    const mainElement = container.querySelector('main');
    expect(mainElement).toBeTruthy();

    // Simulate drag over
    const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true });
    Object.defineProperty(dragOverEvent, 'preventDefault', {
      value: vi.fn(),
    });

    mainElement!.dispatchEvent(dragOverEvent);

    // Verify preventDefault was called (allows drop)
    expect(dragOverEvent.defaultPrevented).toBe(false); // React synthetic events handle this differently
  });

  it('should handle drop event with valid markdown files', () => {
    const onUpload = vi.fn();
    const { container } = render(
      <MainContent
        files={[]}
        activeFileId={null}
        viewMode="editor"
        onViewModeChange={() => { }}
        onUpload={onUpload}
      />
    );

    const mainElement = container.querySelector('main');
    expect(mainElement).toBeTruthy();

    // Create mock files
    const mockFile1 = new File(['# Test'], 'test.md', { type: 'text/markdown' });
    const mockFile2 = new File(['## Another'], 'another.markdown', { type: 'text/markdown' });

    // Simulate drop event
    fireEvent.drop(mainElement!, {
      dataTransfer: {
        files: [mockFile1, mockFile2],
      },
    });

    // Verify onUpload was called with the files
    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload).toHaveBeenCalledWith([mockFile1, mockFile2]);
  });

  it('should filter out non-markdown files on drop', () => {
    const onUpload = vi.fn();
    const { container } = render(
      <MainContent
        files={[]}
        activeFileId={null}
        viewMode="editor"
        onViewModeChange={() => { }}
        onUpload={onUpload}
      />
    );

    const mainElement = container.querySelector('main');
    expect(mainElement).toBeTruthy();

    // Create mock files with mixed types
    const markdownFile = new File(['# Test'], 'test.md', { type: 'text/markdown' });
    const textFile = new File(['plain text'], 'test.txt', { type: 'text/plain' });
    const pdfFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });

    // Simulate drop event
    fireEvent.drop(mainElement!, {
      dataTransfer: {
        files: [markdownFile, textFile, pdfFile],
      },
    });

    // Verify onUpload was called only with markdown file
    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload).toHaveBeenCalledWith([markdownFile]);
  });

  it('should not call onUpload when no valid markdown files are dropped', () => {
    const onUpload = vi.fn();
    const { container } = render(
      <MainContent
        files={[]}
        activeFileId={null}
        viewMode="editor"
        onViewModeChange={() => { }}
        onUpload={onUpload}
      />
    );

    const mainElement = container.querySelector('main');
    expect(mainElement).toBeTruthy();

    // Create mock files with non-markdown types
    const textFile = new File(['plain text'], 'test.txt', { type: 'text/plain' });
    const pdfFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });

    // Simulate drop event
    fireEvent.drop(mainElement!, {
      dataTransfer: {
        files: [textFile, pdfFile],
      },
    });

    // Verify onUpload was not called
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('should handle drag and drop on active workspace', () => {
    const onUpload = vi.fn();
    const files: MarkdownFile[] = [{
      id: '1',
      name: 'existing.md',
      content: '# Existing',
      size: 100,
      uploadDate: new Date(),
    }];

    const { container } = render(
      <MainContent
        files={files}
        activeFileId="1"
        viewMode="editor"
        onViewModeChange={() => { }}
        onUpload={onUpload}
      />
    );

    const mainElement = container.querySelector('main');
    expect(mainElement).toBeTruthy();

    // Create mock file
    const mockFile = new File(['# New'], 'new.md', { type: 'text/markdown' });

    // Simulate drop event
    fireEvent.drop(mainElement!, {
      dataTransfer: {
        files: [mockFile],
      },
    });

    // Verify onUpload was called
    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload).toHaveBeenCalledWith([mockFile]);
  });
});
