import type { ClonedStyle, ThemeStyles } from '../types';

const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const MAX_AGGREGATE_BYTES = 10 * 1024 * 1024;
const MAX_LINKED_STYLESHEETS = 10;

type StyleTarget = 'page' | 'heading' | 'link' | 'code' | 'table' | 'th';

type ParsedDeclaration = {
  value: string;
  important: boolean;
};

type ParsedRule = {
  selector: string;
  declarations: Map<string, ParsedDeclaration>;
};

interface ExtractionOptions {
  sourceType: ClonedStyle['sourceType'];
  sourceLabel: string;
  styleSources?: string[];
  warnings?: string[];
  resolvedLinkedStyles?: boolean;
  preferDark?: boolean;
}

const THEME_TOKEN_NAMES = ['--ground', '--ink', '--accent', '--surface', '--code-bg', '--signal', '--muted'];

function themeSheetScore(css: string): number {
  return THEME_TOKEN_NAMES.reduce((score, name) => score + (css.includes(name) ? 1 : 0), 0);
}

function prefersDarkFromDocument(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.documentElement.classList.contains('dark')) return true;
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

interface ParsedSourceDocument {
  documentNode: Document;
  isEmbeddedArtifact: boolean;
}

/**
 * Saved artifact pages (notably Claude downloads) keep the actual document in
 * an iframe's srcdoc attribute. Reading only the outer document clones the
 * hosting product's chrome instead of the artifact the user can see.
 */
function parseSourceDocument(html: string): ParsedSourceDocument {
  const parser = new DOMParser();
  const outerDocument = parser.parseFromString(html, 'text/html');
  const srcdocFrames = Array.from(outerDocument.querySelectorAll<HTMLIFrameElement>('iframe[srcdoc]'));
  let bestArtifact: { documentNode: Document; score: number } | undefined;

  for (const frame of srcdocFrames) {
    const srcdoc = frame.getAttribute('srcdoc') || '';
    if (!/<(?:html|body|style)\b/i.test(srcdoc)) continue;

    const candidate = parser.parseFromString(srcdoc, 'text/html');
    const styleCount = candidate.querySelectorAll('style, link[rel~="stylesheet"]').length;
    const contentLength = candidate.body?.textContent?.trim().length || 0;
    if (styleCount === 0 || contentLength === 0) continue;

    const frameBonus = frame.id === 'frame-content' ? 1_000_000 : 0;
    const score = frameBonus + styleCount * 10_000 + Math.min(contentLength, 100_000);
    if (!bestArtifact || score > bestArtifact.score) {
      bestArtifact = { documentNode: candidate, score };
    }
  }

  return bestArtifact
    ? { documentNode: bestArtifact.documentNode, isEmbeddedArtifact: true }
    : { documentNode: outerDocument, isEmbeddedArtifact: false };
}

function stripImportant(value: string): string {
  return value.replace(/\s*!important\s*$/i, '').trim();
}

function parseDeclarations(block: string): Map<string, ParsedDeclaration> {
  const declarations = new Map<string, ParsedDeclaration>();

  for (const declaration of block.split(';')) {
    const separator = declaration.indexOf(':');
    if (separator <= 0) continue;

    const property = declaration.slice(0, separator).trim().toLowerCase();
    const rawValue = declaration.slice(separator + 1).trim();
    const value = stripImportant(rawValue);
    if (property && value) declarations.set(property, { value, important: /!important\s*$/i.test(rawValue) });
  }

  return declarations;
}

/**
 * Lift rules out of @layer / @theme / @media / @supports so a conservative
 * parser (and CSSStyleSheet implementations that skip those wrappers) still
 * sees utility classes and design tokens.
 */
