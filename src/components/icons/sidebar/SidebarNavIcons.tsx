import React, { useId } from 'react';
import {
  HomeAssetStatIconApps,
  HomeAssetStatIconAssets,
  HomeAssetStatIconComponents,
  HomeAssetStatIconConstants,
  HomeAssetStatIconFunctions,
} from '../homeAssetStatIcons';

const svgBase: React.CSSProperties = {
  display: 'block',
  flexShrink: 0,
};

function IconSlot({ children }: { children: React.ReactNode }) {
  return (
    <span className="sidebar-nav-icon-slot" aria-hidden>
      {children}
    </span>
  );
}

/** 总览 · 首页：等距小屋 + 暖光窗 */
export function SidebarIconHome() {
  const id = useId().replace(/:/g, '');
  return (
    <IconSlot>
      <svg viewBox="0 0 40 40" style={svgBase} aria-hidden className="urp-asset-style-icon">
        <defs>
          <linearGradient id={`${id}-roof`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7eb8ff" />
            <stop offset="100%" stopColor="#2460d8" />
          </linearGradient>
          <linearGradient id={`${id}-wall`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#dce9ff" />
            <stop offset="100%" stopColor="#9bb8e8" />
          </linearGradient>
          <linearGradient id={`${id}-door`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5a7fb8" />
            <stop offset="100%" stopColor="#2d4a78" />
          </linearGradient>
          <linearGradient id={`${id}-win`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffe8a3" />
            <stop offset="100%" stopColor="#f4b942" />
          </linearGradient>
        </defs>
        <ellipse cx="20" cy="33" rx="12" ry="2.5" fill="rgba(0,0,0,0.1)" />
        <path d="M8 22 L20 14 L32 22 L32 30 L8 30 Z" fill={`url(#${id}-wall)`} />
        <path d="M8 22 L20 14 L32 22 L20 26 Z" fill={`url(#${id}-roof)`} />
        <rect x="17" y="24" width="6" height="7" rx="0.8" fill={`url(#${id}-door)`} />
        <rect x="11" y="20" width="5" height="4" rx="0.5" fill={`url(#${id}-win)`} opacity={0.95} />
        <rect x="24" y="20" width="5" height="4" rx="0.5" fill={`url(#${id}-win)`} opacity={0.85} />
        <path d="M18 12 L20 10 L22 12" stroke="#4a6fa5" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      </svg>
    </IconSlot>
  );
}

/** 构建 · 组件（与首页资产统计同款积木） */
export function SidebarIconBuildComponent() {
  return (
    <IconSlot>
      <HomeAssetStatIconComponents />
    </IconSlot>
  );
}

/** 构建 · 应用页面（与首页资产统计同款窗口） */
export function SidebarIconBuildApp() {
  return (
    <IconSlot>
      <HomeAssetStatIconApps />
    </IconSlot>
  );
}

/** 数据 · 常量（与首页资产统计同款滑块） */
export function SidebarIconConstants() {
  return (
    <IconSlot>
      <HomeAssetStatIconConstants />
    </IconSlot>
  );
}

/** 数据 · API：节点与网关连线 */
export function SidebarIconApi() {
  const id = useId().replace(/:/g, '');
  return (
    <IconSlot>
      <svg viewBox="0 0 40 40" style={svgBase} aria-hidden className="urp-asset-style-icon">
        <defs>
          <linearGradient id={`${id}-n1`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a29bfe" />
            <stop offset="100%" stopColor="#6c5ce7" />
          </linearGradient>
          <linearGradient id={`${id}-n2`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#74b9ff" />
            <stop offset="100%" stopColor="#0984e3" />
          </linearGradient>
          <linearGradient id={`${id}-hub`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffeaa7" />
            <stop offset="100%" stopColor="#fdcb6e" />
          </linearGradient>
        </defs>
        <ellipse cx="20" cy="33" rx="11" ry="2.4" fill="rgba(0,0,0,0.09)" />
        <path d="M8 18 Q20 10 32 18" stroke="rgba(108,92,231,0.35)" strokeWidth="1.2" fill="none" />
        <path d="M8 24 Q20 30 32 24" stroke="rgba(9,132,227,0.35)" strokeWidth="1.2" fill="none" />
        <circle cx="10" cy="18" r="4.5" fill={`url(#${id}-n1)`} />
        <circle cx="30" cy="18" r="4.5" fill={`url(#${id}-n1)`} />
        <circle cx="10" cy="24" r="4" fill={`url(#${id}-n2)`} />
        <circle cx="30" cy="24" r="4" fill={`url(#${id}-n2)`} />
        <rect x="16" y="19" width="8" height="8" rx="2" fill={`url(#${id}-hub)`} stroke="#d4a017" strokeWidth="0.4" />
        <path d="M18 23 h4 M20 21 v4" stroke="#b8860b" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </IconSlot>
  );
}

/** 数据 · 云函数（与首页资产统计同款云+闪电） */
export function SidebarIconCloudFunction() {
  return (
    <IconSlot>
      <HomeAssetStatIconFunctions />
    </IconSlot>
  );
}

/** 数据 · 素材（与首页资产统计同款相框） */
export function SidebarIconAssets() {
  return (
    <IconSlot>
      <HomeAssetStatIconAssets />
    </IconSlot>
  );
}

/** 团队 · 看板：三列便签 */
export function SidebarIconTeamBoard() {
  const id = useId().replace(/:/g, '');
  return (
    <IconSlot>
      <svg viewBox="0 0 40 40" style={svgBase} aria-hidden className="urp-asset-style-icon">
        <defs>
          <linearGradient id={`${id}-c1`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#81ecec" />
            <stop offset="100%" stopColor="#00b894" />
          </linearGradient>
          <linearGradient id={`${id}-c2`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#55efc4" />
            <stop offset="100%" stopColor="#00a085" />
          </linearGradient>
          <linearGradient id={`${id}-c3`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a8e6cf" />
            <stop offset="100%" stopColor="#38ada9" />
          </linearGradient>
        </defs>
        <ellipse cx="20" cy="33" rx="12" ry="2.5" fill="rgba(0,0,0,0.08)" />
        <rect x="7" y="12" width="6" height="17" rx="1" fill={`url(#${id}-c1)`} />
        <rect x="8" y="14" width="4" height="3" rx="0.5" fill="rgba(255,255,255,0.45)" />
        <rect x="8" y="19" width="4" height="2" rx="0.5" fill="rgba(0,60,50,0.2)" />
        <rect x="15" y="10" width="6" height="19" rx="1" fill={`url(#${id}-c2)`} />
        <rect x="16" y="12" width="4" height="4" rx="0.5" fill="rgba(255,255,255,0.4)" />
        <rect x="16" y="18" width="4" height="2" rx="0.5" fill="rgba(0,60,50,0.18)" />
        <rect x="16" y="22" width="4" height="2" rx="0.5" fill="rgba(0,60,50,0.15)" />
        <rect x="23" y="14" width="6" height="15" rx="1" fill={`url(#${id}-c3)`} />
        <rect x="24" y="16" width="4" height="3" rx="0.5" fill="rgba(255,255,255,0.42)" />
        <rect x="24" y="21" width="4" height="2" rx="0.5" fill="rgba(0,60,50,0.2)" />
      </svg>
    </IconSlot>
  );
}

/** 管理员 · 用户：人像 + 盾标 */
export function SidebarIconUserAdmin() {
  const id = useId().replace(/:/g, '');
  return (
    <IconSlot>
      <svg viewBox="0 0 40 40" style={svgBase} aria-hidden className="urp-asset-style-icon">
        <defs>
          <linearGradient id={`${id}-face`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#dfe6e9" />
            <stop offset="100%" stopColor="#b2bec3" />
          </linearGradient>
          <linearGradient id={`${id}-body`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#74b9ff" />
            <stop offset="100%" stopColor="#0984e3" />
          </linearGradient>
          <linearGradient id={`${id}-shield`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffeaa7" />
            <stop offset="100%" stopColor="#fdcb6e" />
          </linearGradient>
        </defs>
        <ellipse cx="20" cy="33" rx="10" ry="2.3" fill="rgba(0,0,0,0.09)" />
        <circle cx="20" cy="14" r="6" fill={`url(#${id}-face)`} />
        <path d="M12 26 Q12 20 20 20 Q28 20 28 26 L28 30 L12 30 Z" fill={`url(#${id}-body)`} />
        <path
          d="M24 12 L28 14 L28 20 Q26 24 24 25 Q22 24 20 22"
          fill={`url(#${id}-shield)`}
          stroke="#e17055"
          strokeWidth="0.35"
        />
        <path d="M25 16 L27 17 L27 19 Q26 21 25 21.5" stroke="#d63031" strokeWidth="0.6" fill="none" strokeLinecap="round" />
      </svg>
    </IconSlot>
  );
}

/** 管理员 · 团队：双环 + 齿轮 */
export function SidebarIconTeamAdmin() {
  const id = useId().replace(/:/g, '');
  return (
    <IconSlot>
      <svg viewBox="0 0 40 40" style={svgBase} aria-hidden className="urp-asset-style-icon">
        <defs>
          <linearGradient id={`${id}-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dda0dd" />
            <stop offset="100%" stopColor="#9b59b6" />
          </linearGradient>
          <linearGradient id={`${id}-gear`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fab1a0" />
            <stop offset="100%" stopColor="#e17055" />
          </linearGradient>
        </defs>
        <ellipse cx="20" cy="33" rx="11" ry="2.4" fill="rgba(0,0,0,0.08)" />
        <circle cx="16" cy="18" r="7" fill={`url(#${id}-ring)`} opacity={0.9} />
        <circle cx="24" cy="20" r="7" fill={`url(#${id}-ring)`} opacity={0.75} />
        <circle cx="16" cy="18" r="3.2" fill="rgba(255,255,255,0.35)" />
        <circle cx="24" cy="20" r="3.2" fill="rgba(255,255,255,0.3)" />
        <g transform="translate(20 26)">
          <circle r="5.5" fill={`url(#${id}-gear)`} />
          <path
            d="M0 -7 L1.2 -2.2 L6 -1.2 L2.2 1.8 L3.5 6.5 L0 4.2 L-3.5 6.5 L-2.2 1.8 L-6 -1.2 L-1.2 -2.2 Z"
            fill="#c0392b"
            opacity={0.95}
          />
          <circle r="2.2" fill="#ffeaa7" />
        </g>
      </svg>
    </IconSlot>
  );
}

/** 管理员 · 系统广播：信封 + 波纹 */
export function SidebarIconBroadcast() {
  const id = useId().replace(/:/g, '');
  return (
    <IconSlot>
      <svg viewBox="0 0 40 40" style={svgBase} aria-hidden className="urp-asset-style-icon">
        <defs>
          <linearGradient id={`${id}-env`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dfe6e9" />
            <stop offset="100%" stopColor="#74b9ff" />
          </linearGradient>
          <linearGradient id={`${id}-flap`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#b2bec3" />
          </linearGradient>
        </defs>
        <ellipse cx="20" cy="33" rx="11" ry="2.4" fill="rgba(0,0,0,0.08)" />
        <path d="M8 14 Q20 8 32 14 L32 26 Q20 30 8 26 Z" fill={`url(#${id}-env)`} />
        <path d="M8 14 L20 22 L32 14" stroke="#636e72" strokeWidth="0.8" fill="none" />
        <path d="M8 14 L20 22 L32 14 L20 18 Z" fill={`url(#${id}-flap)`} opacity={0.85} />
        <path
          d="M34 11 Q38 13 38 16"
          stroke="#0984e3"
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
          opacity={0.65}
        />
        <path
          d="M35 8 Q40 11 40 16"
          stroke="#74b9ff"
          strokeWidth="0.8"
          fill="none"
          strokeLinecap="round"
          opacity={0.5}
        />
      </svg>
    </IconSlot>
  );
}
