import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { HtmlFileManager } from './htmlFileManager';
import { ExportEngine } from './exportEngine';
import type { MarkdownFile, ExportSettings } from '../types';

describe('HtmlFileManager', () => {
  let manager: HtmlFileManager;

  beforeEach(() => {
    manager = new HtmlFileManager();
  });

  describe('Basic Operations', () => {
    it('should add and retrieve HTML files', () => {
      const htmlFile = {
        id: 'test-1',
        name: 'test.html',
        content: '<h1>Test</h1>',
        sourceType: 'upload' as const,
        generatedDate: new Date(),
        size: 100
      };

      manager.addHtmlFile(htmlFile);
      const retrieved = manager.getHtmlFile('test-1');

      expect(retrieved).toEqual(htmlFile);
    });

    it('should list all HTML files', () => {
      const file1 = {
        id: 'test-1',
        name: 'test1.html',
        content: '<h1>Test 1</h1>',
        sourceType: 'upload' as const,
        generatedDate: new Date(),
        size: 100
      };

      const file2 = {
        id: 'test-2',
        name: 'test2.html',
        content: '<h1>Test 2</h1>',
        sourceType: 'markdown' as const,
        sourceId: 'md-1',
        generatedDate: new Date(),
        size: 100
      };

      manager.addHtmlFile(file1);
      manager.addHtmlFile(file2);

      const files = manager.listHtmlFiles();
      expect(files).toHaveLength(2);
      expect(files).toContainEqual(file1);
      expect(files).toContainEqual(file2);
    });

    it('should delete HTML files', () => {
      const htmlFile = {
        id: 'test-1',
        name: 'test.html',
        content: '<h1>Test</h1>',
        sourceType: 'upload' as const,
        generatedDate: new Date(),
        size: 100
      };

      manager.addHtmlFile(htmlFile);
      manager.deleteHtmlFile('test-1');

      expect(manager.getHtmlFile('test-1')).toBeNull();
    });
  });

  describe('Markdown Export Integration', () => {
    /**
     * **Feature: docmesh-navigator, Property 3: HTML exports appear in available files**
     * **Validates: Requirements 2.1**
     * 
     * For any set of markdown files, after exporting them to HTML, 
     * all exported files should appear in the available HTML files list in DocMesh mode.
     */
    it('property: HTML exports appear in available files', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary markdown files
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}.md`),
              content: fc.string({ minLength: 1, maxLength: 1000 }),
              size: fc.integer({ min: 1, max: 10000 }),
              uploadDate: fc.date()
            }),
            { minLength: 1, maxLength: 10 }
          ),
          // Generate export settings
          fc.record({
            outputFormat: fc.constantFrom('html5-complete', 'html-fragment'),
            theme: fc.constantFrom('github-light', 'github-dark', 'dracula', 'monokai', 'sky-blue', 'solarized-light', 'nord'),
            fontFamily: fc.constantFrom('system', 'inter', 'roboto', 'merriweather', 'open-sans', 'fira-code', 'monospace'),
            fontSize: fc.constantFrom('small', 'medium', 'large', 'extra-large'),
            includeTOC: fc.boolean(),
            tocPosition: fc.constantFrom('left-sidebar', 'top-of-page'),
            sanitizeHTML: fc.boolean(),
            includeCSS: fc.boolean(),
            minifyOutput: fc.boolean(),
            highlightCode: fc.boolean()
          }),
          (markdownFiles: MarkdownFile[], settings: ExportSettings) => {
            const testManager = new HtmlFileManager();
            const exportedIds: string[] = [];

            // Export each markdown file to HTML
            for (const mdFile of markdownFiles) {
              const htmlContent = ExportEngine.generateHTML(mdFile, settings);
              const htmlFile = testManager.createFromMarkdownExport(mdFile, htmlContent, settings);
              exportedIds.push(htmlFile.id);
            }

            // Verify all exported files appear in the available files list
            const availableFiles = testManager.listHtmlFiles();
            
            // Check that we have the same number of files
            expect(availableFiles.length).toBe(markdownFiles.length);

            // Check that all exported IDs are in the available files
            const availableIds = availableFiles.map(f => f.id);
            for (const exportedId of exportedIds) {
              expect(availableIds).toContain(exportedId);
            }

            // Check that all files have correct source type
            for (const file of availableFiles) {
              expect(file.sourceType).toBe('markdown');
              expect(file.sourceId).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: docmesh-navigator, Property 19: Markdown export integration**
     * **Validates: Requirements 10.1**
     * 
     * For any markdown file, after exporting it to HTML, the resulting HTML file 
     * should immediately appear in the available files list for DocMesh inclusion.
     */
    it('property: Markdown export integration', () => {
      fc.assert(
        fc.property(
          // Generate a single markdown file
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}.md`),
            content: fc.string({ minLength: 1, maxLength: 1000 }),
            size: fc.integer({ min: 1, max: 10000 }),
            uploadDate: fc.date()
          }),
          // Generate export settings
          fc.record({
            outputFormat: fc.constantFrom('html5-complete', 'html-fragment'),
            theme: fc.constantFrom('github-light', 'github-dark', 'dracula'),
            fontFamily: fc.constantFrom('system', 'inter', 'roboto'),
            fontSize: fc.constantFrom('small', 'medium', 'large'),
            includeTOC: fc.boolean(),
            tocPosition: fc.constantFrom('left-sidebar', 'top-of-page'),
            sanitizeHTML: fc.boolean(),
            includeCSS: fc.boolean(),
            minifyOutput: fc.boolean(),
            highlightCode: fc.boolean()
          }),
          (markdownFile: MarkdownFile, settings: ExportSettings) => {
            const testManager = new HtmlFileManager();
            
            // Get initial count
            const initialCount = testManager.listHtmlFiles().length;
            expect(initialCount).toBe(0);

            // Export markdown to HTML
            const htmlContent = ExportEngine.generateHTML(markdownFile, settings);
            const htmlFile = testManager.createFromMarkdownExport(markdownFile, htmlContent, settings);

            // Verify the file immediately appears in available files
            const availableFiles = testManager.listHtmlFiles();
            expect(availableFiles.length).toBe(initialCount + 1);

            // Verify the file can be retrieved
            const retrievedFile = testManager.getHtmlFile(htmlFile.id);
            expect(retrievedFile).not.toBeNull();
            expect(retrievedFile?.id).toBe(htmlFile.id);
            expect(retrievedFile?.sourceType).toBe('markdown');
            expect(retrievedFile?.sourceId).toBe(markdownFile.id);

            // Verify it's in the markdown exports list
            const markdownExports = testManager.getMarkdownExports();
            expect(markdownExports).toContainEqual(htmlFile);

            // Verify we can find it by source ID
            const foundBySource = testManager.findBySourceId(markdownFile.id);
            expect(foundBySource).not.toBeNull();
            expect(foundBySource?.id).toBe(htmlFile.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('HTML File Upload', () => {
    it('should validate HTML content', () => {
      const validHtml = '<html><body><h1>Test</h1></body></html>';
      const validation = manager.validateHtmlFile(validHtml);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject empty content', () => {
      const validation = manager.validateHtmlFile('');
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('HTML content is empty');
    });

    it('should reject non-HTML content', () => {
      const validation = manager.validateHtmlFile('This is just plain text');
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('File Filtering', () => {
    it('should filter markdown exports', () => {
      const mdFile = {
        id: 'md-1',
        name: 'from-markdown.html',
        content: '<h1>From Markdown</h1>',
        sourceType: 'markdown' as const,
        sourceId: 'md-source-1',
        generatedDate: new Date(),
        size: 100
      };

      const uploadFile = {
        id: 'upload-1',
        name: 'uploaded.html',
        content: '<h1>Uploaded</h1>',
        sourceType: 'upload' as const,
        generatedDate: new Date(),
        size: 100
      };

      manager.addHtmlFile(mdFile);
      manager.addHtmlFile(uploadFile);

      const markdownExports = manager.getMarkdownExports();
      expect(markdownExports).toHaveLength(1);
      expect(markdownExports[0].id).toBe('md-1');
    });

    it('should filter uploaded files', () => {
      const mdFile = {
        id: 'md-1',
        name: 'from-markdown.html',
        content: '<h1>From Markdown</h1>',
        sourceType: 'markdown' as const,
        sourceId: 'md-source-1',
        generatedDate: new Date(),
        size: 100
      };

      const uploadFile = {
        id: 'upload-1',
        name: 'uploaded.html',
        content: '<h1>Uploaded</h1>',
        sourceType: 'upload' as const,
        generatedDate: new Date(),
        size: 100
      };

      manager.addHtmlFile(mdFile);
      manager.addHtmlFile(uploadFile);

      const uploadedFiles = manager.getUploadedFiles();
      expect(uploadedFiles).toHaveLength(1);
      expect(uploadedFiles[0].id).toBe('upload-1');
    });
  });

  describe('Re-export Updates', () => {
    it('should update HTML file on markdown re-export', () => {
      const markdownFile: MarkdownFile = {
        id: 'md-1',
        name: 'test.md',
        content: '# Original Content',
        size: 100,
        uploadDate: new Date()
      };

      const settings: ExportSettings = {
        outputFormat: 'html5-complete',
        theme: 'github-light',
        fontFamily: 'system',
        fontSize: 'medium',
        includeTOC: false,
        tocPosition: 'top-of-page',
        sanitizeHTML: true,
        includeCSS: true,
        minifyOutput: false,
        highlightCode: true
      };

      // Initial export
      const initialHtml = ExportEngine.generateHTML(markdownFile, settings);
      const htmlFile = manager.createFromMarkdownExport(markdownFile, initialHtml, settings);
      const initialContent = htmlFile.content;
      const initialDate = htmlFile.generatedDate;

      // Wait a bit to ensure date changes
      const waitPromise = new Promise(resolve => setTimeout(resolve, 10));
      
      waitPromise.then(() => {
        // Update markdown and re-export
        markdownFile.content = '# Updated Content';
        const updatedHtml = ExportEngine.generateHTML(markdownFile, settings);
        manager.updateFromMarkdownExport(htmlFile.id, updatedHtml);

        // Verify the file was updated
        const updatedFile = manager.getHtmlFile(htmlFile.id);
        expect(updatedFile).not.toBeNull();
        expect(updatedFile?.content).not.toBe(initialContent);
        expect(updatedFile?.content).toBe(updatedHtml);
        expect(updatedFile?.generatedDate.getTime()).toBeGreaterThanOrEqual(initialDate.getTime());
      });
    });
  });
});
