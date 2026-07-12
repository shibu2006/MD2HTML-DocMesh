/**
 * Bug Condition Exploration Test: Mermaid SVG Blurry in Fullscreen
 *
 * **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
 *
 * This test encodes the EXPECTED behavior after the bug is fixed:
 * - SVG `max-width` constraint should be removed on fullscreen entry
 * - SVG should fill the fullscreen viewport (width/height 100%)
 * - Pan/zoom state should reset to fit-to-view on fullscreen entry
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

  it('should set SVG width and height to 100% on fullscreen entry', () => {
    const canvas = pre.querySelector('.mermaid-canvas') as HTMLElement;
    const enhancedSvg = canvas.querySelector('svg') as SVGSVGElement;

    // Simulate fullscreen entry
    simulateFullscreenEntry(pre);

    // Bug Condition Check: SVG should fill the viewport
    expect(enhancedSvg.style.width).toBe('100%');
    expect(enhancedSvg.style.height).toBe('100%');
  });

  it('should reset pan/zoom state on fullscreen entry', () => {
    const canvas = pre.querySelector('.mermaid-canvas') as HTMLElement;
    const viewport = pre.querySelector('.mermaid-viewport') as HTMLElement;

    // First, zoom in to change the pan/zoom state
    simulateWheelZoom(viewport, -100, 3); // Zoom in 3 times

    // Verify transform has changed from default
    const transformBefore = canvas.style.transform;
    expect(transformBefore).not.toBe('translate(0px, 0px) scale(1)');

    // Simulate fullscreen entry
    simulateFullscreenEntry(pre);

    // Bug Condition Check: pan/zoom should reset
    expect(canvas.style.transform).toBe('translate(0px, 0px) scale(1)');
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

          // Assert: SVG constraints removed
          expect(enhancedSvg.style.maxWidth).toBe('none');
          expect(enhancedSvg.style.width).toBe('100%');
          expect(enhancedSvg.style.height).toBe('100%');

          // Assert: pan/zoom reset
          expect(canvas.style.transform).toBe('translate(0px, 0px) scale(1)');
        }
      ),
      { numRuns: 50 } // Run with 50 random states
    );
  });
});
