import { useId, type ComponentType, type ReactNode } from 'react';
import { LibSvg, type LibraryGlyphProps } from './libraryIllustrationPrimitives';
import { LibIllustrationTheme as T } from './libraryIllustrationTheme';

/** 与表格/日历等物料一致：白底卡片 + 浅描边 + 底部投影（非深色 chart 面板） */

function ChartPlate({ children }: { children: ReactNode }) {
  return (
    <>
      <ellipse cx="20" cy="33" rx="11" ry="2.3" fill={T.ground} />
      <rect x="5" y="10" width="30" height="20" rx="2" fill={T.white} stroke={T.border} strokeWidth="0.85" />
      {children}
    </>
  );
}

/** 通用「图表」：折线 + 柱组合 */
export function LibIconEChartGeneric({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={0.9}>
      <defs>
        <linearGradient id={`${id}-a`} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={T.primaryLight} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ChartPlate>
        <path d="M8 26V18h4v8H8zm6 0V14h4v12h-4zm6 0V16h4v10h-4z" fill={`url(#${id}-a)`} opacity={0.85} />
        <path
          d="M9 24l4-5 4 3 5-6 5 4"
          fill="none"
          stroke={T.primary}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M9 26h22" stroke={T.borderStrong} strokeWidth="0.75" opacity={0.65} />
      </ChartPlate>
    </LibSvg>
  );
}

export function LibIconEChartLine({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={0.9}>
      <ChartPlate>
        <path
          d="M8 24l5-8 5 5 6-9 6 6"
          fill="none"
          stroke={T.primaryMid}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="8" cy="24" r="2" fill={T.white} stroke={T.primaryDark} strokeWidth="0.6" />
        <circle cx="13" cy="16" r="2" fill={T.white} stroke={T.primary} strokeWidth="0.6" />
        <circle cx="18" cy="21" r="2" fill={T.white} stroke={T.primaryMid} strokeWidth="0.6" />
        <circle cx="24" cy="12" r="2" fill={T.white} stroke={T.primaryLight} strokeWidth="0.6" />
        <circle cx="30" cy="18" r="2" fill={T.white} stroke={T.primaryMid} strokeWidth="0.6" />
        <path d="M8 26h24" stroke={T.borderStrong} strokeWidth="0.75" opacity={0.6} />
      </ChartPlate>
    </LibSvg>
  );
}

export function LibIconEChartBar({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={0.9}>
      <defs>
        <linearGradient id={`${id}-b`} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={T.primaryLight} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ChartPlate>
        <path d="M8 26V17h4v9H8zm7 0V13h4v13h-4zm7 0V15h4v11h-4zm7 0V11h4v15h-4z" fill={`url(#${id}-b)`} />
        <path d="M8 26h24" stroke={T.borderStrong} strokeWidth="0.75" opacity={0.65} />
      </ChartPlate>
    </LibSvg>
  );
}

export function LibIconEChartPie({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={0.9}>
      <defs>
        <linearGradient id={`${id}-p`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primaryLight} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ChartPlate>
        <path
          d="M20 20 L20 12 A8 8 0 0 1 28 22 z"
          fill={`url(#${id}-p)`}
          stroke={T.primarySoft}
          strokeWidth="0.4"
        />
        <path d="M20 20 L28 22 A8 8 0 1 1 14 14 z" fill={T.barMid} stroke={T.borderStrong} strokeWidth="0.35" />
        <circle cx="20" cy="20" r="2.2" fill={T.white} stroke={T.border} strokeWidth="0.35" />
      </ChartPlate>
    </LibSvg>
  );
}

export function LibIconEChartRadar({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={0.9}>
      <ChartPlate>
        <path
          d="M20 12l7.6 5.5-2.9 8.9h-9.4l-2.9-8.9z"
          fill="none"
          stroke={T.borderStrong}
          strokeWidth="0.7"
          opacity={0.6}
        />
        <path
          d="M20 15.5l5.2 3.8-2 6.1H16.8l-2-6.1z"
          fill={T.primarySoft}
          stroke={T.primary}
          strokeWidth="0.8"
          opacity={0.95}
        />
        <circle cx="20" cy="12" r="1.2" fill={T.primaryLight} />
        <circle cx="27.6" cy="17.5" r="1.2" fill={T.primaryMid} />
        <circle cx="24.7" cy="26.4" r="1.2" fill={T.primary} />
      </ChartPlate>
    </LibSvg>
  );
}

