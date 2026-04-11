import type { TScroll } from 'tdesign-react/es/common';

/**
 * 与 TDesign Tree 默认行高一致：`calc(var(--td-comp-size-m) + 2px)` → 32 + 2 = 34px。
 * 结构树不再覆盖 `.t-tree__item` / 连线高度，避免与组件库内部几何错位；紧凑度由 `.structure-tree__zoom` 的 zoom 控制。
 */
export const BUILDER_STRUCTURE_TREE_ROW_HEIGHT = 34;

/**
 * 搭建页 / 流程页左侧结构树共用：TDesign Tree 虚拟滚动。
 * threshold 设为 1 时，可见行数 > 1 即启用（默认 100 仅在大树才开启）。
 */
export const BUILDER_STRUCTURE_TREE_SCROLL: TScroll = {
  type: 'virtual',
  threshold: 1,
  rowHeight: BUILDER_STRUCTURE_TREE_ROW_HEIGHT,
  bufferSize: 20,
};
