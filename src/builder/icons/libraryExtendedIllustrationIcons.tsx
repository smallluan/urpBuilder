import React, { useId } from 'react';
import { LibSvg, type LibraryGlyphProps } from './libraryIllustrationPrimitives';
import { LibIllustrationTheme as T } from './libraryIllustrationTheme';

/** 分类：布局 */
export function LibIconCategoryLayout({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={0.95}>
      <defs>
        <linearGradient id={`${id}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="18" cy="34" rx="11" ry="2.5" fill={T.ground} />
      <path d="M6 24 L14 28 L14 34 L6 30 Z" fill={`url(#${id}-a)`} />
      <path d="M14 28 L24 22 L24 32 L14 34 Z" fill={T.primary} opacity={0.88} />
      <path d="M6 24 L14 20 L24 22 L14 28 Z" fill={T.primaryMid} opacity={0.85} />
      <path d="M18 14 L28 18 L28 28 L18 24 Z" fill={T.surface2} stroke={T.borderStrong} strokeWidth="0.5" />
    </LibSvg>
  );
}

/** 分类：输入 */
export function LibIconCategoryDisplay({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1}>
      <defs>
        <linearGradient id={`${id}-t`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primary} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.3" fill={T.ground} />
      <rect x="6" y="12" width="28" height="8" rx="2" fill={T.border} />
      <rect x="6" y="12" width="16" height="8" rx="2" fill={`url(#${id}-t)`} opacity={0.88} />
      <circle cx="22" cy="16" r="3.5" fill={T.white} stroke={T.primaryDark} strokeWidth="0.5" />
      <rect x="8" y="24" width="24" height="6" rx="1.5" fill={T.surface} stroke={T.borderStrong} strokeWidth="0.5" />
      <path d="M10 27h14" stroke={T.border} strokeWidth="1.2" strokeLinecap="round" />
    </LibSvg>
  );
}

/** 分类：数据展示（表格 / 卡片 / 统计等） */
export function LibIconCategoryData({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={0.98}>
      <defs>
        <linearGradient id={`${id}-h`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryLight} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="7" y="11" width="26" height="16" rx="2" fill={T.white} stroke={T.border} strokeWidth="1" />
      <path d="M7 15h26" stroke={T.primary} strokeWidth="2" />
      <path d="M10 19h6v6H10z" fill={`url(#${id}-h)`} opacity={0.95} />
      <path d="M18 19h10M18 23h8M18 27h6" stroke={T.border} strokeWidth="1.2" strokeLinecap="round" />
    </LibSvg>
  );
}

/** 分类：展示 */
export function LibIconCategoryText({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={0.98}>
      <defs>
        <linearGradient id={`${id}-f`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryLight} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="8" y="10" width="24" height="18" rx="2" fill={T.white} stroke={T.border} strokeWidth="1" />
      <path d="M10 14h20v8H10z" fill={`url(#${id}-f)`} opacity={0.9} />
      <circle cx="14" cy="26" r="1.5" fill={T.borderStrong} />
      <path d="M17 26h11" stroke={T.inkMuted} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M17 29h8" stroke={T.border} strokeWidth="1" strokeLinecap="round" />
    </LibSvg>
  );
}

/** 分类：导航 */
export function LibIconCategoryNavigation({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.02}>
      <defs>
        <linearGradient id={`${id}-p`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <path d="M8 24 L20 10 L32 24" fill="none" stroke={`url(#${id}-p)`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="22" r="3" fill={T.white} stroke={T.primaryDark} strokeWidth="0.5" />
      <path d="M18 26h4l-1 6h-2z" fill={T.primaryDark} />
    </LibSvg>
  );
}

/** 图表分区标题 */
export function LibIconCategoryCharts({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={0.92}>
      <defs>
        <linearGradient id={`${id}-b`} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={T.primaryLight} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="11" ry="2.3" fill={T.ground} />
      <path d="M6 28V18h6v10H6zm8 0V12h6v16h-6zm8 0V16h6v12h-6z" fill={`url(#${id}-b)`} opacity={0.95} />
      <path d="M6 18h22" stroke={T.primaryDark} strokeWidth="0.6" opacity={0.35} />
    </LibSvg>
  );
}

export function LibIconBackTop({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.1}>
      <defs>
        <linearGradient id={`${id}-a`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="9" ry="2.2" fill={T.ground} />
      <rect x="12" y="24" width="16" height="6" rx="1.5" fill={T.border} />
      <path d="M20 8l8 12H12z" fill={`url(#${id}-a)`} stroke={T.primaryDark} strokeWidth="0.4" />
      <path d="M20 22v6" stroke={T.white} strokeWidth="2" strokeLinecap="round" opacity={0.5} />
    </LibSvg>
  );
}

export function LibIconProgress({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.06}>
      <defs>
        <linearGradient id={`${id}-p`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primary} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="6" y="16" width="28" height="10" rx="3" fill={T.border} />
      <rect x="6" y="16" width="18" height="10" rx="3" fill={`url(#${id}-p)`} />
      <circle cx="24" cy="21" r="2.5" fill={T.white} stroke={T.primaryDark} strokeWidth="0.4" />
    </LibSvg>
  );
}

export function LibIconUpload({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.05}>
      <defs>
        <linearGradient id={`${id}-c`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <path
        d="M10 22c0-4 3.5-7 8-7 3.8 0 7 2.4 7.8 5.8"
        fill="none"
        stroke={`url(#${id}-c)`}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M22 10l4 6H18z" fill={T.primaryMid} stroke={T.primaryDark} strokeWidth="0.4" />
      <path d="M20 16v10" stroke={T.primaryDark} strokeWidth="2" strokeLinecap="round" />
    </LibSvg>
  );
}

export function LibIconMenuNav({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={0.98}>
      <defs>
        <linearGradient id={`${id}-b`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="6" y="10" width="28" height="20" rx="2" fill={T.surface} stroke={T.borderStrong} strokeWidth="0.8" />
      <rect x="8" y="12" width="24" height="5" rx="1" fill={`url(#${id}-b)`} />
      <path d="M10 20h14M10 24h10M10 28h12" stroke={T.inkMuted} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="26" cy="22" r="2" fill={T.white} stroke={T.primary} strokeWidth="0.4" />
    </LibSvg>
  );
}

export function LibIconSpaceFlex({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.08}>
      <defs>
        <linearGradient id={`${id}-a`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primary} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="5" y="14" width="8" height="12" rx="1.5" fill={`url(#${id}-a)`} opacity={0.92} />
      <rect x="16" y="14" width="8" height="12" rx="1.5" fill={T.barStrong} />
      <rect x="27" y="14" width="8" height="12" rx="1.5" fill={T.surface2} stroke={T.borderStrong} strokeWidth="0.45" />
    </LibSvg>
  );
}

export function LibIconGridCol({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1.05}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="8" y="10" width="6" height="18" rx="1" fill={T.primarySoft} stroke={T.primary} strokeWidth="0.5" />
      <rect x="17" y="10" width="6" height="18" rx="1" fill={T.barMid} stroke={T.primaryDark} strokeWidth="0.5" />
      <rect x="26" y="10" width="6" height="18" rx="1" fill={T.surface2} stroke={T.borderStrong} strokeWidth="0.5" />
    </LibSvg>
  );
}

