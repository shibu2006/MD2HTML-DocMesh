// Interactive toolbar + pan/zoom for rendered mermaid diagrams.
// Mermaid only produces a static <svg>; this module wraps that SVG with a
// viewport that supports pan/zoom and a floating toolbar offering zoom in/out,
// reset, fullscreen, copy-to-clipboard, and PNG/SVG export.
import { MERMAID_TOOLBAR_CSS } from './mermaidAssets';

interface EnhanceOptions {
  isDark: boolean;
  backgroundColor: string;
}

const STYLE_ID = 'mermaid-toolbar-styles';
const MIN_SCALE = 0.2;
const MAX_SCALE = 8;
const ICONS = {
  zoomIn:
    '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
  zoomOut:
    '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
  reset:
    '<svg viewBox="0 0 24 24"><polyline points="3 3 3 9 9 9"/><path d="M3.5 9a9 9 0 1 1-.8 5"/></svg>',
  fullscreen:
    '<svg viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
  copy:
    '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  svg:
    '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
};

/**
 * Inject the toolbar/viewport stylesheet once per document.
 */
function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = MERMAID_TOOLBAR_CSS;
  document.head.appendChild(style);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function makeButton(title: string, inner: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.title = title;
  btn.setAttribute('aria-label', title);
  btn.innerHTML = inner;
  return btn;
}

/**
 * Determine the intrinsic pixel size of a mermaid SVG for raster export.
 */
function getSvgSize(svg: SVGSVGElement): { width: number; height: number } {
  const vb = svg.viewBox?.baseVal;
  if (vb && vb.width && vb.height) {
    return { width: vb.width, height: vb.height };
  }
  const rect = svg.getBoundingClientRect();
  return { width: rect.width || 800, height: rect.height || 600 };
}

/**
 * Serialize the SVG to a self-contained markup string with explicit size.
 */
function serializeSvg(svg: SVGSVGElement): { xml: string; width: number; height: number } {
  const { width, height } = getSvgSize(svg);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  const xml = new XMLSerializer().serializeToString(clone);
  return { xml, width, height };
}

/**
 * Rasterize the SVG to a PNG Blob at the given pixel scale.
 */
async function svgToPngBlob(
  svg: SVGSVGElement,
  backgroundColor: string,
  pixelScale = 2
): Promise<Blob> {
  const { xml, width, height } = serializeSvg(svg);
  const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load SVG for export'));
    img.src = src;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * pixelScale));
  canvas.height = Math.max(1, Math.round(height * pixelScale));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }
  ctx.fillStyle = backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create PNG blob'));
      }
    }, 'image/png');
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Wrap a rendered mermaid <pre> with an interactive pan/zoom viewport and
 * toolbar. Idempotent: a block is only enhanced once.
 */
