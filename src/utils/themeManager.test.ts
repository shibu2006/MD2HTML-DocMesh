// Property-based tests for ThemeManager
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ThemeManager } from './themeManager';
import type { ThemeName } from './themeManager';

describe('ThemeManager Property Tests', () => {
  // Feature: md2html-docmesh, Property 15: Light theme triggers light UI mode
  // Validates: Requirements 7.3
  it('Property 15: Light theme triggers light UI mode', () => {
    // Get all light themes
    const lightThemes: ThemeName[] = ['github-light', 'sky-blue', 'solarized-light'];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...lightThemes),
        (themeName) => {
          const uiMode = ThemeManager.syncUIMode(themeName);
          return uiMode === 'light';
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: md2html-docmesh, Property 16: Dark theme triggers dark UI mode
  // Validates: Requirements 7.4
  it('Property 16: Dark theme triggers dark UI mode', () => {
    // Get all dark themes
    const darkThemes: ThemeName[] = ['github-dark', 'dracula', 'monokai', 'nord'];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...darkThemes),
        (themeName) => {
          const uiMode = ThemeManager.syncUIMode(themeName);
          return uiMode === 'dark';
        }
      ),
      { numRuns: 100 }
    );
  });
});
