import React, { useId } from 'react';

const svgStyle: React.CSSProperties = {
  display: 'block',
  flexShrink: 0,
  width: 34,
  height: 34,
};

/** 组件：立体积木块（两块错落的等距立方体） */
export function HomeAssetStatIconComponents() {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 40 40" style={svgStyle} aria-hidden className="home-page__asset-stat-icon">
      <defs>
        <linearGradient id={`${id}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8eb9ff" />
          <stop offset="100%" stopColor="#0052d9" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4a8aed" />
          <stop offset="100%" stopColor="#0034a8" />
        </linearGradient>
        <linearGradient id={`${id}-c`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6aa3ff" />
          <stop offset="100%" stopColor="#1a6bdc" />
        </linearGradient>
        <linearGradient id={`${id}-d`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b8d4ff" />
          <stop offset="100%" stopColor="#3d7fe0" />
        </linearGradient>
        <linearGradient id={`${id}-e`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5d9eff" />
          <stop offset="100%" stopColor="#0d4fbf" />
        </linearGradient>
        <linearGradient id={`${id}-f`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7eb6ff" />
          <stop offset="100%" stopColor="#2a7ae8" />
        </linearGradient>
      </defs>
      <ellipse cx="14" cy="33" rx="9" ry="2.5" fill="rgba(0,0,0,0.12)" />
      <path d="M6 18 L14 23 L14 31 L6 26 Z" fill={`url(#${id}-b)`} />
      <path d="M14 23 L22 18 L22 26 L14 31 Z" fill={`url(#${id}-c)`} />
      <path d="M6 18 L14 13 L22 18 L14 23 Z" fill={`url(#${id}-a)`} />
      <ellipse cx="26" cy="31" rx="8" ry="2.2" fill="rgba(0,0,0,0.1)" />
      <path d="M20 14 L28 19 L28 27 L20 22 Z" fill={`url(#${id}-e)`} />
      <path d="M28 19 L34 15 L34 23 L28 27 Z" fill={`url(#${id}-f)`} />
      <path d="M20 14 L28 10 L34 15 L28 19 Z" fill={`url(#${id}-d)`} />
    </svg>
  );
}

/** 应用：立体「窗口」叠层 */
export function HomeAssetStatIconApps() {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 40 40" style={svgStyle} aria-hidden className="home-page__asset-stat-icon">
      <defs>
        <linearGradient id={`${id}-t`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7dcea0" />
          <stop offset="100%" stopColor="#1e8449" />
        </linearGradient>
        <linearGradient id={`${id}-l`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#52b788" />
          <stop offset="100%" stopColor="#148f52" />
        </linearGradient>
        <linearGradient id={`${id}-r`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#40916c" />
          <stop offset="100%" stopColor="#0d6e3f" />
        </linearGradient>
        <linearGradient id={`${id}-s`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d8f3dc" />
          <stop offset="100%" stopColor="#95d5b2" />
        </linearGradient>
      </defs>
      <ellipse cx="18" cy="33" rx="11" ry="2.5" fill="rgba(0,0,0,0.1)" />
      {/* back panel */}
      <path d="M8 12 L26 12 L26 28 L8 28 Z" fill={`url(#${id}-r)`} opacity={0.85} />
      <path d="M10 14 L24 14 L24 22 L10 22 Z" fill="rgba(0,40,20,0.25)" />
      {/* front panel offset */}
      <path d="M12 16 L30 16 L30 30 L12 30 Z" fill={`url(#${id}-l)`} />
      <path d="M14 18 L28 18 L28 26 L14 26 Z" fill={`url(#${id}-t)`} />
      <path d="M14 18 L28 18 L28 20 L14 20 Z" fill={`url(#${id}-s)`} />
      <rect x="16" y="22" width="10" height="5" rx="1" fill="rgba(255,255,255,0.35)" />
    </svg>
  );
}

/** 常量：立体滑块 / 三档调节 */
export function HomeAssetStatIconConstants() {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 40 40" style={svgStyle} aria-hidden className="home-page__asset-stat-icon">
      <defs>
        <linearGradient id={`${id}-1`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffd89b" />
          <stop offset="100%" stopColor="#e67e22" />
        </linearGradient>
        <linearGradient id={`${id}-2`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffe0b2" />
          <stop offset="100%" stopColor="#d35400" />
        </linearGradient>
        <linearGradient id={`${id}-3`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fad7a0" />
          <stop offset="100%" stopColor="#ca6f1e" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="12" ry="2.5" fill="rgba(0,0,0,0.08)" />
      {/* bar 1 short */}
      <path d="M8 26 L12 26 L12 28 L14 28 L14 30 L8 30 Z" fill={`url(#${id}-1)`} />
      <rect x="8" y="18" width="6" height="8" rx="1" fill={`url(#${id}-2)`} />
      <rect x="9" y="16" width="4" height="3" rx="0.5" fill="#fff5e6" />
      {/* bar 2 mid */}
      <path d="M16 22 L20 22 L20 24 L22 24 L22 30 L16 30 Z" fill={`url(#${id}-2)`} />
      <rect x="16" y="12" width="6" height="10" rx="1" fill={`url(#${id}-3)`} />
      <rect x="17" y="10" width="4" height="3" rx="0.5" fill="#fff8f0" />
      {/* bar 3 tall */}
      <path d="M24 18 L28 18 L28 20 L30 20 L30 30 L24 30 Z" fill={`url(#${id}-3)`} />
      <rect x="24" y="6" width="6" height="12" rx="1" fill={`url(#${id}-1)`} />
      <rect x="25" y="4" width="4" height="3" rx="0.5" fill="#fff5e6" />
    </svg>
  );
}

/** 云函数：立体云 + 闪电 */
export function HomeAssetStatIconFunctions() {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 40 40" style={svgStyle} aria-hidden className="home-page__asset-stat-icon">
      <defs>
        <linearGradient id={`${id}-cl`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffb4b4" />
          <stop offset="100%" stopColor="#c0392b" />
        </linearGradient>
        <linearGradient id={`${id}-cd`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff7675" />
          <stop offset="100%" stopColor="#a93226" />
        </linearGradient>
        <linearGradient id={`${id}-bolt`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffeaa7" />
          <stop offset="100%" stopColor="#f39c12" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="32" rx="12" ry="2.5" fill="rgba(0,0,0,0.1)" />
      <path
        d="M8 22 Q8 14 16 14 Q18 8 26 10 Q32 10 32 16 Q36 18 34 22 Q34 26 28 26 L12 26 Q8 26 8 22 Z"
        fill={`url(#${id}-cl)`}
      />
      <path
        d="M10 20 Q12 16 18 16 Q20 12 26 13 Q30 14 30 18 Q30 22 26 22 L14 22 Q10 22 10 20 Z"
        fill={`url(#${id}-cd)`}
        opacity={0.9}
      />
      <path
        d="M22 14 L18 22 L21 22 L17 30 L25 20 L21 20 L24 14 Z"
        fill={`url(#${id}-bolt)`}
        stroke="#c27b16"
        strokeWidth="0.3"
      />
    </svg>
  );
}

/** 素材：立体相框 + 风景剪影 */
export function HomeAssetStatIconAssets() {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 40 40" style={svgStyle} aria-hidden className="home-page__asset-stat-icon">
      <defs>
        <linearGradient id={`${id}-fr`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#dfe6e9" />
          <stop offset="100%" stopColor="#636e72" />
        </linearGradient>
        <linearGradient id={`${id}-in`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a8d8ea" />
          <stop offset="55%" stopColor="#74b9ff" />
          <stop offset="100%" stopColor="#2d7dd2" />
        </linearGradient>
        <linearGradient id={`${id}-hill`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#55efc4" />
          <stop offset="100%" stopColor="#00a085" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.3" fill="rgba(0,0,0,0.1)" />
      <path d="M8 10 L32 10 L32 28 L8 28 Z" fill={`url(#${id}-fr)`} />
      <path d="M10 12 L30 12 L30 26 L10 26 Z" fill="#2d3436" opacity={0.35} />
      <rect x="11" y="13" width="18" height="12" rx="0.5" fill={`url(#${id}-in)`} />
      <path d="M11 24 L16 19 L20 22 L24 17 L29 24 L29 25 L11 25 Z" fill={`url(#${id}-hill)`} />
      <circle cx="25" cy="16" r="2" fill="#ffeaa7" opacity={0.95} />
    </svg>
  );
}