function unwrapAtRules(css: string): string {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let result = '';
  let index = 0;

  while (index < withoutComments.length) {
    const remaining = withoutComments.slice(index);
    const atRule = remaining.match(/^@(?:layer|theme|media|supports|scope)[^{]*\{/);
    if (atRule) {
      const innerStart = index + atRule[0].length;
      let depth = 1;
      let cursor = innerStart;
      while (cursor < withoutComments.length && depth > 0) {
        const char = withoutComments[cursor];
        if (char === '{') depth += 1;
        else if (char === '}') depth -= 1;
        cursor += 1;
      }
      result += unwrapAtRules(withoutComments.slice(innerStart, cursor - 1));
      index = cursor;
      continue;
    }
    result += withoutComments[index];
    index += 1;
  }

  return result;
}

const MAX_CLONED_CSS_CHARS = 80_000;

function isChromeSheet(css: string): boolean {
  return /:host\s*\{|anthropic-sans|\.consent\s+button|data-frame-uuid/i.test(css);
}

function isChromeSelector(selector: string): boolean {
  return /:host\b|\[data-frame|anthropic|#claude|\.consent\b|\.err-btn|\.sf-hidden/i.test(selector);
}

function isSafeCssValue(value: string): boolean {
  return value.length < 400 && !/[;{}<>]|expression\s*\(|url\s*\(/i.test(value);
}

function sanitizeClonedCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@import[^;]+;/gi, '')
    .replace(/@font-face\s*\{[^{}]*\}/gi, '')
    .replace(/expression\s*\(/gi, 'invalid(');
}

function dropRootRules(css: string): string {
  return css.replace(/:root(?:\s*:not\([^)]*\))?\s*\{[^{}]*\}/g, '');
}

function pickStylesheetsToClone(rawCSS: string[]): string[] {
  const themed = rawCSS
    .filter(css => themeSheetScore(css) >= 3)
    .sort((left, right) => themeSheetScore(right) - themeSheetScore(left));
  if (themed[0]) return [themed[0]];

  return rawCSS.filter(css => {
    if (isChromeSheet(css) || css.length > 40_000) return false;
    const withoutFonts = css.replace(/@font-face\s*\{[^{}]*\}/gi, '');
    return withoutFonts.trim().length > 20;
  }).slice(0, 4);
}

function tokenStylesheet(variables: Map<string, string>): string {
  const declarations = [...variables.entries()]
    .filter(([name, value]) => name.startsWith('--') && isSafeCssValue(value))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
  return declarations ? `:root {\n${declarations}\n}\n` : '';
}

function buildClonedStylesheet(rawCSS: string[], variables: Map<string, string>): string {
  const sheets = pickStylesheetsToClone(rawCSS)
    // Keep responsive @media/@supports wrappers in the stylesheet we apply.
    // unwrapAtRules is only for token/rule analysis; unwrapping here would
    // incorrectly apply mobile-only rules at desktop sizes.
    .map(css => dropRootRules(sanitizeClonedCss(css)))
    .filter(Boolean);
  const combined = `${tokenStylesheet(variables)}${sheets.join('\n')}`.trim();
  return combined.slice(0, MAX_CLONED_CSS_CHARS);
}

function scopeSelector(selector: string, scope: string): string {
  const trimmed = selector.trim();
  if (!trimmed || isChromeSelector(trimmed)) return '';
  if (/^(?:html|body|:root|\*)$/i.test(trimmed) || /^(?:html|body|:root)\b/i.test(trimmed)) {
    return scope;
  }
  return `${scope} ${trimmed}`;
}

function scopeCssBlock(css: string, scope: string): string {
  let result = '';
  let index = 0;

  while (index < css.length) {
    const remaining = css.slice(index);
    const atRule = remaining.match(/^@(?:media|supports|layer)[^{]*\{/);
    if (atRule) {
      const innerStart = index + atRule[0].length;
      let depth = 1;
      let cursor = innerStart;
      while (cursor < css.length && depth > 0) {
        if (css[cursor] === '{') depth += 1;
        else if (css[cursor] === '}') depth -= 1;
        cursor += 1;
      }
      const header = atRule[0].slice(0, -1).trim();
      result += `${header} {\n${scopeCssBlock(css.slice(innerStart, cursor - 1), scope)}\n}\n`;
      index = cursor;
      continue;
    }

    const rule = remaining.match(/^([^{}@]+)\{([^{}]*)\}/);
    if (rule) {
      const selectors = rule[1].split(',').map(part => scopeSelector(part, scope)).filter(Boolean);
      if (selectors.length) result += `${selectors.join(', ')} {${rule[2]}}\n`;
      index += rule[0].length;
      continue;
    }

    result += css[index];
    index += 1;
  }

  return result.replace(/\n{3,}/g, '\n\n').trim();
}

export function scopeClonedStylesheet(css: string, scope: string): string {
  return scopeCssBlock(sanitizeClonedCss(css), scope);
}

function harvestVariables(css: string, variables: Map<string, string>, overwrite = false): void {
  const pattern = /(--[\w-]+)\s*:\s*([^;{}]+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(css))) {
    const name = match[1];
    const value = match[2].trim();
    if (!name || !value) continue;
    if (overwrite || !variables.has(name)) variables.set(name, value);
  }
}

function coerceColorValue(value: string): string {
  const trimmed = value.trim();
  // shadcn / Tailwind tokens store "H S% L%" and paint with hsl(var(--token)).
  if (/^-?[\d.]+(?:deg)?\s+[\d.]+%\s+[\d.]+%$/.test(trimmed)) {
    return `hsl(${trimmed})`;
  }
  return trimmed;
}

function parseCSSFallback(css: string): ParsedRule[] {
  const rules: ParsedRule[] = [];
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = rulePattern.exec(withoutComments))) {
    const selector = match[1].trim();
    if (!selector || selector.startsWith('@') || selector.includes('%')) continue;
    rules.push({ selector, declarations: parseDeclarations(match[2]) });
  }

  return rules;
}

function parseCSS(css: string): ParsedRule[] {
  const fallbackRules = parseCSSFallback(css);

  if (typeof CSSStyleSheet !== 'undefined') {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css.replace(/@import\s+[^;]+;/gi, ''));
      const parsedRules: ParsedRule[] = [];

      const collectRules = (ruleList: CSSRuleList) => {
        for (const rule of Array.from(ruleList)) {
          if (rule.type === 1) {
            const styleRule = rule as CSSStyleRule;
            const declarations = new Map<string, ParsedDeclaration>();
            for (const property of Array.from(styleRule.style)) {
              const value = styleRule.style.getPropertyValue(property).trim();
              if (!value) continue;
              declarations.set(property.toLowerCase(), {
                value,
                important: styleRule.style.getPropertyPriority(property) === 'important',
              });
            }
            parsedRules.push({ selector: styleRule.selectorText, declarations });
            continue;
          }

          const groupingRule = rule as CSSGroupingRule & { conditionText?: string };
          if (!('cssRules' in groupingRule)) continue;
          if (rule.type === 4 && groupingRule.conditionText && typeof matchMedia === 'function' && !matchMedia(groupingRule.conditionText).matches) continue;
          if (rule.type === 12 && groupingRule.conditionText && typeof CSS !== 'undefined' && !CSS.supports(groupingRule.conditionText)) continue;
          collectRules(groupingRule.cssRules);
        }
      };

      collectRules(sheet.cssRules);
      // Keep fallback declarations (oklch, etc.) that CSSStyleSheet dropped.
      return [...fallbackRules, ...parsedRules];
    } catch {
      // Older browsers fall back to the conservative parser below.
    }
  }

  return fallbackRules;
}

function normalizeSelector(selector: string): string {
  return selector
    .replace(/::?(hover|active|focus|focus-visible|focus-within|visited|before|after|first-child|last-child|nth-child\([^)]*\))/gi, '')
    .trim();
}

