/**
 * 从画布上已挂载的节点读取 getComputedStyle，用于样式面板在 __style 未覆盖时回填展示。
 */

const SIDES = ['Top', 'Right', 'Bottom', 'Left'] as const;

const EXTRA_COMPUTED_KEYS = [
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'backgroundColor',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'color',
  'textAlign',
  'display',
  'flexDirection',
  'justifyContent',
  'alignItems',
  'gap',
  'overflow',
  'overflowX',
  'overflowY',
  'opacity',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'zIndex',
] as const;

function pickAxisHint(computed: string, layoutPx: number): string {
  const t = String(computed ?? '').trim();
  if (t && t !== 'auto') {
    return t;
  }
  if (layoutPx > 0) {
    return `${layoutPx}px`;
  }
  return t;
}

export function collectComputedLayoutHints(el: HTMLElement): Record<string, string> {
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const o: Record<string, string> = {};

  for (const s of SIDES) {
    o[`margin${s}`] = String(cs[`margin${s}` as keyof CSSStyleDeclaration] ?? '');
    o[`padding${s}`] = String(cs[`padding${s}` as keyof CSSStyleDeclaration] ?? '');
    o[`border${s}Width`] = String(cs[`border${s}Width` as keyof CSSStyleDeclaration] ?? '');
    o[`border${s}Style`] = String(cs[`border${s}Style` as keyof CSSStyleDeclaration] ?? '');
    o[`border${s}Color`] = String(cs[`border${s}Color` as keyof CSSStyleDeclaration] ?? '');
  }

  o.boxShadow = cs.boxShadow || 'none';
  o.width = pickAxisHint(String(cs.width ?? ''), Math.round(rect.width));
  o.height = pickAxisHint(String(cs.height ?? ''), Math.round(rect.height));

  for (const k of EXTRA_COMPUTED_KEYS) {
    const v = cs[k as keyof CSSStyleDeclaration];
    o[k] = typeof v === 'string' ? v : String(v ?? '');
  }

  return o;
}
