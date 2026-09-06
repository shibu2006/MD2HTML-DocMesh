import { describe, it, expect } from 'vitest';
import { extractClonedStyle, scopeClonedStylesheet } from './styleCloneEngine';

const source = {
  sourceType: 'file' as const,
  sourceLabel: 'sample.html',
};

describe('extractClonedStyle', () => {
  it('reads colors from utility classes on body, not only body {} rules', () => {
    const html = `
      <html>
        <head>
          <style>
            .bg-navy { background-color: #001f3f; }
            .text-paper { color: #f8fafc; }
            .accent { color: #ff851b; }
            h1 { color: #ff851b; }
          </style>
        </head>
        <body class="bg-navy text-paper">
          <h1 class="accent">Title</h1>
          <a href="#">Link</a>
          <pre>code</pre>
        </body>
      </html>
    `;

    const cloned = extractClonedStyle(html, source);

    expect(cloned.colors.backgroundColor.toLowerCase()).toMatch(/#001f3f|rgb\(\s*0,\s*31,\s*63\s*\)/i);
    expect(cloned.colors.textColor.toLowerCase()).toMatch(/#f8fafc|rgb\(\s*248,\s*250,\s*252\s*\)/i);
    expect(cloned.colors.accentColor.toLowerCase()).toMatch(/#ff851b|rgb\(\s*255,\s*133,\s*27\s*\)/i);
    expect(cloned.isDark).toBe(true);
  });

  it('resolves hsl(var(--token)) theme variables used by modern design systems', () => {
    const html = `
      <html>
        <head>
          <style>
            :root {
              --background: 222.2 84% 4.9%;
              --foreground: 210 40% 98%;
              --primary: 217.2 91.2% 59.8%;
            }
            body {
              background-color: hsl(var(--background));
              color: hsl(var(--foreground));
            }
            a { color: hsl(var(--primary)); }
          </style>
        </head>
        <body>
          <h1>Hello</h1>
          <a href="#">Docs</a>
        </body>
      </html>
    `;

    const cloned = extractClonedStyle(html, source);

    expect(cloned.colors.backgroundColor.toLowerCase()).not.toBe('#ffffff');
    expect(cloned.colors.backgroundColor.toLowerCase()).not.toBe('#111827');
    expect(cloned.isDark).toBe(true);
    expect(cloned.colors.textColor.toLowerCase()).not.toBe('#1f2937');
    expect(cloned.colors.accentColor.toLowerCase()).not.toBe('#4f46e5');
  });

  it('unwraps @layer / @theme blocks so nested utility colors are not dropped', () => {
    const html = `
      <html>
        <head>
          <style>
            @layer utilities {
              .bg-ink { background-color: #0b1220; }
              .text-mist { color: #e2e8f0; }
            }
            @theme {
              --color-accent: #38bdf8;
            }
            a { color: var(--color-accent); }
          </style>
        </head>
        <body class="bg-ink text-mist">
          <a href="#">Sky</a>
        </body>
      </html>
    `;

    const cloned = extractClonedStyle(html, { ...source, styleSources: undefined });

    expect(cloned.colors.backgroundColor.toLowerCase()).toMatch(/#0b1220|rgb\(\s*11,\s*18,\s*32\s*\)/i);
    expect(cloned.colors.textColor.toLowerCase()).toMatch(/#e2e8f0|rgb\(\s*226,\s*232,\s*240\s*\)/i);
    expect(cloned.colors.accentColor.toLowerCase()).toMatch(/#38bdf8|rgb\(\s*56,\s*189,\s*248\s*\)/i);
  });

  it('uses html / #root background when body is transparent', () => {
    const html = `
      <html style="background-color: #fff7ed">
        <head>
          <style>
            html { background-color: #fff7ed; }
            body { background-color: transparent; color: #9a3412; }
            a { color: #c2410c; }
          </style>
        </head>
        <body>
          <a href="#">Link</a>
        </body>
      </html>
    `;

    const cloned = extractClonedStyle(html, source);

    expect(cloned.colors.backgroundColor.toLowerCase()).toMatch(/#fff7ed|rgb\(\s*255,\s*247,\s*237\s*\)/i);
    expect(cloned.isDark).toBe(false);
  });

  it('accepts oklch colors instead of falling back to the default palette', () => {
    const html = `
      <html>
        <head>
          <style>
            body { background-color: oklch(0.21 0.04 265); color: oklch(0.97 0.01 250); }
            a { color: oklch(0.7 0.15 250); }
          </style>
        </head>
        <body><a href="#">Link</a></body>
      </html>
    `;

    const cloned = extractClonedStyle(html, source);

    expect(cloned.colors.backgroundColor.toLowerCase()).toMatch(/oklch|rgb\(|#/);
    expect(cloned.colors.backgroundColor.toLowerCase()).not.toBe('#ffffff');
    expect(cloned.colors.backgroundColor.toLowerCase()).not.toBe('#111827');
  });

  it('does not use a near-black nav link as the accent when a saturated heading color exists', () => {
    const html = `
      <html>
        <head>
          <style>
            body { background-color: #0f172a; color: #e2e8f0; }
            a { color: #0b1220; }
            h1, h2 { color: #38bdf8; }
            th { background-color: #1e293b; color: #f8fafc; border-color: #334155; }
            td { border-color: #334155; }
          </style>
        </head>
        <body>
          <a href="#nav">Skip</a>
          <h1>Voice search call trace</h1>
          <table><tr><th>Field</th><td>Value</td></tr></table>
        </body>
      </html>
    `;

    const cloned = extractClonedStyle(html, source);

    expect(cloned.colors.accentColor.toLowerCase()).toMatch(/#38bdf8|rgb\(\s*56,\s*189,\s*248\s*\)/i);
    expect(cloned.headingColor?.toLowerCase()).toMatch(/#38bdf8|rgb\(\s*56,\s*189,\s*248\s*\)/i);
    expect(cloned.tableHeaderBg?.toLowerCase()).toMatch(/#1e293b|rgb\(\s*30,\s*41,\s*59\s*\)/i);
    expect(cloned.tableBorderColor?.toLowerCase()).toMatch(/#334155|rgb\(\s*51,\s*65,\s*85\s*\)/i);
  });

  it('reads the Voice Turn Lifecycle design tokens instead of chrome or light defaults', () => {
    const html = `
      <html>
        <head>
          <style>
            :root { --line: #0b0b0b1a; }
            a { color: #111111; }
            :host { position: fixed; }
            @font-face { font-family: "Skip"; src: url(data:font/woff2;base64,AA==); }
          </style>
          <style>
            :root {
              --ground: #F1F4F6;
              --surface: #FFFFFF;
              --surface-2: #E8EDF1;
              --ink: #151A21;
              --muted: #5C6875;
              --line: #D3DAE1;
              --accent: #0F6E7A;
              --code-bg: #11161D;
            }
            @media (prefers-color-scheme: dark) {
              :root:not([data-theme="light"]) {
                --ground: #0E1218;
                --surface: #161C24;
                --surface-2: #1E262F;
                --ink: #E7ECF1;
                --muted: #909DAA;
                --line: #29323D;
                --accent: #52B4BF;
                --code-bg: #0A0E13;
              }
            }
            body { background: var(--ground); color: var(--ink); font-family: "IBM Plex Sans", sans-serif; }
            h1 { font-weight: 700; }
            .eyebrow { color: var(--accent); letter-spacing: .16em; }
            th { background: var(--surface-2); color: var(--muted); border-color: var(--line); }
          </style>
        </head>
        <body>
          <a href="#chrome">Skip chrome</a>
          <div class="wrap">
            <p class="eyebrow">VoiceQuickCommerce</p>
            <h1>Voice Turn Lifecycle</h1>
            <table><tr><th>Decision</th><td>Who</td></tr></table>
          </div>
        </body>
      </html>
    `;

    const cloned = extractClonedStyle(html, { ...source, preferDark: true });

    expect(cloned.colors.backgroundColor.toLowerCase()).toMatch(/#0e1218|rgb\(\s*14,\s*18,\s*24\s*\)/i);
    expect(cloned.colors.textColor.toLowerCase()).toMatch(/#e7ecf1|rgb\(\s*231,\s*236,\s*241\s*\)/i);
    expect(cloned.colors.accentColor.toLowerCase()).toMatch(/#52b4bf|rgb\(\s*82,\s*180,\s*191\s*\)/i);
    expect(cloned.headingColor?.toLowerCase()).toMatch(/#e7ecf1|rgb\(\s*231,\s*236,\s*241\s*\)/i);
    expect(cloned.tableHeaderBg?.toLowerCase()).toMatch(/#1e262f|rgb\(\s*30,\s*38,\s*47\s*\)/i);
    expect(cloned.fontFamily).toMatch(/IBM Plex Sans/i);
    expect(cloned.clonedCss).toMatch(/--ground:\s*#0E1218/i);
    expect(cloned.clonedCss).toMatch(/h1\s*\{[^}]*font-weight:\s*700/i);
    expect(cloned.clonedCss).toMatch(/\.eyebrow|eyebrow/);
    expect(cloned.clonedCss).not.toMatch(/:host/);
    expect(cloned.clonedCss).not.toMatch(/@font-face/i);
  });

  it('scopes cloned CSS so app chrome is not restyled', () => {
    const scoped = scopeClonedStylesheet('body { color: red; } h1 { font-size: 3rem; } .dp { padding: 1rem; }', '.preview-content');
    expect(scoped).toContain('.preview-content { color: red; }');
    expect(scoped).toContain('.preview-content h1 { font-size: 3rem; }');
    expect(scoped).toContain('.preview-content .dp { padding: 1rem; }');
  });

  it('clones the artifact inside a saved Claude iframe instead of Claude page chrome', () => {
    const artifact = `
      <!doctype html>
      <html>
        <head>
          <title>Voice Turn Lifecycle</title>
          <style>
            :root {
              --ground: #0E1218;
              --surface: #161C24;
              --surface-2: #1E262F;
              --ink: #E7ECF1;
              --muted: #909DAA;
              --line: #29323D;
              --accent: #52B4BF;
              --code-bg: #0A0E13;
            }
            body { background: var(--ground); color: var(--ink); font-family: "IBM Plex Sans", sans-serif; }
            .masthead { padding: 72px 0 40px; border-bottom: 2px solid var(--ink); }
            h1 { font-size: 4.4rem; line-height: .98; }
            table { background: var(--surface); }
            th { background: var(--surface-2); color: var(--muted); }
          </style>
        </head>
        <body><div class="wrap"><header class="masthead"><h1>Voice Turn Lifecycle</h1></header></div></body>
      </html>
    `;
    const escapedArtifact = artifact
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;');
    const savedClaudePage = `
      <!doctype html>
      <html>
        <head>
          <style>
            :root { --bg: #1a1a19; --fg: #f0efec; --primary: #fff; }
            body { background: var(--bg); color: var(--fg); font-family: anthropic-sans, sans-serif; }
          </style>
        </head>
        <body>
          <iframe id="frame-content" srcdoc="${escapedArtifact}"></iframe>
        </body>
      </html>
    `;

    const cloned = extractClonedStyle(savedClaudePage, { ...source, preferDark: true });

    expect(cloned.sourceLabel).toBe('Voice Turn Lifecycle');
    expect(cloned.colors.backgroundColor.toLowerCase()).toBe('#0e1218');
    expect(cloned.colors.textColor.toLowerCase()).toBe('#e7ecf1');
    expect(cloned.colors.accentColor.toLowerCase()).toBe('#52b4bf');
    expect(cloned.fontFamily).toMatch(/IBM Plex Sans/i);
    expect(cloned.clonedCss).toContain('.masthead');
    expect(cloned.clonedCss).toContain('font-size: 4.4rem');
    expect(cloned.clonedCss).not.toMatch(/anthropic-sans/i);
  });
});
