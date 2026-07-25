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

    // Render fenced ```mermaid blocks as <pre class="mermaid"> so that the
    // mermaid runtime (in the live preview and in exported HTML) can turn
    // them into diagrams. Other languages fall back to the default
    // (highlight.js) rendering by returning false.
    this.marked.use({
      renderer: {
        code({ text, lang }) {
          const language = (lang || '').trim().split(/\s+/)[0].toLowerCase();
          if (language === 'mermaid') {
            return `<pre class="mermaid">${MarkdownEngine.escapeHtml(text)}</pre>\n`;
          }
          return false;
        }
      }
    });

    // Configure marked options
    this.marked.setOptions({
      gfm: true, // GitHub Flavored Markdown
      // Soft-wrapped source lines (editor wrap / fixed column) must reflow with
      // the viewport. Converting every \n to <br> freezes line length at the
      // wrap width and leaves unused white space on wide screens. Intentional
      // breaks still work via CommonMark hard breaks (two trailing spaces).
      breaks: false,
      pedantic: false,
    });
  }

  /**
   * Escape HTML special characters so the mermaid source can be safely
   * embedded in markup. The mermaid runtime reads the element's textContent,
   * which decodes these entities back to their original characters.
   */
  static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Detect whether rendered HTML contains mermaid diagram blocks.
   */
  static containsMermaid(html: string): boolean {
    return /<pre[^>]*class="[^"]*\bmermaid\b[^"]*"/i.test(html);
  }

  /**
   * Parse markdown content to HTML
   */
  parse(markdown: string, options: ParseOptions): string {
    let html = this.marked.parse(markdown) as string;

    // Wrap tables in a horizontally-scrollable container. Combined with the
    // CSS switch from a forced `width: 100%` to content-based sizing, this
    // lets small tables hug their content instead of stretching across the
    // full (now wider) reading column, while wide tables still scroll
    // instead of overflowing the page.
    html = this.wrapTables(html);

    // Apply sanitization if enabled
    if (options.sanitize) {
      html = this.sanitize(html);
    }

    return html;
  }

  /**
   * Wrap every top-level <table> in a `.table-wrapper` div so it can scroll
   * horizontally without forcing the table itself to stretch full-width.
   */
  private wrapTables(html: string): string {
    return html
      .replace(/<table>/g, '<div class="table-wrapper"><table>')
      .replace(/<\/table>/g, '</table></div>');
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
   * Remove an author-written "Table of Contents" section (a heading titled
   * "Table of Contents" / "Contents" / "TOC" immediately followed by a list)
   * from markdown. Used when a generated TOC is enabled so the document's own
   * manual TOC isn't duplicated. Only strips the heading when a list actually
   * follows it, so genuine content sections are left untouched.
   */
  stripAuthoredTOC(markdown: string): string {
    const lines = markdown.split('\n');
    const out: string[] = [];
    const isHeading = (l: string) => /^#{1,6}\s+/.test(l);
    const isListItem = (l: string) => /^\s*([-*+]|\d+[.)])\s+/.test(l);

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const headingMatch = line.match(/^#{1,6}\s+(.+?)\s*$/);

      if (headingMatch) {
        const title = headingMatch[1].trim().toLowerCase().replace(/[:#]+$/, '').trim();
        if (title === 'table of contents' || title === 'contents' || title === 'toc') {
          // Look ahead past blank lines for a list.
          let j = i + 1;
          while (j < lines.length && lines[j].trim() === '') {
            j++;
          }
          if (j < lines.length && isListItem(lines[j])) {
            // Skip the heading and the following TOC list block.
            i++;
            while (i < lines.length) {
              const l = lines[i];
              if (l.trim() === '') {
                i++;
                continue;
              }
              if (isHeading(l)) {
                break;
              }
              if (isListItem(l)) {
                i++;
                continue;
              }
              break;
            }
            continue;
          }
        }
      }

      out.push(line);
      i++;
    }

    return out.join('\n').replace(/^\n+/, '');
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