export function LibIconGridRowStack({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1.02}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="6" y="10" width="28" height="5" rx="1" fill={T.primarySoft} stroke={T.primary} strokeWidth="0.45" />
      <rect x="6" y="17" width="28" height="5" rx="1" fill={T.barMid} stroke={T.primaryDark} strokeWidth="0.45" />
      <rect x="6" y="24" width="28" height="5" rx="1" fill={T.surface2} stroke={T.borderStrong} strokeWidth="0.45" />
    </LibSvg>
  );
}

export function LibIconRouteOutlet({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.06}>
      <defs>
        <linearGradient id={`${id}-r`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="8" y="12" width="24" height="16" rx="2" fill={T.surface2} stroke={T.borderStrong} strokeWidth="0.8" />
      <path d="M12 20h10l-3-4 3-4H12" fill="none" stroke={`url(#${id}-r)`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="26" cy="16" r="2" fill={T.white} stroke={T.primary} strokeWidth="0.4" />
    </LibSvg>
  );
}

export function LibIconSticky({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.12}>
      <defs>
        <linearGradient id={`${id}-p`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <path d="M20 8l4 8h-8z" fill={`url(#${id}-p)`} stroke={T.primaryDark} strokeWidth="0.4" />
      <rect x="6" y="18" width="28" height="14" rx="2" fill={T.primarySoft} stroke={T.primaryMid} strokeWidth="0.6" />
      <path d="M10 24h20M10 28h14" stroke={T.borderStrong} strokeWidth="1.2" strokeLinecap="round" />
    </LibSvg>
  );
}

export function LibIconLayoutShell({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={0.95}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="6" y="10" width="28" height="20" rx="2" fill={T.surface} stroke={T.inkMuted} strokeWidth="1" />
      <rect x="6" y="10" width="28" height="6" rx="2" fill={T.border} />
      <rect x="6" y="18" width="8" height="12" rx="1" fill={T.barMuted} />
      <rect x="16" y="18" width="18" height="12" rx="1" fill={T.surface2} />
    </LibSvg>
  );
}

export function LibIconLayoutHeader({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="6" y="14" width="28" height="18" rx="2" fill={T.surface} stroke={T.borderStrong} strokeWidth="0.8" />
      <rect x="6" y="14" width="28" height="7" rx="2" fill={T.inkDark} />
      <circle cx="12" cy="17.5" r="1.5" fill={T.primaryLight} />
      <path d="M16 18h14" stroke={T.borderStrong} strokeWidth="1" strokeLinecap="round" />
    </LibSvg>
  );
}

export function LibIconLayoutContent({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="6" y="12" width="28" height="20" rx="2" fill={T.white} stroke={T.border} strokeWidth="0.9" />
      <path d="M10 18h20M10 22h16M10 26h18" stroke={T.barMuted} strokeWidth="2" strokeLinecap="round" />
      <rect x="10" y="15" width="20" height="3" rx="0.5" fill={T.primarySoft} opacity={0.95} />
    </LibSvg>
  );
}

export function LibIconLayoutAside({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="6" y="12" width="28" height="20" rx="2" fill={T.surface} stroke={T.borderStrong} strokeWidth="0.8" />
      <rect x="6" y="12" width="9" height="20" rx="2" fill={T.primarySoft} opacity={0.9} />
      <path d="M18 18h12M18 22h10M18 26h12" stroke={T.border} strokeWidth="1.2" strokeLinecap="round" />
    </LibSvg>
  );
}

export function LibIconLayoutFooter({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="6" y="10" width="28" height="20" rx="2" fill={T.surface} stroke={T.borderStrong} strokeWidth="0.8" />
      <rect x="6" y="24" width="28" height="6" rx="2" fill={T.ink} />
      <path d="M10 16h20M10 20h14" stroke={T.barMuted} strokeWidth="1.2" strokeLinecap="round" />
    </LibSvg>
  );
}

export function LibIconInput({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1.1}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="6" y="16" width="28" height="10" rx="2" fill={T.white} stroke={T.inkMuted} strokeWidth="1" />
      <path d="M10 21h12" stroke={T.border} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M26 19l3 2-3 2z" fill={T.borderStrong} />
    </LibSvg>
  );
}

