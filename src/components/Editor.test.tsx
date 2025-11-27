import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import { Editor } from './Editor';
import type { MarkdownFile } from '../types';

describe('Editor Property-Based Tests', () => {
  afterEach(() => {
    cleanup();
  });

  // Feature: md2html-docmesh, Property 10: Editor content updates file state
  // Validates: Requirements 3.2
  it('Property 10: Editor content updates file state', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random file data
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}.md`),
          content: fc.string({ minLength: 0, maxLength: 1000 }),
          size: fc.nat(),
          uploadDate: fc.date(),
        }),
        // Generate random text input
        fc.string({ minLength: 0, maxLength: 500 }),
        async (fileData, newContent) => {
          const mockFile: MarkdownFile = fileData;
          const onContentChange = vi.fn();

          // Render the Editor component
          const { rerender, unmount } = render(
            <Editor activeFile={mockFile} onContentChange={onContentChange} />
          );

          try {
            // Find the textarea
            const textarea = screen.getByRole('textbox', { name: /markdown editor/i }) as HTMLTextAreaElement;

            // Verify initial content is displayed
            expect(textarea.value).toBe(mockFile.content);

            // Simulate user input by using fireEvent.change
            // Note: We use this approach instead of userEvent.type() because userEvent has
            // limitations with consecutive spaces and special characters
            fireEvent.change(textarea, { target: { value: newContent } });

            // Verify onContentChange was called with correct parameters
            // Only verify if the content actually changed (React doesn't fire onChange for no-op changes)
            if (mockFile.content !== newContent) {
              expect(onContentChange).toHaveBeenCalled();
              
              // Get the last call to verify final state
              const lastCall = onContentChange.mock.calls[onContentChange.mock.calls.length - 1];
              expect(lastCall[0]).toBe(mockFile.id);
              expect(lastCall[1]).toBe(newContent);
            } else {
              // If content didn't change, onChange should not have been called
              expect(onContentChange).not.toHaveBeenCalled();
            }

            // Simulate parent component updating the file content
            const updatedFile = { ...mockFile, content: newContent };
            rerender(<Editor activeFile={updatedFile} onContentChange={onContentChange} />);

            // Verify the editor displays the updated content
            expect(textarea.value).toBe(newContent);
          } finally {
            // Clean up after each property test iteration
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
