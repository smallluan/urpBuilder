import type { TScroll } from 'tdesign-react/es/common';

/**
 * 搭建页 / 流程页左侧结构树共用：TDesign Tree 虚拟滚动。
 * threshold 设为 1 时，可见行数 > 1 即启用（默认 100 仅在大树才开启）。
 */
export const BUILDER_STRUCTURE_TREE_SCROLL: TScroll = {
  type: 'virtual',
  threshold: 1,
  rowHeight: 36,
  bufferSize: 20,
};