export function enhanceMermaidDiagram(pre: HTMLElement, options: EnhanceOptions): void {
  if (pre.dataset.enhanced === '1') {
    return;
  }
  const svg = pre.querySelector('svg') as SVGSVGElement | null;
  if (!svg) {
    return;
  }
  pre.dataset.enhanced = '1';
  ensureStyles();

  pre.classList.add('mermaid-interactive');
  if (options.isDark) {
    pre.classList.add('is-dark');
  }

  // Build viewport + canvas around the existing SVG.
  const viewport = document.createElement('div');
  viewport.className = 'mermaid-viewport';
  const canvas = document.createElement('div');
  canvas.className = 'mermaid-canvas';
  canvas.appendChild(svg);
  viewport.appendChild(canvas);

  // Pan/zoom state.
  let scale = 1;
  let tx = 0;
  let ty = 0;

  const apply = () => {
    canvas.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  };

  const zoomAt = (factor: number, originX: number, originY: number) => {
    const newScale = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
    // Keep the point under (originX, originY) fixed while scaling.
    tx = originX - ((originX - tx) / scale) * newScale;
    ty = originY - ((originY - ty) / scale) * newScale;
    scale = newScale;
    apply();
  };

  const zoomCenter = (factor: number) => {
    const rect = viewport.getBoundingClientRect();
    zoomAt(factor, rect.width / 2, rect.height / 2);
  };

  const reset = () => {
    scale = 1;
    tx = 0;
    ty = 0;
    apply();
  };

  // Wheel zoom (centered on cursor).
  viewport.addEventListener(
    'wheel',
    (e: WheelEvent) => {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top);
    },
    { passive: false }
  );

  // Drag to pan.
  let dragging = false;
  let startX = 0;
  let startY = 0;
  viewport.addEventListener('pointerdown', (e: PointerEvent) => {
    dragging = true;
    startX = e.clientX - tx;
    startY = e.clientY - ty;
    viewport.classList.add('is-grabbing');
    viewport.setPointerCapture(e.pointerId);
  });
  viewport.addEventListener('pointermove', (e: PointerEvent) => {
    if (!dragging) return;
    tx = e.clientX - startX;
    ty = e.clientY - startY;
    apply();
  });
  const endDrag = () => {
    dragging = false;
    viewport.classList.remove('is-grabbing');
  };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  // Toolbar.
  const toolbar = document.createElement('div');
  toolbar.className = 'mermaid-toolbar';

  const btnZoomIn = makeButton('Zoom in', ICONS.zoomIn);
  btnZoomIn.addEventListener('click', () => zoomCenter(1.2));

  const btnZoomOut = makeButton('Zoom out', ICONS.zoomOut);
  btnZoomOut.addEventListener('click', () => zoomCenter(1 / 1.2));

  const btnReset = makeButton('Reset view', ICONS.reset);
  btnReset.addEventListener('click', reset);

  const btnFull = makeButton('Toggle fullscreen', ICONS.fullscreen);
  btnFull.addEventListener('click', () => {
    if (document.fullscreenElement === pre) {
      document.exitFullscreen?.();
    } else {
      pre.requestFullscreen?.().catch((err) => console.error('Fullscreen failed:', err));
    }
  });

  const btnCopy = makeButton('Copy image', ICONS.copy);
  btnCopy.addEventListener('click', async () => {
    try {
      const blob = await svgToPngBlob(svg, options.backgroundColor);
      if (navigator.clipboard && 'write' in navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      } else {
        downloadBlob(blob, 'diagram.png');
      }
    } catch (err) {
      console.error('Copy image failed:', err);
    }
  });

  const btnPng = makeButton('Download PNG', 'PNG');
  btnPng.addEventListener('click', async () => {
    try {
      const blob = await svgToPngBlob(svg, options.backgroundColor);
      downloadBlob(blob, 'diagram.png');
    } catch (err) {
      console.error('PNG export failed:', err);
    }
  });

  const btnSvg = makeButton('Download SVG', ICONS.svg);
  btnSvg.addEventListener('click', () => {
    try {
      const { xml } = serializeSvg(svg);
      downloadBlob(new Blob([xml], { type: 'image/svg+xml' }), 'diagram.svg');
    } catch (err) {
      console.error('SVG export failed:', err);
    }
  });

  toolbar.append(btnZoomIn, btnZoomOut, btnReset, btnFull, btnCopy, btnPng, btnSvg);

  // Fullscreen state management.
  let savedState: { scale: number; tx: number; ty: number } | null = null;

  pre.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement === pre) {
      // Entering fullscreen: save state and remove SVG constraints
      savedState = { scale, tx, ty };
      svg.style.maxWidth = 'none';
      svg.style.width = '100%';
      svg.style.height = '100%';
      // Reset pan/zoom to fit-to-view
      scale = 1;
      tx = 0;
      ty = 0;
      apply();
    } else {
      // Exiting fullscreen: restore SVG constraints and pan/zoom state
      svg.style.maxWidth = '';
      svg.style.width = '';
      svg.style.height = '';
      if (savedState) {
        scale = savedState.scale;
        tx = savedState.tx;
        ty = savedState.ty;
        savedState = null;
      }
      apply();
    }
  });

  pre.appendChild(toolbar);
  pre.appendChild(viewport);
  apply();
}