export function LibIconEChartScatter({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={0.9}>
      <ChartPlate>
        <path d="M8 26h24" stroke={T.borderStrong} strokeWidth="0.65" opacity={0.55} />
        <path d="M8 14v14" stroke={T.borderStrong} strokeWidth="0.65" opacity={0.55} />
        <circle cx="12" cy="22" r="2.5" fill={T.primarySoft} stroke={T.primary} strokeWidth="0.5" />
        <circle cx="17" cy="16" r="2" fill={T.primaryLight} stroke={T.primaryDark} strokeWidth="0.45" />
        <circle cx="24" cy="20" r="2.8" fill={T.primaryMid} stroke={T.white} strokeWidth="0.4" />
        <circle cx="28" cy="14" r="1.6" fill={T.barMuted} stroke={T.borderStrong} strokeWidth="0.4" />
        <circle cx="14" cy="18" r="1.4" fill={T.primary} opacity={0.85} />
        <circle cx="22" cy="24" r="1.8" fill={T.primaryDark} opacity={0.75} />
      </ChartPlate>
    </LibSvg>
  );
}

export function LibIconEChartArea({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={0.9}>
      <defs>
        <linearGradient id={`${id}-f`} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={T.primaryDark} stopOpacity={0.35} />
          <stop offset="100%" stopColor={T.primaryLight} stopOpacity={0.75} />
        </linearGradient>
      </defs>
      <ChartPlate>
        <path d="M8 26V18l5-4 5 6 6-8 6 5v9H8z" fill={`url(#${id}-f)`} />
        <path
          d="M8 18l5-4 5 6 6-8 6 5"
          fill="none"
          stroke={T.primaryMid}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M8 26h24" stroke={T.borderStrong} strokeWidth="0.75" opacity={0.6} />
      </ChartPlate>
    </LibSvg>
  );
}

export function LibIconEChartDonut({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={0.9}>
      <defs>
        <linearGradient id={`${id}-d`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primaryLight} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ChartPlate>
        <circle cx="20" cy="20" r="9" fill="none" stroke={T.barMuted} strokeWidth="3.5" />
        <circle
          cx="20"
          cy="20"
          r="9"
          fill="none"
          stroke={`url(#${id}-d)`}
          strokeWidth="3.5"
          strokeDasharray="28 28"
          transform="rotate(-50 20 20)"
        />
        <circle cx="20" cy="20" r="4.5" fill={T.white} stroke={T.border} strokeWidth="0.35" />
      </ChartPlate>
    </LibSvg>
  );
}

export function LibIconEChartGauge({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={0.9}>
      <ChartPlate>
        <path
          d="M11 26 A9 9 0 0 1 29 26"
          fill="none"
          stroke={T.barMuted}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M11 26 A9 9 0 0 1 24 15"
          fill="none"
          stroke={T.primary}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path d="M20 20l5 6" stroke={T.primaryLight} strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="20" cy="20" r="2" fill={T.white} stroke={T.primaryDark} strokeWidth="0.5" />
      </ChartPlate>
    </LibSvg>
  );
}

export function LibIconEChartFunnel({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={0.9}>
      <ChartPlate>
        <path d="M10 13h20l-3 4H13z" fill={T.primaryLight} stroke={T.primary} strokeWidth="0.35" />
        <path d="M13 18h14l-2.5 4h-9z" fill={T.primaryMid} stroke={T.primaryDark} strokeWidth="0.35" />
        <path d="M15.5 23h9l-2 4h-5z" fill={T.primaryDark} opacity={0.88} />
      </ChartPlate>
    </LibSvg>
  );
}

export function LibIconEChartCandlestick({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={0.9}>
      <ChartPlate>
        <path d="M11 14v14" stroke={T.borderStrong} strokeWidth="1" />
        <rect x="8" y="17" width="6" height="6" rx="0.5" fill={T.positive} />
        <path d="M19 12v16" stroke={T.borderStrong} strokeWidth="1" />
        <rect x="16" y="15" width="6" height="5" rx="0.5" fill={T.risk} opacity={0.9} />
        <path d="M27 16v12" stroke={T.borderStrong} strokeWidth="1" />
        <rect x="24" y="18" width="6" height="7" rx="0.5" fill={T.positive} />
        <path d="M8 26h24" stroke={T.borderStrong} strokeWidth="0.65" opacity={0.55} />
      </ChartPlate>
    </LibSvg>
  );
}

