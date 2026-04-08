/** 搭建页左右侧栏：可拖拽宽度区间（px） */
export const BUILDER_ASIDE_MIN_PX = 200;
export const BUILDER_ASIDE_MAX_PX = 300;
export const BUILDER_ASIDE_DEFAULT_PX = 280;

export const clampBuilderAsideWidth = (width: number) =>
  Math.min(BUILDER_ASIDE_MAX_PX, Math.max(BUILDER_ASIDE_MIN_PX, Math.round(width)));
