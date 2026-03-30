/**
 * 节点 __style 与侧栏 CSS 草稿之间的解析、序列化与合并。
 */

export type StyleStringMap = Record<string, string>;

export const normalizeStyleValue = (value?: Record<string, unknown>): StyleStringMap => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const styleMap: StyleStringMap = {};
  Object.entries(value).forEach(([key, val]) => {
    if (val === null || val === undefined) {
      return;
    }
    styleMap[key] = String(val);
  });
  return styleMap;
};

export const kebabToCamel = (value: string) => value.replace(/-([a-z])/g, (_, character: string) => character.toUpperCase());

export const camelToKebab = (value: string) => value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);

export const styleToCssText = (style: StyleStringMap): string => {
  const lines = Object.entries(style)
    .filter(([, cssValue]) => String(cssValue ?? '').trim().length > 0)
    .map(([property, cssValue]) => `${camelToKebab(property)}: ${String(cssValue).trim()};`);

  return lines.join('\n');
};

export type ParseCssTextResult = {
  style: Record<string, unknown>;
  invalidLines: string[];
  validCount: number;
};

export const parseCssText = (cssText: string): ParseCssTextResult => {
  const cleanedText = cssText
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/[{}]/g, '\n');

  const nextStyle: Record<string, unknown> = {};
  const invalidLines: string[] = [];

  const lines = cleanedText
    .split(/\n+/)
    .flatMap((row) => row.split(';'))
    .map((row) => row.trim())
    .filter(Boolean);

  lines.forEach((line) => {
    const splitIndex = line.indexOf(':');
    if (splitIndex <= 0) {
      invalidLines.push(line);
      return;
    }

    const rawProperty = line.slice(0, splitIndex).trim();
    const rawValue = line.slice(splitIndex + 1).trim();

    if (!rawProperty || !rawValue) {
      invalidLines.push(line);
      return;
    }

    const property = kebabToCamel(rawProperty);
    nextStyle[property] = rawValue;
  });

  return {
    style: nextStyle,
    invalidLines,
    validCount: Object.keys(nextStyle).length,
  };
};

export const cssTextToPayload = (cssText: string): Record<string, unknown> => parseCssText(cssText).style;

/** 代码区应用：解析结果覆盖同名键；空值删除键；未出现在代码中的键保留 */
export const mergeStyleFromParsedCss = (base: Record<string, unknown> | undefined, cssText: string): Record<string, unknown> => {
  const { style: parsed } = parseCssText(cssText);
  const result: Record<string, unknown> = { ...normalizeStyleValue(base) };

  Object.entries(parsed).forEach(([key, raw]) => {
    const s = String(raw ?? '').trim();
    if (s === '') {
      delete result[key];
    } else {
      result[key] = s;
    }
  });

  return result;
};

export const normalizeComparableStyle = (value?: Record<string, unknown>): Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const normalizedEntries = Object.entries(value)
    .map(([key, rawValue]) => [key, String(rawValue ?? '').trim()] as const)
    .filter(([, text]) => text.length > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  return Object.fromEntries(normalizedEntries);
};

export const isSameStylePayload = (left: Record<string, unknown>, right: Record<string, unknown>): boolean => {
  const normalizedLeft = normalizeComparableStyle(left);
  const normalizedRight = normalizeComparableStyle(right);
  const leftKeys = Object.keys(normalizedLeft);
  const rightKeys = Object.keys(normalizedRight);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => normalizedLeft[key] === normalizedRight[key]);
};

/** 可视化表单 patch：undefined 或空字符串表示删除该键 */
export const patchStyle = (base: Record<string, unknown> | undefined, patch: Record<string, string | undefined>): Record<string, unknown> => {
  const result: Record<string, unknown> = { ...normalizeStyleValue(base) };

  Object.entries(patch).forEach(([key, raw]) => {
    if (raw === undefined || String(raw).trim() === '') {
      delete result[key];
    } else {
      result[key] = String(raw).trim();
    }
  });

  return result;
};

/** 间距简写：存在时四向 longhand 与可视化冲突 */
export const STYLE_SHORTHAND_PADDING = 'padding' as const;
export const STYLE_SHORTHAND_MARGIN = 'margin' as const;

export const hasShorthandSpacing = (style: Record<string, unknown> | undefined): { padding: boolean; margin: boolean } => {
  const n = normalizeStyleValue(style);
  return {
    padding: String(n.padding ?? '').trim().length > 0,
    margin: String(n.margin ?? '').trim().length > 0,
  };
};
