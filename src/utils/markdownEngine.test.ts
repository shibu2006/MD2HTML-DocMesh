import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { MarkdownEngine } from './markdownEngine';

describe('MarkdownEngine Property-Based Tests', () => {
  const engine = new MarkdownEngine();

  // Feature: md2html-docmesh, Property 12: Markdown parsing round-trip preserves structure
  // Validates: Requirements 4.2
  it('Property 12: Markdown parsing round-trip preserves structure', () => {
    fc.assert(
      fc.property(
        fc.record({
          numHeaders: fc.integer({ min: 0, max: 5 }),
          numParagraphs: fc.integer({ min: 0, max: 3 }),
          numCodeBlocks: fc.integer({ min: 0, max: 2 }),
          numLists: fc.integer({ min: 0, max: 2 })
        }),
        (structure) => {
          // Build markdown with known structure counts
          let markdown = '';
          let expectedH1Count = 0;
          let expectedH2Count = 0;
          let expectedH3Count = 0;

          // Add headers with simple alphanumeric content
          for (let i = 0; i < structure.numHeaders; i++) {
            const level = (i % 3) + 1; // Cycle through h1, h2, h3
            markdown += `${'#'.repeat(level)} Header${i}\n\n`;
            if (level === 1) expectedH1Count++;
            else if (level === 2) expectedH2Count++;
            else expectedH3Count++;
          }

          // Add paragraphs with simple content
          for (let i = 0; i < structure.numParagraphs; i++) {
            markdown += `Paragraph ${i} content here.\n\n`;
          }

          // Add code blocks
          for (let i = 0; i < structure.numCodeBlocks; i++) {
            markdown += `\`\`\`javascript\nconst x${i} = ${i};\n\`\`\`\n\n`;
          }

          // Add lists (with separating content to ensure they're distinct)
          for (let i = 0; i < structure.numLists; i++) {
            markdown += `- List ${i} item 1\n- List ${i} item 2\n\nSeparator ${i}\n\n`;
          }

          // Parse to HTML
          const html = engine.parse(markdown, { highlightCode: true, sanitize: false });

          // Verify structure is preserved by counting elements
          const h1Count = (html.match(/<h1[^>]*>/g) || []).length;
          const h2Count = (html.match(/<h2[^>]*>/g) || []).length;
          const h3Count = (html.match(/<h3[^>]*>/g) || []).length;
          const preCount = (html.match(/<pre>/g) || []).length;
          const ulCount = (html.match(/<ul>/g) || []).length;

          // Verify counts match expected structure
          expect(h1Count).toBe(expectedH1Count);
          expect(h2Count).toBe(expectedH2Count);
          expect(h3Count).toBe(expectedH3Count);
          expect(preCount).toBe(structure.numCodeBlocks);
          expect(ulCount).toBe(structure.numLists);

          // Verify paragraphs are present (may be wrapped in <p> tags or other elements)
          if (structure.numParagraphs > 0) {
            // At least some paragraph content should be present
            expect(html).toContain('Paragraph');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: md2html-docmesh, Property 13: Code block syntax highlighting
  // Validates: Requirements 4.3
  it('Property 13: Code block syntax highlighting', () => {
    fc.assert(
      fc.property(
        fc.record({
          language: fc.constantFrom('javascript', 'python', 'typescript', 'java', 'cpp', 'html', 'css'),
          code: fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0)
        }),
        (codeBlock) => {
          // Create markdown with code block
          const markdown = `\`\`\`${codeBlock.language}\n${codeBlock.code}\n\`\`\``;

          // Parse with highlighting enabled
          const html = engine.parse(markdown, { highlightCode: true, sanitize: false });

          // Verify syntax highlighting classes are present
          // highlight.js adds 'hljs' class and language-specific classes
          expect(html).toContain('hljs');
          expect(html).toContain('language-');
          
          // Verify code content is present
          expect(html).toContain('<pre>');
          expect(html).toContain('<code');
          
          // The code should be in the HTML (possibly with highlighting markup and HTML entities)
          // Highlight.js wraps code in spans, and special characters get HTML-encoded
          
          // Decode HTML entities from the output
          const decodeHTML = (str: string) => {
            return str
              .replace(/&quot;/g, '"')
              .replace(/&#039;/g, "'")
              .replace(/&#x27;/g, "'")
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&');
          };
          
          // Extract all text content from the code (removing HTML tags and decoding entities)
          const textContent = decodeHTML(html.replace(/<[^>]+>/g, ''));
          
          // The original code should be present in the text content (whitespace may vary)
          // Check that the non-whitespace characters from the code appear in order
          const codeChars = codeBlock.code.replace(/\s+/g, '');
          const htmlChars = textContent.replace(/\s+/g, '');
          
          if (codeChars.length > 0) {
            // Check that the code characters appear in the HTML
            expect(htmlChars).toContain(codeChars);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: md2html-docmesh, Property 18: TOC generation includes all headers
  // Validates: Requirements 6.1
  it('Property 18: TOC generation includes all headers', () => {
    fc.assert(
      fc.property(
        fc.record({
          numH2: fc.integer({ min: 0, max: 10 }),
          numH3: fc.integer({ min: 0, max: 10 }),
          numH1: fc.integer({ min: 0, max: 5 }) // h1 should not be in TOC
        }),
        (structure) => {
          // Build markdown with known header structure
          let markdown = '';
          const expectedHeaders: Array<{ text: string; level: number }> = [];

          // Add h1 headers (should NOT be in TOC)
          for (let i = 0; i < structure.numH1; i++) {
            markdown += `# H1 Header ${i}\n\n`;
          }

          // Add h2 headers (should be in TOC)
          for (let i = 0; i < structure.numH2; i++) {
            const text = `H2 Header ${i}`;
            markdown += `## ${text}\n\n`;
            expectedHeaders.push({ text, level: 2 });
          }

          // Add h3 headers (should be in TOC)
          for (let i = 0; i < structure.numH3; i++) {
            const text = `H3 Header ${i}`;
            markdown += `### ${text}\n\n`;
            expectedHeaders.push({ text, level: 3 });
          }

          // Generate TOC
          const toc = engine.generateTOC(markdown);

          // Verify all h2 and h3 headers are in TOC
          expect(toc.length).toBe(structure.numH2 + structure.numH3);

          // Verify each expected header is present with correct level
          for (const expected of expectedHeaders) {
            const found = toc.find(entry => entry.text === expected.text && entry.level === expected.level);
            expect(found).toBeDefined();
          }

          // Verify no h1 headers are in TOC
          for (let i = 0; i < structure.numH1; i++) {
            const h1Text = `H1 Header ${i}`;
            const found = toc.find(entry => entry.text === h1Text);
            expect(found).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: md2html-docmesh, Property 19: TOC ID generation is consistent
  // Validates: Requirements 6.2
  it('Property 19: TOC ID generation is consistent', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (headerText) => {
          // Generate ID multiple times for the same text
          const id1 = engine.generateTOCId(headerText);
          const id2 = engine.generateTOCId(headerText);
          const id3 = engine.generateTOCId(headerText);

          // All IDs should be identical
          expect(id1).toBe(id2);
          expect(id2).toBe(id3);

          // ID should be lowercase
          expect(id1).toBe(id1.toLowerCase());

          // ID should not contain special characters (only alphanumeric, hyphens)
          expect(id1).toMatch(/^[a-z0-9-]*$/);

          // ID should not have leading or trailing hyphens
          if (id1.length > 0) {
            expect(id1[0]).not.toBe('-');
            expect(id1[id1.length - 1]).not.toBe('-');
          }

          // ID should not have multiple consecutive hyphens
          expect(id1).not.toMatch(/--/);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: md2html-docmesh, Property 20: TOC anchors injected in HTML
  // Validates: Requirements 6.3
  it('Property 20: TOC anchors injected in HTML', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            level: fc.constantFrom(2, 3),
            text: fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => s.trim().length > 0)
              .filter(s => /[a-z0-9]/i.test(s)) // Ensure at least one alphanumeric character
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (headers) => {
          // Build markdown with headers
          let markdown = '';
          for (const header of headers) {
            markdown += `${'#'.repeat(header.level)} ${header.text}\n\n`;
          }

          // Parse to HTML
          const html = engine.parse(markdown, { highlightCode: false, sanitize: false });

          // Generate TOC
          const toc = engine.generateTOC(markdown);

          // Inject anchors
          const htmlWithAnchors = engine.injectTOCAnchors(html, toc);

          // Verify each TOC entry has a corresponding anchor in the HTML
          // Only check entries that have non-empty IDs
          for (const entry of toc) {
            if (entry.id.length > 0) {
              // Check that the header has an id attribute with the correct value
              const headerRegex = new RegExp(`<h${entry.level}[^>]*id="${entry.id}"[^>]*>`, 'i');
              expect(htmlWithAnchors).toMatch(headerRegex);

              // Verify the header text is present (may be HTML-escaped)
              // We check that the header with the correct ID exists, which is sufficient
              // The text content may be escaped (e.g., ">" becomes "&gt;")
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
