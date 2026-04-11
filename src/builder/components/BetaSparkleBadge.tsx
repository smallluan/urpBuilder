import React from 'react';

export interface BetaSparkleBadgeProps {
  /** 默认 `BETA` */
  children?: React.ReactNode;
  className?: string;
}

/**
 * 搭建器专用：非组件库的 Beta 角标，用于组件库切换等仍在适配的能力。
 * 外环渐变由样式表做横向 background-position 流动（不旋转）。
 */
const BetaSparkleBadge: React.FC<BetaSparkleBadgeProps> = ({ children = 'BETA', className = '' }) => {
  return (
    <span className={`beta-sparkle-badge ${className}`.trim()} aria-label="Beta 版本">
      <span className="beta-sparkle-badge__aurora" aria-hidden />
      <span className="beta-sparkle-badge__text">{children}</span>
    </span>
  );
};

export default BetaSparkleBadge;
