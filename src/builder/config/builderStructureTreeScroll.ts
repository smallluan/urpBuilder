import type { TScroll } from 'tdesign-react/es/common';

/**
 * 与 `builder/style.less` 中 `.structure-tree` 行高一致；虚拟列表行高必须与实际 DOM 接近，否则滚动会错位。
 * TDesign Tree 无 `size` API，紧凑度由样式与缩进 token 控制。
 */
export const BUILDER_STRUCTURE_TREE_ROW_HEIGHT = 30;

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
