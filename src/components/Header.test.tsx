import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import * as fc from 'fast-check';
import { Header } from './Header';
import type { MarkdownFile, ExportSettings } from '../types';

// Helper to create a mock file
function createMockFile(id: string, name: string): MarkdownFile {
  return {
    id,
    name,
    content: '# Test',
    size: 100,
    uploadDate: new Date(),
  };
}

// Helper to create default export settings
function createDefaultExportSettings(): ExportSettings {
  return {
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
}

describe('Header Component', () => {
  /**
   * Feature: md2html-docmesh, Property 30: Download button disabled when no active file
   * Validates: Requirements 10.2
   * 
   * For any application state where activeFileId is null, 
   * the download HTML button should be disabled.
   */
  it('property: download button disabled when no active file', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary file lists (0 to 10 files)
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 20 }).map(s => `${s}.md`),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        // Generate arbitrary UI mode
        fc.constantFrom('light' as const, 'dark' as const),
        (fileData, uiMode) => {
          // Create files from generated data
          const files = fileData.map(data => createMockFile(data.id, data.name));
          const exportSettings = createDefaultExportSettings();
          
          // Test with activeFileId = null (no active file)
          const { container, unmount } = render(
            <Header
              uiMode={uiMode}
              activeFileId={null}
              files={files}
              exportSettings={exportSettings}
              onToggleUIMode={() => {}}
            />
          );

          // Find the download HTML button by querying within the container
          const downloadButton = container.querySelector('[aria-label="Download HTML"]') as HTMLButtonElement;
          
          // Property: button should be disabled when no active file
          expect(downloadButton).not.toBeNull();
          expect(downloadButton?.disabled).toBe(true);
          
          // Cleanup after each property test iteration
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property test: download button enabled when active file exists
   * This complements Property 30 by testing the inverse condition.
   */
  it('property: download button enabled when active file exists', () => {
    fc.assert(
      fc.property(
        // Generate at least 1 file
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 20 }).map(s => `${s}.md`),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        // Generate arbitrary UI mode
        fc.constantFrom('light' as const, 'dark' as const),
        (fileData, uiMode) => {
          // Create files from generated data
          const files = fileData.map(data => createMockFile(data.id, data.name));
          const exportSettings = createDefaultExportSettings();
          
          // Pick a random file to be active
          const activeFileId = files[0].id;
          
          const { container, unmount } = render(
            <Header
              uiMode={uiMode}
              activeFileId={activeFileId}
              files={files}
              exportSettings={exportSettings}
              onToggleUIMode={() => {}}
            />
          );

          // Find the download HTML button by querying within the container
          const downloadButton = container.querySelector('[aria-label="Download HTML"]') as HTMLButtonElement;
          
          // Property: button should be enabled when active file exists
          expect(downloadButton).not.toBeNull();
          expect(downloadButton?.disabled).toBe(false);
          
          // Cleanup after each property test iteration
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property test: download all button disabled when no files
   */
  it('property: download all button disabled when no files', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary UI mode
        fc.constantFrom('light' as const, 'dark' as const),
        // Generate arbitrary activeFileId (null or some id)
        fc.option(fc.uuid(), { nil: null }),
        (uiMode, activeFileId) => {
          const exportSettings = createDefaultExportSettings();
          
          const { container, unmount } = render(
            <Header
              uiMode={uiMode}
              activeFileId={activeFileId}
              files={[]}
              exportSettings={exportSettings}
              onToggleUIMode={() => {}}
            />
          );

          // Find the download all button by querying within the container
          const downloadAllButton = container.querySelector('[aria-label="Download All as ZIP"]') as HTMLButtonElement;
          
          // Property: button should be disabled when no files
          expect(downloadAllButton).not.toBeNull();
          expect(downloadAllButton?.disabled).toBe(true);
          
          // Cleanup after each property test iteration
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