export function LibIconTextarea({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1.02}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="6" y="12" width="28" height="18" rx="2" fill={T.white} stroke={T.inkMuted} strokeWidth="0.9" />
      <path d="M10 17h16M10 21h14M10 25h12" stroke={T.border} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M28 26l2 2" stroke={T.borderStrong} strokeWidth="1" strokeLinecap="round" />
    </LibSvg>
  );
}

export function LibIconInputNumber({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.08}>
      <defs>
        <linearGradient id={`${id}-n`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="6" y="14" width="28" height="14" rx="2" fill={T.white} stroke={T.borderStrong} strokeWidth="0.8" />
      <rect x="11" y="18" width="3" height="7" rx="0.5" fill={`url(#${id}-n)`} />
      <rect x="16" y="16" width="3" height="9" rx="0.5" fill={`url(#${id}-n)`} />
      <rect x="21" y="18" width="3" height="7" rx="0.5" fill={`url(#${id}-n)`} />
      <path d="M28 14v12M28 14h4M28 20h3" stroke={T.inkMuted} strokeWidth="1" strokeLinecap="round" />
    </LibSvg>
  );
}

export function LibIconSwitch({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.15}>
      <defs>
        <linearGradient id={`${id}-o`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primary} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="8" y="16" width="24" height="10" rx="5" fill={`url(#${id}-o)`} />
      <circle cx="26" cy="21" r="4" fill={T.white} stroke={T.primaryDark} strokeWidth="0.4" />
    </LibSvg>
  );
}

