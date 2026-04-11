import React from 'react';

export interface StickyBoundaryHostProps {
  /** 是否启用 sticky 吸顶（默认开启） */
  affix: boolean;
  /** 吸顶时距滚动容器顶部的距离（px） */
  offsetTop: number;
  /** 固定时 z-index */
  zIndex?: number;
  overflow: React.CSSProperties['overflow'];
  minHeight?: number;
  mergeStyle: (base?: React.CSSProperties) => React.CSSProperties | undefined;
  children?: React.ReactNode;
}

/**
 * 搭建态 + 预览态共用。
 *
 * 用原生 `position: sticky` 而非 TDesign Affix（`position: fixed`）：
 * Affix 内部 fixed 定位在模拟器 contain 环境下退化成 absolute，无法吸顶。
 * sticky 天然以最近 overflow 滚动祖先为粘附边界，搭建模拟器与独立预览页表现一致。
 */
export const StickyBoundaryHost: React.FC<StickyBoundaryHostProps> = ({
  affix,
  offsetTop,
  zIndex,
  overflow,
  minHeight,
  mergeStyle,
  children,
}) => {
  const stickyStyle: React.CSSProperties | undefined = affix
    ? { position: 'sticky', top: offsetTop, zIndex: zIndex ?? 500 }
    : undefined;

  return (
    <div
      className="builder-sticky-boundary"
      data-builder-sticky-boundary="true"
      style={mergeStyle({
        ...stickyStyle,
        boxSizing: 'border-box',
        width: '100%',
        minWidth: 0,
        minHeight: minHeight && minHeight > 0 ? minHeight : undefined,
        overflow,
      })}
    >
      {children}
    </div>
  );
};

export type StickyBoundaryPreviewProps = StickyBoundaryHostProps;

/**
 * 预览引擎内同样用 sticky：嵌入式预览的滚动层也有 contain，且独立预览页 sticky 同样生效。
 */
export const StickyBoundaryPreview = StickyBoundaryHost;
