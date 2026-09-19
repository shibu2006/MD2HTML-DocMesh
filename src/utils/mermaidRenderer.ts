// Client-side mermaid rendering helper used by the live previews.
// The heavy mermaid library is loaded lazily so it is only pulled in when a
// document actually contains a diagram.
import type { ThemeName } from './themeManager';
import { ThemeManager } from './themeManager';
import { enhanceMermaidDiagram } from './mermaidToolbar';

// Cache the dynamically imported mermaid module so we only load it once.
type MermaidModule = typeof import('mermaid')['default'];
let mermaidPromise: Promise<MermaidModule> | null = null;

async function getMermaid(): Promise<MermaidModule> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => mod.default);
  }
  return mermaidPromise;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function showError(node: HTMLElement, message: string): void {
  node.dataset.mmdState = 'error';
  node.setAttribute('data-processed', 'error');
  node.innerHTML = `<div class="mermaid-error" role="alert">⚠ Mermaid diagram could not be rendered.<br><span class="mermaid-error-detail">${escapeHtml(
    message
  )}</span></div>`;
}

/**
 * Find <pre class="mermaid"> blocks inside the given container and turn them
 * into SVG diagrams. Each block is rendered individually so one failure does
 * not block the others, and failures are surfaced visibly instead of leaving
 * raw diagram source on screen.
 *
 * @param container - DOM element to search within
 * @param theme - the active export theme, used to pick a light/dark look
 */
export async function renderMermaid(container: HTMLElement | null, theme: ThemeName): Promise<void> {
  if (!container) {
    return;
  }

  // Claim unprocessed blocks synchronously (before any await) so that React
  // StrictMode's double-invoked effect cannot process the same node twice.
  const nodes = Array.from(container.querySelectorAll<HTMLElement>('pre.mermaid')).filter(
    (n) => !n.dataset.mmdState
  );
  for (const node of nodes) {
    node.dataset.mmdState = 'pending';
  }

  if (nodes.length === 0) {
    return;
  }

  let mermaid: MermaidModule;
  try {
    mermaid = await getMermaid();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[mermaid] failed to load library:', err);
    for (const node of nodes) {
      showError(node, `Failed to load the mermaid library: ${message}`);
    }
    return;
  }

  const isDark = ThemeManager.isDarkTheme(theme);
  const backgroundColor = ThemeManager.getThemeStyles(theme).backgroundColor;

  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    securityLevel: 'loose',
    // Render labels as native SVG <text>/<tspan> rather than HTML inside a
    // <foreignObject>, so long labels wrap instead of being clipped.
    //
    // With HTML labels, mermaid's addHtmlSpan() constrains the label <div> to
    // `max-width: flowchart.wrappingWidth` (200px) with `white-space: nowrap`,
    // then sizes the <foreignObject> to that div's getBoundingClientRect().
    // A label with hard <br/> breaks therefore reports a rect clamped near
    // 200px while its lines actually render wider — and a foreignObject clips
    // its overflow, shearing every line off at the same x, mid-word.
    //
    // SVG text takes the other branch in labelHelper(): lines are measured with
    // getComputedTextLength()/getBBox() in the same context they render in, and
    // the node sizes to its widest line with no clipping box involved.
    htmlLabels: false,
    // Raise the line-break threshold from mermaid's 200px default so authored
    // <br/> lines are not re-wrapped into very narrow columns. Text still wraps
    // at word boundaries beyond this width; it is never clipped.
    flowchart: { wrappingWidth: 360 },
  });

  for (const node of nodes) {
    // textContent decodes the HTML-escaped diagram source back to raw text.
    const source = (node.textContent || '').trim();
    const id = 'mmd-' + Math.random().toString(36).slice(2, 11);

    try {
      const { svg } = await mermaid.render(id, source);
      node.innerHTML = svg;
      node.dataset.mmdState = 'done';
      node.setAttribute('data-processed', 'true');
      enhanceMermaidDiagram(node, { isDark, backgroundColor });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[mermaid] diagram render failed:', err);
      showError(node, message);
    }
  }
}
