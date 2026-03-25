/**
 * DropArea 等在搭建器内使用 display:contents 时，带 data-builder-node-key 的节点可能没有布局盒，
 * getBoundingClientRect 为 0。选区蒙层、视口内滚动判断应对齐到后代真实盒的并集。
 */
function mergeDomRects(rects: DOMRect[]): DOMRect {
  if (!rects.length) {
    return new DOMRect(0, 0, 0, 0);
  }
  let minL = Infinity;
  let minT = Infinity;
  let maxR = -Infinity;
  let maxB = -Infinity;
  for (const br of rects) {
    minL = Math.min(minL, br.left);
    minT = Math.min(minT, br.top);
    maxR = Math.max(maxR, br.right);
    maxB = Math.max(maxB, br.bottom);
  }
  const w = maxR - minL;
  const h = maxB - minT;
  return new DOMRect(minL, minT, w, h);
}

export function getEffectiveBoundingRect(el: HTMLElement): DOMRect {
  const direct = el.getBoundingClientRect();
  if (direct.width > 0 && direct.height > 0) {
    return direct;
  }

  const style = window.getComputedStyle(el);
  if (style.display !== 'contents') {
    return direct;
  }

  const rects: DOMRect[] = [];
  for (let i = 0; i < el.children.length; i++) {
    rects.push(getEffectiveBoundingRect(el.children[i] as HTMLElement));
  }
  const valid = rects.filter((r) => r.width > 0 || r.height > 0);
  return valid.length ? mergeDomRects(valid) : direct;
}

/** 用于 scrollIntoView：沿子节点链跳过 display:contents，落到第一个真实布局盒 */
export function getScrollTargetForBuilderNode(el: HTMLElement): HTMLElement {
  let cur: HTMLElement | null = el;
  for (let d = 0; d < 64 && cur; d++) {
    const st = window.getComputedStyle(cur);
    if (st.display !== 'contents') {
      return cur;
    }
    const next = cur.firstElementChild as HTMLElement | null;
    if (!next) {
      break;
    }
    cur = next;
  }
  return el;
}
