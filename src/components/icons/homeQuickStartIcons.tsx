import React, { useId } from 'react';

const svgStyle: React.CSSProperties = {
  display: 'block',
  flexShrink: 0,
};

/** 快速开始 · 新建组件：与「我的资产-组件」同款等距积木 + 角标加号（与新建应用构图一致） */
export function HomeQuickStartIconNewComponent() {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 40 40" style={svgStyle} aria-hidden className="urp-asset-style-icon">
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
        <linearGradient id={`${id}-plus`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#b8d4ff" />
        </linearGradient>
      </defs>
      <g transform="translate(-3, 1)">
        <ellipse cx="14" cy="33" rx="9" ry="2.5" fill="rgba(0,0,0,0.12)" />
        <path d="M6 18 L14 23 L14 31 L6 26 Z" fill={`url(#${id}-b)`} />
        <path d="M14 23 L22 18 L22 26 L14 31 Z" fill={`url(#${id}-c)`} />
        <path d="M6 18 L14 13 L22 18 L14 23 Z" fill={`url(#${id}-a)`} />
        <ellipse cx="26" cy="31" rx="8" ry="2.2" fill="rgba(0,0,0,0.1)" />
        <path d="M20 14 L28 19 L28 27 L20 22 Z" fill={`url(#${id}-e)`} />
        <path d="M28 19 L34 15 L34 23 L28 27 Z" fill={`url(#${id}-f)`} />
        <path d="M20 14 L28 10 L34 15 L28 19 Z" fill={`url(#${id}-d)`} />
      </g>
      <circle cx="29" cy="11" r="6" fill={`url(#${id}-plus)`} stroke="#0052d9" strokeWidth="0.6" />
      <path d="M29 8.2 L29 13.8 M25.2 11 L32.8 11" stroke="#0034a8" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** 快速开始 · 新建应用：与「我的资产-应用」同系的叠层窗口 + 角标加号 */
export function HomeQuickStartIconNewApp() {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 40 40" style={svgStyle} aria-hidden className="urp-asset-style-icon">
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
        <linearGradient id={`${id}-plus`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#b8e6c5" />
        </linearGradient>
      </defs>
      <ellipse cx="17" cy="33" rx="10" ry="2.4" fill="rgba(0,0,0,0.09)" />
      <path d="M6 14 L22 14 L22 28 L6 28 Z" fill={`url(#${id}-r)`} opacity={0.82} />
      <path d="M8 16 L20 16 L20 22 L8 22 Z" fill="rgba(0,40,20,0.22)" />
      <path d="M10 17 L28 17 L28 29 L10 29 Z" fill={`url(#${id}-l)`} />
      <path d="M12 19 L26 19 L26 26 L12 26 Z" fill={`url(#${id}-t)`} />
      <path d="M12 19 L26 19 L26 21 L12 21 Z" fill={`url(#${id}-s)`} />
      <rect x="14" y="23" width="10" height="4" rx="0.8" fill="rgba(255,255,255,0.38)" />
      <circle cx="29" cy="11" r="6" fill={`url(#${id}-plus)`} stroke="#148f52" strokeWidth="0.6" />
      <path d="M29 8.2 L29 13.8 M25.2 11 L32.8 11" stroke="#1e8449" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
