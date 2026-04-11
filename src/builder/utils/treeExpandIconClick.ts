/**
 * TDesign Tree：点击展开/收起三角时仍会触发 `onClick`，但内部 `active: false`，仅折叠展开。
 * 业务侧若在此处同步「选中/激活」，需忽略来自 `.t-tree__icon` 的点击。
 */
export function isTdesignTreeExpandIconClick(event: MouseEvent | undefined | null): boolean {
  if (!event?.target || typeof (event.target as Node).nodeType !== 'number') {
    return false;
  }
  const el = event.target as HTMLElement;
  return Boolean(el.closest?.('.t-tree__icon'));
}
