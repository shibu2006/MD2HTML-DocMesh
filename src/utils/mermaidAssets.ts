// Shared assets for the interactive mermaid toolbar so the live preview and
// the exported standalone HTML stay in sync.
//
// - MERMAID_TOOLBAR_CSS: styles for the viewport + floating toolbar.
// - MERMAID_RUNTIME_JS: a self-contained vanilla-JS snippet that defines an
//   `enhanceMermaid(pre, isDark, backgroundColor)` function. It is consumed by
//   the live preview (via mermaidToolbar.ts, which mirrors this logic in TS)
//   and embedded verbatim into exported HTML.
// - getMermaidExportScript(): builds the <script type="module"> block that the
//   export engines inject to render diagrams and attach the toolbar.

export const MERMAID_TOOLBAR_CSS = `
.mermaid-interactive { position: relative; display: block; }
.mermaid-viewport {
  position: relative;
  overflow: hidden;
  width: 100%;
  cursor: grab;
  touch-action: none;
}
.mermaid-viewport.is-grabbing { cursor: grabbing; }
.mermaid-canvas {
  transform-origin: 0 0;
  display: flex;
  justify-content: center;
  will-change: transform;
}
.mermaid-canvas > svg { max-width: 100%; height: auto; }
.mermaid-toolbar {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 8px;
  background: rgba(37, 99, 235, 0.92);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  z-index: 5;
  opacity: 0.85;
  transition: opacity 0.15s ease;
}
.mermaid-interactive:hover .mermaid-toolbar,
.mermaid-interactive:focus-within .mermaid-toolbar { opacity: 1; }
.mermaid-toolbar button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: #ffffff;
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.3px;
  line-height: 1;
}
.mermaid-toolbar button:hover { background: rgba(255, 255, 255, 0.22); }
.mermaid-toolbar button:active { background: rgba(255, 255, 255, 0.35); }
.mermaid-toolbar button svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.mermaid-interactive:fullscreen {
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
.mermaid-interactive.is-dark:fullscreen { background: #1e1e1e; }
.mermaid-interactive:fullscreen .mermaid-viewport {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mermaid-error {
  color: #b91c1c;
  background-color: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 6px;
  padding: 12px 16px;
  text-align: left;
}
`;

