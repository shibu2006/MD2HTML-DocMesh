/**
 * Bug Condition Exploration Test: Mermaid SVG Blurry in Fullscreen
 *
 * **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
 *
 * This test encodes the EXPECTED behavior after the bug is fixed:
 * - SVG `max-width` constraint should be removed on fullscreen entry
 * - SVG should render at its intrinsic viewBox size (same resolution as PNG
 *   export), not be stretched to width/height 100% (which shrinks a large
 *   diagram and then CSS-upscales a low-res compositor layer → blur)
 * - Pan/zoom state should reset on fullscreen entry
 *
 * EXPECTED OUTCOME ON UNFIXED CODE: Test FAILS because:
 * - No `fullscreenchange` listener exists
 * - SVG retains `max-width: 100%` (via CSS)
 * - Pan/zoom is not reset
 *
 * This failure CONFIRMS the bug exists.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { enhanceMermaidDiagram } from './mermaidToolbar';

describe('Bug Condition Exploration: Mermaid SVG Blurry in Fullscreen', () => {
  let pre: HTMLElement;
  let svg: SVGSVGElement;

  beforeEach(() => {
    // Create a <pre> element with an SVG child simulating a rendered mermaid diagram
    pre = document.createElement('pre');
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 800 400');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    pre.appendChild(svg);
    document.body.appendChild(pre);

    // Call enhanceMermaidDiagram to set up the interactive toolbar/viewport
    enhanceMermaidDiagram(pre, { isDark: false, backgroundColor: '#ffffff' });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  /**
   * Helper: Simulate entering fullscreen by setting document.fullscreenElement
   * and dispatching the fullscreenchange event on the pre element.
   */
  function simulateFullscreenEntry(target: HTMLElement): void {
    Object.defineProperty(document, 'fullscreenElement', {
      value: target,
      writable: true,
      configurable: true,
    });
    target.dispatchEvent(new Event('fullscreenchange', { bubbles: true }));
  }

  /**
   * Helper: Simulate a wheel zoom event to change pan/zoom state.
   */
  function simulateWheelZoom(viewport: HTMLElement, deltaY: number, times: number = 1): void {
    for (let i = 0; i < times; i++) {
      const event = new WheelEvent('wheel', {
        deltaY,
        clientX: 100,
        clientY: 100,
        bubbles: true,
      });
      viewport.dispatchEvent(event);
    }
  }

  it('should remove SVG max-width constraint on fullscreen entry', () => {
    // Verify the SVG is inside the mermaid-canvas after enhancement
    const canvas = pre.querySelector('.mermaid-canvas') as HTMLElement;
    expect(canvas).not.toBeNull();

    const enhancedSvg = canvas.querySelector('svg') as SVGSVGElement;
    expect(enhancedSvg).not.toBeNull();

    // Simulate fullscreen entry
    simulateFullscreenEntry(pre);

    // Bug Condition Check: After fullscreen entry, svg.style.maxWidth should be 'none'
    // On UNFIXED code, this will be '' (empty, inheriting CSS max-width: 100%)
    expect(enhancedSvg.style.maxWidth).toBe('none');
  });

  it('should size the SVG to its viewBox on fullscreen entry (native resolution)', () => {
    const canvas = pre.querySelector('.mermaid-canvas') as HTMLElement;
    const enhancedSvg = canvas.querySelector('svg') as SVGSVGElement;

    simulateFullscreenEntry(pre);

    // Stretching to 100% shrinks a 4000px diagram into the screen and the
    // compositor then rasterizes that small bitmap — zooming looks blurry.
    // Native viewBox pixels match PNG export and stay sharp.
    expect(enhancedSvg.style.width).toBe('800px');
    expect(enhancedSvg.style.height).toBe('400px');
    expect(enhancedSvg.style.maxWidth).toBe('none');
  });

  it('should zoom fullscreen diagrams by resizing the SVG, not CSS scale()', () => {
    const canvas = pre.querySelector('.mermaid-canvas') as HTMLElement;
    const enhancedSvg = canvas.querySelector('svg') as SVGSVGElement;
    const zoomIn = pre.querySelector('button[aria-label="Zoom in"]') as HTMLButtonElement;

    simulateFullscreenEntry(pre);
    zoomIn.click();

    // 800 * 1.2, 400 * 1.2 — vector re-raster at the new size, stays sharp.
    expect(enhancedSvg.style.width).toBe('960px');
    expect(enhancedSvg.style.height).toBe('480px');
    expect(canvas.style.transform).toMatch(/^translate\(/);
    expect(canvas.style.transform).not.toMatch(/scale\(/);
  });

  it('should reset pan/zoom state on fullscreen entry', () => {
    const canvas = pre.querySelector('.mermaid-canvas') as HTMLElement;
    const viewport = pre.querySelector('.mermaid-viewport') as HTMLElement;

    // First, zoom in to change the pan/zoom state
    simulateWheelZoom(viewport, -100, 3); // Zoom in 3 times

    const svgBefore = canvas.querySelector('svg') as SVGSVGElement;
    expect(svgBefore.style.width).not.toBe('800px');

    // Simulate fullscreen entry
    simulateFullscreenEntry(pre);

    // Bug Condition Check: pan/zoom should reset (fullscreen uses translate only)
    expect(canvas.style.transform).toBe('translate(0px, 0px)');
  });

  /**
   * Property-based test: For ALL random initial pan/zoom states,
   * entering fullscreen should remove SVG constraints and reset pan/zoom.
   *
   * **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
   */
  it('should reset pan/zoom and remove SVG constraints for any initial state (PBT)', () => {
    fc.assert(
      fc.property(
        // Generate random scale in [0.2, 8]
        fc.double({ min: 0.2, max: 8, noNaN: true }),
        // Generate random tx in [-500, 500]
        fc.double({ min: -500, max: 500, noNaN: true }),
        // Generate random ty in [-500, 500]
        fc.double({ min: -500, max: 500, noNaN: true }),
        (scale, txVal, tyVal) => {
          // Clean up previous state
          document.body.innerHTML = '';
          Object.defineProperty(document, 'fullscreenElement', {
            value: null,
            writable: true,
            configurable: true,
          });

          // Set up fresh diagram
          const testPre = document.createElement('pre');
          const testSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          testSvg.setAttribute('viewBox', '0 0 800 400');
          testSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          testPre.appendChild(testSvg);
          document.body.appendChild(testPre);

          enhanceMermaidDiagram(testPre, { isDark: false, backgroundColor: '#ffffff' });

          const canvas = testPre.querySelector('.mermaid-canvas') as HTMLElement;
          const enhancedSvg = canvas.querySelector('svg') as SVGSVGElement;

          // Manually set the canvas transform to simulate an arbitrary pan/zoom state
          canvas.style.transform = `translate(${txVal}px, ${tyVal}px) scale(${scale})`;

          // Simulate fullscreen entry
          Object.defineProperty(document, 'fullscreenElement', {
            value: testPre,
            writable: true,
            configurable: true,
          });
          testPre.dispatchEvent(new Event('fullscreenchange', { bubbles: true }));

          // Assert: SVG constraints removed; sized to viewBox, not 100%
          expect(enhancedSvg.style.maxWidth).toBe('none');
          expect(enhancedSvg.style.width).toBe('800px');
          expect(enhancedSvg.style.height).toBe('400px');

          // Assert: pan reset; fullscreen zoom uses SVG resize, not CSS scale
          expect(canvas.style.transform).toBe('translate(0px, 0px)');
        }
      ),
      { numRuns: 50 } // Run with 50 random states
    );
  });
});