export function LibIconSliderControl({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.1}>
      <defs>
        <linearGradient id={`${id}-t`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <line x1="8" y1="21" x2="32" y2="21" stroke={T.barMuted} strokeWidth="3" strokeLinecap="round" />
      <line x1="8" y1="21" x2="22" y2="21" stroke={`url(#${id}-t)`} strokeWidth="3" strokeLinecap="round" />
      <circle cx="22" cy="21" r="4" fill={T.white} stroke={T.primaryDark} strokeWidth="1.2" />
    </LibSvg>
  );
}

export function LibIconRadio({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.12}>
      <defs>
        <linearGradient id={`${id}-r`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primaryLight} />
          <stop offset="100%" stopColor={T.primary} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <circle cx="20" cy="19" r="9" fill={T.white} stroke={T.inkMuted} strokeWidth="1.2" />
      <circle cx="20" cy="19" r="5" fill={`url(#${id}-r)`} />
    </LibSvg>
  );
}

export function LibIconCheckbox({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.1}>
      <defs>
        <linearGradient id={`${id}-c`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="10" y="13" width="14" height="14" rx="3" fill={`url(#${id}-c)`} stroke={T.primaryDark} strokeWidth="0.5" />
      <path d="M13 20l3 3 6-7" fill="none" stroke={T.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </LibSvg>
  );
}

export function LibIconColorPicker({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.05}>
      <defs>
        <linearGradient id={`${id}-hue`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="50%" stopColor={T.primaryMid} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <circle cx="20" cy="18" r="10" fill={`url(#${id}-hue)`} stroke={T.white} strokeWidth="1.5" />
      <path d="M24 24l4 6" stroke={T.inkDark} strokeWidth="2" strokeLinecap="round" />
    </LibSvg>
  );
}

export function LibIconTimePicker({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.05}>
      <defs>
        <linearGradient id={`${id}-f`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.barMuted} />
          <stop offset="100%" stopColor={T.inkMuted} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <circle cx="20" cy="19" r="11" fill={T.white} stroke={`url(#${id}-f)`} strokeWidth="2" />
      <path d="M20 19v-5M20 19l4 3" stroke={T.inkDark} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="20" cy="19" r="1.5" fill={T.inkDark} />
    </LibSvg>
  );
}

export function LibIconTimeRange({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={0.95}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <circle cx="13" cy="18" r="7" fill={T.white} stroke={T.borderStrong} strokeWidth="1.2" />
      <path d="M13 18v-3M13 18l2 1.5" stroke={T.ink} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="27" cy="18" r="7" fill={T.white} stroke={T.borderStrong} strokeWidth="1.2" />
      <path d="M27 18v-3M27 18l2 1.5" stroke={T.ink} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M20 26h2" stroke={T.inkMuted} strokeWidth="1.5" strokeLinecap="round" />
    </LibSvg>
  );
}