// Vanilla-JS runtime shared with exported HTML. Defines window.__enhanceMermaid.
export const MERMAID_RUNTIME_JS = `
const MIN_SCALE = 0.2, MAX_SCALE = 8;
const ICONS = {
  zoomIn: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
  zoomOut: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
  reset: '<svg viewBox="0 0 24 24"><polyline points="3 3 3 9 9 9"/><path d="M3.5 9a9 9 0 1 1-.8 5"/></svg>',
  fullscreen: '<svg viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  svg: '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
};
function clamp(v, min, max){ return Math.min(max, Math.max(min, v)); }
function makeButton(title, inner){
  const b = document.createElement('button');
  b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); b.innerHTML = inner;
  return b;
}
function getSvgSize(svg){
  const vb = svg.viewBox && svg.viewBox.baseVal;
  if (vb && vb.width && vb.height) return { width: vb.width, height: vb.height };
  const r = svg.getBoundingClientRect();
  return { width: r.width || 800, height: r.height || 600 };
}
function serializeSvg(svg){
  const s = getSvgSize(svg);
  const clone = svg.cloneNode(true);
  clone.setAttribute('width', String(s.width));
  clone.setAttribute('height', String(s.height));
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return { xml: new XMLSerializer().serializeToString(clone), width: s.width, height: s.height };
}
async function svgToPngBlob(svg, bg, pixelScale){
  pixelScale = pixelScale || 2;
  const data = serializeSvg(svg);
  const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data.xml);
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(data.width * pixelScale));
  canvas.height = Math.max(1, Math.round(data.height * pixelScale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg || '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/png'));
}
function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function __enhanceMermaid(pre, isDark, bg){
  if (pre.dataset.enhanced === '1') return;
  const svg = pre.querySelector('svg');
  if (!svg) return;
  pre.dataset.enhanced = '1';
  pre.classList.add('mermaid-interactive');
  if (isDark) pre.classList.add('is-dark');

  const viewport = document.createElement('div'); viewport.className = 'mermaid-viewport';
  const canvas = document.createElement('div'); canvas.className = 'mermaid-canvas';
  canvas.appendChild(svg); viewport.appendChild(canvas);

  let scale = 1, tx = 0, ty = 0;
  const apply = () => { canvas.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')'; };
  const zoomAt = (f, ox, oy) => {
    const ns = clamp(scale * f, MIN_SCALE, MAX_SCALE);
    tx = ox - ((ox - tx) / scale) * ns;
    ty = oy - ((oy - ty) / scale) * ns;
    scale = ns; apply();
  };
  const zoomCenter = (f) => { const r = viewport.getBoundingClientRect(); zoomAt(f, r.width/2, r.height/2); };
  const reset = () => { scale = 1; tx = 0; ty = 0; apply(); };

  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = viewport.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.1 : 1/1.1, e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  let dragging = false, sx = 0, sy = 0;
  viewport.addEventListener('pointerdown', (e) => { dragging = true; sx = e.clientX - tx; sy = e.clientY - ty; viewport.classList.add('is-grabbing'); viewport.setPointerCapture(e.pointerId); });
  viewport.addEventListener('pointermove', (e) => { if (!dragging) return; tx = e.clientX - sx; ty = e.clientY - sy; apply(); });
  const end = () => { dragging = false; viewport.classList.remove('is-grabbing'); };
  viewport.addEventListener('pointerup', end);
  viewport.addEventListener('pointercancel', end);

  const toolbar = document.createElement('div'); toolbar.className = 'mermaid-toolbar';
  const bIn = makeButton('Zoom in', ICONS.zoomIn); bIn.addEventListener('click', () => zoomCenter(1.2));
  const bOut = makeButton('Zoom out', ICONS.zoomOut); bOut.addEventListener('click', () => zoomCenter(1/1.2));
  const bReset = makeButton('Reset view', ICONS.reset); bReset.addEventListener('click', reset);
  const bFull = makeButton('Toggle fullscreen', ICONS.fullscreen);
  bFull.addEventListener('click', () => { if (document.fullscreenElement === pre) { document.exitFullscreen && document.exitFullscreen(); } else { pre.requestFullscreen && pre.requestFullscreen(); } });
  const bCopy = makeButton('Copy image', ICONS.copy);
  bCopy.addEventListener('click', async () => {
    try {
      const blob = await svgToPngBlob(svg, bg);
      if (navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      } else { downloadBlob(blob, 'diagram.png'); }
    } catch (err) { console.error('Copy image failed:', err); }
  });
  const bPng = makeButton('Download PNG', 'PNG');
  bPng.addEventListener('click', async () => { try { downloadBlob(await svgToPngBlob(svg, bg), 'diagram.png'); } catch (err) { console.error('PNG export failed:', err); } });
  const bSvg = makeButton('Download SVG', ICONS.svg);
  bSvg.addEventListener('click', () => { try { downloadBlob(new Blob([serializeSvg(svg).xml], { type: 'image/svg+xml' }), 'diagram.svg'); } catch (err) { console.error('SVG export failed:', err); } });

  toolbar.appendChild(bIn); toolbar.appendChild(bOut); toolbar.appendChild(bReset); toolbar.appendChild(bFull); toolbar.appendChild(bCopy); toolbar.appendChild(bPng); toolbar.appendChild(bSvg);
  pre.appendChild(toolbar); pre.appendChild(viewport); apply();
}
`;

/**
 * Build the <script type="module"> block that renders mermaid diagrams in an
 * exported standalone HTML document and attaches the interactive toolbar.
 */
/**
 * Build the <script type="module"> block that renders mermaid diagrams in an
 * exported standalone HTML document and attaches the interactive toolbar.
 *
 * Exposes window.__setMermaidTheme(isDark) so a page-level light/dark toggle
 * can re-render the diagrams to match the active theme.
 */
export function getMermaidExportScript(isDark: boolean, bgLight: string, bgDark: string): string {
  return `<style>${MERMAID_TOOLBAR_CSS}</style>
<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
const BG_LIGHT = ${JSON.stringify(bgLight)};
const BG_DARK = ${JSON.stringify(bgDark)};
${MERMAID_RUNTIME_JS}
async function renderAllMermaid(dark) {
  mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'default', securityLevel: 'loose' });
  const blocks = Array.from(document.querySelectorAll('pre.mermaid'));
  for (let i = 0; i < blocks.length; i++) {
    const node = blocks[i];
    let source = node.getAttribute('data-mmd-src');
    if (source === null) {
      source = (node.textContent || '').trim();
      node.setAttribute('data-mmd-src', source);
    }
    node.removeAttribute('data-enhanced');
    node.classList.remove('mermaid-interactive', 'is-dark');
    try {
      const out = await mermaid.render('mmd-export-' + i + '-' + (dark ? 'd' : 'l'), source);
      node.innerHTML = out.svg;
      __enhanceMermaid(node, dark, dark ? BG_DARK : BG_LIGHT);
    } catch (err) {
      console.error('[mermaid] export render failed:', err);
      node.innerHTML = '<div class="mermaid-error">Mermaid diagram could not be rendered: ' + (err && err.message ? err.message : err) + '</div>';
    }
  }
}
window.__setMermaidTheme = function (dark) { renderAllMermaid(!!dark); };
renderAllMermaid(typeof window.__docThemeDark === 'boolean' ? window.__docThemeDark : ${isDark ? 'true' : 'false'});
</script>`;
}