describe('In-page zoom sharpness and surface color', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  function mount(backgroundColor: string, isDark: boolean) {
    const pre = document.createElement('pre');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 800 400');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    pre.appendChild(svg);
    document.body.appendChild(pre);
    enhanceMermaidDiagram(pre, { isDark, backgroundColor });
    return pre;
  }

  it('replaces mermaid width="100%" so in-page zoom is not clamped to the column', () => {
    const pre = document.createElement('pre');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 800 400');
    svg.setAttribute('width', '100%');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    pre.appendChild(svg);
    document.body.appendChild(pre);
    enhanceMermaidDiagram(pre, { isDark: false, backgroundColor: '#ffffff' });

    const live = pre.querySelector('.mermaid-canvas > svg') as SVGSVGElement;
    const zoomIn = pre.querySelector('button[aria-label="Zoom in"]') as HTMLButtonElement;
    zoomIn.click();

    // Mermaid ships width="100%". If that attribute stays, the SVG is a
    // percentage of the viewport and zoom-in/out look like no-ops.
    expect(live.getAttribute('width')).toBe('960');
    expect(live.getAttribute('height')).toBe('480');
    expect(live.style.maxWidth).toBe('none');
  });

  it('zooms in-page by resizing the SVG instead of CSS scale()', () => {
    const pre = mount('#ffffff', false);
    const canvas = pre.querySelector('.mermaid-canvas') as HTMLElement;
    const svg = canvas.querySelector('svg') as SVGSVGElement;
    const zoomIn = pre.querySelector('button[aria-label="Zoom in"]') as HTMLButtonElement;

    zoomIn.click();

    expect(svg.style.width).toBe('960px');
    expect(svg.style.height).toBe('480px');
    expect(canvas.style.transform).toMatch(/^translate\(/);
    expect(canvas.style.transform).not.toMatch(/scale\(/);
  });

  it('paints the viewport with the diagram surface color, not a dark chrome backdrop', () => {
    const pre = mount('#ffffff', true);
    const viewport = pre.querySelector('.mermaid-viewport') as HTMLElement;
    const canvas = pre.querySelector('.mermaid-canvas') as HTMLElement;

    expect(viewport.style.backgroundColor.replace(/\s/g, '')).toMatch(/#ffffff|rgb\(255,255,255\)/i);
    expect(canvas.style.backgroundColor.replace(/\s/g, '')).toMatch(/#ffffff|rgb\(255,255,255\)/i);
    expect(pre.style.getPropertyValue('--mermaid-surface')).toBe('#ffffff');
  });
});
