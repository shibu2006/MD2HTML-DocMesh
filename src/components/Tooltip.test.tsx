import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import { Tooltip } from './Tooltip';

describe('Tooltip Component', () => {
  beforeEach(() => {
    // Mock getBoundingClientRect for testing
    Element.prototype.getBoundingClientRect = vi.fn(function(this: Element) {
      const element = this as HTMLElement;
      const top = parseFloat(element.style.top || '0');
      const left = parseFloat(element.style.left || '0');
      const width = parseFloat(element.style.width || '100');
      const height = parseFloat(element.style.height || '30');
      
      return {
        top,
        left,
        right: left + width,
        bottom: top + height,
        width,
        height,
        x: left,
        y: top,
        toJSON: () => ({}),
      };
    });
  });

  /**
   * Feature: md2html-docmesh, Property 34: Tooltip positioning avoids viewport edges
   * Validates: Requirements 12.2
   * 
   * For any tooltip trigger element, the tooltip should be positioned such that 
   * it remains fully visible within the viewport bounds.
   */
  it('property: tooltip positioning avoids viewport edges', async () => {
    // Set a consistent viewport size for testing
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });

    await fc.assert(
      fc.asyncProperty(
        // Generate random trigger element positions within viewport
        fc.record({
          top: fc.integer({ min: 0, max: 700 }),
          left: fc.integer({ min: 0, max: 900 }),
          width: fc.integer({ min: 50, max: 200 }),
          height: fc.integer({ min: 20, max: 60 }),
        }),
        // Generate random tooltip content
        fc.string({ minLength: 5, maxLength: 50 }),
        async (triggerRect, content) => {
          // Create a mock trigger element with specific position
          const mockGetBoundingClientRect = vi.fn(() => ({
            top: triggerRect.top,
            left: triggerRect.left,
            right: triggerRect.left + triggerRect.width,
            bottom: triggerRect.top + triggerRect.height,
            width: triggerRect.width,
            height: triggerRect.height,
            x: triggerRect.left,
            y: triggerRect.top,
            toJSON: () => ({}),
          }));

          const { container, unmount } = render(
            <Tooltip content={content} delay={0}>
              <button>Hover me</button>
            </Tooltip>
          );

          // Find the trigger element and override its getBoundingClientRect
          const triggerElement = container.querySelector('div') as HTMLDivElement;
          if (triggerElement) {
            triggerElement.getBoundingClientRect = mockGetBoundingClientRect;
          }

          // Simulate mouse enter to show tooltip
          const triggerDiv = container.querySelector('div');
          if (triggerDiv) {
            fireEvent.mouseEnter(triggerDiv);
          }

          // Wait for tooltip to appear
          await waitFor(() => {
            const tooltip = document.querySelector('[role="tooltip"]');
            expect(tooltip).not.toBeNull();
          }, { timeout: 500 });

          // Get the tooltip element
          const tooltip = document.querySelector('[role="tooltip"]') as HTMLElement;
          
          if (tooltip) {
            const tooltipTop = parseFloat(tooltip.style.top);
            const tooltipLeft = parseFloat(tooltip.style.left);
            
            // Estimated tooltip dimensions (from component)
            const tooltipWidth = 200;
            const tooltipHeight = 40;
            const spacing = 8;

            // Property: Tooltip should stay within viewport bounds
            // Check horizontal bounds
            expect(tooltipLeft).toBeGreaterThanOrEqual(spacing);
            expect(tooltipLeft + tooltipWidth).toBeLessThanOrEqual(window.innerWidth - spacing);

            // Check vertical bounds
            expect(tooltipTop).toBeGreaterThanOrEqual(spacing);
            expect(tooltipTop + tooltipHeight).toBeLessThanOrEqual(window.innerHeight - spacing);
          }

          // Cleanup
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Tooltip appears on hover
   */
  it('tooltip appears on hover after delay', async () => {
    const { container, unmount } = render(
      <Tooltip content="Test tooltip" delay={0}>
        <button>Hover me</button>
      </Tooltip>
    );

    // Initially, tooltip should not be visible
    expect(document.querySelector('[role="tooltip"]')).toBeNull();

    // Simulate mouse enter on the wrapper div
    const triggerDiv = container.querySelector('div');
    if (triggerDiv) {
      fireEvent.mouseEnter(triggerDiv);
    }

    // Wait for tooltip to appear
    await waitFor(() => {
      const tooltip = document.querySelector('[role="tooltip"]');
      expect(tooltip).not.toBeNull();
      expect(tooltip?.textContent).toContain('Test tooltip');
    }, { timeout: 500 });

    unmount();
  });

  /**
   * Additional test: Tooltip disappears on mouse leave
   */
  it('tooltip disappears on mouse leave', async () => {
    const { container, unmount } = render(
      <Tooltip content="Test tooltip" delay={0}>
        <button>Hover me</button>
      </Tooltip>
    );

    // Simulate mouse enter on the wrapper div
    const triggerDiv = container.querySelector('div');
    if (triggerDiv) {
      fireEvent.mouseEnter(triggerDiv);
    }

    // Wait for tooltip to appear
    await waitFor(() => {
      expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
    }, { timeout: 500 });

    // Simulate mouse leave
    if (triggerDiv) {
      fireEvent.mouseLeave(triggerDiv);
    }

    // Wait for tooltip to disappear
    await waitFor(() => {
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
    }, { timeout: 500 });

    unmount();
  });
});
