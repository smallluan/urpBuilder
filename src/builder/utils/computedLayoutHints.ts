/**
 * 从画布上已挂载的节点读取 getComputedStyle，用于样式面板在 __style 未覆盖时回填展示。
 */

const SIDES = ['Top', 'Right', 'Bottom', 'Left'] as const;

export function collectComputedLayoutHints(el: HTMLElement): Record<string, string> {
  const cs = getComputedStyle(el);
  const o: Record<string, string> = {};

  for (const s of SIDES) {
    const mk = `margin${s}` as keyof CSSStyleDeclaration;
    const pk = `padding${s}` as keyof CSSStyleDeclaration;
    const bk = `border${s}Width` as keyof CSSStyleDeclaration;
    const sk = `border${s}Style` as keyof CSSStyleDeclaration;
    const ck = `border${s}Color` as keyof CSSStyleDeclaration;
    o[`margin${s}`] = String(cs[mk] ?? '');
    o[`padding${s}`] = String(cs[pk] ?? '');
    o[`border${s}Width`] = String(cs[bk] ?? '');
    o[`border${s}Style`] = String(cs[sk] ?? '');
    o[`border${s}Color`] = String(cs[ck] ?? '');
  }

  o.boxShadow = cs.boxShadow || 'none';
  return o;
}
