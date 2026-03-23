export const ECHART_SERIES_TYPES = [
  'line',
  'bar',
  'pie',
  'radar',
  'scatter',
  'area',
  'donut',
  'gauge',
  'funnel',
  'candlestick',
  'treemap',
  'heatmap',
  'sunburst',
  'map',
  'sankey',
  'graph',
  'boxplot',
  'waterfall',
] as const;

export type EChartSeriesType = (typeof ECHART_SERIES_TYPES)[number];

export const ECHART_TYPE_OPTIONS: Array<{ label: string; value: EChartSeriesType }> = [
  { label: '折线图', value: 'line' },
  { label: '柱状图', value: 'bar' },
  { label: '饼图', value: 'pie' },
  { label: '雷达图', value: 'radar' },
  { label: '散点图', value: 'scatter' },
  { label: '面积图', value: 'area' },
  { label: '环形图', value: 'donut' },
  { label: '仪表盘', value: 'gauge' },
  { label: '漏斗图', value: 'funnel' },
  { label: 'K线图', value: 'candlestick' },
  { label: '矩形树图', value: 'treemap' },
  { label: '热力图', value: 'heatmap' },
  { label: '旭日图', value: 'sunburst' },
  { label: '地图', value: 'map' },
  { label: '桑基图', value: 'sankey' },
  { label: '关系图', value: 'graph' },
  { label: '箱线图', value: 'boxplot' },
  { label: '瀑布图', value: 'waterfall' },
];

export const CHART_COMPONENT_TYPE_MAP: Record<string, EChartSeriesType> = {
  EChart: 'line',
  LineChart: 'line',
  BarChart: 'bar',
  PieChart: 'pie',
  RadarChart: 'radar',
  ScatterChart: 'scatter',
  AreaChart: 'area',
  DonutChart: 'donut',
  GaugeChart: 'gauge',
  FunnelChart: 'funnel',
  CandlestickChart: 'candlestick',
  TreemapChart: 'treemap',
  HeatmapChart: 'heatmap',
  SunburstChart: 'sunburst',
  MapChart: 'map',
  SankeyChart: 'sankey',
  GraphChart: 'graph',
  BoxplotChart: 'boxplot',
  WaterfallChart: 'waterfall',
};

export const ECHART_COMPONENT_TYPES = Object.keys(CHART_COMPONENT_TYPE_MAP);

export const ECHART_OPTION_PRESET_OPTIONS = [
  { label: '无', value: 'none' },
  { label: '简洁网格', value: 'cleanGrid' },
  { label: '深色主题', value: 'darkTheme' },
  { label: '标签增强', value: 'labelEnhanced' },
  { label: '平滑动画', value: 'smoothAnimation' },
] as const;

export type EChartOptionPreset = (typeof ECHART_OPTION_PRESET_OPTIONS)[number]['value'];
