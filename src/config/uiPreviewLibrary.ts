import type { UiTreeNode } from '../builder/store/types';
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
 * 仅「可承载任意子内容」的容器类在两种预览下统一走 TDesign，优先保证布局骨架与 DSL 一致。
 * 菜单、步骤条等仅允许固定子物料的节点不放入此集合，Ant Design 预览可走 antd.* 镜像。
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
]);

const TD_TO_ANTD = new Map<string, string>(
  ANTD_TD_MIRROR_PAIRS.map((p) => [p.tdesignType, p.antdType]),
);

/**
 * 卡片壳在任意预览库下均使用 antd Card，避免 TDesign Card 与 antd Card 默认排版（子项行内/块级、header/body）不一致。
 * DSL `type` 仍为物料表中的 `Card`（与 `antd.Card` 镜像）。
 */
export const CARD_SHELL_ALWAYS_ANTD_TYPES = new Set<string>(['Card', 'antd.Card']);

/**
 * 右侧组件库是否展示某物料 type。
 * Ant Design 预览下 DSL 仍以 TDesign `type` 为主：仅有 {@link ANTD_TD_MIRROR_PAIRS} 且未被
 * {@link SHARED_LAYOUT_TD_TYPES} 兜底的节点会走 antd 渲染；其余（如 BackTop、Calendar、TimePicker）
 * 仍走 TDesign 注册表——这些也必须出现在面板中，否则会被误当成「删掉」。
 */
export function catalogTypeMatchesPreviewLibrary(_type: string, library: UiPreviewLibrary): boolean {
  return library === 'tdesign' || library === 'antd';
}

/**
 * 画布 / 预览在 Ant Design 模式下应使用的 antd.* 分发键；若返回 null 则**始终**走 TDesign 注册表 / PreviewRenderer 的 TDesign 分支。
 * - {@link SHARED_LAYOUT_TD_TYPES}：仅布局容器类强制 TDesign；菜单、步骤条等可走镜像 antd.*。
 * - Drawer：按 shellPresentation 映射 antd.Modal / antd.Drawer。
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