export function LibIconEChartTreemap({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={0.9}>
      <ChartPlate>
        <rect x="8" y="12" width="14" height="11" rx="1" fill={T.primarySoft} stroke={T.primary} strokeWidth="0.5" />
        <rect x="23" y="12" width="9" height="5" rx="0.8" fill={T.primaryMid} stroke={T.primaryDark} strokeWidth="0.4" />
        <rect x="23" y="18" width="9" height="5" rx="0.8" fill={T.primaryLight} stroke={T.borderStrong} strokeWidth="0.4" />
        <rect x="8" y="24" width="9" height="4" rx="0.6" fill={T.barMid} stroke={T.border} strokeWidth="0.4" />
        <rect x="18" y="24" width="14" height="4" rx="0.6" fill={T.primary} opacity={0.65} stroke={T.white} strokeWidth="0.35" />
      </ChartPlate>
    </LibSvg>
  );
}

export function LibIconEChartHeatmap({ size = 24, className }: LibraryGlyphProps) {
  const cells = [
    [0.3, 0.55, 0.85, 0.4],
    [0.65, 0.35, 0.7, 0.5],
    [0.45, 0.9, 0.25, 0.75],
  ];
  return (
    <LibSvg size={size} className={className} contentScale={0.9}>
      <ChartPlate>
        {cells.flatMap((row, ri) =>
          row.map((op, ci) => (
            <rect
              key={`${ri}-${ci}`}
              x={8 + ci * 6}
              y={13 + ri * 5.5}
              width="5"
              height="4.5"
              rx="0.6"
              fill={T.primary}
              opacity={0.25 + op * 0.65}
              stroke={T.white}
              strokeWidth="0.45"
            />
          )),
        )}
      </ChartPlate>
    </LibSvg>
  );
}

export function LibIconEChartSunburst({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={0.9}>
      <defs>
        <linearGradient id={`${id}-s`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.primaryLight} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ChartPlate>
        <path
          d="M20 20 L20 11 A9 9 0 0 1 29 24 z"
          fill={T.primarySoft}
          stroke={T.white}
          strokeWidth="0.5"
        />
        <path d="M20 20 L29 24 A9 9 0 0 1 14 29 z" fill={T.primaryMid} stroke={T.white} strokeWidth="0.5" />
        <path d="M20 20 L14 29 A9 9 0 0 1 11 18 z" fill={`url(#${id}-s)`} stroke={T.white} strokeWidth="0.5" />
        <circle cx="20" cy="20" r="4" fill={T.white} stroke={T.borderStrong} strokeWidth="0.55" />
      </ChartPlate>
    </LibSvg>
  );
}

export function LibIconEChartMap({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={0.9}>
      <ChartPlate>
        <path
          d="M12 22l3-7 5 2 4-4 4 6-2 5-6 1-8-3z"
          fill={T.primarySoft}
          stroke={T.primary}
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        <path d="M18 17l2 2-1 3" fill="none" stroke={T.primaryDark} strokeWidth="0.6" opacity={0.6} />
        <circle cx="22" cy="19" r="1.8" fill={T.risk} opacity={0.85} />
      </ChartPlate>
    </LibSvg>
  );
}

export function LibIconEChartSankey({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={0.9}>
      <ChartPlate>
        <rect x="8" y="13" width="4" height="5" rx="0.5" fill={T.primaryLight} stroke={T.border} strokeWidth="0.25" />
        <rect x="8" y="21" width="4" height="5" rx="0.5" fill={T.primaryMid} stroke={T.border} strokeWidth="0.25" />
        <rect x="28" y="14" width="4" height="4" rx="0.5" fill={T.primarySoft} stroke={T.border} strokeWidth="0.25" />
        <rect x="28" y="21" width="4" height="5" rx="0.5" fill={T.primaryDark} opacity={0.85} stroke={T.white} strokeWidth="0.25" />
        <path
          d="M12 15.5C18 15 18 20 22 20s4 5 10 4.5"
          fill="none"
          stroke={T.primary}
          strokeWidth="2.5"
          opacity={0.55}
        />
        <path
          d="M12 23.5C17 24 19 18 24 18s5-3 10-2.5"
          fill="none"
          stroke={T.primaryLight}
          strokeWidth="2.2"
          opacity={0.5}
        />
      </ChartPlate>
    </LibSvg>
  );
}

