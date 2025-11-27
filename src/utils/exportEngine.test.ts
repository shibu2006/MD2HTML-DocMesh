import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ExportEngine } from './exportEngine';
import type { MarkdownFile, ExportSettings } from '../types';

// Helper to create a markdown file for testing
const createMarkdownFile = (name: string, content: string): MarkdownFile => ({
  id: crypto.randomUUID(),
  name,
  content,
  size: content.length,
  uploadDate: new Date()
});

// Helper to create default export settings
const createExportSettings = (overrides?: Partial<ExportSettings>): ExportSettings => ({
  outputFormat: 'html5-complete',
  theme: 'github-light',
  fontFamily: 'system',
  fontSize: 'medium',
  includeTOC: false,
  tocPosition: 'top-of-page',
  sanitizeHTML: false,
  includeCSS: true,
  minifyOutput: false,
  highlightCode: true,
  ...overrides
});

describe('ExportEngine', () => {
  describe('Property 22: HTML5 Complete includes document structure', () => {
    // Feature: md2html-docmesh, Property 22: HTML5 Complete includes document structure
    // Validates: Requirements 9.1
    it('should include DOCTYPE, html, head, and body tags for any markdown content', () => {
      fc.assert(
        fc.property(
          fc.string(), // Random markdown content
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('.')), // Random filename without extension
          (content, filename) => {
            const file = createMarkdownFile(`${filename}.md`, content);
            const settings = createExportSettings({ outputFormat: 'html5-complete' });

            const html = ExportEngine.generateHTML(file, settings);

            // Check for required HTML5 Complete structure
            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toMatch(/<html[^>]*>/);
            expect(html).toContain('<head>');
            expect(html).toContain('</head>');
            expect(html).toContain('<meta charset="UTF-8">');
            expect(html).toContain('<meta name="viewport"');
            expect(html).toContain('<title>');
            expect(html).toContain('</title>');
            expect(html).toContain('<body>');
            expect(html).toContain('</body>');
            expect(html).toContain('</html>');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 23: HTML Fragment excludes document structure', () => {
    // Feature: md2html-docmesh, Property 23: HTML Fragment excludes document structure
    // Validates: Requirements 9.2
    it('should not include DOCTYPE, html, head, or body tags for any markdown content', () => {
      fc.assert(
        fc.property(
          fc.string(), // Random markdown content
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('.')), // Random filename without extension
          (content, filename) => {
            const file = createMarkdownFile(`${filename}.md`, content);
            const settings = createExportSettings({ outputFormat: 'html-fragment' });

            const html = ExportEngine.generateHTML(file, settings);

            // Check that HTML Fragment does NOT contain document structure
            expect(html).not.toContain('<!DOCTYPE html>');
            expect(html).not.toContain('<html');
            expect(html).not.toContain('</html>');
            expect(html).not.toContain('<head>');
            expect(html).not.toContain('</head>');
            expect(html).not.toContain('<body>');
            expect(html).not.toContain('</body>');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 28: Minification removes whitespace', () => {
    // Feature: md2html-docmesh, Property 28: Minification removes whitespace
    // Validates: Requirements 9.7
    it('should remove unnecessary newlines and multiple spaces while preserving pre/code content', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }), // Random markdown content
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('.')), // Random filename without extension
          (content, filename) => {
            const file = createMarkdownFile(`${filename}.md`, content);
            const settingsWithMinify = createExportSettings({
              outputFormat: 'html5-complete',
              minifyOutput: true
            });
            const settingsWithoutMinify = createExportSettings({
              outputFormat: 'html5-complete',
              minifyOutput: false
            });

            const minifiedHTML = ExportEngine.generateHTML(file, settingsWithMinify);
            const normalHTML = ExportEngine.generateHTML(file, settingsWithoutMinify);

            // Minified HTML should not contain newlines (except in pre/code blocks)
            // Extract pre blocks first
            const preBlocks = minifiedHTML.match(/<pre[^>]*>[\s\S]*?<\/pre>/gi) || [];
            const htmlWithoutPre = minifiedHTML.replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, '');

            // Check that non-pre content has no newlines
            expect(htmlWithoutPre).not.toContain('\n');

            // Check that there are no multiple consecutive spaces outside pre blocks
            expect(htmlWithoutPre).not.toMatch(/\s{2,}/);

            // Minified should be shorter or equal in length (unless content is already minimal)
            expect(minifiedHTML.length).toBeLessThanOrEqual(normalHTML.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 26: Sanitization removes dangerous content', () => {
    // Feature: md2html-docmesh, Property 26: Sanitization removes dangerous content
    // Validates: Requirements 9.5
    it('should remove script tags, event handlers, and dangerous content while preserving safe content', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            // Test various dangerous HTML patterns
            '<script>alert("xss")</script>Hello World',
            'Click <a href="javascript:alert(1)">here</a>',
            '<img src="x" onerror="alert(1)">',
            '<div onclick="alert(1)">Click me</div>',
            '<iframe src="evil.com"></iframe>',
            'Safe content <strong>bold</strong> text',
            '<p>Normal paragraph</p><script>evil()</script>',
            '<a href="http://example.com" onclick="steal()">Link</a>'
          ),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('.')),
          (dangerousContent, filename) => {
            // Create markdown that will produce the dangerous HTML
            const file = createMarkdownFile(`${filename}.md`, dangerousContent);
            const settings = createExportSettings({
              outputFormat: 'html-fragment',
              sanitizeHTML: true
            });

            const html = ExportEngine.generateHTML(file, settings);

            // Check that dangerous content is removed
            expect(html).not.toContain('<script');
            expect(html).not.toContain('</script>');
            expect(html).not.toContain('javascript:');
            expect(html).not.toContain('onerror=');
            expect(html).not.toContain('onclick=');
            expect(html).not.toContain('<iframe');

            // Safe content should be preserved (if it was in the original)
            if (dangerousContent.includes('bold') || dangerousContent.includes('strong')) {
              // The word "bold" or tag should still be there
              expect(html.toLowerCase()).toMatch(/bold|strong/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 32: ZIP contains all workspace files', () => {
    // Feature: md2html-docmesh, Property 32: ZIP contains all workspace files
    // Validates: Requirements 11.2
    it('should generate a ZIP archive containing exactly N HTML files for N markdown files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.stringMatching(/^[a-zA-Z0-9_-]{1,30}$/),
              content: fc.string()
            }),
            { minLength: 1, maxLength: 10 }
          ).map(arr => {
            // Ensure unique filenames by appending index if needed
            const seen = new Set<string>();
            return arr.map((item, idx) => {
              let name = item.name;
              if (seen.has(name)) {
                name = `${name}_${idx}`;
              }
              seen.add(name);
              return { ...item, name };
            });
          }),
          async (fileData) => {
            // Create markdown files from the generated data
            const files = fileData.map(data =>
              createMarkdownFile(`${data.name}.md`, data.content)
            );

            const settings = createExportSettings();

            // Generate ZIP
            const zipBlob = await ExportEngine.generateZIP(files, settings);

            // Verify it's a valid blob
            expect(zipBlob).toBeInstanceOf(Blob);
            expect(zipBlob.size).toBeGreaterThan(0);

            // Load the ZIP and verify contents
            const JSZip = (await import('jszip')).default;
            const zip = await JSZip.loadAsync(zipBlob);

            // Get all files in the ZIP
            const zipFiles = Object.keys(zip.files);

            // Should have exactly N files
            expect(zipFiles.length).toBe(files.length);

            // Each markdown file should have a corresponding HTML file in the ZIP
            for (const file of files) {
              const expectedFilename = file.name.replace(/\.md$/, '.html');
              expect(zipFiles).toContain(expectedFilename);

              // Verify the file exists and has content
              const zipFile = zip.files[expectedFilename];
              expect(zipFile).toBeDefined();

              const content = await zipFile.async('string');
              expect(content.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 24: Font family included in export', () => {
    // Feature: md2html-docmesh, Property 24: Font family included in export
    // Validates: Requirements 9.3
    it('should include the selected font family styles in the exported HTML', () => {
      fc.assert(
        fc.property(
          fc.string(), // Random markdown content
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('.')), // Random filename
          fc.constantFrom('system' as const, 'inter' as const, 'roboto' as const, 'monospace' as const), // Font family
          (content, filename, fontFamily) => {
            const file = createMarkdownFile(`${filename}.md`, content);
            const settings = createExportSettings({
              outputFormat: 'html5-complete',
              fontFamily,
              includeCSS: true
            });

            const html = ExportEngine.generateHTML(file, settings);

            // Check that the HTML contains font-family CSS
            expect(html).toContain('font-family:');

            // Check for specific font family strings based on selection
            switch (fontFamily) {
              case 'system':
                expect(html).toMatch(/-apple-system|BlinkMacSystemFont/);
                break;
              case 'inter':
                expect(html).toContain('Inter');
                break;
              case 'roboto':
                expect(html).toContain('Roboto');
                break;
              case 'monospace':
                expect(html).toMatch(/Courier|monospace/);
                break;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 25: Font size included in export', () => {
    // Feature: md2html-docmesh, Property 25: Font size included in export
    // Validates: Requirements 9.4
    it('should include the selected font size styles in the exported HTML', () => {
      fc.assert(
        fc.property(
          fc.string(), // Random markdown content
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('.')), // Random filename
          fc.constantFrom('small' as const, 'medium' as const, 'large' as const, 'extra-large' as const), // Font size
          (content, filename, fontSize) => {
            const file = createMarkdownFile(`${filename}.md`, content);
            const settings = createExportSettings({
              outputFormat: 'html5-complete',
              fontSize,
              includeCSS: true
            });

            const html = ExportEngine.generateHTML(file, settings);

            // Check that the HTML contains font-size CSS
            expect(html).toContain('font-size:');

            // Check for specific font size values based on selection
            switch (fontSize) {
              case 'small':
                expect(html).toContain('14px');
                break;
              case 'medium':
                expect(html).toContain('16px');
                break;
              case 'large':
                expect(html).toContain('18px');
                break;
              case 'extra-large':
                expect(html).toContain('20px');
                break;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 27: CSS inclusion in export', () => {
    // Feature: md2html-docmesh, Property 27: CSS inclusion in export
    // Validates: Requirements 9.6
    it('should include theme and typography styles when includeCSS is enabled', () => {
      fc.assert(
        fc.property(
          fc.string(), // Random markdown content
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('.')), // Random filename
          fc.constantFrom(
            'github-light' as const,
            'github-dark' as const,
            'dracula' as const,
            'monokai' as const,
            'sky-blue' as const,
            'solarized-light' as const,
            'nord' as const
          ), // Theme
          (content, filename, theme) => {
            const file = createMarkdownFile(`${filename}.md`, content);

            // Test with CSS enabled
            const settingsWithCSS = createExportSettings({
              outputFormat: 'html5-complete',
              theme,
              includeCSS: true
            });

            const htmlWithCSS = ExportEngine.generateHTML(file, settingsWithCSS);

            // Should contain style tag and CSS properties
            expect(htmlWithCSS).toContain('<style>');
            expect(htmlWithCSS).toContain('</style>');
            expect(htmlWithCSS).toContain('background-color:');
            expect(htmlWithCSS).toContain('color:');
            expect(htmlWithCSS).toContain('font-family:');
            expect(htmlWithCSS).toContain('font-size:');

            // Test with CSS disabled
            const settingsWithoutCSS = createExportSettings({
              outputFormat: 'html5-complete',
              theme,
              includeCSS: false
            });

            const htmlWithoutCSS = ExportEngine.generateHTML(file, settingsWithoutCSS);

            // Should not contain style tag
            expect(htmlWithoutCSS).not.toContain('<style>');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 29: Highlight CSS included when enabled', () => {
    // Feature: md2html-docmesh, Property 29: Highlight CSS included when enabled
    // Validates: Requirements 9.8
    it('should include syntax highlighting CSS when highlightCode is enabled', () => {
      fc.assert(
        fc.property(
          fc.string(), // Random markdown content
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('.')), // Random filename
          (content, filename) => {
            const file = createMarkdownFile(`${filename}.md`, content);

            // Test with highlight enabled
            const settingsWithHighlight = createExportSettings({
              outputFormat: 'html5-complete',
              highlightCode: true,
              includeCSS: true
            });

            const htmlWithHighlight = ExportEngine.generateHTML(file, settingsWithHighlight);

            // Should contain syntax highlighting CSS classes
            expect(htmlWithHighlight).toMatch(/\.hljs|Syntax Highlighting/);

            // Test with highlight disabled
            const settingsWithoutHighlight = createExportSettings({
              outputFormat: 'html5-complete',
              highlightCode: false,
              includeCSS: true
            });

            const htmlWithoutHighlight = ExportEngine.generateHTML(file, settingsWithoutHighlight);

            // Should not contain syntax highlighting CSS
            expect(htmlWithoutHighlight).not.toMatch(/\.hljs|Syntax Highlighting/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});