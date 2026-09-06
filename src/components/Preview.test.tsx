import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import * as fc from 'fast-check';
import { Preview } from './Preview';
import type { MarkdownFile, ExportSettings } from '../types';
import { ThemeManager } from '../utils';

describe('Preview Property-Based Tests', () => {
  // Feature: md2html-docmesh, Property 14: Theme selection updates preview
  // Validates: Requirements 7.1, 7.2
  it('Property 14: Theme selection updates preview', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'github-light',
          'github-dark',
          'dracula',
          'monokai',
          'sky-blue',
          'solarized-light',
          'nord'
        ),
        fc.string({ minLength: 10, maxLength: 500 }),
        (theme, markdownContent) => {
          // Create a mock file
          const mockFile: MarkdownFile = {
            id: 'test-id',
            name: 'test.md',
            content: markdownContent,
            size: markdownContent.length,
            uploadDate: new Date(),
          };

          // Create export settings with the selected theme
          const exportSettings: ExportSettings = {
            outputFormat: 'html5-complete',
            theme: theme as any,
            fontFamily: 'system',
            fontSize: 'medium',
            includeTOC: false,
            tocPosition: 'left-sidebar',
            sanitizeHTML: true,
            includeCSS: true,
            minifyOutput: false,
            highlightCode: true,
          };

          // Get expected theme styles
          const expectedStyles = ThemeManager.getThemeStyles(theme as any);

          // Render the Preview component
          const { container } = render(
            <Preview activeFile={mockFile} exportSettings={exportSettings} />
          );

          // Find the main content div (should have prose class)
          const contentDiv = container.querySelector('.prose');
          expect(contentDiv).toBeTruthy();

          // Verify theme styles are applied
          if (contentDiv) {
            const styles = window.getComputedStyle(contentDiv);
            const bgColor = (contentDiv as HTMLElement).style.backgroundColor;
            const textColor = (contentDiv as HTMLElement).style.color;

            // Verify background color matches theme
            expect(bgColor).toBe(expectedStyles.backgroundColor);

            // Verify text color matches theme
            expect(textColor).toBe(expectedStyles.textColor);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: md2html-docmesh, Property 21: TOC top position placement
  // Validates: Requirements 6.5
  // Feature: md2html-docmesh, Property 21: TOC placement
  // Validates: Requirements 6.5
  it('Property 21: TOC placement (after H1 if present, else top)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            level: fc.constantFrom(2, 3),
            text: fc.string({ minLength: 5, maxLength: 50 })
              .filter(s => s.trim().length > 0)
              .filter(s => /[a-z0-9]/i.test(s))
              .map(s => s.replace(/[^a-z0-9\s]/gi, '')),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        fc.boolean(),
        (headers, hasH1) => {
          // Build markdown
          let markdown = '';
          if (hasH1) {
            markdown += '# Main Title\n\n';
          }

          for (const header of headers) {
            markdown += `${'#'.repeat(header.level)} ${header.text}\n\n`;
            markdown += `Some content under this header.\n\n`;
          }

          // Create a mock file
          const mockFile: MarkdownFile = {
            id: 'test-id',
            name: 'test.md',
            content: markdown,
            size: markdown.length,
            uploadDate: new Date(),
          };

          // Create export settings with TOC enabled and top position
          const exportSettings: ExportSettings = {
            outputFormat: 'html5-complete',
            theme: 'github-light',
            fontFamily: 'system',
            fontSize: 'medium',
            includeTOC: true,
            tocPosition: 'top-of-page',
            sanitizeHTML: true,
            includeCSS: true,
            minifyOutput: false,
            highlightCode: true,
          };

          // Render the Preview component
          const { container } = render(
            <Preview activeFile={mockFile} exportSettings={exportSettings} />
          );

          // Get the main container
          const mainDiv = container.querySelector('.prose');
          expect(mainDiv).toBeTruthy();

          if (mainDiv) {
            // Get all child elements
            const children = Array.from(mainDiv.children);

            // Should have style and content div
            expect(children.length).toBeGreaterThan(1);

            const contentDiv = children[1] as HTMLElement;
            const tocNav = contentDiv.querySelector('nav.toc');
            expect(tocNav).toBeTruthy();

            if (hasH1) {
              const h1 = contentDiv.querySelector('h1');
              expect(h1).toBeTruthy();
              // Verify TOC follows H1
              // compareDocumentPosition returns a bitmask. 4 means FOLLOWING.
              const position = h1!.compareDocumentPosition(tocNav!);
              expect(position & 4).toBeTruthy();
            } else {
              // Verify TOC is the first element
              expect(contentDiv.firstElementChild).toBe(tocNav);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: md2html-docmesh, Property 30: Syntax highlighting in preview
  // Validates: Requirements 7.3
  it('Property 30: Syntax highlighting CSS is injected when enabled', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (highlightCode) => {
          // Mock file
          const mockFile: MarkdownFile = {
            id: 'test-id',
            name: 'test.md',
            content: '```javascript\nconsole.log("hello");\n```',
            size: 30,
            uploadDate: new Date(),
          };

          // Settings
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
            highlightCode: highlightCode,
          };

          // Render
          const { container } = render(
            <Preview activeFile={mockFile} exportSettings={exportSettings} />
          );

          // Find style tag
          const styleTag = container.querySelector('style');
          expect(styleTag).toBeTruthy();

          if (styleTag) {
            const cssContent = styleTag.textContent || '';
            if (highlightCode) {
              expect(cssContent).toContain('.hljs');
              expect(cssContent).toContain('Syntax Highlighting');
            } else {
              expect(cssContent).not.toContain('Syntax Highlighting');
              // Note: .hljs might be present if we didn't strictly clean up, but the comment should definitely be there/not there
              // Our implementation appends the whole block which starts with the comment.
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('paints cloned heading, link, and table colors instead of a generic accent', () => {
    const mockFile: MarkdownFile = {
      id: 'clone-preview',
      name: 'trace.md',
      content: '# Voice search\n\nSee [docs](#docs).\n\n| Field | Value |\n| --- | --- |\n| turn | 1 |\n',
      size: 80,
      uploadDate: new Date(),
    };

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
      highlightCode: false,
      clonedStyle: {
        sourceType: 'file',
        sourceLabel: 'Voice Turn Lifecycle.html',
        colors: {
          backgroundColor: '#0f172a',
          textColor: '#e2e8f0',
          accentColor: '#0b1220',
          codeBlockBg: '#1e293b',
        },
        headingColor: '#38bdf8',
        linkColor: '#38bdf8',
        tableHeaderBg: '#1e293b',
        tableHeaderColor: '#f8fafc',
        tableBorderColor: '#334155',
        isDark: true,
        stylesheetCount: 4,
      },
    };

    const { container } = render(
      <Preview activeFile={mockFile} exportSettings={exportSettings} />
    );

    const css = container.querySelector('style')?.textContent || '';
    expect(css).toContain('#38bdf8');
    expect(css).toContain('#1e293b');
    expect(css).toContain('#334155');
    expect(css).toMatch(/\.preview-content h1[\s\S]*color:\s*#38bdf8/);
    expect(css).toMatch(/\.preview-content a[\s\S]*color:\s*#38bdf8/);
    expect(css).toMatch(/\.preview-content th[\s\S]*background-color:\s*#1e293b/);
  });

  it('injects scoped cloned CSS from the uploaded HTML into the preview', () => {
    const mockFile: MarkdownFile = {
      id: 'clone-css-preview',
      name: 'trace.md',
      content: '# Voice Turn Lifecycle\n',
      size: 20,
      uploadDate: new Date(),
    };

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
      highlightCode: false,
      clonedStyle: {
        sourceType: 'file',
        sourceLabel: 'Voice Turn Lifecycle.html',
        colors: {
          backgroundColor: '#0E1218',
          textColor: '#E7ECF1',
          accentColor: '#52B4BF',
          codeBlockBg: '#0A0E13',
        },
        clonedCss: 'h1 { font-size: 3rem; } .eyebrow { color: teal; }',
        isDark: true,
        stylesheetCount: 1,
      },
    };

    const { container } = render(
      <Preview activeFile={mockFile} exportSettings={exportSettings} />
    );

    const css = Array.from(container.querySelectorAll('style')).map(node => node.textContent || '').join('\n');
    expect(css).toContain('.preview-content h1 { font-size: 3rem; }');
    expect(css).toContain('.preview-content .eyebrow { color: teal; }');
  });

  it('keeps links and inline code readable on a dark cloned background', () => {
    const mockFile: MarkdownFile = {
      id: 'contrast-preview',
      name: 'trace.md',
      content: 'See [suggestion chips](#chips) and `logs/bond007.json`.\n',
      size: 40,
      uploadDate: new Date(),
    };

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
      highlightCode: false,
      clonedStyle: {
        sourceType: 'file',
        sourceLabel: 'Voice Turn Lifecycle.html',
        colors: {
          backgroundColor: '#1a1a19',
          textColor: '#f0efec',
          accentColor: '#52B4BF',
          codeBlockBg: '#11161D',
        },
        linkColor: '#0F6E7A',
        clonedCss: 'a { color: #0F6E7A; } code { color: #1e3a5f; }',
        isDark: true,
        stylesheetCount: 4,
      },
    };

    const { container } = render(
      <Preview activeFile={mockFile} exportSettings={exportSettings} />
    );

    const preview = container.querySelector('.preview-content');
    expect(preview?.className).toMatch(/prose-invert/);
    const css = Array.from(container.querySelectorAll('style')).map(node => node.textContent || '').join('\n');
    expect(css).toMatch(/contrast-safe|Readable on dark paper/i);
    expect(css).toMatch(/\.preview-content a[\s\S]*color:\s*(#52B4BF|#f0efec)/i);
    expect(css).toMatch(/\.preview-content :not\(pre\) > code[\s\S]*color:\s*#f0efec/i);
  });
});