export function LibIconImage({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1}>
      <defs>
        <linearGradient id={`${id}-s`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primary} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="7" y="11" width="26" height="18" rx="2" fill={T.white} stroke={T.border} strokeWidth="0.8" />
      <path d="M7 24l7-6 5 5 5-4 8 7v4H7z" fill={`url(#${id}-s)`} opacity={0.88} />
      <circle cx="14" cy="15" r="2" fill={T.white} opacity={0.95} />
    </LibSvg>
  );
}

export function LibIconAvatar({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.08}>
      <defs>
        <linearGradient id={`${id}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.border} />
          <stop offset="100%" stopColor={T.inkMuted} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <circle cx="20" cy="18" r="11" fill={`url(#${id}-a)`} stroke={T.borderStrong} strokeWidth="0.5" />
      <circle cx="20" cy="16" r="4" fill={T.surface} opacity={0.95} />
      <ellipse cx="20" cy="23" rx="5" ry="3" fill={T.surface2} opacity={0.9} />
    </LibSvg>
  );
}

export function LibIconCalendar({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={0.98}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="7" y="12" width="26" height="18" rx="2" fill={T.white} stroke={T.inkMuted} strokeWidth="0.9" />
      <path d="M7 17h26" stroke={T.primary} strokeWidth="3" />
      <path d="M13 10v4M27 10v4" stroke={T.inkMuted} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14" cy="22" r="1.5" fill={T.border} />
      <circle cx="20" cy="22" r="1.5" fill={T.border} />
      <circle cx="26" cy="22" r="1.5" fill={T.border} />
      <circle cx="14" cy="26" r="1.5" fill={T.primaryLight} />
    </LibSvg>
  );
}

/** 通用 ECharts 物料 */
export function LibIconChart({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={0.9}>
      <defs>
        <linearGradient id={`${id}-a`} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={T.primaryLight} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="11" ry="2.3" fill={T.ground} />
      <rect x="5" y="10" width="30" height="20" rx="2" fill={T.panel} opacity={0.95} />
      <path d="M8 26V18h4v8H8zm6 0V14h4v12h-4zm6 0V16h4v10h-4zm6 0V12h4v14h-4z" fill={`url(#${id}-a)`} />
      <path d="M8 26h24" stroke={T.inkDark} strokeWidth="0.8" opacity={0.5} />
    </LibSvg>
  );
}

export function LibIconList({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1.08}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <circle cx="10" cy="15" r="2" fill={T.borderStrong} />
      <path d="M15 15h15" stroke={T.border} strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="21" r="2" fill={T.borderStrong} />
      <path d="M15 21h13" stroke={T.border} strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="27" r="2" fill={T.borderStrong} />
      <path d="M15 27h11" stroke={T.border} strokeWidth="2" strokeLinecap="round" />
    </LibSvg>
  );
}

export function LibIconDynamicList({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1}>
      <defs>
        <linearGradient id={`${id}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="7" y="12" width="26" height="16" rx="2" fill={T.surface} stroke={T.borderStrong} strokeWidth="0.7" />
      <path d="M10 17h14M10 21h12M10 25h10" stroke={T.barMuted} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M26 14l4 4-4 4" fill="none" stroke={`url(#${id}-a)`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </LibSvg>
  );
}

export function LibIconTabs({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1.02}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <path d="M6 14h10v6H6z" fill={T.barMid} stroke={T.primary} strokeWidth="0.5" />
      <path d="M17 16h8v4H17z" fill={T.barMuted} />
      <path d="M26 16h8v4h-8z" fill={T.barMuted} />
      <rect x="6" y="20" width="28" height="12" rx="1" fill={T.white} stroke={T.borderStrong} strokeWidth="0.7" />
      <path d="M10 25h16" stroke={T.border} strokeWidth="1.5" strokeLinecap="round" />
    </LibSvg>
  );
}

export function LibIconCollapse({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="6" y="11" width="28" height="6" rx="1" fill={T.primarySoft} stroke={T.primary} strokeWidth="0.5" />
      <path d="M9 14h3l-1.5 2z" fill={T.primaryDark} />
      <rect x="6" y="18" width="28" height="5" rx="1" fill={T.barMuted} />
      <rect x="6" y="24" width="28" height="5" rx="1" fill={T.barMuted} />
    </LibSvg>
  );
}

