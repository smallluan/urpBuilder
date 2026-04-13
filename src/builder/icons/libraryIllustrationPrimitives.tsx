import React from 'react';

/**
 * 搭建器物料插画共用：viewBox、contentScale、urp-builder-lib-illustration-icon。
 * 独立文件避免 libraryActionBasicIcons ↔ libraryExtendedIllustrationIcons 循环依赖。
 */
export type LibraryGlyphProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
};

const svgStyle: React.CSSProperties = {
  display: 'block',
  flexShrink: 0,
};

export function LibSvg(
  props: LibraryGlyphProps & {
    children: React.ReactNode;
    viewBox?: string;
    contentScale?: number;
  },
) {
  const { size = 24, className, children, viewBox = '0 0 40 40', contentScale = 1 } = props;
  const scaled =
    contentScale !== 1 && Number.isFinite(contentScale) ? (
      <g transform={`translate(20 20) scale(${contentScale}) translate(-20 -20)`}>{children}</g>
    ) : (
      children
    );

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      style={svgStyle}
      className={`urp-builder-lib-illustration-icon${className ? ` ${className}` : ''}`}
      aria-hidden
    >
      {scaled}
    </svg>
  );
}