export function LibIconEChartGraph({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={0.9}>
      <ChartPlate>
        <path d="M14 18l6-4 6 5" stroke={T.borderStrong} strokeWidth="1" opacity={0.7} />
        <path d="M14 18l4 7" stroke={T.borderStrong} strokeWidth="1" opacity={0.7} />
        <path d="M20 14l4 11" stroke={T.borderStrong} strokeWidth="1" opacity={0.7} />
        <path d="M26 19l2 6" stroke={T.borderStrong} strokeWidth="1" opacity={0.7} />
        <circle cx="14" cy="18" r="2.8" fill={T.primarySoft} stroke={T.primary} strokeWidth="0.6" />
        <circle cx="20" cy="14" r="2.8" fill={T.primaryLight} stroke={T.primaryDark} strokeWidth="0.6" />
        <circle cx="26" cy="19" r="2.8" fill={T.primaryMid} stroke={T.primary} strokeWidth="0.6" />
        <circle cx="18" cy="25" r="2.8" fill={T.barMuted} stroke={T.borderStrong} strokeWidth="0.6" />
        <circle cx="28" cy="25" r="2.5" fill={T.primaryDark} opacity={0.75} stroke={T.white} strokeWidth="0.4" />
      </ChartPlate>
    </LibSvg>
  );
}

export function LibIconEChartBoxplot({ size = 24, className }: LibraryGlyphProps) {
  return (
    <LibSvg size={size} className={className} contentScale={0.9}>
      <ChartPlate>
        <path d="M20 12v16" stroke={T.borderStrong} strokeWidth="1" strokeDasharray="2 1" />
        <path d="M16 14h8" stroke={T.borderStrong} strokeWidth="1" />
        <rect x="14" y="17" width="12" height="7" rx="0.8" fill={T.primarySoft} stroke={T.primary} strokeWidth="0.7" />
        <path d="M17 21h6" stroke={T.primaryDark} strokeWidth="1.2" />
        <path d="M16 24h8" stroke={T.borderStrong} strokeWidth="1" />
        <path d="M8 26h24" stroke={T.borderStrong} strokeWidth="0.65" opacity={0.55} />
      </ChartPlate>
    </LibSvg>
  );
}

export function LibIconEChartWaterfall({ size = 24, className }: LibraryGlyphProps) {
  const id = useId().replace(/:/g, '');
  return (
    <LibSvg size={size} className={className} contentScale={0.9}>
      <defs>
        <linearGradient id={`${id}-w`} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={T.primaryLight} />
          <stop offset="100%" stopColor={T.primaryDark} />
        </linearGradient>
      </defs>
      <ChartPlate>
        <path d="M8 26h24" stroke={T.borderStrong} strokeWidth="0.75" opacity={0.6} />
        <rect x="8" y="20" width="5" height="6" rx="0.5" fill={T.barMuted} stroke={T.borderStrong} strokeWidth="0.4" />
        <rect x="14" y="16" width="5" height="10" rx="0.5" fill={`url(#${id}-w)`} opacity={0.85} />
        <rect x="20" y="18" width="5" height="8" rx="0.5" fill={T.primaryMid} opacity={0.75} />
        <rect x="26" y="12" width="5" height="14" rx="0.5" fill={T.primaryDark} opacity={0.7} />
        <path d="M13 20v-4h6M19 16v2h6M25 18v-2h5" stroke={T.border} strokeWidth="0.5" strokeDasharray="1 1" opacity={0.8} />
      </ChartPlate>
    </LibSvg>
  );
}

/** 物料面板：组件 type → 插画（与 {@link CHART_COMPONENT_TYPE_MAP} 键一致） */
export const LIBRARY_ECHART_COMPONENT_ICONS: Record<string, ComponentType<LibraryGlyphProps>> = {
  EChart: LibIconEChartGeneric,
  LineChart: LibIconEChartLine,
  BarChart: LibIconEChartBar,
  PieChart: LibIconEChartPie,
  RadarChart: LibIconEChartRadar,
  ScatterChart: LibIconEChartScatter,
  AreaChart: LibIconEChartArea,
  DonutChart: LibIconEChartDonut,
  GaugeChart: LibIconEChartGauge,
  FunnelChart: LibIconEChartFunnel,
  CandlestickChart: LibIconEChartCandlestick,
  TreemapChart: LibIconEChartTreemap,
  HeatmapChart: LibIconEChartHeatmap,
  SunburstChart: LibIconEChartSunburst,
  MapChart: LibIconEChartMap,
  SankeyChart: LibIconEChartSankey,
  GraphChart: LibIconEChartGraph,
  BoxplotChart: LibIconEChartBoxplot,
  WaterfallChart: LibIconEChartWaterfall,
};