export function LibIconSteps({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={0.95}>
      <defs>
        <linearGradient id={`${id}-c`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <circle cx="10" cy="19" r="4" fill={`url(#${id}-c)`} />
      <path d="M14 19h8" stroke={T.borderStrong} strokeWidth="2" />
      <circle cx="22" cy="19" r="4" fill={T.barMuted} stroke={T.borderStrong} strokeWidth="1" />
      <path d="M26 19h6" stroke={T.borderStrong} strokeWidth="2" />
      <circle cx="32" cy="19" r="4" fill={T.barMuted} stroke={T.borderStrong} strokeWidth="1" />
    </LibSvg>
  );
}

export function LibIconSwiper({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1}>
      <defs>
        <linearGradient id={`${id}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <path d="M8 26 L10 12 L22 10 L30 24 Z" fill={`url(#${id}-a)`} opacity={0.92} stroke={T.primaryDark} strokeWidth="0.4" />
      <path d="M12 25 L14 14 L26 12 L32 24 Z" fill={T.white} opacity={0.88} stroke={T.border} strokeWidth="0.5" />
    </LibSvg>
  );
}

export function LibIconTypographyTitle({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1.1}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <path d="M12 28V12h4l4 10 4-10h4v16" fill="none" stroke={T.panel} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </LibSvg>
  );
}

export function LibIconTypographyParagraph({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1.05}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <path d="M8 14h24M8 19h22M8 24h20M8 29h16" stroke={T.ink} strokeWidth="2" strokeLinecap="round" />
    </LibSvg>
  );
}

export function LibIconTypographyText({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1.1}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <path d="M10 18h16M10 22h12M10 26h14" stroke={T.inkMuted} strokeWidth="1.8" strokeLinecap="round" />
    </LibSvg>
  );
}

export function LibIconPopup({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1.05}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="8" y="14" width="24" height="14" rx="2" fill={T.white} stroke={T.inkMuted} strokeWidth="0.9" />
      <path d="M14 28 L20 22 L26 28" fill={T.white} stroke={T.inkMuted} strokeWidth="0.8" />
      <path d="M12 18h14" stroke={T.barMuted} strokeWidth="2" strokeLinecap="round" />
    </LibSvg>
  );
}

export function LibIconTag({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.12}>
      <defs>
        <linearGradient id={`${id}-t`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primaryLight} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <path d="M10 14 L22 14 L30 22 L22 30 L10 30 Z" fill={`url(#${id}-t)`} stroke={T.primaryDark} strokeWidth="0.4" />
      <circle cx="14" cy="22" r="2" fill={T.white} opacity={0.9} />
    </LibSvg>
  );
}

export function LibIconBadge({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1.08}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="10" y="14" width="20" height="14" rx="3" fill={T.barMuted} stroke={T.borderStrong} strokeWidth="0.8" />
      <circle cx="28" cy="14" r="5" fill={T.primaryDark} stroke={T.white} strokeWidth="1.2" />
    </LibSvg>
  );
}

export function LibIconEmpty({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1.05}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="10" y="12" width="20" height="16" rx="2" fill="none" stroke={T.border} strokeWidth="1.5" strokeDasharray="3 2" />
      <path d="M14 20h12M14 24h8" stroke={T.barMuted} strokeWidth="1.5" strokeLinecap="round" />
    </LibSvg>
  );
}

export function LibIconSelect({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.06}>
      <defs>
        <linearGradient id={`${id}-s`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={T.primarySoft} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="6" y="12" width="28" height="10" rx="2" fill={T.white} stroke={T.inkMuted} strokeWidth="0.9" />
      <rect x="6" y="12" width="28" height="10" rx="2" fill={`url(#${id}-s)`} opacity={0.22} />
      <path d="M26 16l4 4-4 4" fill="none" stroke={T.primaryDark} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="8" y="24" width="24" height="8" rx="1" fill={T.surface} stroke={T.border} strokeWidth="0.6" />
    </LibSvg>
  );
}

