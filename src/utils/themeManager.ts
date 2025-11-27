// Theme management utilities for MD2HTML DOCMesh
import type { ThemeStyles } from '../types';

export type ThemeName = 'github-light' | 'github-dark' | 'dracula' | 'monokai' | 'sky-blue' | 'solarized-light' | 'nord';
export type UIMode = 'light' | 'dark';

// Theme definitions with color values
export const THEMES: Record<ThemeName, ThemeStyles & { uiMode: UIMode }> = {
  'github-light': {
    backgroundColor: '#ffffff',
    textColor: '#24292f',
    accentColor: '#0969da',
    codeBlockBg: '#f6f8fa',
    uiMode: 'light'
  },
  'github-dark': {
    backgroundColor: '#0d1117',
    textColor: '#c9d1d9',
    accentColor: '#58a6ff',
    codeBlockBg: '#161b22',
    uiMode: 'dark'
  },
  'dracula': {
    backgroundColor: '#282a36',
    textColor: '#f8f8f2',
    accentColor: '#bd93f9',
    codeBlockBg: '#44475a',
    uiMode: 'dark'
  },
  'monokai': {
    backgroundColor: '#272822',
    textColor: '#f8f8f2',
    accentColor: '#f92672',
    codeBlockBg: '#3e3d32',
    uiMode: 'dark'
  },
  'sky-blue': {
    backgroundColor: '#ffffff',
    textColor: '#334155',
    accentColor: '#0ea5e9',
    codeBlockBg: '#f0f9ff',
    uiMode: 'light'
  },
  'solarized-light': {
    backgroundColor: '#fdf6e3',
    textColor: '#657b83',
    accentColor: '#268bd2',
    codeBlockBg: '#eee8d5',
    uiMode: 'light'
  },
  'nord': {
    backgroundColor: '#2e3440',
    textColor: '#d8dee9',
    accentColor: '#88c0d0',
    codeBlockBg: '#3b4252',
    uiMode: 'dark'
  }
};

/**
 * ThemeManager class for managing theme styles and UI mode synchronization
 */
export class ThemeManager {
  /**
   * Get theme styles for a given theme name
   * @param themeName - The name of the theme
   * @returns ThemeStyles object with color values
   */
  static getThemeStyles(themeName: ThemeName): ThemeStyles {
    const theme = THEMES[themeName];
    return {
      backgroundColor: theme.backgroundColor,
      textColor: theme.textColor,
      accentColor: theme.accentColor,
      codeBlockBg: theme.codeBlockBg
    };
  }

  /**
   * Synchronize UI mode based on theme selection
   * @param themeName - The name of the theme
   * @returns The UI mode ('light' or 'dark') for the theme
   */
  static syncUIMode(themeName: ThemeName): UIMode {
    return THEMES[themeName].uiMode;
  }

  /**
   * Apply UI mode to the document
   * @param mode - The UI mode to apply
   */
  static applyUIMode(mode: UIMode): void {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  /**
   * Toggle UI mode between light and dark
   * @param currentMode - The current UI mode
   * @returns The new UI mode after toggling
   */
  static toggleUIMode(currentMode: UIMode): UIMode {
    return currentMode === 'light' ? 'dark' : 'light';
  }

  /**
   * Get all available theme names
   * @returns Array of theme names
   */
  static getAvailableThemes(): ThemeName[] {
    return Object.keys(THEMES) as ThemeName[];
  }

  /**
   * Check if a theme is a light theme
   * @param themeName - The name of the theme
   * @returns true if the theme is light, false otherwise
   */
  static isLightTheme(themeName: ThemeName): boolean {
    return THEMES[themeName].uiMode === 'light';
  }

  /**
   * Check if a theme is a dark theme
   * @param themeName - The name of the theme
   * @returns true if the theme is dark, false otherwise
   */
  static isDarkTheme(themeName: ThemeName): boolean {
    return THEMES[themeName].uiMode === 'dark';
  }
  /**
   * Get syntax highlighting CSS based on theme
   * @param themeName - The name of the theme
   * @returns CSS string for syntax highlighting
   */
  static getSyntaxHighlightingCSS(themeName: ThemeName): string {
    const isDark = this.isDarkTheme(themeName);

    if (isDark) {
      return `
/* Syntax Highlighting - Dark Theme */
.hljs {
  display: block;
  overflow-x: auto;
  padding: 0.5em;
}

.hljs-keyword,
.hljs-selector-tag,
.hljs-literal,
.hljs-section,
.hljs-link {
  color: #c678dd;
}

.hljs-string {
  color: #98c379;
}

.hljs-number,
.hljs-regexp,
.hljs-addition {
  color: #d19a66;
}

.hljs-built_in,
.hljs-builtin-name {
  color: #e6c07b;
}

.hljs-variable,
.hljs-template-variable,
.hljs-attribute,
.hljs-tag,
.hljs-name,
.hljs-selector-id,
.hljs-selector-class {
  color: #e06c75;
}

.hljs-comment,
.hljs-quote,
.hljs-deletion,
.hljs-meta {
  color: #5c6370;
}

.hljs-function {
  color: #61afef;
}
`;
    } else {
      return `
/* Syntax Highlighting - Light Theme */
.hljs {
  display: block;
  overflow-x: auto;
  padding: 0.5em;
}

.hljs-keyword,
.hljs-selector-tag,
.hljs-literal,
.hljs-section,
.hljs-link {
  color: #a626a4;
}

.hljs-string {
  color: #50a14f;
}

.hljs-number,
.hljs-regexp,
.hljs-addition {
  color: #986801;
}

.hljs-built_in,
.hljs-builtin-name {
  color: #c18401;
}

.hljs-variable,
.hljs-template-variable,
.hljs-attribute,
.hljs-tag,
.hljs-name,
.hljs-selector-id,
.hljs-selector-class {
  color: #e45649;
}

.hljs-comment,
.hljs-quote,
.hljs-deletion,
.hljs-meta {
  color: #a0a1a7;
}

.hljs-function {
  color: #4078f2;
}
`;
    }
  }
}
