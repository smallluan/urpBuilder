/**
 * 轻量可读性提示：仅当 color 与 backgroundColor 均为可解析的 #rgb/#rrggbb 时估算对比度。
 */

const parseHex = (raw: string): [number, number, number] | null => {
  const s = raw.trim();
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (!m) {
    return null;
  }
  let h = m[1];
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const linearize = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = (rgb: [number, number, number]): number => {
  const [r, g, b] = rgb.map(linearize) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (fg: string, bg: string): number | null => {
  const a = parseHex(fg);
  const b = parseHex(bg);
  if (!a || !b) {
    return null;
  }
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
};

export type ContrastHint = { level: 'ok' | 'warn'; message: string };

/** WCAG AA 正文约 4.5:1；大字号可 3:1，此处用 4.5 作保守提示 */
export const hintTextOnBackgroundContrast = (
  color?: string,
  backgroundColor?: string,
): ContrastHint | null => {
  const c = String(color ?? '').trim();
  const b = String(backgroundColor ?? '').trim();
  if (!c || !b) {
    return null;
  }
  const ratio = contrastRatio(c, b);
  if (ratio === null) {
    return null;
  }
  if (ratio >= 4.5) {
    return { level: 'ok', message: `文字与背景对比度约 ${ratio.toFixed(2)}:1（参考 AA）` };
  }
  return {
    level: 'warn',
    message: `对比度约 ${ratio.toFixed(2)}:1，可能低于常见可读性建议（4.5:1）`,
  };
};
