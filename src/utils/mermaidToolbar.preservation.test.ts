/**
 * Preservation Property Tests: Non-Fullscreen Pan/Zoom and Toolbar Behavior Unchanged
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * These tests capture the EXISTING baseline behavior of `enhanceMermaidDiagram`
 * that must be preserved after the fullscreen blurriness fix.
 *
 * Tests focus on:
 * - DOM structure created by `enhanceMermaidDiagram`
 * - Zoom transform math (zoomCenter formula)
 * - Toolbar button behavior (zoom in, zoom out, reset)
 * - SVG initial styling in normal (non-fullscreen) view
 *
 * EXPECTED OUTCOME: All tests PASS on unfixed code (confirms baseline behavior).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { enhanceMermaidDiagram } from './mermaidToolbar';

const MIN_SCALE = 0.2;
const MAX_SCALE = 8;

describe('Preservation: Non-Fullscreen Pan/Zoom and Toolbar Behavior', () => {
  let pre: HTMLElement;
  let svg: SVGSVGElement;

  beforeEach(() => {
    pre = document.createElement('pre');
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 800 400');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    pre.appendChild(svg);
    document.body.appendChild(pre);

    enhanceMermaidDiagram(pre, { isDark: false, backgroundColor: '#ffffff' });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  /**
   * Helper: get the toolbar buttons by their aria-label
   */
  function getToolbarButton(label: string): HTMLButtonElement {
    const btn = pre.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;
    return btn;
  }

  /**
   * Helper: clamp like the source code does
   */
  function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  describe('DOM Structure Preservation', () => {
    /**
     * Property: After calling `enhanceMermaidDiagram`, the SVG is wrapped in
     * `.mermaid-canvas` inside `.mermaid-viewport` with toolbar containing 7 buttons.
     *
     * **Validates: Requirements 3.1, 3.3**
     */
    it('should create correct DOM structure: viewport > canvas > svg, toolbar with 7 buttons (PBT)', () => {
      fc.assert(
        fc.property(
          // Generate random viewBox dimensions
          fc.integer({ min: 100, max: 2000 }),
          fc.integer({ min: 100, max: 2000 }),
          fc.boolean(), // isDark
          (vbWidth, vbHeight, isDark) => {
            // Clean up
            document.body.innerHTML = '';

            // Set up fresh diagram with random viewBox
            const testPre = document.createElement('pre');
            const testSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            testSvg.setAttribute('viewBox', `0 0 ${vbWidth} ${vbHeight}`);
            testSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            testPre.appendChild(testSvg);
            document.body.appendChild(testPre);

            enhanceMermaidDiagram(testPre, { isDark, backgroundColor: '#ffffff' });

            // Verify DOM structure: pre > viewport > canvas > svg
            const viewport = testPre.querySelector('.mermaid-viewport') as HTMLElement;
            expect(viewport).not.toBeNull();

            const canvas = viewport.querySelector('.mermaid-canvas') as HTMLElement;
            expect(canvas).not.toBeNull();

            const svgInCanvas = canvas.querySelector('svg') as SVGSVGElement;
            expect(svgInCanvas).not.toBeNull();
            expect(svgInCanvas.getAttribute('viewBox')).toBe(`0 0 ${vbWidth} ${vbHeight}`);

            // Verify toolbar with 7 buttons
            const toolbar = testPre.querySelector('.mermaid-toolbar') as HTMLElement;
            expect(toolbar).not.toBeNull();

            const buttons = toolbar.querySelectorAll('button');
            expect(buttons.length).toBe(7);

            // Verify expected button labels
            const expectedLabels = [
              'Zoom in',
              'Zoom out',
              'Reset view',
              'Toggle fullscreen',
              'Copy image',
              'Download PNG',
              'Download SVG',
            ];
            const actualLabels = Array.from(buttons).map((btn) => btn.getAttribute('aria-label'));
            expect(actualLabels).toEqual(expectedLabels);

            // Verify mermaid-interactive class
            expect(testPre.classList.contains('mermaid-interactive')).toBe(true);

            // Verify isDark class applied correctly
            expect(testPre.classList.contains('is-dark')).toBe(isDark);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Zoom Transform Preservation', () => {
    /**
     * Property: For all random zoom factors applied via toolbar button clicks
     * (zoomCenter), the canvas transform follows the formula:
     * `translate(tx, ty) scale(newScale)` where newScale is clamped to [MIN_SCALE, MAX_SCALE].
     *
     * Using toolbar buttons (which call zoomCenter) avoids DOM layout issues
     * that occur with wheel events in happy-dom's synthetic environment.
     * zoomCenter calls zoomAt with origin (rect.width/2, rect.height/2).
     * In happy-dom rect.width=0, rect.height=0, so origin is (0, 0).
     * With origin (0, 0) and initial tx=0, ty=0: only scale changes.
     *
     * **Validates: Requirements 3.1, 3.2**
     */
    it('should apply correct zoom scale for any number of zoom-in via toolbar (PBT)', () => {
      fc.assert(
        fc.property(
          // Generate random number of zoom-in steps
          fc.integer({ min: 1, max: 15 }),
          (steps) => {
            // Clean up
            document.body.innerHTML = '';

            // Set up fresh diagram
            const testPre = document.createElement('pre');
            const testSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            testSvg.setAttribute('viewBox', '0 0 800 400');
            testSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            testPre.appendChild(testSvg);
            document.body.appendChild(testPre);

            enhanceMermaidDiagram(testPre, { isDark: false, backgroundColor: '#ffffff' });

            const canvas = testPre.querySelector('.mermaid-canvas') as HTMLElement;
            const btnZoomIn = testPre.querySelector('button[aria-label="Zoom in"]') as HTMLButtonElement;

            // Click zoom in button 'steps' times
            for (let i = 0; i < steps; i++) {
              btnZoomIn.click();
            }

            // Calculate expected scale: each zoom in uses factor 1.2
            let expectedScale = 1;
            for (let i = 0; i < steps; i++) {
              expectedScale = clamp(expectedScale * 1.2, MIN_SCALE, MAX_SCALE);
            }

            // Zoom resizes the SVG (vector) rather than CSS scale()
            const svgEl = canvas.querySelector('svg') as SVGSVGElement;
            expect(svgEl.style.width).toBe(`${Math.round(800 * expectedScale)}px`);
            expect(canvas.style.transform).toMatch(/^translate\(/);
            expect(canvas.style.transform).not.toMatch(/scale\(/);
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * Property: For all random zoom factors ∈ [0.5, 2.0], the clamped scale
     * is always within [MIN_SCALE, MAX_SCALE].
     *
     * **Validates: Requirements 3.1, 3.2**
     */
    it('should always clamp scale within [MIN_SCALE, MAX_SCALE] for any zoom sequence (PBT)', () => {
      fc.assert(
        fc.property(
          // Generate a sequence of zoom-in or zoom-out events (up to 50 steps)
          fc.array(fc.boolean(), { minLength: 1, maxLength: 50 }),
          (zoomSequence) => {
            // Clean up
            document.body.innerHTML = '';

            // Set up fresh diagram
            const testPre = document.createElement('pre');
            const testSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            testSvg.setAttribute('viewBox', '0 0 800 400');
            testSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            testPre.appendChild(testSvg);
            document.body.appendChild(testPre);

            enhanceMermaidDiagram(testPre, { isDark: false, backgroundColor: '#ffffff' });

            const canvas = testPre.querySelector('.mermaid-canvas') as HTMLElement;
            const viewport = testPre.querySelector('.mermaid-viewport') as HTMLElement;

            // Apply zoom sequence
            for (const isZoomIn of zoomSequence) {
              const event = new WheelEvent('wheel', {
                deltaY: isZoomIn ? -100 : 100,
                clientX: 0,
                clientY: 0,
                bubbles: true,
              });
              viewport.dispatchEvent(event);
            }

            const svgEl = canvas.querySelector('svg') as SVGSVGElement;
            const width = parseFloat(svgEl.style.width);
            const actualScale = width / 800;
            expect(actualScale).toBeGreaterThanOrEqual(MIN_SCALE - 1e-10);
            expect(actualScale).toBeLessThanOrEqual(MAX_SCALE + 1e-10);
            expect(canvas.style.transform).not.toMatch(/scale\(/);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Toolbar Button Preservation', () => {
    /**
     * Property: For any sequence of zoom-in/zoom-out/reset toolbar clicks
     * (without fullscreen), the final transform matches the expected mathematical formula.
     *
     * Toolbar: zoom in uses factor 1.2, zoom out uses factor 1/1.2, reset → scale=1, tx=0, ty=0
     * zoomCenter with happy-dom (origin 0, 0): only scale changes, tx/ty remain 0
     *
     * **Validates: Requirements 3.2, 3.4**
     */
    it('should produce correct transform for any sequence of toolbar clicks (PBT)', () => {
      fc.assert(
        fc.property(
          // Generate a sequence of toolbar actions: 0=zoom in, 1=zoom out, 2=reset
          fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 1, maxLength: 20 }),
          (actions) => {
            // Clean up
            document.body.innerHTML = '';

            // Set up fresh diagram
            const testPre = document.createElement('pre');
            const testSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            testSvg.setAttribute('viewBox', '0 0 800 400');
            testSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            testPre.appendChild(testSvg);
            document.body.appendChild(testPre);

            enhanceMermaidDiagram(testPre, { isDark: false, backgroundColor: '#ffffff' });

            const canvas = testPre.querySelector('.mermaid-canvas') as HTMLElement;
            const btnZoomIn = testPre.querySelector('button[aria-label="Zoom in"]') as HTMLButtonElement;
            const btnZoomOut = testPre.querySelector('button[aria-label="Zoom out"]') as HTMLButtonElement;
            const btnReset = testPre.querySelector('button[aria-label="Reset view"]') as HTMLButtonElement;

            // Calculate expected scale by simulating the math
            let expectedScale = 1;

            for (const action of actions) {
              if (action === 0) {
                // Zoom in: factor 1.2
                btnZoomIn.click();
                expectedScale = clamp(expectedScale * 1.2, MIN_SCALE, MAX_SCALE);
              } else if (action === 1) {
                // Zoom out: factor 1/1.2
                btnZoomOut.click();
                expectedScale = clamp(expectedScale * (1 / 1.2), MIN_SCALE, MAX_SCALE);
              } else {
                // Reset
                btnReset.click();
                expectedScale = 1;
              }
            }

            const svgEl = canvas.querySelector('svg') as SVGSVGElement;
            expect(svgEl.style.width).toBe(`${Math.round(800 * expectedScale)}px`);
            expect(canvas.style.transform).toBe('translate(0px, 0px)');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reset SVG size to the viewBox on reset button click', () => {
      const canvas = pre.querySelector('.mermaid-canvas') as HTMLElement;
      const svgEl = canvas.querySelector('svg') as SVGSVGElement;
      const btnZoomIn = getToolbarButton('Zoom in');
      const btnReset = getToolbarButton('Reset view');

      btnZoomIn.click();
      btnZoomIn.click();
      btnZoomIn.click();

      expect(svgEl.style.width).not.toBe('800px');

      btnReset.click();

      expect(svgEl.style.width).toBe('800px');
      expect(canvas.style.transform).toBe('translate(0px, 0px)');
    });
  });

  describe('SVG Initial Styling Preservation', () => {
    /**
     * The canvas SVG must not be max-width: 100% or in-page zoom is clamped
     * to the column and the buttons look like no-ops.
     *
     * **Validates: Requirements 3.3, 3.5**
     */
    it('should size the SVG to its viewBox at rest in jsdom (no layout width)', () => {
      const canvas = pre.querySelector('.mermaid-canvas') as HTMLElement;
      const enhancedSvg = canvas.querySelector('svg') as SVGSVGElement;

      expect(enhancedSvg.style.width).toBe('800px');
      expect(enhancedSvg.style.height).toBe('400px');
    });

    it('should have initial transform of translate(0px, 0px)', () => {
      const canvas = pre.querySelector('.mermaid-canvas') as HTMLElement;
      expect(canvas.style.transform).toBe('translate(0px, 0px)');
    });

    it('should inject mermaid-toolbar-styles stylesheet', () => {
      const styleEl = document.getElementById('mermaid-toolbar-styles');
      expect(styleEl).not.toBeNull();
      expect(styleEl!.textContent).toContain('.mermaid-canvas > svg');
      expect(styleEl!.textContent).toContain('max-width: none');
    });
  });
});