function selectorMatches(documentNode: Document, selector: string, target: StyleTarget): boolean {
  const selectorParts = selector.split(',').map(normalizeSelector).filter(Boolean);

  for (const part of selectorParts) {
    try {
      const matches = Array.from(documentNode.querySelectorAll(part));
      if (target === 'page' && matches.some(element => ['HTML', 'BODY', 'MAIN', 'ARTICLE'].includes(element.tagName))) return true;
      if (target === 'heading' && matches.some(element => /^H[1-6]$/.test(element.tagName))) return true;
      if (target === 'link' && matches.some(element => element.tagName === 'A')) return true;
      if (target === 'code' && matches.some(element => element.tagName === 'CODE' || element.tagName === 'PRE')) return true;
    } catch {
      // Invalid and browser-specific selectors are handled by the fallback below.
    }

    if (target === 'page' && /(^|[\s>+~])(:root|html|body)(?=$|[\s.#:[>+~])/i.test(part)) return true;
    if (target === 'heading' && /(^|[\s>+~])h[1-6](?=$|[\s.#:[>+~])/i.test(part)) return true;
    if (target === 'link' && /(^|[\s>+~])a(?=$|[\s.#:[>+~])/i.test(part)) return true;
    if (target === 'code' && /(^|[\s>+~])(pre|code)(?=$|[\s.#:[>+~])/i.test(part)) return true;
    if (target === 'table' && /(^|[\s>+~])(table|td|tr)(?=$|[\s.#:[>+~])/i.test(part)) return true;
    if (target === 'th' && /(^|[\s>+~])th(?=$|[\s.#:[>+~])/i.test(part)) return true;
  }

  return false;
}

function resolveVariable(value: string | undefined, variables: Map<string, string>, depth = 0): string | undefined {
  if (!value || depth > 5) return value;

  const variablePattern = /var\(\s*(--[\w-]+)(?:\s*,\s*([^()]+))?\s*\)/g;
  let unresolved = false;
  const resolved = value.replace(variablePattern, (_match, name: string, fallback: string | undefined) => {
    const replacement = variables.get(name) || fallback;
    if (!replacement) {
      unresolved = true;
      return '';
    }
    return resolveVariable(replacement, variables, depth + 1) || '';
  });

  return unresolved ? undefined : resolved.trim();
}

function isSafeColor(value: string | undefined): boolean {
  if (!value || value.length > 180 || /[;{}<>]|url\s*\(/i.test(value)) return false;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'transparent' || normalized === 'inherit' || normalized === 'currentcolor' || normalized === 'none') {
    return false;
  }
  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('color', value)) {
    return true;
  }
  return /^(#[\da-f]{3,8}|rgba?\([\d\s.,%+/-]+\)|hsla?\([\d\s.,%+\-/]+\)|oklch\([\d\s.,%+/.-]+\)|oklab\([\d\s.,%+/.-]+\)|hwb\([\d\s.,%+/-]+\)|lab\([\d\s.,%+/-]+\)|lch\([\d\s.,%+/-]+\)|color-mix\([^)]+\)|[a-z]+)$/i.test(value);
}

function safeColor(value: string | undefined, variables: Map<string, string>): string | undefined {
  const resolved = resolveVariable(value, variables);
  if (!resolved) return undefined;
  const color = coerceColorValue(resolved);
  return isSafeColor(color) ? color : undefined;
}

function safeFont(value: string | undefined, variables: Map<string, string>): string | undefined {
  const resolved = resolveVariable(value, variables);
  if (!resolved || resolved.length > 250 || /[;{}<>]|url\s*\(|@import/i.test(resolved)) return undefined;
  return /^[\w\s,'".-]+$/.test(resolved) ? resolved : undefined;
}

function safeLineHeight(value: string | undefined, variables: Map<string, string>): string | undefined {
  const resolved = resolveVariable(value, variables);
  return resolved && /^(normal|\d*\.?\d+(?:px|rem|em|%)?)$/i.test(resolved) ? resolved : undefined;
}

function safeFontWeight(value: string | undefined, variables: Map<string, string>): string | undefined {
  const resolved = resolveVariable(value, variables);
  return resolved && /^(normal|bold|[1-9]00)$/i.test(resolved) ? resolved : undefined;
}

function safeRadius(value: string | undefined, variables: Map<string, string>): string | undefined {
  const resolved = resolveVariable(value, variables);
  return resolved && /^(?:0|\d*\.?\d+(?:px|rem|em|%))(?:\s+(?:0|\d*\.?\d+(?:px|rem|em|%))){0,3}$/i.test(resolved)
    ? resolved
    : undefined;
}

function parseColorChannels(color: string): [number, number, number] | undefined {
  const normalizedColor = color.trim();
  const hex = normalizedColor.match(/^#([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i)?.[1];
  if (hex) {
    const full = hex.length === 3 ? hex.split('').map(char => char + char).join('') : hex.slice(0, 6);
    return [Number.parseInt(full.slice(0, 2), 16), Number.parseInt(full.slice(2, 4), 16), Number.parseInt(full.slice(4, 6), 16)];
  }

  const rgb = normalizedColor.match(/^rgba?\(\s*([\d.]+)(%)?[,\s]+([\d.]+)(%)?[,\s]+([\d.]+)(%)?/i);
  if (rgb) {
    const channel = (value: string, percentage: string | undefined) => Number(value) * (percentage ? 2.55 : 1);
    return [channel(rgb[1], rgb[2]), channel(rgb[3], rgb[4]), channel(rgb[5], rgb[6])];
  }

  const oklch = normalizedColor.match(/^oklch\(\s*([\d.]+)/i);
  if (oklch) {
    const lightness = Number(oklch[1]);
    const value = lightness <= 1 ? lightness * 255 : lightness;
    return [value, value, value];
  }

  const hsl = normalizedColor.match(/^hsla?\(\s*([-\d.]+)(?:deg)?[,\s]+([\d.]+)%[,\s]+([\d.]+)%/i);
  if (hsl) {
    const hue = ((Number(hsl[1]) % 360) + 360) % 360;
    const saturation = Number(hsl[2]) / 100;
    const lightness = Number(hsl[3]) / 100;
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const segment = hue / 60;
    const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
    const [red, green, blue] = segment < 1 ? [chroma, secondary, 0]
      : segment < 2 ? [secondary, chroma, 0]
        : segment < 3 ? [0, chroma, secondary]
          : segment < 4 ? [0, secondary, chroma]
            : segment < 5 ? [secondary, 0, chroma]
              : [chroma, 0, secondary];
    const match = lightness - chroma / 2;
    return [(red + match) * 255, (green + match) * 255, (blue + match) * 255];
  }

  const named: Record<string, [number, number, number]> = {
    black: [0, 0, 0], white: [255, 255, 255], navy: [0, 0, 128],
    gray: [128, 128, 128], grey: [128, 128, 128],
  };
  const known = named[normalizedColor.toLowerCase()];
  if (known) return known;

  if (typeof document !== 'undefined' && typeof getComputedStyle === 'function') {
    const probe = document.createElement('span');
    probe.style.color = normalizedColor;
    if (!probe.style.color) return undefined;
    document.body.appendChild(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    if (computed && computed !== normalizedColor) return parseColorChannels(computed);
  }

  return undefined;
}

function channelLuminance(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(channels: [number, number, number]): number {
  return 0.2126 * channelLuminance(channels[0]) + 0.7152 * channelLuminance(channels[1]) + 0.0722 * channelLuminance(channels[2]);
}

export function isDarkColor(color: string): boolean {
  const channels = parseColorChannels(color);
  return channels ? relativeLuminance(channels) < 0.36 : false;
}

export function contrastRatio(foreground: string, background: string): number {
  const fg = parseColorChannels(foreground);
  const bg = parseColorChannels(background);
  if (!fg || !bg) return 1;
  const lighter = Math.max(relativeLuminance(fg), relativeLuminance(bg));
  const darker = Math.min(relativeLuminance(fg), relativeLuminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

export function pickReadableColor(
  candidates: Array<string | undefined>,
  background: string,
  fallback: string,
  minRatio = 4.5,
): string {
  for (const candidate of candidates) {
    if (candidate && contrastRatio(candidate, background) >= minRatio) return candidate;
  }
  return fallback;
}

function saturation(channels: [number, number, number]): number {
  const max = Math.max(...channels);
  const min = Math.min(...channels);
  return max === 0 ? 0 : (max - min) / max;
}

/**
 * Prefer a saturated color that actually reads against the page paper.
 * First-in-document links are often skip-nav / muted chrome and look black
 * when reused as the document accent.
 */
export function pickDistinctColor(candidates: Array<string | undefined>, background: string, text: string): string | undefined {
  const backgroundLum = parseColorChannels(background);
  const textLum = parseColorChannels(text);
  const bg = backgroundLum ? relativeLuminance(backgroundLum) : 1;
  const fg = textLum ? relativeLuminance(textLum) : 0;
  let best: { color: string; score: number } | undefined;

  for (const candidate of candidates) {
    if (!candidate) continue;
    const channels = parseColorChannels(candidate);
    if (!channels) continue;
    const lum = relativeLuminance(channels);
    const chroma = saturation(channels);
    const vsBackground = Math.abs(lum - bg);
    const vsText = Math.abs(lum - fg);
    if (vsBackground < 0.1) continue;
    if (chroma < 0.15 && vsText < 0.12) continue;
    const score = chroma * 3 + vsBackground;
    if (!best || score > best.score) best = { color: candidate, score };
  }

  return best?.color;
}

function colorFromBorderShorthand(value: string | undefined, variables: Map<string, string>): string | undefined {
  const resolved = resolveVariable(value, variables);
  if (!resolved) return undefined;
  if (isSafeColor(resolved)) return resolved;
  for (const part of resolved.split(/\s+/).reverse()) {
    const color = safeColor(part, variables);
    if (color) return color;
  }
  return undefined;
}

function targetElement(documentNode: Document, target: StyleTarget): Element | null {
  switch (target) {
    case 'page':
      return documentNode.body || documentNode.documentElement;
    case 'heading':
      return documentNode.querySelector('h1, h2, h3, h4, h5, h6');
    case 'link':
      return documentNode.querySelector('a');
    case 'code':
      return documentNode.querySelector('pre, code');
    case 'table':
      return documentNode.querySelector('table, td');
    case 'th':
      return documentNode.querySelector('th');
  }
}

function selectorSpecificity(selector: string): [number, number, number] {
  const withoutWhere = selector.replace(/:where\([^)]*\)/g, '');
  const ids = withoutWhere.match(/#[\w-]+/g)?.length || 0;
  const classes = withoutWhere.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+(?:\([^)]*\))?/g)?.length || 0;
  const elements = withoutWhere
    .replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|::?[\w-]+(?:\([^)]*\))?/g, ' ')
    .match(/(^|[\s>+~])(?:[a-z][\w-]*|\*)/gi)
    ?.filter(match => !match.trim().startsWith('*')).length || 0;
  return [ids, classes, elements];
}

function compareSpecificity(left: [number, number, number], right: [number, number, number]): number {
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}

function matchingSpecificity(documentNode: Document, selector: string, target: StyleTarget): [number, number, number] | undefined {
  const primaryElement = targetElement(documentNode, target);
  const elements: Element[] = target === 'page'
    ? [documentNode.body, documentNode.documentElement]
    : primaryElement ? [primaryElement] : [];
  let best: [number, number, number] | undefined;

  for (const rawPart of selector.split(',')) {
    const part = normalizeSelector(rawPart);
    if (!part) continue;

    let matches = false;
    try {
      matches = elements.length > 0 ? elements.some(element => element.matches(part)) : selectorMatches(documentNode, part, target);
    } catch {
      matches = selectorMatches(documentNode, part, target);
    }
    if (!matches) continue;

    const specificity = selectorSpecificity(rawPart);
    if (!best || compareSpecificity(specificity, best) > 0) best = specificity;
  }

  return best;
}

function colorForTarget(
  rules: ParsedRule[],
  documentNode: Document,
  target: StyleTarget,
  properties: string[],
  variables: Map<string, string>,
): string | undefined {
  const raw = valueForTarget(rules, documentNode, target, properties, (candidate) => Boolean(safeColor(candidate, variables)));
  return safeColor(raw, variables);
}

function valueForTarget(rules: ParsedRule[], documentNode: Document, target: StyleTarget, properties: string[], accept?: (value: string) => boolean): string | undefined {
  let winner: { value: string; important: boolean; specificity: [number, number, number]; order: number } | undefined;

  rules.forEach((rule, order) => {
    const specificity = matchingSpecificity(documentNode, rule.selector, target);
    if (!specificity) return;

    for (const property of properties) {
      const candidate = rule.declarations.get(property);
      if (!candidate) continue;
      if (accept && !accept(candidate.value)) continue;

      const shouldReplace = !winner
        || (candidate.important && !winner.important)
        || (candidate.important === winner.important && (
          compareSpecificity(specificity, winner.specificity) > 0
          || (compareSpecificity(specificity, winner.specificity) === 0 && order >= winner.order)
        ));
      if (shouldReplace) winner = { ...candidate, specificity, order };
    }
  });

  return winner?.value;
}

function variableByName(variables: Map<string, string>, names: RegExp): string | undefined {
  let value: string | undefined;
  for (const [name, candidate] of variables) {
    if (names.test(name)) value = candidate;
  }
  return value;
}

function inlineValue(element: Element | null, properties: string[]): string | undefined {
  const style = element?.getAttribute('style');
  if (!style) return undefined;
  const declarations = parseDeclarations(style);
  for (const property of properties) {
    const value = declarations.get(property)?.value;
    if (value) return value;
  }
  return undefined;
}

function assertSourceSize(content: string, label: string): void {
  if (new Blob([content]).size > MAX_SOURCE_BYTES) {
    throw new Error(`${label} is larger than 5 MB. Choose a smaller HTML page or stylesheet.`);
  }
}

export function extractClonedStyle(html: string, options: ExtractionOptions): ClonedStyle {
  assertSourceSize(html, 'The HTML source');
  const { documentNode, isEmbeddedArtifact } = parseSourceDocument(html);
  const embeddedCSS = Array.from(documentNode.querySelectorAll('style')).map(style => style.textContent || '');
  // styleSources collected from an outer saved-page shell are not relevant to
  // its iframe artifact. The artifact's own embedded styles are authoritative.
  const rawCSS = isEmbeddedArtifact ? embeddedCSS : (options.styleSources || embeddedCSS);
  const allCSS = rawCSS.map(unwrapAtRules);
  const rules = allCSS.flatMap(parseCSS);
  const variables = new Map<string, string>();
  const preferDark = options.preferDark ?? prefersDarkFromDocument();
  const themeSheet = [...rawCSS, ...allCSS]
    .filter(css => themeSheetScore(css) >= 3)
    .sort((left, right) => themeSheetScore(right) - themeSheetScore(left))[0];

  for (const css of [...rawCSS, ...allCSS]) {
    harvestVariables(css, variables);
  }
  if (themeSheet) {
    harvestVariables(unwrapAtRules(themeSheet), variables, preferDark);
  }

  const variableNames = new Set<string>();
  for (const rule of rules) {
    for (const property of rule.declarations.keys()) {
      if (property.startsWith('--')) variableNames.add(property);
    }
  }
  for (const property of variableNames) {
    const value = valueForTarget(rules, documentNode, 'page', [property]);
    if (value) variables.set(property, value);
  }

  const body = documentNode.body;
  const contentRoot = documentNode.querySelector('main, article, .wrap, .masthead') || body;
  const firstHeading = contentRoot?.querySelector('h1, h2, h3, h4, h5, h6')
    || documentNode.querySelector('h1, h2, h3, h4, h5, h6');
  const firstLink = contentRoot?.querySelector('a') || documentNode.querySelector('a');
  const firstCode = contentRoot?.querySelector('pre, code') || documentNode.querySelector('pre, code');
  const pageShell = documentNode.querySelector('#root, #app, main, .wrap');

  const tokenBackground = safeColor(variableByName(variables, /^--ground$/i), variables)
    || safeColor(variableByName(variables, /--(?:color-)?(?:page-)?(?:background|bg)$/i), variables);
  const background = safeColor(inlineValue(body, ['background-color', 'background']), variables)
    || colorForTarget(rules, documentNode, 'page', ['background-color', 'background'], variables)
    || safeColor(inlineValue(documentNode.documentElement, ['background-color', 'background']), variables)
    || safeColor(inlineValue(pageShell, ['background-color', 'background']), variables)
    || tokenBackground;
  const isDark = background ? isDarkColor(background) : false;
  const defaults: ThemeStyles = isDark
    ? { backgroundColor: '#111827', textColor: '#e5e7eb', accentColor: '#818cf8', codeBlockBg: '#1f2937' }
    : { backgroundColor: '#ffffff', textColor: '#1f2937', accentColor: '#4f46e5', codeBlockBg: '#f3f4f6' };

  const tokenInk = safeColor(variableByName(variables, /^--ink$/i), variables)
    || safeColor(variableByName(variables, /--(?:color-)?(?:text|foreground|fg)(?:-color)?$/i), variables);
  const textColor = safeColor(inlineValue(body, ['color']), variables)
    || colorForTarget(rules, documentNode, 'page', ['color'], variables)
    || tokenInk;
  const headingColor = safeColor(inlineValue(firstHeading, ['color']), variables)
    || colorForTarget(rules, documentNode, 'heading', ['color'], variables)
    || tokenInk;
  const linkColor = safeColor(inlineValue(firstLink, ['color']), variables)
    || colorForTarget(rules, documentNode, 'link', ['color'], variables);
  const tokenAccent = safeColor(variableByName(variables, /^--(?:color-)?(?:primary|accent)$/i), variables)
    || safeColor(documentNode.querySelector('meta[name="theme-color"]')?.getAttribute('content') || undefined, variables);
  const paper = background || defaults.backgroundColor;
  const ink = textColor || defaults.textColor;
  const accentColor = pickDistinctColor([tokenAccent, headingColor, linkColor], paper, ink)
    || tokenAccent
    || headingColor
    || linkColor;
  const codeBlockBg = safeColor(inlineValue(firstCode, ['background-color', 'background']), variables)
    || colorForTarget(rules, documentNode, 'code', ['background-color', 'background'], variables)
    || safeColor(variableByName(variables, /--(?:color-)?(?:code|pre)(?:-background|-bg)?$/i), variables);
  const tableHeaderBg = colorForTarget(rules, documentNode, 'th', ['background-color', 'background'], variables)
    || safeColor(variableByName(variables, /^--surface-2$/i), variables)
    || safeColor(variableByName(variables, /^--surface$/i), variables);
  const tableHeaderColor = colorForTarget(rules, documentNode, 'th', ['color'], variables)
    || safeColor(variableByName(variables, /^--muted$/i), variables);
  const tableBorderColor = colorFromBorderShorthand(valueForTarget(rules, documentNode, 'th', ['border-color', 'border']), variables)
    || colorFromBorderShorthand(valueForTarget(rules, documentNode, 'table', ['border-color', 'border']), variables)
    || safeColor(variableByName(variables, /^--line$/i), variables);

  const colors: ThemeStyles = {
    backgroundColor: paper,
    textColor: ink,
    accentColor: accentColor || defaults.accentColor,
    codeBlockBg: codeBlockBg || defaults.codeBlockBg,
  };

  const fontFamily = safeFont(
    inlineValue(body, ['font-family']) || valueForTarget(rules, documentNode, 'page', ['font-family'])
      || variableByName(variables, /--(?:body-)?font(?:-family)?$/i),
    variables,
  );
  const headingFontFamily = safeFont(
    inlineValue(firstHeading, ['font-family']) || valueForTarget(rules, documentNode, 'heading', ['font-family'])
      || variableByName(variables, /--(?:heading|headings|title)-font(?:-family)?$/i),
    variables,
  );

  const warnings: string[] = [...(options.warnings || [])];
  if (options.sourceType === 'file' && !options.resolvedLinkedStyles && documentNode.querySelector('link[rel~="stylesheet"][href]')) {
    warnings.push('Linked CSS files cannot be read from a single HTML upload; embedded styles were cloned.');
  }
  if (allCSS.some(css => /@font-face\b/i.test(css)) && (fontFamily || headingFontFamily)) {
    warnings.push('Font names were copied, but remote font files are not embedded and may use a browser fallback.');
  }
  if (allCSS.some(css => /@import\b/i.test(css))) {
    warnings.push('Nested @import stylesheets are not loaded; directly available styles were cloned.');
  }

  const clonedCss = buildClonedStylesheet(rawCSS, variables);
  if (clonedCss) {
    warnings.push('Source page CSS was copied into preview and export. Custom layout appears only when the markdown uses the same HTML structure.');
  }

  return {
    sourceType: options.sourceType,
    sourceLabel: documentNode.title.trim() || options.sourceLabel,
    colors,
    headingColor,
    linkColor: pickDistinctColor([linkColor, headingColor, tokenAccent], paper, ink) || linkColor,
    tableHeaderBg,
    tableHeaderColor,
    tableBorderColor,
    fontFamily,
    headingFontFamily,
    lineHeight: safeLineHeight(inlineValue(body, ['line-height']) || valueForTarget(rules, documentNode, 'page', ['line-height']), variables),
    headingFontWeight: safeFontWeight(inlineValue(firstHeading, ['font-weight']) || valueForTarget(rules, documentNode, 'heading', ['font-weight']), variables),
    borderRadius: safeRadius(valueForTarget(rules, documentNode, 'code', ['border-radius']) || variableByName(variables, /--(?:border-)?radius(?:-md|-medium)?$/i), variables),
    clonedCss: clonedCss || undefined,
    isDark,
    stylesheetCount: allCSS.filter(Boolean).length,
    warnings: warnings.length ? warnings : undefined,
  };
}

async function readResponse(response: Response, label: string, maxBytes = MAX_SOURCE_BYTES): Promise<string> {
  if (!response.ok) throw new Error(`${label} returned ${response.status} ${response.statusText}.`);
  const contentLength = Number(response.headers.get('content-length'));
  if (contentLength > maxBytes) throw new Error(`${label} exceeds the remaining style import limit.`);
  const content = await response.text();
  if (new Blob([content]).size > maxBytes) throw new Error(`${label} exceeds the remaining style import limit.`);
  return content;
}

export function normalizeStyleSourceUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Enter a webpage URL first.');
  const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only HTTP and HTTPS URLs are supported.');
  return url;
}

export async function cloneStyleFromUrl(input: string, signal?: AbortSignal, options?: { preferDark?: boolean }): Promise<ClonedStyle> {
  const url = normalizeStyleSourceUrl(input);
  let html: string;

  try {
    const response = await fetch(url, { signal, headers: { Accept: 'text/html,application/xhtml+xml' } });
    html = await readResponse(response, 'The webpage');
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    if (error instanceof Error && /returned|larger/.test(error.message)) throw error;
    throw new Error('Could not read this URL. The site may block browser access (CORS). Try downloading the page as HTML and upload it instead.');
  }

  const { documentNode } = parseSourceDocument(html);
  const styleSources: string[] = [];
  const warnings: string[] = [];
  let linkedStylesheetCount = 0;
  let failedStylesheetCount = 0;
  let aggregateBytes = new Blob([html]).size;

  for (const node of Array.from(documentNode.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style, link[rel~="stylesheet"][href]'))) {
    if (node.tagName === 'STYLE') {
      styleSources.push(node.textContent || '');
      continue;
    }
    if (linkedStylesheetCount >= MAX_LINKED_STYLESHEETS) continue;
    linkedStylesheetCount += 1;

    try {
      const stylesheetUrl = new URL(node.getAttribute('href') || '', url);
      const remainingBytes = MAX_AGGREGATE_BYTES - aggregateBytes;
      if (remainingBytes <= 0) {
        warnings.push('Additional stylesheets were skipped after the 10 MB total import limit.');
        break;
      }
      const response = await fetch(stylesheetUrl, { signal, headers: { Accept: 'text/css' } });
      const css = await readResponse(response, `Stylesheet ${stylesheetUrl.hostname}`, Math.min(MAX_SOURCE_BYTES, remainingBytes));
      aggregateBytes += new Blob([css]).size;
      styleSources.push(css);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      failedStylesheetCount += 1;
    }
  }

  if (failedStylesheetCount > 0) {
    warnings.push(`${failedStylesheetCount} linked stylesheet${failedStylesheetCount === 1 ? '' : 's'} could not be read; available styles were cloned.`);
  }
  if (documentNode.querySelectorAll('link[rel~="stylesheet"][href]').length > MAX_LINKED_STYLESHEETS) {
    warnings.push(`Only the first ${MAX_LINKED_STYLESHEETS} linked stylesheets were inspected.`);
  }

  const sourceLabel = documentNode.title.trim() || url.hostname;
  return extractClonedStyle(html, { sourceType: 'url', sourceLabel, styleSources, warnings, preferDark: options?.preferDark });
}

export async function cloneStyleFromFiles(files: File[], options?: { preferDark?: boolean }): Promise<ClonedStyle> {
  const htmlFile = files.find(file => /\.html?$/i.test(file.name));
  if (!htmlFile) throw new Error('Choose an .html or .htm file.');
  if (htmlFile.size > MAX_SOURCE_BYTES) throw new Error('The HTML file is larger than 5 MB.');

  const html = await htmlFile.text();
  const { documentNode } = parseSourceDocument(html);
  const styleSources: string[] = [];
  const warnings: string[] = [];
  let aggregateBytes = new Blob([html]).size;
  let unresolvedStylesheets = 0;

  const cssFiles = files.filter(file => /\.css$/i.test(file.name));
  for (const node of Array.from(documentNode.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style, link[rel~="stylesheet"][href]'))) {
    if (node.tagName === 'STYLE') {
      styleSources.push(node.textContent || '');
      continue;
    }

    const rawHref = node.getAttribute('href') || '';
    let decodedPath = rawHref.split(/[?#]/, 1)[0];
    try {
      decodedPath = decodeURIComponent(decodedPath);
    } catch {
      // Keep the original path when percent-encoding is malformed.
    }
    const normalizedPath = decodedPath.replace(/^\.\//, '').replace(/^\//, '');
    const basename = normalizedPath.split('/').pop();
    const matchingFile = cssFiles.find(file => {
      const relativePath = file.webkitRelativePath || file.name;
      return relativePath === normalizedPath || relativePath.endsWith(`/${normalizedPath}`) || file.name === basename;
    });

    if (!matchingFile) {
      unresolvedStylesheets += 1;
      continue;
    }
    const remainingBytes = MAX_AGGREGATE_BYTES - aggregateBytes;
    if (remainingBytes <= 0 || matchingFile.size > Math.min(MAX_SOURCE_BYTES, remainingBytes)) {
      warnings.push('Additional CSS files were skipped after the 10 MB total import limit.');
      break;
    }
    const css = await matchingFile.text();
    aggregateBytes += new Blob([css]).size;
    styleSources.push(css);
  }

  if (unresolvedStylesheets > 0) {
    warnings.push(`${unresolvedStylesheets} linked CSS file${unresolvedStylesheets === 1 ? '' : 's'} were not selected; embedded and selected styles were cloned.`);
  }

  return extractClonedStyle(html, {
    sourceType: 'file',
    sourceLabel: htmlFile.name,
    styleSources,
    warnings,
    resolvedLinkedStyles: true,
    preferDark: options?.preferDark,
  });
}

export async function cloneStyleFromFile(file: File): Promise<ClonedStyle> {
  return cloneStyleFromFiles([file]);
}
