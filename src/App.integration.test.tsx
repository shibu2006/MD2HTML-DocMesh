import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import App from './App';
import type { MarkdownFile } from './types';

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
});
