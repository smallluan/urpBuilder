import React, { useId } from 'react';
import { LibSvg, type LibraryGlyphProps } from './libraryIllustrationPrimitives';
import { LibIllustrationTheme as T } from './libraryIllustrationTheme';

/**
 * 搭建器「基础组件」物料图标：企业级统一主色 + 中性灰，弱渐变。
 * API 仍兼容 size / strokeWidth（线宽在插画里可忽略）。
 */
export type { LibraryGlyphProps } from './libraryIllustrationPrimitives';
export { LibSvg } from './libraryIllustrationPrimitives';

/** 按钮 */
export function LibIconButton({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.22}>
      <defs>
        <linearGradient id={`${id}-b`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={T.primaryLight} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
        <linearGradient id={`${id}-h`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="12" ry="2.8" fill={T.ground} />
      <rect x="8" y="14" width="24" height="14" rx="7" fill={`url(#${id}-b)`} />
      <rect x="9" y="15" width="22" height="5" rx="3" fill={`url(#${id}-h)`} opacity={0.85} />
      <path d="M14 22h12" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
    </LibSvg>
  );
}

/** 链接 */
export function LibIconLink({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.1}>
      <defs>
        <linearGradient id={`${id}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="32" rx="10" ry="2.2" fill={T.ground} />
      <ellipse cx="14" cy="17" rx="8" ry="8" fill="none" stroke={`url(#${id}-a)`} strokeWidth="3.2" />
      <ellipse cx="26" cy="21" rx="8" ry="8" fill="none" stroke={T.primaryMid} strokeWidth="2.8" opacity={0.85} />
      <circle cx="18" cy="19" r="2" fill={T.white} opacity={0.95} />
    </LibSvg>
  );
}

/** 抽屉 / 对话框 */
export function LibIconDrawer({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.08}>
      <defs>
        <linearGradient id={`${id}-m`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={T.surface2} />
          <stop offset="100%" stopColor={T.borderStrong} />
        </linearGradient>
        <linearGradient id={`${id}-d`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primary} />
        </linearGradient>
      </defs>
      <ellipse cx="22" cy="33" rx="11" ry="2.5" fill={T.ground} />
      <path d="M14 10h20a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H14V10z" fill={`url(#${id}-m)`} />
      <path d="M6 8h12a2 2 0 0 1 2 2v22a2 2 0 0 1-2 2H6V8z" fill={`url(#${id}-d)`} />
      <circle cx="11" cy="21" r="1.8" fill={T.white} opacity={0.9} />
      <rect x="18" y="14" width="12" height="2" rx="0.5" fill="rgba(255,255,255,0.35)" />
      <rect x="18" y="19" width="10" height="1.5" rx="0.5" fill="rgba(255,255,255,0.22)" />
    </LibSvg>
  );
}

/** 下拉 */
export function LibIconDropdown({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.08}>
      <defs>
        <linearGradient id={`${id}-p`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="16" cy="32" rx="9" ry="2.2" fill={T.ground} />
      <rect x="4" y="14" width="22" height="12" rx="3" fill={`url(#${id}-p)`} />
      <path d="M9 19h12" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M28 12l6 8-6 8V12z" fill={T.primaryDark} opacity={0.92} />

    </LibSvg>
  );
}

/** 图标组件 */
export function LibIconGlyphComponent({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.02}>
      <defs>
        <linearGradient id={`${id}-s`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primaryLight} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="9" ry="2.2" fill={T.ground} />
      <path
        d="M20 8l2.2 6.8h7l-5.7 4.1 2.2 6.8L20 25.8l-5.7 4.1 2.2-6.8-5.7-4.1h7z"
        fill={`url(#${id}-s)`}
        stroke={T.primaryDark}
        strokeWidth="0.35"
      />
      <circle cx="12" cy="14" r="2.2" fill={T.primarySoft} stroke={T.borderStrong} strokeWidth="0.4" />
      <circle cx="30" cy="22" r="1.6" fill={T.border} opacity={0.95} />
      <circle cx="26" cy="11" r="1.2" fill={T.borderStrong} />
    </LibSvg>
  );
}

/** 表格：同色系蓝灰区分单元格 */
export function LibIconTable({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={0.86}>
      <defs>
        <linearGradient id={`${id}-h`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryMid} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="11" ry="2.3" fill={T.ground} />
      <rect x="6" y="10" width="28" height="6" rx="1.5" fill={`url(#${id}-h)`} />
      <rect x="6" y="18" width="8" height="7" rx="1" fill={T.primarySoft} stroke={T.primaryMid} strokeWidth="0.5" />
      <rect x="16" y="18" width="8" height="7" rx="1" fill="#e0e7ff" stroke={T.primary} strokeWidth="0.5" />
      <rect x="26" y="18" width="8" height="7" rx="1" fill={T.surface2} stroke={T.borderStrong} strokeWidth="0.5" />
      <rect x="6" y="27" width="8" height="6" rx="1" fill={T.surface2} stroke={T.borderStrong} strokeWidth="0.5" />
      <rect x="16" y="27" width="8" height="6" rx="1" fill={T.primarySoft} stroke={T.primaryMid} strokeWidth="0.5" />
      <rect x="26" y="27" width="8" height="6" rx="1" fill="#e0e7ff" stroke={T.primary} strokeWidth="0.5" />
    </LibSvg>
  );
}

/** 卡片 */
export function LibIconCard({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.04}>
      <defs>
        <linearGradient id={`${id}-t`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primary} />
        </linearGradient>
      </defs>
      <ellipse cx="21" cy="33" rx="10" ry="2.3" fill={T.ground} />
      <path d="M10 28 L9 12 L31 10 L32 26 Z" fill={T.surface} stroke={T.borderStrong} strokeWidth="0.6" />
      <path d="M9 12 L31 10 L31 16 L9 18 Z" fill={`url(#${id}-t)`} />
      <rect x="13" y="20" width="14" height="2" rx="0.5" fill={T.border} transform="rotate(-2 20 21)" />
      <rect x="13" y="24" width="9" height="1.5" rx="0.5" fill={T.surface2} transform="rotate(-2 17 25)" />
    </LibSvg>
  );
}

