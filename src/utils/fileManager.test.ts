import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { FileManager } from './fileManager';

describe('FileManager Property-Based Tests', () => {
  let fileManager: FileManager;

  beforeEach(() => {
    fileManager = new FileManager();
  });

  // Feature: md2html-docmesh, Property 1: File upload preserves content
  // Validates: Requirements 1.2
  it('Property 1: File upload preserves content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 0, maxLength: 10000 }), // Random markdown content
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // Random filename
        async (content, baseName) => {
          // Create a mock File object
          const fileName = baseName.endsWith('.md') ? baseName : `${baseName}.md`;
          const blob = new Blob([content], { type: 'text/plain' });
          const file = new File([blob], fileName, { type: 'text/plain' });

          // Upload the file
          const uploadedFiles = await fileManager.uploadFiles([file]);

          // Verify content is preserved
          expect(uploadedFiles).toHaveLength(1);
          expect(uploadedFiles[0].content).toBe(content);
          expect(uploadedFiles[0].name).toBe(fileName);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: md2html-docmesh, Property 2: File metadata generation
  // Validates: Requirements 1.4
  it('Property 2: File metadata generation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 0, maxLength: 5000 }),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (content, baseName) => {
          const fileName = baseName.endsWith('.md') ? baseName : `${baseName}.md`;
          const blob = new Blob([content], { type: 'text/plain' });
          const file = new File([blob], fileName, { type: 'text/plain' });

          const beforeUpload = new Date();
          const uploadedFiles = await fileManager.uploadFiles([file]);
          const afterUpload = new Date();

          expect(uploadedFiles).toHaveLength(1);
          const uploadedFile = uploadedFiles[0];

          // Verify unique ID exists and is non-empty
          expect(uploadedFile.id).toBeDefined();
          expect(uploadedFile.id.length).toBeGreaterThan(0);

          // Verify size is calculated correctly
          expect(uploadedFile.size).toBe(file.size);

          // Verify upload date is set to current time (within reasonable bounds)
          expect(uploadedFile.uploadDate.getTime()).toBeGreaterThanOrEqual(beforeUpload.getTime());
          expect(uploadedFile.uploadDate.getTime()).toBeLessThanOrEqual(afterUpload.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: md2html-docmesh, Property 3: Batch upload completeness
  // Validates: Requirements 1.5
  it('Property 3: Batch upload completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            content: fc.string({ minLength: 0, maxLength: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (fileSpecs) => {
          // Create a fresh FileManager for each test run
          const freshFileManager = new FileManager();
          
          // Create File objects from specs
          const files = fileSpecs.map((spec) => {
            const fileName = spec.name.endsWith('.md') ? spec.name : `${spec.name}.md`;
            const blob = new Blob([spec.content], { type: 'text/plain' });
            return new File([blob], fileName, { type: 'text/plain' });
          });

          // Upload all files
          const uploadedFiles = await freshFileManager.uploadFiles(files);

          // Verify all files were uploaded
          expect(uploadedFiles).toHaveLength(files.length);

          // Verify each file has correct content
          for (let i = 0; i < files.length; i++) {
            expect(uploadedFiles[i].content).toBe(fileSpecs[i].content);
            expect(uploadedFiles[i].name).toBe(files[i].name);
          }

          // Verify all files are in the workspace
          const allFiles = freshFileManager.getAllFiles();
          expect(allFiles).toHaveLength(files.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
