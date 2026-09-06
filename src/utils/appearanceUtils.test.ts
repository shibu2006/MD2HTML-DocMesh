import { describe, it, expect } from 'vitest';
import { resolveAppearance } from './appearanceUtils';
import type { ExportSettings } from '../types';

const baseSettings: ExportSettings = {
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
};

describe('resolveAppearance', () => {
  it('maps cloned heading, link, and table tokens onto the preview theme', () => {
    const appearance = resolveAppearance({
      ...baseSettings,
      clonedStyle: {
        sourceType: 'file',
        sourceLabel: 'sample.html',
        colors: {
          backgroundColor: '#0f172a',
          textColor: '#e2e8f0',
          accentColor: '#38bdf8',
          codeBlockBg: '#1e293b',
        },
        headingColor: '#38bdf8',
        linkColor: '#7dd3fc',
        tableHeaderBg: '#1e293b',
        tableHeaderColor: '#f8fafc',
        tableBorderColor: '#334155',
        isDark: true,
        stylesheetCount: 1,
      },
    });

    expect(appearance.headingColor).toBe('#38bdf8');
    expect(appearance.linkColor).toBe('#7dd3fc');
    expect(appearance.tableHeaderBg).toBe('#1e293b');
    expect(appearance.tableBorderColor).toBe('#334155');
  });

  it('does not reuse a near-black cloned accent for headings when no heading token exists', () => {
    const appearance = resolveAppearance({
      ...baseSettings,
      clonedStyle: {
        sourceType: 'file',
        sourceLabel: 'old-clone.html',
        colors: {
          backgroundColor: '#0f172a',
          textColor: '#e2e8f0',
          accentColor: '#0b1220',
          codeBlockBg: '#1e293b',
        },
        isDark: true,
        stylesheetCount: 4,
      },
    });

    expect(appearance.headingColor.toLowerCase()).not.toMatch(/#0b1220|rgb\(\s*11,\s*18,\s*32\s*\)/i);
    expect(appearance.colors.accentColor.toLowerCase()).not.toMatch(/#0b1220|rgb\(\s*11,\s*18,\s*32\s*\)/i);
  });

  it('does not use a dark teal link color on a near-black paper', () => {
    const appearance = resolveAppearance({
      ...baseSettings,
      clonedStyle: {
        sourceType: 'file',
        sourceLabel: 'artifact.html',
        colors: {
          backgroundColor: '#1a1a19',
          textColor: '#f0efec',
          accentColor: '#52B4BF',
          codeBlockBg: '#11161D',
        },
        linkColor: '#0F6E7A',
        isDark: true,
        stylesheetCount: 4,
      },
    });

    expect(appearance.linkColor.toLowerCase()).not.toBe('#0f6e7a');
    expect(appearance.linkColor.toLowerCase()).toMatch(/#52b4bf|#f0efec/i);
  });
});
