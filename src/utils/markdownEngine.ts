import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import type { TOCEntry } from '../types';

export interface ParseOptions {
  highlightCode: boolean;
  sanitize: boolean;
}

export class MarkdownEngine {
  private marked: Marked;

  constructor() {
    // Create a new Marked instance
    this.marked = new Marked();

    // Configure marked with highlight.js integration
    this.marked.use(
      markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang) {
          const language = lang && hljs.getLanguage(lang) ? lang : undefined;
          if (language) {
            try {
              return hljs.highlight(code, { language }).value;
            } catch (err) {
              console.error('Highlight error:', err);
            }
          }
          // If no language is specified or detection fails, return the code as is.
          // This avoids incorrect auto-detection for ASCII art or plain text.
          return code;
        }
      })
    );

    // Configure marked options
    this.marked.setOptions({
      gfm: true, // GitHub Flavored Markdown
      breaks: true, // Convert \n to <br>
      pedantic: false,
    });
  }

  /**
   * Parse markdown content to HTML
   */
  parse(markdown: string, options: ParseOptions): string {
    let html = this.marked.parse(markdown) as string;

    // Apply sanitization if enabled
    if (options.sanitize) {
      html = this.sanitize(html);
    }

    return html;
  }

  /**
   * Generate table of contents from markdown content
   */
  generateTOC(markdown: string): TOCEntry[] {
    const tocEntries: TOCEntry[] = [];
    const tokens = this.marked.lexer(markdown);

    for (const token of tokens) {
      if (token.type === 'heading' && (token.depth === 2 || token.depth === 3)) {
        const text = token.text;
        const id = this.generateTOCId(text);
        tocEntries.push({
          id,
          text,
          level: token.depth
        });
      }
    }

    return tocEntries;
  }

  /**
   * Generate clean ID from header text
   */
  generateTOCId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters (keep only alphanumeric, spaces, hyphens)
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Inject anchor elements into HTML headers
   */
  injectTOCAnchors(html: string, tocEntries: TOCEntry[]): string {
    let result = html;
    let entryIndex = 0;

    // Match all h2 and h3 headers in order (including nested tags)
    // Use a non-greedy match to capture everything between opening and closing tags
    const headerRegex = /<h([23])>(.*?)<\/h\1>/gi;

    result = result.replace(headerRegex, (match, level, content) => {
      // Find the next TOC entry that matches this level
      while (entryIndex < tocEntries.length) {
        const entry = tocEntries[entryIndex];
        entryIndex++;

        if (entry.level === parseInt(level)) {
          // This is the matching entry, inject the ID
          if (entry.id) {
            return `<h${level} id="${entry.id}">${content}</h${level}>`;
          }
          break;
        }
      }

      // No matching entry or empty ID, return unchanged
      return match;
    });

    return result;
  }

  /**
   * Sanitize HTML using DOMPurify
   */
  sanitize(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr',
        'strong', 'em', 'u', 's', 'code', 'pre',
        'a', 'img',
        'ul', 'ol', 'li',
        'blockquote',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'div', 'span'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'id', 'class'],
      ALLOW_DATA_ATTR: false
    });
  }
}

// Export singleton instance
export const markdownEngine = new MarkdownEngine();
