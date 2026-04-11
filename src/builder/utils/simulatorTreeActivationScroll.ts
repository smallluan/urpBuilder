import type { UiTreeNode } from '../store/types';

/**
 * 左侧组件树激活某节点时，模拟器是否自动滚到对应 DOM。
 *
 * 部分组件（如 Drawer）在树中层级与画布展示无关，且 portal 到叠层根节点，
 * 滚到「占位」节点没有编辑意义，反而干扰操作 —— 此类类型在此登记，跳过自动滚动。
 * 后续扩展：往 Set 中追加 canonical type 字符串即可（与 uiPageData 中 node.type 一致）。
 */
export const SIMULATOR_SKIP_SCROLL_ON_TREE_ACTIVATION_TYPES = new Set<string>([
  'Drawer',
  'antd.Drawer',
]);

export function shouldSkipSimulatorScrollOnTreeActivation(node: UiTreeNode | null | undefined): boolean {
  if (!node?.type) {
    return false;
  }
  const t = String(node.type).trim();
  return SIMULATOR_SKIP_SCROLL_ON_TREE_ACTIVATION_TYPES.has(t);
}
