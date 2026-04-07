/**
 * 样式侧栏采集 getComputedStyle 时，尽量对准「实际承载视觉」的 DOM
 *（部分组件 data-builder-node-key 落在外层，内层才有 box-shadow / 尺寸等）。
 */

export function escapeBuilderNodeKeyForSelector(key: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(key);
  }
  return key.replace(/"/g, '\\"');
}

/** 组件类型 → 在标记根节点内用于采样的子选择器（无匹配则退回根节点） */
const INNER_STYLE_TARGET_SELECTORS: Record<string, string> = {
  Button: '.t-button',
  Link: '.t-link',
  Input: '.t-input__inner',
  Textarea: '.t-textarea__inner',
  InputNumber: '.t-input__inner',
  Switch: '.t-switch',
  Slider: '.t-slider',
  Progress: '.t-progress__bar',
  Icon: 'svg',
};

export function resolveStyleTargetElement(
  nodeType: string | undefined,
  targetKey: string,
): HTMLElement | null {
  const safe = escapeBuilderNodeKeyForSelector(targetKey);
  const root = document.querySelector<HTMLElement>(`[data-builder-node-key="${safe}"]`);
  if (!root) {
    return null;
  }
  const t = String(nodeType ?? '').trim();
  const innerSel = INNER_STYLE_TARGET_SELECTORS[t];
  if (innerSel) {
    const inner = root.querySelector<HTMLElement>(innerSel);
    if (inner) {
      return inner;
    }
  }
  return root;
}