export function LibIconForm({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={0.98}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="6" y="10" width="28" height="20" rx="2" fill={T.white} stroke={T.inkMuted} strokeWidth="0.9" />
      <path d="M10 15h6M10 15v3" stroke={T.inkDark} strokeWidth="1.2" />
      <rect x="18" y="14" width="12" height="5" rx="1" fill={T.surface2} stroke={T.border} strokeWidth="0.5" />
      <path d="M10 23h6M10 23v3" stroke={T.inkDark} strokeWidth="1.2" />
      <rect x="18" y="22" width="12" height="5" rx="1" fill={T.surface2} stroke={T.border} strokeWidth="0.5" />
    </LibSvg>
  );
}

export function LibIconFormItem({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1.05}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <path d="M8 14h8v4H8z" fill={T.barMuted} />
      <rect x="18" y="13" width="14" height="6" rx="1" fill={T.white} stroke={T.borderStrong} strokeWidth="0.6" />
    </LibSvg>
  );
}

export function LibIconSpin({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={1.08}>
      <defs>
        <linearGradient id={`${id}-s`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primaryLight} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <circle cx="20" cy="19" r="11" fill="none" stroke={T.barMuted} strokeWidth="3" />
      <path
        d="M20 8a11 11 0 0 1 11 11"
        fill="none"
        stroke={`url(#${id}-s)`}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </LibSvg>
  );
}

export function LibIconAlert({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1.08}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <path d="M20 10 L32 28H8Z" fill={T.cautionSoft} stroke={T.caution} strokeWidth="0.8" />
      <path d="M20 16v6M20 24h.01" stroke={T.caution} strokeWidth="2" strokeLinecap="round" />
    </LibSvg>
  );
}

export function LibIconBreadcrumb({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1.05}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="8" y="18" width="6" height="6" rx="1" fill={T.barMid} />
      <path d="M17 22l3 2-3 2" fill="none" stroke={T.borderStrong} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="22" y="19" width="10" height="6" rx="1" fill={T.barMuted} />
    </LibSvg>
  );
}

export function LibIconPagination({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1.02}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="6" y="17" width="8" height="8" rx="1" fill={T.surface2} stroke={T.borderStrong} strokeWidth="0.6" />
      <rect x="16" y="17" width="8" height="8" rx="1" fill={T.primaryMid} />
      <path d="M19 20h2M19 22h2" stroke={T.white} strokeWidth="1" />
      <rect x="26" y="17" width="8" height="8" rx="1" fill={T.surface2} stroke={T.borderStrong} strokeWidth="0.6" />
    </LibSvg>
  );
}

export function LibIconDatePicker({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1}>
      <ellipse cx="20" cy="33" rx="10" ry="2.2" fill={T.ground} />
      <rect x="7" y="13" width="26" height="16" rx="2" fill={T.white} stroke={T.inkMuted} strokeWidth="0.8" />
      <rect x="7" y="13" width="26" height="5" rx="2" fill={T.primarySoft} opacity={0.95} />
      <circle cx="12" cy="22" r="1.5" fill={T.border} />
      <circle cx="20" cy="22" r="1.5" fill={T.primaryMid} />
      <circle cx="28" cy="22" r="1.5" fill={T.border} />
    </LibSvg>
  );
}

export function LibIconModal({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={1}>
      <ellipse cx="20" cy="33" rx="11" ry="2.3" fill={T.ground} />
      <rect x="4" y="14" width="32" height="18" rx="2" fill={T.white} stroke={T.ink} strokeWidth="1.2" />
      <path d="M4 18h32" stroke={T.barMuted} strokeWidth="4" />
      <path d="M28 16l4 4" stroke={T.borderStrong} strokeWidth="1.2" strokeLinecap="round" />
      <rect x="10" y="22" width="20" height="2" rx="0.5" fill={T.barMuted} />
    </LibSvg>
  );
}
