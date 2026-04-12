import React from 'react';
import './UrpBuilderLogo.less';

type Props = {
  className?: string;
  /** 词标字号，默认与 header 原图比例接近 */
  wordmarkSize?: number;
  /** 顶栏用较小图标，避免高于 60px header */
  variant?: 'default' | 'header';
};

/**
 * UrpBuilder 矢量 Logo：分层蓝底 + 白 U，词标随 theme-mode 变色；
 * 3D 感由父级 perspective + mark 的 rotateY/rotateX 动画提供（非 Three，避免壳层常驻 WebGL）。
 */
const UrpBuilderLogo: React.FC<Props> = ({ className, wordmarkSize, variant = 'default' }) => {
  const markSize = variant === 'header' ? 32 : 40;
  const fs = wordmarkSize ?? (variant === 'header' ? 17 : 20);
  const uid = React.useId().replace(/:/g, '');

  return (
    <div
      className={['urp-logo', variant === 'header' ? 'urp-logo--header' : '', className].filter(Boolean).join(' ')}
      aria-label="UrpBuilder"
    >
      <div className="urp-logo__mark-scene" style={{ width: markSize, height: markSize }}>
        <svg
          className="urp-logo__mark"
          width={markSize}
          height={markSize}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <linearGradient id={`${uid}-base`} x1="6" y1="4" x2="44" y2="46" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0034a8" />
              <stop offset="0.45" stopColor="#0052d9" />
              <stop offset="1" stopColor="#2b7eee" />
            </linearGradient>
            <linearGradient id={`${uid}-fold`} x1="4" y1="40" x2="46" y2="8" gradientUnits="userSpaceOnUse">
              <stop stopColor="#5d9eff" stopOpacity="0.95" />
              <stop offset="0.55" stopColor="#0052d9" stopOpacity="0.55" />
              <stop offset="1" stopColor="#0034a8" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id={`${uid}-shine`} x1="10" y1="8" x2="34" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" stopOpacity="0.22" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* 底层圆角块 */}
          <rect x="4" y="4" width="40" height="40" rx="11" fill={`url(#${uid}-base)`} />
          {/* 斜向叠层，模拟折纸/分层 */}
          <path
            d="M4 28 L26 4 L44 14 L44 44 L14 44 L4 36 Z"
            fill={`url(#${uid}-fold)`}
            opacity={0.88}
          />
          <path
            d="M4 32 L30 8 L44 18 L44 44 L8 44 L4 38 Z"
            fill="#0052d9"
            opacity={0.35}
          />
          {/* 高光 */}
          <ellipse cx="18" cy="14" rx="14" ry="9" fill={`url(#${uid}-shine)`} />
          {/* 白 U：字重与品牌图一致 */}
          <text
            x="24"
            y="33.5"
            textAnchor="middle"
            fontSize="26"
            fontWeight="800"
            fill="#ffffff"
            fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
          >
            U
          </text>
        </svg>
      </div>
      <span className="urp-logo__wordmark" style={{ fontSize: fs }}>
        <span className="urp-logo__urp">Urp</span>
        <span className="urp-logo__builder">Builder</span>
      </span>
    </div>
  );
};

export default UrpBuilderLogo;
