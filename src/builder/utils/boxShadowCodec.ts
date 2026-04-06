/**
 * box-shadow 单层解析与序列化（camelCase 样式键 boxShadow）。
 * 多层或无法可靠拆解时返回 unparsed，避免丢数据。
 */

export type BoxShadowLayer = {
  offsetX: string;
  offsetY: string;
  blur: string;
  spread: string;
  color: string;
  inset: boolean;
};

export type ParseBoxShadowResult =
  | { kind: 'none' }
  | { kind: 'single'; layer: BoxShadowLayer }
  | { kind: 'unparsed'; raw: string };

const LENGTH_RE = /^-?(?:\d+\.?\d*|\.\d+)(?:px|em|rem|%|vw|vh|vmin|vmax|pt|pc|in|cm|mm|ex|ch|fr)?$/i;

function isLengthToken(t: string): boolean {
  const s = t.trim();
  if (s === '0') {
    return true;
  }
  return LENGTH_RE.test(s);
}

/** 按顶层逗号拆分（括号内逗号不计） */
export function splitTopLevelBoxShadowLayers(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') {
      depth++;
    } else if (c === ')') {
      depth--;
    } else if (c === ',' && depth === 0) {
      const chunk = s.slice(start, i).trim();
      if (chunk) {
        out.push(chunk);
      }
      start = i + 1;
    }
  }
  const last = s.slice(start).trim();
  if (last) {
    out.push(last);
  }
  return out;
}

function extractTrailingParenColor(t: string): { color: string; before: string } | null {
  const s = t.trim();
  if (!s.endsWith(')')) {
    return null;
  }
  let depth = 0;
  let open = -1;
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] === ')') {
      depth++;
    } else if (s[i] === '(') {
      depth--;
      if (depth === 0) {
        open = i;
        break;
      }
    }
  }
  if (open < 0) {
    return null;
  }
  let j = open - 1;
  while (j >= 0 && /\s/.test(s[j])) {
    j--;
  }
  let k = j;
  while (k >= 0 && /[a-z]/i.test(s[k])) {
    k--;
  }
  const fn = s.slice(k + 1, j + 1).toLowerCase();
  if (!['rgb', 'rgba', 'hsl', 'hsla', 'var'].includes(fn)) {
    return null;
  }
  const color = s.slice(k + 1).trim();
  const before = s.slice(0, k + 1).trim();
  return { color, before };
}

/**
 * 从字符串末尾取出颜色片段（#hex / rgb() / rgba() / hsl() / hsla() / var()）。
 */
export function extractTrailingColor(str: string): { color: string; before: string } | null {
  const s = str.trim();
  if (!s) {
    return null;
  }

  const paren = extractTrailingParenColor(s);
  if (paren) {
    return paren;
  }

  // #hex
  const hexMatch = s.match(/#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})\s*$/i);
  if (hexMatch) {
    const color = hexMatch[0].trim();
    const before = s.slice(0, hexMatch.index).trim();
    return { color, before };
  }

  // 简单命名色（最后一节且非单位）
  const tokens = s.split(/\s+/).filter(Boolean);
  if (tokens.length >= 3) {
    const last = tokens[tokens.length - 1];
    if (/^[a-z]+$/i.test(last) && !/^(inset|px|em|rem)$/i.test(last)) {
      const color = last;
      const before = tokens.slice(0, -1).join(' ');
      return { color, before };
    }
  }

  return null;
}

/**
 * 颜色在前的写法（getComputedStyle 序列化常见），如 rgba(0,0,0,.15) 0px 4px 8px 0px
 */
export function extractLeadingColor(str: string): { color: string; after: string } | null {
  const s = str.trim();
  if (!s) {
    return null;
  }
  const fn = s.match(/^(rgba?|hsla?|var)\s*\(/i);
  if (fn) {
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '(') {
        depth++;
      } else if (s[i] === ')') {
        depth--;
        if (depth === 0) {
          return { color: s.slice(0, i + 1).trim(), after: s.slice(i + 1).trim() };
        }
      }
    }
    return null;
  }
  const hexMatch = s.match(/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})\b/i);
  if (hexMatch) {
    return { color: hexMatch[0], after: s.slice(hexMatch[0].length).trim() };
  }
  return null;
}

function layerFromLengthTokens(
  lenTokens: string[],
  color: string,
  inset: boolean,
): BoxShadowLayer | null {
  if (lenTokens.length < 2 || lenTokens.length > 4) {
    return null;
  }
  if (!lenTokens.every(isLengthToken)) {
    return null;
  }
  let offsetX: string;
  let offsetY: string;
  let blur: string;
  let spread: string;
  if (lenTokens.length === 2) {
    [offsetX, offsetY] = lenTokens;
    blur = '0';
    spread = '0';
  } else if (lenTokens.length === 3) {
    [offsetX, offsetY, blur] = lenTokens;
    spread = '0';
  } else {
    [offsetX, offsetY, blur, spread] = lenTokens;
  }
  return { offsetX, offsetY, blur, spread, color, inset };
}

/** 解析单层 segment（已按顶层逗号拆开） */
function tryParseSingleLayerSegment(seg: string): BoxShadowLayer | 'none' | null {
  let body = seg.trim();
  if (!body || /^none$/i.test(body)) {
    return 'none';
  }
  let inset = false;
  if (/^inset\s+/i.test(body)) {
    inset = true;
    body = body.replace(/^inset\s+/i, '').trim();
  }

  const trailing = extractTrailingColor(body);
  if (trailing) {
    const lenTokens = trailing.before.split(/\s+/).filter(Boolean);
    const layer = layerFromLengthTokens(lenTokens, trailing.color, inset);
    return layer;
  }

  const leading = extractLeadingColor(body);
  if (leading) {
    let rest = leading.after.trim();
    if (/^inset\s+/i.test(rest)) {
      inset = true;
      rest = rest.replace(/^inset\s+/i, '').trim();
    }
    const lenTokens = rest.split(/\s+/).filter(Boolean);
    return layerFromLengthTokens(lenTokens, leading.color, inset);
  }

  return null;
}

export function parseBoxShadow(raw: string): ParseBoxShadowResult {
  const t = String(raw ?? '').trim();
  if (!t || /^none$/i.test(t)) {
    return { kind: 'none' };
  }

  const layers = splitTopLevelBoxShadowLayers(t);
  if (layers.length !== 1) {
    return { kind: 'unparsed', raw: t };
  }

  const got = tryParseSingleLayerSegment(layers[0]);
  if (got === null) {
    return { kind: 'unparsed', raw: t };
  }
  if (got === 'none') {
    return { kind: 'none' };
  }
  return { kind: 'single', layer: got };
}

export function serializeBoxShadow(layer: BoxShadowLayer): string {
  const parts: string[] = [];
  if (layer.inset) {
    parts.push('inset');
  }
  parts.push(
    layer.offsetX.trim(),
    layer.offsetY.trim(),
    layer.blur.trim(),
    layer.spread.trim(),
    layer.color.trim(),
  );
  return parts.join(' ');
}

export const defaultBoxShadowLayer = (): BoxShadowLayer => ({
  offsetX: '0',
  offsetY: '4px',
  blur: '8px',
  spread: '0',
  color: 'rgba(0, 0, 0, 0.15)',
  inset: false,
});

/** 无阴影时的表单展示（不自动写入 __style，直至用户修改） */
export const emptyBoxShadowLayer = (): BoxShadowLayer => ({
  offsetX: '0',
  offsetY: '0',
  blur: '0',
  spread: '0',
  color: 'transparent',
  inset: false,
});
