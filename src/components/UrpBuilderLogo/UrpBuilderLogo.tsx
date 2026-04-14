import React from 'react';
import { UrpBuilderLogoMark } from './UrpBuilderLogoMark';
import './UrpBuilderLogo.less';

type Props = {
  className?: string;
  /** 词标字号，默认与 header 原图比例接近 */
  wordmarkSize?: number;
  /** 顶栏用较小图标，避免高于 60px header */
  variant?: 'default' | 'header';
};

/**
 * BuilderNext 矢量 Logo：分层蓝底 + 白 U，词标 Builder（深）+ Next（蓝）随 theme-mode 变色；
 * 3D 感由父级 perspective + mark 的 rotateY/rotateX 动画提供。
 */
const UrpBuilderLogo: React.FC<Props> = ({ className, wordmarkSize, variant = 'default' }) => {
  const markSize = variant === 'header' ? 32 : 40;
  const fs = wordmarkSize ?? (variant === 'header' ? 17 : 20);
  const uid = React.useId().replace(/:/g, '');

  return (
    <div
      className={['urp-logo', variant === 'header' ? 'urp-logo--header' : '', className].filter(Boolean).join(' ')}
      aria-label="BuilderNext"
    >
      <div className="urp-logo__mark-scene" style={{ width: markSize, height: markSize }}>
        <UrpBuilderLogoMark size={markSize} uid={uid} className="urp-logo__mark" />
      </div>
      <span className="urp-logo__wordmark" style={{ fontSize: fs }}>
        <span className="urp-logo__urp">Builder</span>
        <span className="urp-logo__builder">Next</span>
      </span>
    </div>
  );
};

export default UrpBuilderLogo;
