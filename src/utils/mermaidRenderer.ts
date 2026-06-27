// Client-side mermaid rendering helper used by the live previews.
// The heavy mermaid library is loaded lazily so it is only pulled in when a
// document actually contains a diagram.
import type { ThemeName } from './themeManager';
import { ThemeManager } from './themeManager';

// Cache the dynamically imported mermaid module so we only load it once.
type MermaidModule = typeof import('mermaid')['default'];
let mermaidPromise: Promise<MermaidModule> | null = null;

async function getMermaid(): Promise<MermaidModule> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => mod.default);
  }
  return mermaidPromise;
}

/**
 * Find <pre class="mermaid"> blocks inside the given container and turn them
 * into SVG diagrams using mermaid's documented run() API. Safe to call
 * repeatedly: mermaid marks processed nodes with a data-processed attribute
 * and skips them on subsequent runs.
 *
 * @param container - DOM element to search within
 * @param theme - the active export theme, used to pick a light/dark look
 */
export async function renderMermaid(container: HTMLElement | null, theme: ThemeName): Promise<void> {
  if (!container) {
    return;
  }

  // Only collect blocks mermaid hasn't already turned into SVG.
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>('pre.mermaid:not([data-processed])')
  );

  if (nodes.length === 0) {
    return;
  }

  let mermaid: MermaidModule;
  try {
    mermaid = await getMermaid();
  } catch (err) {
    console.error('Failed to load mermaid:', err);
    return;
  }

  const mermaidTheme = ThemeManager.isDarkTheme(theme) ? 'dark' : 'default';
  mermaid.initialize({
    startOnLoad: false,
    theme: mermaidTheme,
    securityLevel: 'loose',
  });

  try {
    await mermaid.run({ nodes, suppressErrors: true });
  } catch (err) {
    console.error('Mermaid render error:', err);
  }
}
