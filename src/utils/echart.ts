import merge from 'lodash/merge';
import type { EChartOptionPreset, EChartSeriesType } from '../constants/echart';

export interface BuildEChartOptionParams {
  chartType: EChartSeriesType;
  dataSource: Array<Record<string, unknown>>;
  xField: string;
  yField: string;
  nameField: string;
  valueField: string;
  openField?: string;
  closeField?: string;
  lowField?: string;
  highField?: string;
  sourceField?: string;
  targetField?: string;
  categoryField?: string;
  childrenField?: string;
  mapName?: string;
  minField?: string;
  q1Field?: string;
  medianField?: string;
  q3Field?: string;
  maxField?: string;
  min?: number;
  max?: number;
  splitNumber?: number;
  sort?: 'ascending' | 'descending';
  smooth: boolean;
  showLegend: boolean;
  optionPreset?: EChartOptionPreset | string;
  optionOverride?: unknown;
}

export const ECHART_FALLBACK_DATA: Array<Record<string, unknown>> = [
  { name: 'Mon', value: 120 },
  { name: 'Tue', value: 200 },
  { name: 'Wed', value: 150 },
  { name: 'Thu', value: 80 },
  { name: 'Fri', value: 70 },
];

const SANKEY_GRAPH_FALLBACK_ROWS: Array<Record<string, unknown>> = [
  { source: '访问', target: '注册', value: 120, category: '流量' },
  { source: '注册', target: '付费', value: 64, category: '转化' },
  { source: '注册', target: '流失', value: 32, category: '流失' },
];

const toFiniteNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
};

const toText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
};

const normalizeOptionOverride = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
};

const normalizeOptionPreset = (value: unknown): EChartOptionPreset => {
  const preset = String(value ?? '').trim();
  if (
    preset === 'cleanGrid'
    || preset === 'darkTheme'
    || preset === 'labelEnhanced'
    || preset === 'smoothAnimation'
  ) {
    return preset;
  }
  return 'none';
};

const createPresetOption = (
  preset: EChartOptionPreset,
  chartType: EChartSeriesType,
): Record<string, unknown> => {
  if (preset === 'cleanGrid') {
    return {
      grid: { left: 28, right: 24, top: 42, bottom: 28, containLabel: true },
    };
  }

  if (preset === 'darkTheme') {
    return {
      backgroundColor: '#0f172a',
      textStyle: { color: '#e2e8f0' },
      legend: { textStyle: { color: '#cbd5e1' } },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.88)',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc' },
      },
      xAxis: { axisLabel: { color: '#cbd5e1' }, axisLine: { lineStyle: { color: '#475569' } } },
      yAxis: { axisLabel: { color: '#cbd5e1' }, splitLine: { lineStyle: { color: '#334155' } } },
    };
  }

  if (preset === 'labelEnhanced') {
    return {
      series: [
        {
          label: { show: true, color: '#1f2937' },
        },
      ],
    };
  }

  if (preset === 'smoothAnimation') {
    return {
      animationDuration: 600,
      animationDurationUpdate: 400,
      animationEasing: 'cubicOut',
      series: [
        {
          animationDuration: 600,
          animationDurationUpdate: 400,
          ...(chartType === 'line' || chartType === 'area'
            ? { smooth: true }
            : {}),
        },
      ],
    };
  }

  return {};
};

export const normalizeEChartDataSource = (value: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(value)) {
    const rows = value.filter((item) => item && typeof item === 'object') as Array<Record<string, unknown>>;
    return rows.length > 0 ? rows : ECHART_FALLBACK_DATA;
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        const rows = parsed.filter((item) => item && typeof item === 'object') as Array<Record<string, unknown>>;
        return rows.length > 0 ? rows : ECHART_FALLBACK_DATA;
      }
    } catch {
      return ECHART_FALLBACK_DATA;
    }
  }

  return ECHART_FALLBACK_DATA;
};

