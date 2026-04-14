import React from 'react';
import { UrpBuilderLogoMark } from '../../components/UrpBuilderLogo/UrpBuilderLogoMark';
import '../../components/UrpBuilderLogo/UrpBuilderLogo.less';
import './DocsSiteLogo.less';

type Props = {
  className?: string;
  /** 与顶栏 UrpBuilderLogo header  variant 对齐 */
  wordmarkSize?: number;
};

/**
 * 文档站词标：BuilderNext + 间隔 +「文档站」。非链接，仅展示。
 */
const DocsSiteLogo: React.FC<Props> = ({ className, wordmarkSize }) => {
  const markSize = 32;
  const fs = wordmarkSize ?? 17;
  const uid = React.useId().replace(/:/g, '');

  return (
    <div
      className={['docs-site-logo', 'urp-logo', 'urp-logo--header', className].filter(Boolean).join(' ')}
      role="img"
      aria-label="BuilderNext 文档站"
    >
      <div className="urp-logo__mark-scene" style={{ width: markSize, height: markSize }}>
        <UrpBuilderLogoMark size={markSize} uid={uid} className="urp-logo__mark" />
      </div>
      <span className="docs-site-logo__wordmark" style={{ fontSize: fs }}>
        <span className="docs-site-logo__builder">Builder</span>
        <span className="docs-site-logo__next">Next</span>
        <span className="docs-site-logo__badge">文档站</span>
      </span>
    </div>
  );
};

export default DocsSiteLogo;
