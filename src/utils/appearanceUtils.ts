import type { ExportSettings, ThemeStyles } from '../types';
import { ThemeManager } from './themeManager';
import { pickDistinctColor, pickReadableColor } from './styleCloneEngine';

export interface ResolvedAppearance {
  colors: ThemeStyles;
  headingColor: string;
  linkColor: string;
  tableHeaderBg: string;
  tableHeaderColor: string;
  tableBorderColor: string;
  fontFamily: string;
  headingFontFamily: string;
  lineHeight: string;
  headingFontWeight: string;
  borderRadius: string;
  clonedCss?: string;
  isDark: boolean;
}

export function getConfiguredFontFamily(fontFamily: ExportSettings['fontFamily']): string {
  switch (fontFamily) {
    case 'system':
      return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    case 'inter':
      return '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    case 'roboto':
      return '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    case 'open-sans':
      return '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    case 'merriweather':
      return '"Merriweather", Georgia, Cambria, "Times New Roman", Times, serif';
    case 'fira-code':
      return '"Fira Code", "Courier New", Courier, monospace';
    case 'monospace':
      return '"Courier New", Courier, monospace';
    default:
      return '-apple-system, BlinkMacSystemFont, sans-serif';
  }
}

export function getConfiguredFontSize(fontSize: ExportSettings['fontSize']): string {
  switch (fontSize) {
    case 'small':
      return '14px';
    case 'large':
      return '18px';
    case 'extra-large':
      return '20px';
    case 'medium':
    default:
      return '16px';
  }
}

export function resolveAppearance(settings: ExportSettings): ResolvedAppearance {
  const baseColors = ThemeManager.getThemeStyles(settings.theme);
  const cloned = settings.clonedStyle;
  const fontFamily = cloned?.fontFamily || getConfiguredFontFamily(settings.fontFamily);

  const colors = cloned?.colors || baseColors;
  const isDark = cloned?.isDark ?? ThemeManager.isDarkTheme(settings.theme);
  const readableAccent = cloned
    ? pickDistinctColor(
        [cloned.headingColor, colors.accentColor, cloned.linkColor],
        colors.backgroundColor,
        colors.textColor,
      ) || colors.textColor
    : colors.accentColor;

  return {
    colors: cloned
      ? {
          ...colors,
          accentColor: pickDistinctColor(
            [colors.accentColor, cloned.headingColor, cloned.linkColor],
            colors.backgroundColor,
            colors.textColor,
          ) || readableAccent,
        }
      : colors,
    headingColor: pickReadableColor(
      [cloned?.headingColor, readableAccent, colors.textColor],
      colors.backgroundColor,
      colors.textColor,
    ),
    linkColor: pickReadableColor(
      [cloned?.linkColor, colors.accentColor, readableAccent, colors.textColor],
      colors.backgroundColor,
      colors.textColor,
    ),
    tableHeaderBg: cloned?.tableHeaderBg || colors.codeBlockBg,
    tableHeaderColor: cloned?.tableHeaderColor || colors.textColor,
    tableBorderColor: cloned?.tableBorderColor || (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'),
    fontFamily,
    headingFontFamily: cloned?.headingFontFamily || fontFamily,
    lineHeight: cloned?.lineHeight || '1.6',
    headingFontWeight: cloned?.headingFontWeight || '700',
    borderRadius: cloned?.borderRadius || '5px',
    clonedCss: cloned?.clonedCss,
    isDark,
  };
}