export const buildEChartOption = (params: BuildEChartOptionParams): Record<string, unknown> => {
  const rows = Array.isArray(params.dataSource) && params.dataSource.length > 0
    ? params.dataSource
    : ECHART_FALLBACK_DATA;

  const chartType = params.chartType;

  const pieData = rows.map((row) => ({
    name: toText(row[params.nameField]) || '未命名',
    value: toFiniteNumber(row[params.valueField]),
  }));
  const categoryData = rows.map((row) => toText(row[params.xField]));
  const valueData = rows.map((row) => toFiniteNumber(row[params.yField]));

  let baseOption: Record<string, unknown>;

  if (chartType === 'pie' || chartType === 'donut') {
    baseOption = {
      tooltip: { trigger: 'item' },
      legend: { show: params.showLegend, top: 0 },
      series: [
        {
          type: 'pie',
          radius: chartType === 'donut' ? ['35%', '70%'] : '65%',
          data: pieData,
        },
      ],
    };
  } else if (chartType === 'radar') {
    const maxValue = Math.max(100, ...valueData);
    baseOption = {
      tooltip: { trigger: 'item' },
      legend: { show: params.showLegend, top: 0 },
      radar: {
        indicator: categoryData.map((name) => ({
          name,
          max: Math.ceil(maxValue * 1.2),
        })),
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: valueData,
              name: '数据',
            },
          ],
        },
      ],
    };
  } else if (chartType === 'scatter') {
    baseOption = {
      tooltip: { trigger: 'item' },
      xAxis: {
        type: 'category',
        data: categoryData,
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          type: 'scatter',
          data: valueData,
        },
      ],
    };
  } else if (chartType === 'gauge') {
    const min = typeof params.min === 'number' && Number.isFinite(params.min) ? params.min : 0;
    const max = typeof params.max === 'number' && Number.isFinite(params.max) ? params.max : 100;
    const splitNumber = typeof params.splitNumber === 'number' && Number.isFinite(params.splitNumber)
      ? Math.max(1, Math.round(params.splitNumber))
      : 5;
    baseOption = {
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'gauge',
          min,
          max,
          splitNumber,
          detail: { formatter: '{value}' },
          data: [
            {
              value: valueData[0] ?? 0,
              name: categoryData[0] || '指标',
            },
          ],
        },
      ],
    };
  } else if (chartType === 'funnel') {
    baseOption = {
      tooltip: { trigger: 'item' },
      legend: { show: params.showLegend, top: 0 },
      series: [
        {
          type: 'funnel',
          sort: params.sort === 'ascending' ? 'ascending' : 'descending',
          data: pieData,
        },
      ],
    };
  } else if (chartType === 'candlestick') {
    const openField = params.openField || 'open';
    const closeField = params.closeField || 'close';
    const lowField = params.lowField || 'low';
    const highField = params.highField || 'high';
    const candlestickData = rows.map((row) => [
      toFiniteNumber(row[openField]),
      toFiniteNumber(row[closeField]),
      toFiniteNumber(row[lowField]),
      toFiniteNumber(row[highField]),
    ]);
    baseOption = {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: categoryData },
      yAxis: { type: 'value' },
      series: [{ type: 'candlestick', data: candlestickData }],
    };
  } else if (chartType === 'treemap') {
    const childrenField = params.childrenField || 'children';
    baseOption = {
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'treemap',
          data: rows.map((row) => ({
            name: toText(row[params.nameField]) || '未命名',
            value: toFiniteNumber(row[params.valueField]),
            children: Array.isArray(row[childrenField]) ? row[childrenField] : undefined,
          })),
        },
      ],
    };
  } else if (chartType === 'heatmap') {
    const heatmapData = rows.map((row, index) => ([
      index,
      0,
      toFiniteNumber(row[params.valueField]),
    ]));
    baseOption = {
      tooltip: { position: 'top' },
      xAxis: { type: 'category', data: categoryData },
      yAxis: { type: 'category', data: ['value'] },
      visualMap: {
        min: 0,
        max: Math.max(100, ...valueData),
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
      },
      series: [{ type: 'heatmap', data: heatmapData }],
    };
  } else if (chartType === 'sunburst') {
    const childrenField = params.childrenField || 'children';
    baseOption = {
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'sunburst',
          data: rows.map((row) => ({
            name: toText(row[params.nameField]) || '未命名',
            value: toFiniteNumber(row[params.valueField]),
            children: Array.isArray(row[childrenField]) ? row[childrenField] : undefined,
          })),
          radius: [0, '92%'],
        },
      ],
    };
  } else if (chartType === 'map') {
    const mapName = (params.mapName || 'china').trim() || 'china';
    baseOption = {
      title: {
        text: '地图组件',
        // subtext: `默认地图 ${mapName}，如未注册地图数据请通过 option 覆盖`,
        left: 'center',
      },
      tooltip: { trigger: 'item' },
      visualMap: {
        min: 0,
        max: Math.max(100, ...valueData),
        left: 'left',
        bottom: 24,
        text: ['高', '低'],
        calculable: true,
      },
      series: [
        {
          type: 'map',
          map: mapName,
          roam: true,
          data: pieData,
        },
      ],
    };
  } else if (chartType === 'sankey') {
    const sourceField = params.sourceField || 'source';
    const targetField = params.targetField || 'target';
    const sankeyRows = rows.filter((row) => toText(row[sourceField]) && toText(row[targetField]));
    const effectiveRows = sankeyRows.length > 0 ? sankeyRows : SANKEY_GRAPH_FALLBACK_ROWS;
    baseOption = {
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'sankey',
          data: Array.from(new Set(effectiveRows.flatMap((row) => [toText(row[sourceField]), toText(row[targetField])])))
            .filter(Boolean)
            .map((name) => ({ name })),
          links: effectiveRows.map((row) => ({
            source: toText(row[sourceField]),
            target: toText(row[targetField]),
            value: toFiniteNumber(row[params.valueField]),
          })),
        },
      ],
    };
  } else if (chartType === 'graph') {
    const sourceField = params.sourceField || 'source';
    const targetField = params.targetField || 'target';
    const categoryField = params.categoryField || 'category';
    const graphRows = rows.filter((row) => toText(row[sourceField]) && toText(row[targetField]));
    const effectiveRows = graphRows.length > 0 ? graphRows : SANKEY_GRAPH_FALLBACK_ROWS;
    const categoryIndexMap = new Map<string, number>();
    const categories: Array<{ name: string }> = [];
    const nodes = new Map<string, { name: string; category?: number }>();

    const resolveCategoryIndex = (categoryRaw: unknown): number | undefined => {
      const categoryName = toText(categoryRaw).trim();
      if (!categoryName) {
        return undefined;
      }
      if (!categoryIndexMap.has(categoryName)) {
        categoryIndexMap.set(categoryName, categories.length);
        categories.push({ name: categoryName });
      }
      return categoryIndexMap.get(categoryName);
    };

    effectiveRows.forEach((row) => {
      const source = toText(row[sourceField]);
      const target = toText(row[targetField]);
      const categoryIndex = resolveCategoryIndex(row[categoryField]);
      if (source) nodes.set(source, { name: source, category: categoryIndex });
      if (target) nodes.set(target, { name: target, category: categoryIndex });
    });
    baseOption = {
      tooltip: { trigger: 'item' },
      legend: { show: params.showLegend, top: 0, data: categories.map((item) => item.name) },
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          data: Array.from(nodes.values()),
          categories,
          links: effectiveRows.map((row) => ({
            source: toText(row[sourceField]),
            target: toText(row[targetField]),
            value: toFiniteNumber(row[params.valueField]),
          })),
          force: { repulsion: 180, edgeLength: 100 },
        },
      ],
    };
  } else if (chartType === 'boxplot') {
    const minField = params.minField || 'min';
    const q1Field = params.q1Field || 'q1';
    const medianField = params.medianField || 'median';
    const q3Field = params.q3Field || 'q3';
    const maxField = params.maxField || 'max';
    const boxData = rows.map((row) => ([
      toFiniteNumber(row[minField]),
      toFiniteNumber(row[q1Field]),
      toFiniteNumber(row[medianField]),
      toFiniteNumber(row[q3Field]),
      toFiniteNumber(row[maxField]),
    ]));
    baseOption = {
      tooltip: { trigger: 'item' },
      xAxis: { type: 'category', data: categoryData },
      yAxis: { type: 'value' },
      series: [{ type: 'boxplot', data: boxData }],
    };
  } else if (chartType === 'waterfall') {
    const cumulative = valueData.reduce<number[]>((acc, value) => {
      const previous = acc.length === 0 ? 0 : acc[acc.length - 1];
      acc.push(previous + value);
      return acc;
    }, []);
    const helpData = cumulative.map((total, index) => total - valueData[index]);
    baseOption = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { show: params.showLegend, top: 0 },
      xAxis: { type: 'category', data: categoryData },
      yAxis: { type: 'value' },
      series: [
        { type: 'bar', stack: 'total', itemStyle: { borderColor: 'transparent', color: 'transparent' }, emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } }, data: helpData },
        { type: 'bar', stack: 'total', data: valueData },
      ],
    };
  } else {
    const resolvedSeriesType = chartType === 'area' ? 'line' : chartType;
    baseOption = {
      tooltip: { trigger: 'axis' },
      legend: { show: params.showLegend, top: 0 },
      xAxis: {
        type: 'category',
        data: categoryData,
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          type: resolvedSeriesType,
          smooth: resolvedSeriesType === 'line' ? params.smooth : undefined,
          areaStyle: chartType === 'area' ? {} : undefined,
          data: valueData,
        },
      ],
    };
  }

  const presetOption = createPresetOption(normalizeOptionPreset(params.optionPreset), chartType);
  const overrideOption = normalizeOptionOverride(params.optionOverride);
  return merge({}, baseOption, presetOption, overrideOption);
};
