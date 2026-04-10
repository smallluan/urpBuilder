import type { UiTreeNode } from '../store/types';

/** 与 ComponentConfigPanel readBoundPropValue / propAccessors 一致 */
export function readMenuDslBoundValue(node: UiTreeNode, propKey: string): unknown {
  const wrap = node.props?.[propKey] as { value?: unknown } | undefined;
  return wrap?.value;
}

/**
 * 子菜单在 DSL 中的「标识」，与 getMenuValueArrayProp / collectMenuSubmenuValueOptions 一致：
 * props.value → 否则节点 key。
 */
export function resolveMenuSubmenuDslValue(node: UiTreeNode): string | number {
  const raw = readMenuDslBoundValue(node, 'value');
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number(raw.trim());
    return Number.isFinite(n) ? n : raw.trim();
  }
  return String(node.key ?? '').trim() || 'submenu';
}

/**
 * 菜单项在 DSL 中的「标识」，与 getMenuValueProp / collectMenuItemValueOptions 一致。
 */
export function resolveMenuItemDslValue(node: UiTreeNode): string | number {
  const raw = readMenuDslBoundValue(node, 'value');
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number(raw.trim());
    return Number.isFinite(n) ? n : raw.trim();
  }
  return String(node.key ?? '').trim() || 'item';
}

export function stringifyMenuDslKey(value: string | number): string {
  return String(value);
}

export function isMenuContainerNodeType(type: string | undefined): boolean {
  return type === 'Menu' || type === 'HeadMenu' || type === 'antd.Menu' || type === 'antd.HeadMenu';
}

export function isMenuSubmenuNodeType(type: string | undefined): boolean {
  const t = typeof type === 'string' ? type.trim() : '';
  return t === 'Menu.Submenu' || t === 'antd.Menu.SubMenu';
}

export function isMenuItemNodeType(type: string | undefined): boolean {
  const t = typeof type === 'string' ? type.trim() : '';
  return t === 'Menu.Item' || t === 'antd.Menu.Item';
}