/** 统计 */
export function LibIconStatistic({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.08}>
      <defs>
        <linearGradient id={`${id}-a`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={T.primaryLight} />
          <stop offset="100%" stopColor={T.primary} stopOpacity={0.12} />
        </linearGradient>
        <linearGradient id={`${id}-l`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={T.primaryMid} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="11" ry="2.2" fill={T.ground} />
      <path d="M6 28 L6 22 Q12 24 16 16 T28 10 L28 28 Z" fill={`url(#${id}-a)`} />
      <path
        d="M6 22 Q12 24 16 16 T28 10"
        fill="none"
        stroke={`url(#${id}-l)`}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="2.5" fill={T.white} stroke={T.primaryDark} strokeWidth="0.5" />
      <circle cx="24" cy="12" r="2" fill={T.white} stroke={T.primaryMid} strokeWidth="0.5" />
    </LibSvg>
  );
}

/** 分割线 */
export function LibIconDivider({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.14}>
      <defs>
        <linearGradient id={`${id}-d`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <path d="M4 20h11" stroke={T.border} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" />
      <path d="M25 20h11" stroke={T.border} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" />
      <path d="M20 14l4 6-4 6-4-6z" fill={`url(#${id}-d)`} stroke={T.primaryDark} strokeWidth="0.5" />
      <circle cx="8" cy="20" r="2" fill={T.border} />
      <circle cx="32" cy="20" r="2" fill={T.border} />
    </LibSvg>
  );
}

/** 分类「基础组件」 */
export function LibIconCategoryBasic({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={0.93}>
      <defs>
        <linearGradient id={`${id}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="18" cy="34" rx="10" ry="2.5" fill={T.ground} />
      <path d="M6 22 L14 26 L14 32 L6 28 Z" fill={`url(#${id}-a)`} />
      <path d="M14 26 L22 22 L22 28 L14 32 Z" fill={T.primaryDark} opacity={0.82} />
      <path d="M6 22 L14 18 L22 22 L14 26 Z" fill={T.primaryMid} opacity={0.9} />
      <path d="M16 12 L24 16 L24 26 L16 22 Z" fill={T.surface2} stroke={T.borderStrong} strokeWidth="0.5" />
      <path d="M16 12 L22 9 L24 16 L16 18 Z" fill={T.border} />
      <path d="M24 10 L32 14 L32 24 L24 20 Z" fill={T.primarySoft} stroke={T.primary} strokeWidth="0.45" />
      <path d="M24 10 L30 7 L32 14 L24 16 Z" fill={T.primaryLight} />
    </LibSvg>
  );
}

/** 已保存组件 */
export function LibIconSavedComponents({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.06}>
      <defs>
        <linearGradient id={`${id}-p`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primary} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.3" fill={T.ground} />
      <path d="M10 14 L28 12 L30 28 L12 30 Z" fill={T.surface} stroke={T.borderStrong} strokeWidth="0.6" />
      <path d="M8 18 L26 16 L28 30 L10 32 Z" fill={`url(#${id}-p)`} opacity={0.92} />
      <path d="M22 8 L26 12 L22 16 L18 12 Z" fill={T.primaryDark} opacity={0.95} />
      <path d="M14 22h8" stroke="rgba(255,255,255,0.65)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M14 26h6" stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeLinecap="round" />
    </LibSvg>
  );
}

export * from './libraryExtendedIllustrationIcons';
