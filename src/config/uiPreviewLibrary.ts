import type { UiTreeNode } from '../builder/store/types';
import { ECHART_COMPONENT_TYPES } from '../constants/echart';
import { ANTD_TD_MIRROR_PAIRS } from './antdCatalogMirror';

export type UiPreviewLibrary = 'tdesign' | 'antd';

/** 搭建器工具栏下拉选项；后续扩展组件库时在此追加 */
export const PREVIEW_UI_LIBRARY_OPTIONS: Array<{ value: UiPreviewLibrary; label: string }> = [
  { value: 'tdesign', label: 'TDesign' },
  { value: 'antd', label: 'Ant Design' },
];

const getPropValue = (node: UiTreeNode, propName: string): unknown => {
  const p = node.props?.[propName] as { value?: unknown } | undefined;
  return p?.value;
};

const getStringProp = (node: UiTreeNode, propName: string): string | undefined => {
  const v = getPropValue(node, propName);
  return typeof v === 'string' ? v : undefined;
};

/**
 * 布局与导航骨架在任意组件库预览下均走 TDesign 实现，避免栅格/菜单等与 DSL 不一致。
 */
export const SHARED_LAYOUT_TD_TYPES = new Set<string>([
  'Grid.Row',
  'Grid.Col',
  'Layout',
  'Layout.Header',
  'Layout.Content',
  'Layout.Aside',
  'Layout.Footer',
  'Flex',
  'Flex.Item',
  'Stack',
  'Inline',
  'Space',
  'RouteOutlet',
  'ComponentSlotOutlet',
  'HeadMenu',
  'Menu',
  'Menu.Submenu',
  'Menu.Item',
  'Menu.Group',
  'Steps',
  'Steps.Item',
]);

const TD_TO_ANTD = new Map<string, string>(
  ANTD_TD_MIRROR_PAIRS.map((p) => [p.tdesignType, p.antdType]),
);

/** 右侧组件库在 Ant Design 壳下应展示的物料（与 {@link resolveAntdPreviewTypeForCanonical} 可渲染集合一致，并含图表与布局）。 */
export function catalogTypeMatchesPreviewLibrary(type: string, library: UiPreviewLibrary): boolean {
  const t = String(type ?? '').trim();
  if (library === 'tdesign') {
    return true;
  }
  if (ECHART_COMPONENT_TYPES.includes(t)) {
    return true;
  }
  if (SHARED_LAYOUT_TD_TYPES.has(t)) {
    return true;
  }
  if (t === 'Drawer') {
    return true;
  }
  return TD_TO_ANTD.has(t);
}

/**
 * 画布 / 预览在 Ant Design 模式下应使用的 antd.* 分发键；若返回 null 则走 TDesign 注册表。
 * Drawer 根据 shellPresentation 区分对话框与抽屉（与 antdCatalogMirror 中 Modal/Drawer 镜像一致）。
 */
export function resolveAntdPreviewTypeForCanonical(node: UiTreeNode): string | null {
  const t = String(node.type ?? '').trim();
  if (!t || SHARED_LAYOUT_TD_TYPES.has(t)) {
    return null;
  }
  if (t === 'Drawer') {
    const shell = getStringProp(node, 'shellPresentation');
    return shell === 'dialog' ? 'antd.Modal' : 'antd.Drawer';
  }
  return TD_TO_ANTD.get(t) ?? null;
}
