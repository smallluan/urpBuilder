import React, { useCallback, useEffect, useState } from 'react';
import { Button, Collapse, ColorPicker, Dialog, Empty, Input, InputNumber, MessagePlugin, Popup, Select, Slider, Space, Switch, Table, Tag, Tabs, Typography, Row, Textarea } from 'tdesign-react';
import { HelpCircleIcon, LayoutIcon } from 'tdesign-icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBuilderAccess, useBuilderContext } from '../context/BuilderContext';
import { useBuilderThemeStore } from '../theme/builderThemeStore';
import type { UiTreeNode } from '../store/types';
import NodeStyleTab from './NodeStyleTab';
import { isSlotNode } from '../utils/slot';
import AssetPickerModal from './AssetPickerModal';
import IconPickerModal from './IconPickerModal';
import { findNodePathByKey } from '../utils/tree';
import {
  GRID_BREAKPOINTS,
  getBreakpointByWidth,
  normalizeResponsiveConfig,
  resolveBuilderViewportWidth,
  type GridBreakpoint,
  type GridResponsiveConfig,
} from '../utils/gridResponsive';
import type { IconInitialFilterKey, IconQuickFilterKey } from '../../constants/iconRegistry';
import componentCatalog from '../../config/componentCatalog';
import { createDefaultTabsList, normalizeTabsList } from '../utils/tabs';
import { loadCustomComponentDetail, resolveExposedPropSchemas } from '../../utils/customComponentRuntime';
import { getPropSection, sortSectionKeys } from '../utils/propConfigGroups';
import type { EChartSeriesType } from '../../constants/echart';
import { CHART_COMPONENT_TYPE_MAP } from '../../constants/echart';
import { useTeam } from '../../team/context';
import { getDataConstantList, type DataConstantRecord } from '../../api/dataConstant';
import { getDataTableList, type DataTableRecord } from '../../api/dataTable';
import { getCloudFunctionList, type CloudFunctionRecord } from '../../api/cloudFunction';
import type { CodeNodeData } from '../../types/flow';
import type { ComponentDataSourceType } from '../../types/dataSource';
import { normalizeDataSourceConfig } from '../../types/dataSource';
import { findComponentFlowNodeIdsForUiKey, listUpstreamCodeNodesForComponentFlow } from '../flow/flowDynamicListUpstream';
import { getMediaAssetUrlFromDrop } from '../../utils/mediaAssetDrag';
import {
  clearCodeWorkbenchResult,
  createCodeWorkbenchSessionId,
  readCodeWorkbenchResult,
  writeCodeWorkbenchPayload,
} from './codeEditor/workbenchSession';
import {
  isMenuContainerNodeType,
  isMenuItemNodeType,
  isMenuSubmenuNodeType,
  readMenuDslBoundValue,
  resolveMenuItemDslValue,
  resolveMenuSubmenuDslValue,
} from '../utils/menuDslKeys';

const toJsonCodeString = (value: unknown): string => {
  if (typeof value === 'string') {
    if (!value.trim()) {
      return '[]';
    }
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  if (Array.isArray(value) || (value && typeof value === 'object')) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[]';
    }
  }

  return '[]';
};

type EditType =
  | 'switch'
  | 'input'
  | 'inputNumber'
  | 'select'
  | 'menuSubmenuMultiSelect'
  | 'menuMenuItemSingleSelect'
  | 'iconSelect'
  | 'swiperImages'
  | 'tabsConfig'
  | 'tableColumnsConfig'
  | 'tableDataConfig'
  | 'dataSourceConfig'
  | 'jsonCode';

interface SwiperImageRow {
  id: string;
  src: string;
  fallback: string;
  lazy: boolean;
  objectFit: string;
  objectPosition: string;
}

/** 素材库选择目标：组件属性或轮播图某一行的 src/fallback */
type AssetPickerTarget =
  | { kind: 'prop'; propKey: string }
  | { kind: 'swiper'; rowId: string; field: 'src' | 'fallback' };

interface TabsRow {
  id: string;
  value: string;
  label: string;
  disabled: boolean;
  draggable: boolean;
  removable: boolean;
  lazy: boolean;
  destroyOnHide: boolean;
}

interface TableColumnRow {
  id: string;
  colKey: string;
  title: string;
  width?: number;
  align: 'left' | 'center' | 'right';
  ellipsis: boolean;
  sortType: '' | 'all' | 'asc' | 'desc';
  fixed: '' | 'left' | 'right';
}

interface DataSourceConfigDraft {
  type: ComponentDataSourceType;
  constantId: string;
  tableId: string;
  functionId: string;
  flowCodeNodeId: string;
  page: number;
  pageSize: number;
  responsePath: string;
  payloadText: string;
}

const SWIPER_FIT_OPTIONS = ['contain', 'cover', 'fill', 'none', 'scale-down'].map((item) => ({
  label: item,
  value: item,
}));

const SWIPER_POSITION_OPTIONS = ['left', 'center', 'right', 'top', 'bottom'].map((item) => ({
  label: item,
  value: item,
}));

const CHART_PROP_WHITELIST: Record<string, Set<string>> = {
  EChart: new Set([
    'chartType',
    'dataSource',
    'dataSourceConfig',
    'xField',
    'yField',
    'nameField',
    'valueField',
    'smooth',
    'openField',
    'closeField',
    'lowField',
    'highField',
    'sourceField',
    'targetField',
    'categoryField',
    'childrenField',
    'mapName',
    'minField',
    'q1Field',
    'medianField',
    'q3Field',
    'maxField',
    'min',
    'max',
    'splitNumber',
    'sort',
    'showLegend',
    'height',
    'optionPreset',
    'option',
  ]),
  LineChart: new Set(['dataSource', 'dataSourceConfig', 'xField', 'yField', 'smooth', 'showLegend', 'height', 'optionPreset', 'option']),
  BarChart: new Set(['dataSource', 'dataSourceConfig', 'xField', 'yField', 'showLegend', 'height', 'optionPreset', 'option']),
  AreaChart: new Set(['dataSource', 'dataSourceConfig', 'xField', 'yField', 'smooth', 'showLegend', 'height', 'optionPreset', 'option']),
  ScatterChart: new Set(['dataSource', 'dataSourceConfig', 'xField', 'yField', 'showLegend', 'height', 'optionPreset', 'option']),
  PieChart: new Set(['dataSource', 'dataSourceConfig', 'nameField', 'valueField', 'showLegend', 'height', 'optionPreset', 'option']),
  DonutChart: new Set(['dataSource', 'dataSourceConfig', 'nameField', 'valueField', 'showLegend', 'height', 'optionPreset', 'option']),
  RadarChart: new Set(['dataSource', 'dataSourceConfig', 'xField', 'yField', 'showLegend', 'height', 'optionPreset', 'option']),
  GaugeChart: new Set(['dataSource', 'dataSourceConfig', 'nameField', 'valueField', 'min', 'max', 'splitNumber', 'height', 'optionPreset', 'option']),
  FunnelChart: new Set(['dataSource', 'dataSourceConfig', 'nameField', 'valueField', 'showLegend', 'height', 'optionPreset', 'option']),
  CandlestickChart: new Set(['dataSource', 'dataSourceConfig', 'xField', 'openField', 'closeField', 'lowField', 'highField', 'showLegend', 'height', 'optionPreset', 'option']),
  TreemapChart: new Set(['dataSource', 'dataSourceConfig', 'nameField', 'valueField', 'childrenField', 'height', 'optionPreset', 'option']),
  HeatmapChart: new Set(['dataSource', 'dataSourceConfig', 'xField', 'valueField', 'showLegend', 'height', 'optionPreset', 'option']),
  SunburstChart: new Set(['dataSource', 'dataSourceConfig', 'nameField', 'valueField', 'childrenField', 'height', 'optionPreset', 'option']),
  MapChart: new Set(['dataSource', 'dataSourceConfig', 'nameField', 'valueField', 'mapName', 'showLegend', 'height', 'optionPreset', 'option']),
  SankeyChart: new Set(['dataSource', 'dataSourceConfig', 'sourceField', 'targetField', 'valueField', 'showLegend', 'height', 'optionPreset', 'option']),
  GraphChart: new Set(['dataSource', 'dataSourceConfig', 'sourceField', 'targetField', 'nameField', 'valueField', 'categoryField', 'showLegend', 'height', 'optionPreset', 'option']),
  BoxplotChart: new Set(['dataSource', 'dataSourceConfig', 'xField', 'minField', 'q1Field', 'medianField', 'q3Field', 'maxField', 'showLegend', 'height', 'optionPreset', 'option']),
  WaterfallChart: new Set(['dataSource', 'dataSourceConfig', 'xField', 'yField', 'showLegend', 'height', 'optionPreset', 'option']),
};

const CHART_TYPE_PROP_WHITELIST: Record<EChartSeriesType, Set<string>> = {
  line: new Set(['xField', 'yField', 'smooth']),
  bar: new Set(['xField', 'yField']),
  pie: new Set(['nameField', 'valueField']),
  radar: new Set(['xField', 'yField']),
  scatter: new Set(['xField', 'yField']),
  area: new Set(['xField', 'yField', 'smooth']),
  donut: new Set(['nameField', 'valueField']),
  gauge: new Set(['nameField', 'valueField', 'min', 'max', 'splitNumber']),
  funnel: new Set(['nameField', 'valueField', 'sort']),
  candlestick: new Set(['xField', 'openField', 'closeField', 'lowField', 'highField']),
  treemap: new Set(['nameField', 'valueField', 'childrenField']),
  heatmap: new Set(['xField', 'valueField']),
  sunburst: new Set(['nameField', 'valueField', 'childrenField']),
  map: new Set(['nameField', 'valueField', 'mapName']),
  sankey: new Set(['sourceField', 'targetField', 'valueField']),
  graph: new Set(['sourceField', 'targetField', 'valueField', 'categoryField']),
  boxplot: new Set(['xField', 'minField', 'q1Field', 'medianField', 'q3Field', 'maxField']),
  waterfall: new Set(['xField', 'yField']),
};

const COMMON_CHART_PROPS = new Set([
  'chartType',
  'dataSource',
  'dataSourceConfig',
  'showLegend',
  'height',
  'optionPreset',
  'option',
]);

const getChartVisibleProps = (componentType?: string): Set<string> | null => {
  if (!componentType) {
    return null;
  }
  return CHART_PROP_WHITELIST[componentType] ?? null;
};

const normalizeChartType = (value: unknown): EChartSeriesType | null => {
  if (
    value === 'line'
    || value === 'bar'
    || value === 'pie'
    || value === 'radar'
    || value === 'scatter'
    || value === 'area'
    || value === 'donut'
    || value === 'gauge'
    || value === 'funnel'
    || value === 'candlestick'
    || value === 'treemap'
    || value === 'heatmap'
    || value === 'sunburst'
    || value === 'map'
    || value === 'sankey'
    || value === 'graph'
    || value === 'boxplot'
    || value === 'waterfall'
  ) {
    return value;
  }
  return null;
};

const createSwiperImageRow = (seed?: Partial<SwiperImageRow>): SwiperImageRow => ({
  id: `swiper-image-${Date.now()}-${Math.round(Math.random() * 10000)}`,
  src: String(seed?.src ?? ''),
  fallback: String(seed?.fallback ?? ''),
  lazy: typeof seed?.lazy === 'boolean' ? seed.lazy : true,
  objectFit: String(seed?.objectFit ?? 'cover'),
  objectPosition: String(seed?.objectPosition ?? 'center'),
});

const normalizeSwiperImageRows = (value: unknown): SwiperImageRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => !!item && typeof item === 'object')
    .map((item) => createSwiperImageRow(item as Partial<SwiperImageRow>));
};

const createTabsRow = (seed?: Partial<TabsRow>): TabsRow => ({
  id: `tabs-row-${Date.now()}-${Math.round(Math.random() * 10000)}`,
  value: String(seed?.value ?? ''),
  label: String(seed?.label ?? ''),
  disabled: Boolean(seed?.disabled),
  draggable: typeof seed?.draggable === 'boolean' ? seed.draggable : true,
  removable: Boolean(seed?.removable),
  lazy: Boolean(seed?.lazy),
  destroyOnHide: typeof seed?.destroyOnHide === 'boolean' ? seed.destroyOnHide : true,
});

const normalizeTabsRows = (value: unknown): TabsRow[] => {
  const list = normalizeTabsList(value);
  return list.map((item) => createTabsRow({
    value: String(item.value),
    label: item.label,
    disabled: item.disabled,
    draggable: item.draggable,
    removable: item.removable,
    lazy: item.lazy,
    destroyOnHide: item.destroyOnHide,
  }));
};

const createTableColumnRow = (seed?: Partial<TableColumnRow>): TableColumnRow => {
  const widthValue =
    typeof seed?.width === 'number' && Number.isFinite(seed.width) && seed.width > 0
      ? Math.round(seed.width)
      : undefined;

  const alignValue = seed?.align === 'center' || seed?.align === 'right' ? seed.align : 'left';
  const sortTypeValue =
    seed?.sortType === 'all' || seed?.sortType === 'asc' || seed?.sortType === 'desc' ? seed.sortType : '';
  const fixedValue = seed?.fixed === 'left' || seed?.fixed === 'right' ? seed.fixed : '';

  return {
    id: `table-column-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    colKey: String(seed?.colKey ?? ''),
    title: String(seed?.title ?? ''),
    width: widthValue,
    align: alignValue,
    ellipsis: typeof seed?.ellipsis === 'boolean' ? seed.ellipsis : true,
    sortType: sortTypeValue,
    fixed: fixedValue,
  };
};

const normalizeTableColumnRows = (value: unknown): TableColumnRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => !!item && typeof item === 'object')
    .map((item) => createTableColumnRow(item as Partial<TableColumnRow>));
};

const normalizeDataSourceConfigDraft = (value: unknown): DataSourceConfigDraft => {
  const config = normalizeDataSourceConfig(value);
  const payloadText = (() => {
    try {
      return JSON.stringify(config.payload ?? {}, null, 2);
    } catch {
      return '{}';
    }
  })();

  return {
    type: config.type,
    constantId: config.constantId ?? '',
    tableId: config.tableId ?? '',
    functionId: config.functionId ?? '',
    flowCodeNodeId: config.flowCodeNodeId ?? '',
    page: config.page ?? 1,
    pageSize: config.pageSize ?? 20,
    responsePath: config.responsePath ?? 'output',
    payloadText: payloadText || '{}',
  };
};

interface ComponentPropSchema {
  name?: string;
  value?: unknown;
  /** 配置面板分组标题；未设置时按 propKey 自动归类 */
  group?: string;
  editType?: EditType | string;
  editInput?: EditType | string;
  payload?: {
    options?: Array<string | number | { label: string; value: string | number }>;
    min?: number;
    max?: number;
  };
}

const PROGRESS_COLOR_PROP_KEYS = new Set(['color', 'trackColor']);

const GRID_PRESET_OPTIONS = [
  { label: '1/4', value: 3 },
  { label: '1/3', value: 4 },
  { label: '1/2', value: 6 },
  { label: '2/3', value: 8 },
  { label: '全宽', value: 12 },
];

const BREAKPOINT_LABEL_MAP: Record<GridBreakpoint, string> = {
  xs: 'xs (<768)',
  sm: 'sm (≥768)',
  md: 'md (≥992)',
  lg: 'lg (≥1200)',
  xl: 'xl (≥1400)',
  xxl: 'xxl (≥1880)',
};

const BREAKPOINT_DEVICE_MAP: Record<GridBreakpoint, string> = {
  xs: '移动端',
  sm: '大屏手机',
  md: '平板',
  lg: '笔记本',
  xl: '桌面端',
  xxl: '超宽屏',
};

const clampSpan = (value: number) => Math.max(0, Math.min(12, Math.round(value)));
const clampOffset = (value: number) => Math.max(0, Math.min(11, Math.round(value)));

interface ListBindingMapping {
  prop: string;
  field: string;
}

interface ListBindingDraftRow extends ListBindingMapping {
  id: string;
}

const createListBindingDraftRow = (seed?: Partial<ListBindingMapping>): ListBindingDraftRow => ({
  id: `list-binding-${Date.now()}-${Math.round(Math.random() * 10000)}`,
  prop: String(seed?.prop ?? ''),
  field: String(seed?.field ?? ''),
});

const normalizeListBindingMappings = (value: unknown): ListBindingMapping[] => {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const raw = value as {
    prop?: unknown;
    field?: unknown;
    mappings?: Array<{ prop?: unknown; field?: unknown }>;
  };

  if (Array.isArray(raw.mappings)) {
    return raw.mappings
      .map((item) => ({
        prop: String(item?.prop ?? '').trim(),
        field: String(item?.field ?? '').trim(),
      }))
      .filter((item) => item.prop && item.field);
  }

  const prop = String(raw.prop ?? '').trim();
  const field = String(raw.field ?? '').trim();
  if (!prop || !field) {
    return [];
  }
  return [{ prop, field }];
};

const LIST_META_PROP_KEYS = new Set([
  'titleField',
  'descriptionField',
  'imageField',
  'actionField',
]);

const LIST_ITEM_META_PROP_KEYS = new Set([
  'showImage',
  'showDescription',
  'showAction',
  'actionTheme',
  'actionVariant',
  'actionSize',
]);

const MENU_ICON_COMPAT_NODE_TYPES = new Set(['Menu.Item', 'Menu.Submenu', 'antd.Menu.Item', 'antd.Menu.SubMenu']);

/**
 * 收集 Menu / HeadMenu / antd.Menu / antd.HeadMenu 下所有「子菜单」的标识，供展开项多选。
 * 标识优先取 props.value，空则回退节点 key（与运行时 getMenuValueArrayProp 一致）。
 */
const collectMenuSubmenuValueOptions = (menuRoot: UiTreeNode): { label: string; value: string | number }[] => {
  const out: { label: string; value: string | number }[] = [];
  const visit = (nodes: UiTreeNode[] | undefined) => {
    if (!nodes?.length) {
      return;
    }
    for (const node of nodes) {
      if (isMenuSubmenuNodeType(node.type)) {
        const resolved = resolveMenuSubmenuDslValue(node);
        const titleRaw = readMenuDslBoundValue(node, 'title');
        const title =
          typeof titleRaw === 'string' && titleRaw.trim()
            ? titleRaw.trim()
            : String(node.label ?? '').trim() || String(resolved);
        out.push({
          label: `${title} · ${String(resolved)}`,
          value: resolved,
        });
      }
      if (node.children?.length) {
        visit(node.children);
      }
    }
  };
  visit(menuRoot.children);
  return out;
};

/**
 * 收集菜单容器下所有「菜单项」标识，供激活项单选（含 antd 镜像类型）。
 */
const collectMenuItemValueOptions = (menuRoot: UiTreeNode): { label: string; value: string | number }[] => {
  const out: { label: string; value: string | number }[] = [];
  const seen = new Set<string | number>();
  const visit = (nodes: UiTreeNode[] | undefined) => {
    if (!nodes?.length) {
      return;
    }
    for (const node of nodes) {
      if (isMenuItemNodeType(node.type)) {
        const resolved = resolveMenuItemDslValue(node);
        if (!seen.has(resolved)) {
          seen.add(resolved);
          const contentRaw = readMenuDslBoundValue(node, 'content');
          const content =
            typeof contentRaw === 'string' && contentRaw.trim()
              ? contentRaw.trim()
              : String(node.label ?? '').trim() || String(resolved);
          out.push({
            label: `${content} · ${String(resolved)}`,
            value: resolved,
          });
        }
      }
      if (node.children?.length) {
        visit(node.children);
      }
    }
  };
  visit(menuRoot.children);
  return out;
};

/** 与 propAccessors.getMenuValueArrayProp 对齐，将配置里存的 string / string[] 规范为数组 */
const normalizeMenuExpandedStoredValue = (raw: unknown): (string | number)[] => {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'number' && Number.isFinite(item)) {
          return item;
        }
        if (typeof item === 'string') {
          const text = item.trim();
          if (!text) {
            return undefined;
          }
          const parsed = Number(text);
          return Number.isFinite(parsed) ? parsed : text;
        }
        return undefined;
      })
      .filter((item): item is string | number => typeof item !== 'undefined');
  }
  if (typeof raw === 'string') {
    return raw
      .split(/\r?\n|,|，/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const parsed = Number(item);
        return Number.isFinite(parsed) ? parsed : item;
      });
  }
  return [];
};

/** 与 propAccessors.getMenuValueProp 对齐，将配置里存的值规范为 string | number | undefined */
const normalizeMenuItemStoredValue = (raw: unknown): string | number | undefined => {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) {
      return undefined;
    }
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : text;
  }
  return undefined;
};

const COMMON_PROP_PRIORITY_MAP = new Map<string, number>([
  ['visible', 9],
  ['className', 10],
  ['name', 11],
  ['type', 12],
  ['placeholder', 13],
  ['size', 14],
  ['status', 15],
  ['disabled', 16],
  ['readonly', 17],
  ['readOnly', 17],
  ['clearable', 18],
  ['borderless', 19],
]);

const getCommonPropPriority = (propKey: string): number | undefined => {
  if (propKey === 'controlled') {
    return 0;
  }

  if (propKey === 'value') {
    return 1;
  }

  if (propKey === 'defaultValue') {
    return 2;
  }

  return COMMON_PROP_PRIORITY_MAP.get(propKey);
};

const getEditTypeSortRank = (editType: EditType) => {
  if (editType === 'input') {
    return 1;
  }

  if (editType === 'select' || editType === 'menuSubmenuMultiSelect' || editType === 'menuMenuItemSingleSelect') {
    return 2;
  }

  if (editType === 'inputNumber') {
    return 3;
  }

  if (editType === 'switch') {
    return 9;
  }

  return 4;
};

const resolveEditType = (schema: ComponentPropSchema): EditType => {
  const type = (schema.editType ?? schema.editInput) as EditType | string | undefined;
  if (
    type === 'switch'
    || type === 'input'
    || type === 'inputNumber'
    || type === 'select'
    || type === 'menuSubmenuMultiSelect'
    || type === 'menuMenuItemSingleSelect'
    || type === 'iconSelect'
    || type === 'swiperImages'
    || type === 'tabsConfig'
    || type === 'tableColumnsConfig'
    || type === 'tableDataConfig'
    || type === 'dataSourceConfig'
    || type === 'jsonCode'
  ) {
    return type;
  }

  return typeof schema.value === 'number' ? 'inputNumber' : 'input';
};

/** 菜单容器：展开项多选、激活项单选（旧数据里可能仍是 input） */
const resolveMenuPropEditType = (
  propKey: string,
  nodeType: string | undefined,
  schema: ComponentPropSchema,
): EditType => {
  if (isMenuContainerNodeType(nodeType)) {
    if (propKey === 'expanded' || propKey === 'defaultExpanded') {
      return 'menuSubmenuMultiSelect';
    }
    if (propKey === 'value' || propKey === 'defaultValue') {
      return 'menuMenuItemSingleSelect';
    }
  }
  return resolveEditType(schema);
};

const ComponentConfigPanel: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { useStore } = useBuilderContext();
  const { readOnly, readOnlyReason } = useBuilderAccess();
  const { workspaceMode, currentTeamId } = useTeam();
  const activeNode = useStore((state) => state.activeNode);
  const activeNodeKey = useStore((state) => state.activeNodeKey);
  const uiPageData = useStore((state) => state.uiPageData);
  const flowNodes = useStore((state) => state.flowNodes);
  const flowEdges = useStore((state) => state.flowEdges);
  const updateActiveNodeLabel = useStore((state) => state.updateActiveNodeLabel);
  const updateActiveNodeKey = useStore((state) => state.updateActiveNodeKey);
  const updateActiveNodeProp = useStore((state) => state.updateActiveNodeProp);
  const screenSize = useStore((state) => state.screenSize);
  const autoWidth = useStore((state) => state.autoWidth);
  const [labelDraft, setLabelDraft] = useState('');
  const [keyDraft, setKeyDraft] = useState('');
  const [keyError, setKeyError] = useState('');
  const [swiperDialogVisible, setSwiperDialogVisible] = useState(false);
  const [swiperImageDraft, setSwiperImageDraft] = useState<SwiperImageRow[]>([]);
  const [tabsDialogVisible, setTabsDialogVisible] = useState(false);
  const [tabsDraft, setTabsDraft] = useState<TabsRow[]>([]);
  const [tabsTargetPropKey, setTabsTargetPropKey] = useState<string | null>(null);
  const [tableColumnsDialogVisible, setTableColumnsDialogVisible] = useState(false);
  const [tableColumnsDraft, setTableColumnsDraft] = useState<TableColumnRow[]>([]);
  const [tableColumnsTargetPropKey, setTableColumnsTargetPropKey] = useState<string | null>(null);
  const [dataSourceDialogVisible, setDataSourceDialogVisible] = useState(false);
  const [dataSourceTargetPropKey, setDataSourceTargetPropKey] = useState<string | null>(null);
  const [dataSourceDraft, setDataSourceDraft] = useState<DataSourceConfigDraft>(normalizeDataSourceConfigDraft(undefined));
  const [dataSourceLoading, setDataSourceLoading] = useState(false);
  const [dataConstantOptions, setDataConstantOptions] = useState<DataConstantRecord[]>([]);
  const [dataTableOptions, setDataTableOptions] = useState<DataTableRecord[]>([]);
  const [cloudFunctionOptions, setCloudFunctionOptions] = useState<CloudFunctionRecord[]>([]);
  const [inputDrafts, setInputDrafts] = useState<Record<string, string>>({});
  const [numberDrafts, setNumberDrafts] = useState<Record<string, number | undefined>>({});
  const [pendingWorkbenchSessionId, setPendingWorkbenchSessionId] = useState('');
  const [gridResponsiveDialogVisible, setGridResponsiveDialogVisible] = useState(false);
  const [gridResponsiveDraft, setGridResponsiveDraft] = useState<GridResponsiveConfig>({});
  const [assetPickerTarget, setAssetPickerTarget] = useState<AssetPickerTarget | null>(null);
  const [activeBreakpoint, setActiveBreakpoint] = useState<GridBreakpoint>('xs');
  const [iconQuickFilters, setIconQuickFilters] = useState<Record<string, IconQuickFilterKey>>({});
  const [iconInitialFilters, setIconInitialFilters] = useState<Record<string, IconInitialFilterKey>>({});
  const [iconPickerPropKey, setIconPickerPropKey] = useState<string | null>(null);
  const [customComponentFallbackProps, setCustomComponentFallbackProps] = useState<Array<[string, ComponentPropSchema]>>([]);
  const [configMainTab, setConfigMainTab] = useState<'props' | 'style'>('props');
  const [listBindingDialogVisible, setListBindingDialogVisible] = useState(false);
  const [listBindingDraft, setListBindingDraft] = useState<ListBindingDraftRow[]>([]);

  const openJsonCodeWorkbench = useCallback((propKey: string, title: string, code: string) => {
    const sessionId = createCodeWorkbenchSessionId();
    const dark = useBuilderThemeStore.getState().colorMode === 'dark';
    const editorTheme = dark ? 'vscode-dark' : 'vscode-light';
    writeCodeWorkbenchPayload({
      sessionId,
      returnTo: `${location.pathname}${location.search}`,
      title: `JSON 编辑工作台 · ${title}`,
      context: 'json',
      files: [{
        id: propKey,
        path: `${title}.json`,
        code,
        language: 'json',
        editorTheme,
      }],
      activeFileId: propKey,
    });
    setPendingWorkbenchSessionId(sessionId);
    const workbenchUrl = `${window.location.origin}/code-workbench?sid=${encodeURIComponent(sessionId)}`;
    const opened = window.open(workbenchUrl, '_blank');
    if (!opened) {
      MessagePlugin.warning('无法打开新窗口，请在浏览器中允许本站弹窗后重试');
    }
  }, [location.pathname, location.search]);

  const propsMap = React.useMemo(() => {
    const activeProps = (activeNode?.props ?? {}) as Record<string, ComponentPropSchema>;
    if (!activeNode?.type || !MENU_ICON_COMPAT_NODE_TYPES.has(activeNode.type)) {
      return activeProps;
    }

    const catalogSchema = componentCatalog.find((item) => item.type === activeNode.type);
    const catalogProps = (catalogSchema?.props ?? {}) as Record<string, ComponentPropSchema>;
    if (!catalogProps.iconName || activeProps.iconName) {
      return activeProps;
    }

    return {
      ...activeProps,
      iconName: {
        ...catalogProps.iconName,
      },
    };
  }, [activeNode?.props, activeNode?.type]);
  const styleValue = (propsMap.__style?.value ?? {}) as Record<string, unknown>;
  const switchControlled = (activeNode?.type === 'Switch' || activeNode?.type === 'Slider' || activeNode?.type === 'Steps')
    ? Boolean((propsMap.controlled?.value ?? true))
    : undefined;
  const currentChartType = React.useMemo<EChartSeriesType | null>(() => {
    const explicitChartType = normalizeChartType((propsMap.chartType as { value?: unknown } | undefined)?.value);
    if (explicitChartType) {
      return explicitChartType;
    }
    return normalizeChartType(CHART_COMPONENT_TYPE_MAP[String(activeNode?.type ?? '')]);
  }, [activeNode?.type, propsMap.chartType]);
  const ownerType = workspaceMode === 'team' ? 'team' : 'user';
  const canQueryWorkspaceResource = ownerType === 'user' || Boolean(currentTeamId);
  const accessContext = {
    ownerType,
    ownerTeamId: ownerType === 'team' ? currentTeamId || undefined : undefined,
  } as const;

  const activePath = activeNode?.key ? findNodePathByKey(uiPageData, activeNode.key) : null;
  const listItemAncestor = activePath?.slice().reverse().find((node: UiTreeNode) => node.type === 'List.Item');
  const dynamicListItemAncestor = activePath?.slice().reverse().find((node: UiTreeNode) => node.type === 'DynamicList.Item');
  const dynamicListAncestor = activePath?.slice().reverse().find((node: UiTreeNode) => node.type === 'DynamicList');
  const listAncestor = activePath?.slice().reverse().find((node: UiTreeNode) => node.type === 'List');
  const isListCustomTemplateEnabled = Boolean(
    (listAncestor?.props?.customTemplateEnabled as { value?: unknown } | undefined)?.value,
  );
  const isInsideDynamicList = Boolean(dynamicListItemAncestor && dynamicListAncestor);

  const menuSubmenuSelectOptions = React.useMemo(() => {
    if (!activeNode || !isMenuContainerNodeType(activeNode.type)) {
      return [] as { label: string; value: string | number }[];
    }
    return collectMenuSubmenuValueOptions(activeNode);
  }, [activeNode]);

  const menuMenuItemSelectOptions = React.useMemo(() => {
    if (!activeNode || !isMenuContainerNodeType(activeNode.type)) {
      return [] as { label: string; value: string | number }[];
    }
    return collectMenuItemValueOptions(activeNode);
  }, [activeNode]);

  const editableProps = Object.entries(propsMap).filter(([propKey]) => {
    if (propKey.startsWith('__')) {
      return false;
    }

    if (activeNode?.type === 'Progress' && PROGRESS_COLOR_PROP_KEYS.has(propKey)) {
      return false;
    }

    if (activeNode?.type === 'Switch' || activeNode?.type === 'Slider' || activeNode?.type === 'Steps') {
      if (propKey === 'value' && switchControlled === false) {
        return false;
      }
      if (propKey === 'defaultValue' && switchControlled === true) {
        return false;
      }
    }

    if (
      activeNode?.type === 'List'
      && Boolean((propsMap.customTemplateEnabled?.value as boolean | undefined) ?? false)
      && LIST_META_PROP_KEYS.has(propKey)
    ) {
      return false;
    }

    if (activeNode?.type === 'List.Item' && isListCustomTemplateEnabled && LIST_ITEM_META_PROP_KEYS.has(propKey)) {
      return false;
    }

    const chartVisibleProps = getChartVisibleProps(activeNode?.type);
    if (chartVisibleProps && !chartVisibleProps.has(propKey)) {
      return false;
    }
    if (chartVisibleProps && currentChartType) {
      const chartTypeProps = CHART_TYPE_PROP_WHITELIST[currentChartType];
      if (!COMMON_CHART_PROPS.has(propKey) && !chartTypeProps.has(propKey)) {
        return false;
      }
    }

    return true;
  });

  const sortedEditableProps = React.useMemo(() => {
    return editableProps
      .map(([propKey, schema], originalIndex) => ({
        propKey,
        schema,
        originalIndex,
        editType: resolveMenuPropEditType(propKey, activeNode?.type, schema),
      }))
      .sort((a, b) => {
        const aCommonPriority = getCommonPropPriority(a.propKey);
        const bCommonPriority = getCommonPropPriority(b.propKey);
        const aIsCommon = typeof aCommonPriority === 'number';
        const bIsCommon = typeof bCommonPriority === 'number';

        if (aIsCommon !== bIsCommon) {
          return aIsCommon ? -1 : 1;
        }

        if (aIsCommon && bIsCommon) {
          return (aCommonPriority as number) - (bCommonPriority as number);
        }

        const rankDiff = getEditTypeSortRank(a.editType) - getEditTypeSortRank(b.editType);
        if (rankDiff !== 0) {
          return rankDiff;
        }

        return a.originalIndex - b.originalIndex;
      })
      .map((item) => [item.propKey, item.schema] as const);
  }, [editableProps, activeNode?.type]);

  const mergedEditableProps = React.useMemo(() => {
    if (customComponentFallbackProps.length === 0) {
      return sortedEditableProps;
    }

    const merged = [...sortedEditableProps];
    const existingKeys = new Set(merged.map(([propKey]) => propKey));
    customComponentFallbackProps.forEach(([propKey, schema]) => {
      if (existingKeys.has(propKey)) {
        return;
      }
      merged.push([propKey, schema] as const);
      existingKeys.add(propKey);
    });

    return merged;
  }, [customComponentFallbackProps, sortedEditableProps]);

  const groupedEditableProps = React.useMemo(() => {
    const map = new Map<string, Array<[string, ComponentPropSchema]>>();
    mergedEditableProps.forEach(([propKey, schema]) => {
      const section = getPropSection(propKey, schema, activeNode?.type);
      if (!map.has(section)) {
        map.set(section, []);
      }
      map.get(section)!.push([propKey, schema]);
    });
    const keys = sortSectionKeys(Array.from(map.keys()));
    return keys.map((key) => [key, map.get(key)!] as [string, Array<[string, ComponentPropSchema]>]);
  }, [activeNode?.type, mergedEditableProps]);

  const isNodeInsideListTemplate = Boolean(
    (listItemAncestor && activeNode && activeNode.type !== 'List.Item')
    || (dynamicListItemAncestor && activeNode && activeNode.type !== 'DynamicList.Item'),
  );
  const bindableProps = React.useMemo(
    () => mergedEditableProps
      .filter(([propKey]) => !propKey.startsWith('__'))
      .map(([propKey, schema]) => ({
        label: String(schema.name ?? propKey),
        value: propKey,
      })),
    [mergedEditableProps],
  );
  const listBindingSchema = propsMap.__listBinding;
  const listBindingMappings = React.useMemo(
    () => normalizeListBindingMappings(listBindingSchema?.value),
    [listBindingSchema?.value],
  );
  const showBindingUI = (isListCustomTemplateEnabled && isNodeInsideListTemplate && bindableProps.length > 0)
    || (isInsideDynamicList && isNodeInsideListTemplate && bindableProps.length > 0);

  const dynamicListDataSourceConfig = React.useMemo(
    () => normalizeDataSourceConfig((dynamicListAncestor?.props?.dataSourceConfig as { value?: unknown } | undefined)?.value),
    [dynamicListAncestor?.props?.dataSourceConfig],
  );

  const dynamicListConstantRecord = React.useMemo(
    () => dataConstantOptions.find((item) => item.id === dynamicListDataSourceConfig.constantId) ?? null,
    [dataConstantOptions, dynamicListDataSourceConfig.constantId],
  );

  const flowUpstreamCodeSelectOptions = React.useMemo(() => {
    if (!dynamicListAncestor?.key) {
      return [] as Array<{ label: string; value: string }>;
    }
    const compIds = findComponentFlowNodeIdsForUiKey(flowNodes, dynamicListAncestor.key);
    const dedup = new Map<string, string>();
    compIds.forEach((cid) => {
      listUpstreamCodeNodesForComponentFlow(flowEdges, flowNodes, cid).forEach((item) => {
        if (!dedup.has(item.id)) {
          dedup.set(item.id, item.label);
        }
      });
    });
    return Array.from(dedup.entries()).map(([value, label]) => ({ value, label }));
  }, [dynamicListAncestor?.key, flowNodes, flowEdges]);

  const dynamicListFlowCodeLabel = React.useMemo(() => {
    if (dynamicListDataSourceConfig.type !== 'flowCode' || !dynamicListDataSourceConfig.flowCodeNodeId) {
      return '';
    }
    const n = flowNodes.find((x) => x.id === dynamicListDataSourceConfig.flowCodeNodeId);
    const d = (n?.data ?? {}) as CodeNodeData;
    return String(d.label ?? '代码节点');
  }, [flowNodes, dynamicListDataSourceConfig.flowCodeNodeId, dynamicListDataSourceConfig.type]);

  const dynamicListFieldMeta = React.useMemo(() => {
    if (!isInsideDynamicList) {
      return { options: [] as Array<{ label: string; value: string }>, error: '' };
    }
    if (dynamicListDataSourceConfig.type === 'flowCode') {
      if (!dynamicListDataSourceConfig.flowCodeNodeId) {
        return {
          options: [] as Array<{ label: string; value: string }>,
          error: '请在数据源中选择流程代码节点（需从代码节点连到本组件的流程节点）。',
        };
      }
      const codeNode = flowNodes.find((n) => n.id === dynamicListDataSourceConfig.flowCodeNodeId);
      const fields = (codeNode?.data as CodeNodeData | undefined)?.listOutputContract?.fields;
      if (!fields?.length) {
        return {
          options: [] as Array<{ label: string; value: string }>,
          error: '请先在代码节点上配置「列表输出契约」（点击画布上的警告图标）。',
        };
      }
      return {
        options: fields.map((key) => ({ label: key, value: key })),
        error: '',
      };
    }
    if (dynamicListDataSourceConfig.type !== 'constant') {
      return {
        options: [] as Array<{ label: string; value: string }>,
        error: '当前仅支持「常量管理」或「流程代码节点」数据源。',
      };
    }
    if (!dynamicListDataSourceConfig.constantId) {
      return {
        options: [] as Array<{ label: string; value: string }>,
        error: '请先给动态列表配置常量数据源。',
      };
    }
    if (!dynamicListConstantRecord) {
      return {
        options: [] as Array<{ label: string; value: string }>,
        error: dataSourceLoading ? '正在加载常量数据源...' : '未找到对应常量，请检查常量是否存在。',
      };
    }
    if (dynamicListConstantRecord.valueType !== 'array' || !Array.isArray(dynamicListConstantRecord.value)) {
      return {
        options: [] as Array<{ label: string; value: string }>,
        error: '常量数据源格式错误：必须是 Array 类型。',
      };
    }
    const rows = dynamicListConstantRecord.value;
    if (rows.length === 0) {
      return {
        options: [] as Array<{ label: string; value: string }>,
        error: '常量数组为空，无法推断可绑定字段。',
      };
    }
    const firstRow = rows[0];
    if (!firstRow || typeof firstRow !== 'object' || Array.isArray(firstRow)) {
      return {
        options: [] as Array<{ label: string; value: string }>,
        error: '常量数据源格式错误：数组元素必须全部是对象。',
      };
    }
    const firstKeys = Object.keys(firstRow as Record<string, unknown>);
    const sameShape = rows.every((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        return false;
      }
      const keys = Object.keys(row as Record<string, unknown>);
      return keys.length === firstKeys.length && keys.every((key) => firstKeys.includes(key));
    });
    if (!sameShape) {
      return {
        options: [] as Array<{ label: string; value: string }>,
        error: '常量数据源格式错误：数组内每个对象的字段必须完全一致。',
      };
    }
    return {
      options: firstKeys.map((key) => ({ label: key, value: key })),
      error: '',
    };
  }, [dataSourceLoading, dynamicListConstantRecord, dynamicListDataSourceConfig, flowNodes, isInsideDynamicList]);

  const dynamicListFieldOptions = dynamicListFieldMeta.options;
  const dynamicListFieldError = dynamicListFieldMeta.error;

  const responsiveColSchema = propsMap.__responsiveCol;
  const simulatorWidth = resolveBuilderViewportWidth(screenSize, autoWidth);
  const simulatorBreakpoint = getBreakpointByWidth(simulatorWidth);

  useEffect(() => {
    if (!activeNode) {
      setLabelDraft('');
      setInputDrafts({});
      setNumberDrafts({});
      return;
    }

    setLabelDraft(String(activeNode.label ?? ''));
    setKeyDraft(String(activeNode.key ?? ''));
    setKeyError('');

    const nextInputDrafts: Record<string, string> = {};
    const nextNumberDrafts: Record<string, number | undefined> = {};

    sortedEditableProps.forEach(([propKey, schema]) => {
      const editType = resolveMenuPropEditType(propKey, activeNode?.type, schema);
      if (editType === 'input') {
        nextInputDrafts[propKey] = typeof schema.value === 'string' ? schema.value : String(schema.value ?? '');
      }
      if (editType === 'inputNumber') {
        nextNumberDrafts[propKey] = typeof schema.value === 'number' ? schema.value : undefined;
      }
    });

    setInputDrafts(nextInputDrafts);
    setNumberDrafts(nextNumberDrafts);
  }, [activeNode?.key, activeNode?.label, activeNode?.props]);

  useEffect(() => {
    setConfigMainTab('props');
  }, [activeNode?.key]);

  useEffect(() => {
    let cancelled = false;

    const loadFallbackProps = async () => {
      if (!activeNode || activeNode.type !== 'CustomComponent') {
        setCustomComponentFallbackProps([]);
        return;
      }

      const nonMetaPropKeys = Object.keys((activeNode.props ?? {}) as Record<string, unknown>)
        .filter((propKey) => propKey && !propKey.startsWith('__'));
      if (nonMetaPropKeys.length > 0) {
        setCustomComponentFallbackProps([]);
        return;
      }

      const componentIdSchema = (activeNode.props?.__componentId ?? null) as { value?: unknown } | null;
      const componentId = String(componentIdSchema?.value ?? '').trim();
      const componentVersionSchema = (activeNode.props?.__componentVersion ?? null) as { value?: unknown } | null;
      const componentVersionRaw = Number(componentVersionSchema?.value);
      const componentVersion = Number.isFinite(componentVersionRaw) && componentVersionRaw > 0
        ? Math.floor(componentVersionRaw)
        : null;
      if (!componentId) {
        setCustomComponentFallbackProps([]);
        return;
      }

      const detail = await loadCustomComponentDetail(componentId, {
        forceRefresh: true,
        version: componentVersion,
      });
      if (cancelled) {
        return;
      }

      const exposed = resolveExposedPropSchemas(detail);
      const fallback = exposed.map((item) => [item.propKey, item.schema as ComponentPropSchema] as [string, ComponentPropSchema]);
      setCustomComponentFallbackProps(fallback);
    };

    void loadFallbackProps();

    return () => {
      cancelled = true;
    };
  }, [activeNode]);

  const applyWorkbenchResult = React.useCallback((sessionId: string) => {
    const normalizedSessionId = String(sessionId ?? '').trim();
    if (!normalizedSessionId) {
      return;
    }
    const result = readCodeWorkbenchResult(normalizedSessionId);
    const file = result?.files?.[0];
    if (result?.applied && file) {
      updateActiveNodeProp(file.id, file.code);
      MessagePlugin.success('应用成功');
    }

    clearCodeWorkbenchResult(normalizedSessionId);
    if (pendingWorkbenchSessionId === normalizedSessionId) {
      setPendingWorkbenchSessionId('');
    }
  }, [pendingWorkbenchSessionId, updateActiveNodeProp]);

  useEffect(() => {
    const navState = (location.state ?? {}) as {
      codeWorkbenchSessionId?: string;
      codeWorkbenchApplied?: boolean;
    };
    const sessionId = typeof navState.codeWorkbenchSessionId === 'string' ? navState.codeWorkbenchSessionId.trim() : '';
    if (sessionId && navState.codeWorkbenchApplied === true) {
      applyWorkbenchResult(sessionId);
    }
    if (sessionId) {
      navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
    }
  }, [applyWorkbenchResult, location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (!pendingWorkbenchSessionId) {
      return;
    }
    const onStorage = (event: StorageEvent) => {
      if (!event.key || !event.key.endsWith(pendingWorkbenchSessionId)) {
        return;
      }
      applyWorkbenchResult(pendingWorkbenchSessionId);
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, [applyWorkbenchResult, pendingWorkbenchSessionId]);

  /** 必须在任意 early return 之前声明：否则 activeNode 为空时少跑 hooks，触发 React #310 */
  const loadDataSourceResources = useCallback(async () => {
    if (!canQueryWorkspaceResource) {
      setDataConstantOptions([]);
      setDataTableOptions([]);
      setCloudFunctionOptions([]);
      return;
    }

    setDataSourceLoading(true);
    try {
      const [constantsResult, tablesResult, functionsResult] = await Promise.all([
        getDataConstantList({
          ...accessContext,
          page: 1,
          pageSize: 200,
        }),
        getDataTableList({
          ...accessContext,
          page: 1,
          pageSize: 200,
        }),
        getCloudFunctionList({
          ...accessContext,
          page: 1,
          pageSize: 200,
        }),
      ]);
      setDataConstantOptions(Array.isArray(constantsResult.list) ? constantsResult.list : []);
      setDataTableOptions(Array.isArray(tablesResult.list) ? tablesResult.list : []);
      setCloudFunctionOptions(Array.isArray(functionsResult.list) ? functionsResult.list : []);
    } finally {
      setDataSourceLoading(false);
    }
  }, [accessContext, canQueryWorkspaceResource]);

  useEffect(() => {
    if (!showBindingUI || !isInsideDynamicList) {
      return;
    }
    if (dynamicListDataSourceConfig.type !== 'constant') {
      return;
    }
    if (dataConstantOptions.length > 0 || dataSourceLoading) {
      return;
    }
    void loadDataSourceResources();
  }, [
    dataConstantOptions.length,
    dataSourceLoading,
    dynamicListDataSourceConfig.type,
    isInsideDynamicList,
    loadDataSourceResources,
    showBindingUI,
  ]);

  if (!activeNode) {
    return (
      <div className="right-panel-body right-panel-empty">
        <Empty description="请先在画布或组件树中选择一个组件" />
      </div>
    );
  }

  if (isSlotNode(activeNode)) {
    return (
      <div className="config-panel">
        <Empty description="插槽节点仅用于承载拖拽，不支持单独配置" />
      </div>
    );
  }

  const readOnlyBanner = readOnly ? (
    <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#fff7e8', color: '#8d5c0d', fontSize: 12 }}>
      当前为只读模式。{readOnlyReason || '你可以查看组件配置，但不能修改。'}
    </div>
  ) : null;

  const renderEditor = (propKey: string, schema: ComponentPropSchema) => {
    const editType = resolveMenuPropEditType(propKey, activeNode?.type, schema);
    const currentValue = schema.value;

    if (editType === 'switch') {
      return (
        <Switch
          size='small'
          value={Boolean(currentValue)}
          onChange={(value) => updateActiveNodeProp(propKey, Boolean(value))}
        />
      );
    }

    if (editType === 'inputNumber') {
      const draftValue = numberDrafts[propKey];
      const min = typeof schema.payload?.min === 'number' ? schema.payload.min : undefined;
      const max = typeof schema.payload?.max === 'number' ? schema.payload.max : undefined;
      return (
        <InputNumber
          size='small'
          min={min}
          max={max}
          value={typeof draftValue === 'number' ? draftValue : undefined}
          onChange={(value) => {
            const nextNumber = typeof value === 'number' && !Number.isNaN(value) ? value : undefined;
            const normalizedNumber = typeof nextNumber === 'number'
              ? (
                typeof min === 'number' && typeof max === 'number'
                  ? Math.min(max, Math.max(min, nextNumber))
                  : typeof min === 'number'
                    ? Math.max(min, nextNumber)
                    : typeof max === 'number'
                      ? Math.min(max, nextNumber)
                      : nextNumber
              )
              : undefined;
            setNumberDrafts((previous) => ({
              ...previous,
              [propKey]: normalizedNumber,
            }));
            if (typeof normalizedNumber === 'number') {
              updateActiveNodeProp(propKey, normalizedNumber);
            }
          }}
        />
      );
    }

    if (editType === 'select') {
      const options = (schema.payload?.options ?? []).map((item) => {
        if (item && typeof item === 'object' && 'label' in item && 'value' in item) {
          const option = item as { label: string; value: string | number };
          return {
            label: String(option.label),
            value: option.value,
          };
        }

        return {
          label: String(item),
          value: item,
        };
      });

      return (
        <Select
          size='small'
          options={options}
          value={currentValue as string | number | undefined}
          onChange={(value) => updateActiveNodeProp(propKey, value)}
        />
      );
    }

    if (editType === 'menuSubmenuMultiSelect') {
      const options = menuSubmenuSelectOptions;
      const normalized = normalizeMenuExpandedStoredValue(currentValue);
      const allowed = new Set(options.map((item) => item.value));
      const valueForSelect = normalized.filter((item) => allowed.has(item));
      return (
        <Select
          multiple
          minCollapsedNum={2}
          size="small"
          disabled={readOnly}
          options={options}
          value={valueForSelect}
          placeholder={
            options.length > 0
              ? '选择要展开的子菜单（多选）'
              : '请先在菜单下添加「子菜单」并设置标识'
          }
          onChange={(value) => {
            updateActiveNodeProp(propKey, Array.isArray(value) ? value : []);
          }}
        />
      );
    }

    if (editType === 'menuMenuItemSingleSelect') {
      const options = menuMenuItemSelectOptions;
      const normalized = normalizeMenuItemStoredValue(currentValue);
      const allowed = new Set(options.map((item) => item.value));
      const valueForSelect = normalized !== undefined && allowed.has(normalized) ? normalized : undefined;
      return (
        <Select
          size="small"
          clearable
          disabled={readOnly}
          options={options}
          value={valueForSelect}
          placeholder={
            options.length > 0
              ? '选择激活的菜单项'
              : '请先在菜单下添加「菜单项」并设置标识'
          }
          onChange={(value) => {
            if (value === undefined || value === null || value === '') {
              updateActiveNodeProp(propKey, '');
              return;
            }
            updateActiveNodeProp(propKey, value);
          }}
        />
      );
    }

    if (editType === 'iconSelect') {
      return (
        <Button
          size="small"
          variant="outline"
          disabled={readOnly}
          onClick={() => setIconPickerPropKey(propKey)}
        >
          浏览图标
        </Button>
      );
    }

    if (editType === 'swiperImages') {
      return (
        <Button
          size="small"
          variant="outline"
          onClick={() => {
            const rows = normalizeSwiperImageRows(currentValue);
            setSwiperImageDraft(rows.length > 0 ? rows : [createSwiperImageRow(), createSwiperImageRow()]);
            setSwiperDialogVisible(true);
          }}
        >
          配置图片
        </Button>
      );
    }

    if (editType === 'tabsConfig') {
      return (
        <Button
          size="small"
          variant="outline"
          onClick={() => {
            const rows = normalizeTabsRows(currentValue);
            setTabsDraft(rows.length ? rows : normalizeTabsRows(createDefaultTabsList()));
            setTabsTargetPropKey(propKey);
            setTabsDialogVisible(true);
          }}
        >
          配置选项卡
        </Button>
      );
    }

    if (editType === 'tableColumnsConfig') {
      return (
        <Button
          size="small"
          variant="outline"
          onClick={() => {
            const rows = normalizeTableColumnRows(currentValue);
            setTableColumnsDraft(
              rows.length > 0
                ? rows
                : [
                    createTableColumnRow({ colKey: 'name', title: '姓名', width: 140, align: 'left', ellipsis: true }),
                    createTableColumnRow({ colKey: 'role', title: '角色', width: 120, align: 'left', ellipsis: true }),
                  ],
            );
            setTableColumnsTargetPropKey(propKey);
            setTableColumnsDialogVisible(true);
          }}
        >
          配置列
        </Button>
      );
    }

    if (editType === 'tableDataConfig') {
      return (
        <Button size="small" variant="outline" disabled>
          配置数据（待支持）
        </Button>
      );
    }

    if (editType === 'dataSourceConfig') {
      return (
        <Button
          size="small"
          variant="outline"
          onClick={() => openDataSourceConfigDialog(propKey, currentValue)}
        >
          配置数据源
        </Button>
      );
    }

    if (
      editType === 'input'
      && activeNode
      && ((activeNode.type === 'Image' && propKey === 'src')
        || (activeNode.type === 'Avatar' && propKey === 'image'))
    ) {
      const draftValue = inputDrafts[propKey] ?? (typeof currentValue === 'string' ? currentValue : String(currentValue ?? ''));
      return (
        <div
          style={{
            border: '1px dashed transparent',
            borderRadius: 6,
            padding: 4,
            margin: -4,
          }}
          onDragOver={(e) => {
            if (readOnly) {
              return;
            }
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (readOnly) {
              return;
            }
            const url = getMediaAssetUrlFromDrop(e);
            if (!url) {
              return;
            }
            setInputDrafts((previous) => ({
              ...previous,
              [propKey]: url,
            }));
            updateActiveNodeProp(propKey, url);
            MessagePlugin.success('已应用素材地址');
          }}
        >
          <Space align="center" size={8} style={{ width: '100%' }}>
            <Input
              style={{ flex: 1 }}
              size="small"
              clearable
              value={draftValue}
              onChange={(value) => {
                setInputDrafts((previous) => ({
                  ...previous,
                  [propKey]: String(value ?? ''),
                }));
              }}
              onBlur={(value, context) => {
                const fallbackValue = context?.e?.target && 'value' in context.e.target
                  ? String((context.e.target as { value?: unknown }).value ?? '')
                  : draftValue;
                const nextValue = typeof value === 'string' ? value : fallbackValue;
                setInputDrafts((previous) => ({
                  ...previous,
                  [propKey]: String(nextValue ?? ''),
                }));
                updateActiveNodeProp(propKey, String(nextValue ?? ''));
              }}
            />
            <Button
              size="small"
              variant="outline"
              disabled={readOnly}
              onClick={() => {
                if (readOnly) {
                  return;
                }
                setAssetPickerTarget({ kind: 'prop', propKey });
              }}
            >
              使用素材库
            </Button>
          </Space>
        </div>
      );
    }

    if (editType === 'jsonCode') {
      return (
        <Button
          size="small"
          variant="outline"
          disabled={readOnly}
          onClick={() => {
            if (readOnly) {
              return;
            }
            const code = toJsonCodeString(currentValue);
            openJsonCodeWorkbench(propKey, String(schema.name ?? propKey), code);
          }}
        >
          编辑示例数据
        </Button>
      );
    }

    const draftValue = inputDrafts[propKey] ?? (typeof currentValue === 'string' ? currentValue : String(currentValue ?? ''));

    return (
      <Input
        size='small'
        clearable
        value={draftValue}
        onChange={(value) => {
          setInputDrafts((previous) => ({
            ...previous,
            [propKey]: String(value ?? ''),
          }));
        }}
        onBlur={(value, context) => {
          const fallbackValue = context?.e?.target && 'value' in context.e.target
            ? String((context.e.target as { value?: unknown }).value ?? '')
            : draftValue;
          const nextValue = typeof value === 'string' ? value : fallbackValue;
          setInputDrafts((previous) => ({
            ...previous,
            [propKey]: String(nextValue ?? ''),
          }));
          updateActiveNodeProp(propKey, String(nextValue ?? ''));
        }}
      />
    );
  };

  const handleApplyNodeKey = () => {
    const result = updateActiveNodeKey(keyDraft);
    setKeyError(result.success ? '' : String(result.message ?? '组件标识重复'));
    if (result.success && activeNode) {
      setKeyDraft(String(keyDraft.trim()));
    }
  };

  const applySwiperImageDraft = () => {
    updateActiveNodeProp(
      'images',
      swiperImageDraft.map((item) => ({
        src: item.src,
        fallback: item.fallback,
        lazy: item.lazy,
        objectFit: item.objectFit,
        objectPosition: item.objectPosition,
      })),
    );
    setSwiperDialogVisible(false);
  };

  const applyTabsDraft = () => {
    const normalizedRows = tabsDraft
      .map((item, index) => {
        const value = item.value.trim();
        const label = item.label.trim();
        if (!value) {
          return null;
        }

        return {
          value,
          label: label || `选项卡${index + 1}`,
          disabled: item.disabled,
          draggable: item.draggable,
          removable: item.removable,
          lazy: item.lazy,
          destroyOnHide: item.destroyOnHide,
        };
      })
      .filter((item): item is {
        value: string;
        label: string;
        disabled: boolean;
        draggable: boolean;
        removable: boolean;
        lazy: boolean;
        destroyOnHide: boolean;
      } => !!item);

    const dedupedRows = normalizedRows.reduce<typeof normalizedRows>((acc, item) => {
      if (!acc.some((existing) => existing.value === item.value)) {
        acc.push(item);
      }
      return acc;
    }, []);

    const nextList = dedupedRows.length
      ? dedupedRows
      : createDefaultTabsList().map((item) => ({
          value: String(item.value),
          label: item.label,
          disabled: Boolean(item.disabled),
          draggable: typeof item.draggable === 'boolean' ? item.draggable : true,
          removable: Boolean(item.removable),
          lazy: Boolean(item.lazy),
          destroyOnHide: typeof item.destroyOnHide === 'boolean' ? item.destroyOnHide : true,
        }));

    if (tabsTargetPropKey) {
      updateActiveNodeProp(tabsTargetPropKey, nextList);
    }

    setTabsDialogVisible(false);
    setTabsTargetPropKey(null);
  };

  const applyTableColumnsDraft = () => {
    const normalizedRows = tableColumnsDraft
      .map((item, index) => {
        const colKey = item.colKey.trim();
        const title = item.title.trim();
        if (!colKey) {
          return null;
        }

        const nextColumn: Record<string, unknown> = {
          colKey,
          title: title || `列${index + 1}`,
          align: item.align,
          ellipsis: item.ellipsis,
        };

        if (typeof item.width === 'number' && Number.isFinite(item.width) && item.width > 0) {
          nextColumn.width = Math.round(item.width);
        }
        if (item.sortType) {
          nextColumn.sortType = item.sortType;
        }
        if (item.fixed) {
          nextColumn.fixed = item.fixed;
        }

        return nextColumn;
      })
      .filter((item): item is Record<string, unknown> => !!item);

    const dedupedRows = normalizedRows.reduce<Record<string, unknown>[]>((acc, item) => {
      const key = String(item.colKey ?? '');
      if (!acc.some((existing) => String(existing.colKey ?? '') === key)) {
        acc.push(item);
      }
      return acc;
    }, []);

    const nextColumns = dedupedRows.length
      ? dedupedRows
      : [
          { colKey: 'name', title: '姓名', width: 140, align: 'left', ellipsis: true },
          { colKey: 'role', title: '角色', width: 120, align: 'left', ellipsis: true },
        ];

    if (tableColumnsTargetPropKey) {
      updateActiveNodeProp(tableColumnsTargetPropKey, nextColumns);
    }

    setTableColumnsDialogVisible(false);
    setTableColumnsTargetPropKey(null);
  };

  const dataSourceTypeSelectOptions = React.useMemo(() => {
    const base: Array<{ label: string; value: ComponentDataSourceType }> = [
      { label: '静态数据', value: 'static' },
      { label: '常量管理', value: 'constant' },
      { label: '数据表记录', value: 'dataTable' },
      { label: '云函数调用', value: 'cloudFunction' },
    ];
    if (activeNode?.type === 'DynamicList') {
      base.push({ label: '流程代码节点', value: 'flowCode' });
    }
    return base;
  }, [activeNode?.type]);

  const openDataSourceConfigDialog = (propKey: string, currentValue: unknown) => {
    setDataSourceTargetPropKey(propKey);
    const draft = normalizeDataSourceConfigDraft(currentValue);
    if (activeNode?.type !== 'DynamicList' && draft.type === 'flowCode') {
      setDataSourceDraft({ ...draft, type: 'static', flowCodeNodeId: '' });
    } else {
      setDataSourceDraft(draft);
    }
    setDataSourceDialogVisible(true);
    void loadDataSourceResources();
  };

  const openListBindingDialog = () => {
    setListBindingDraft(
      listBindingMappings.length > 0
        ? listBindingMappings.map((item) => createListBindingDraftRow(item))
        : [createListBindingDraftRow()],
    );
    setListBindingDialogVisible(true);
    if (isInsideDynamicList && dynamicListDataSourceConfig.type === 'constant' && dataConstantOptions.length === 0) {
      void loadDataSourceResources();
    }
  };

  const applyListBindingDraft = () => {
    const normalized = listBindingDraft
      .map((item) => ({
        prop: String(item.prop ?? '').trim(),
        field: String(item.field ?? '').trim(),
      }))
      .filter((item) => item.prop && item.field);
    updateActiveNodeProp('__listBinding', { mappings: normalized });
    setListBindingDialogVisible(false);
  };

  const applyDataSourceConfigDraft = () => {
    if (!dataSourceTargetPropKey) {
      setDataSourceDialogVisible(false);
      return;
    }

    let parsedPayload: unknown = {};
    const payloadText = dataSourceDraft.payloadText.trim();
    if (payloadText) {
      try {
        parsedPayload = JSON.parse(payloadText);
      } catch {
        parsedPayload = {};
      }
    }

    updateActiveNodeProp(dataSourceTargetPropKey, {
      type: dataSourceDraft.type,
      constantId: dataSourceDraft.constantId || undefined,
      tableId: dataSourceDraft.tableId || undefined,
      functionId: dataSourceDraft.functionId || undefined,
      flowCodeNodeId: dataSourceDraft.flowCodeNodeId || undefined,
      page: Math.max(1, Math.round(Number(dataSourceDraft.page) || 1)),
      pageSize: Math.max(1, Math.round(Number(dataSourceDraft.pageSize) || 20)),
      responsePath: dataSourceDraft.responsePath.trim() || 'output',
      payload: parsedPayload,
    });

    setDataSourceDialogVisible(false);
    setDataSourceTargetPropKey(null);
  };

  const openGridResponsiveDialog = () => {
    setGridResponsiveDraft(normalizeResponsiveConfig(responsiveColSchema?.value));
    setActiveBreakpoint('xs');
    setGridResponsiveDialogVisible(true);
  };

  const updateBreakpointDraft = (breakpoint: GridBreakpoint, patch: { span?: number; offset?: number }) => {
    setGridResponsiveDraft((previous) => {
      const current = previous[breakpoint] ?? {};
      const next = {
        ...current,
        ...patch,
      };

      const normalized: { span?: number; offset?: number } = {};
      if (typeof next.span === 'number') {
        normalized.span = clampSpan(next.span);
      }
      if (typeof next.offset === 'number') {
        normalized.offset = clampOffset(next.offset);
      }

      return {
        ...previous,
        [breakpoint]: normalized,
      };
    });
  };

  const clearBreakpointDraft = (breakpoint: GridBreakpoint) => {
    setGridResponsiveDraft((previous) => {
      const next = { ...previous };
      delete next[breakpoint];
      return next;
    });
  };

  const applyGridResponsiveDraft = () => {
    updateActiveNodeProp('__responsiveCol', gridResponsiveDraft);
    setGridResponsiveDialogVisible(false);
  };

  const resetGridResponsiveDraft = () => {
    setGridResponsiveDraft({});
  };

  const activeBreakpointValue = gridResponsiveDraft[activeBreakpoint] ?? {};
  const activeSpan = typeof activeBreakpointValue.span === 'number' ? activeBreakpointValue.span : 6;
  const activeOffset = typeof activeBreakpointValue.offset === 'number' ? activeBreakpointValue.offset : 0;
  return (
    <div className="right-panel-body">
      {readOnlyBanner}
      <div className={readOnly ? 'builder-readonly-surface' : ''}>
      <Tabs
        className="config-panel-main-tabs"
        value={configMainTab}
        onChange={(v) => setConfigMainTab(String(v) === 'style' ? 'style' : 'props')}
      >
        <Tabs.TabPanel value="props" label="属性" destroyOnHide={false}>
      <div className="config-form"> 
        <div className="config-row">
          <span className="config-label">组件名称</span>
          <Input
            className="config-editor"
            clearable
            value={labelDraft}
            placeholder="请输入组件名称"
            onChange={(value) => setLabelDraft(String(value ?? ''))}
            onBlur={() => updateActiveNodeLabel(labelDraft)}
            size='small'
          />
        </div>

        <div className="config-row">
          <span className="config-label">组件标识</span>
          <Input
            size='small'
            className="config-editor"
            clearable
            value={keyDraft}
            status={keyError ? 'error' : 'default'}
            onChange={(value) => {
              setKeyDraft(String(value ?? ''));
              if (keyError) {
                setKeyError('');
              }
            }}
            onBlur={handleApplyNodeKey}
            onEnter={handleApplyNodeKey}
          />
        </div>
        <Collapse
          className="config-props-collapse config-props-collapse--airy"
          borderless
          defaultExpandAll
          expandIconPlacement="right"
          expandOnRowClick
        >
          {groupedEditableProps.map(([sectionTitle, rows]) => (
            <Collapse.Panel
              key={sectionTitle}
              value={sectionTitle}
              header={
                <span className="config-props-section-head">
                  <span className="config-props-section-head__icon" aria-hidden>
                    <LayoutIcon size="14px" />
                  </span>
                  <span className="config-props-section-head__text">{sectionTitle}</span>
                </span>
              }
            >
              <div className="config-props-group">
                {rows.map(([propKey, schema]) => (
                  <Row key={propKey} className="config-row" justify="space-between">
                    <span className="config-label">{schema.name ?? propKey}</span>
                    <div className="config-editor">{renderEditor(propKey, schema)}</div>
                  </Row>
                ))}
              </div>
            </Collapse.Panel>
          ))}
        </Collapse>

        {activeNode.type === 'Progress' ? (
          <>
            <div className="config-row">
              <span className="config-label">颜色</span>
              <div className="config-editor">
                <ColorPicker
                  value={String(propsMap.color?.value ?? '')}
                  onChange={(value) => updateActiveNodeProp('color', String(value ?? ''))}
                />
              </div>
            </div>
            <div className="config-row">
              <span className="config-label">轨道颜色</span>
              <div className="config-editor">
                <ColorPicker
                  value={String(propsMap.trackColor?.value ?? '')}
                  onChange={(value) => updateActiveNodeProp('trackColor', String(value ?? ''))}
                />
              </div>
            </div>
          </>
        ) : null}

        {activeNode.type === 'Grid.Col' ? (
          <div className="config-row">
            <span className="config-label">响应式占格</span>
            <div className="config-editor" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button size="small" variant="outline" onClick={openGridResponsiveDialog}>配置断点</Button>
            </div>
          </div>
        ) : null}

        {showBindingUI ? (
          <div className="config-row">
            <span className="config-label">动态绑定</span>
            <div className="config-editor">
              <Space direction="vertical" style={{ width: '100%' }} size={6}>
                <Button
                  size="small"
                  variant="outline"
                  disabled={readOnly}
                  onClick={openListBindingDialog}
                >
                  配置字段映射
                </Button>
                <div style={{ fontSize: 12, color: 'var(--td-text-color-secondary)' }}>
                  {listBindingMappings.length > 0
                    ? `已配置 ${listBindingMappings.length} 组映射`
                    : '尚未配置字段映射'}
                </div>
                {isInsideDynamicList ? (
                  <div style={{ fontSize: 12, color: dynamicListFieldError ? 'var(--td-error-color, #d54941)' : 'var(--td-text-color-secondary)' }}>
                    {dynamicListFieldError || `可用数据字段：${dynamicListFieldOptions.map((item) => item.value).join('、') || '无'}`}
                  </div>
                ) : null}
              </Space>
            </div>
          </div>
        ) : null}
      </div>
        </Tabs.TabPanel>
        <Tabs.TabPanel value="style" label="样式" destroyOnHide={false}>
          <NodeStyleTab
            nodeType={activeNode.type}
            targetKey={activeNode.key}
            readOnly={readOnly}
            value={styleValue}
            onChange={(nextStyle: Record<string, unknown>) => {
              if (!activeNode || activeNode.key !== activeNodeKey) {
                return;
              }
              updateActiveNodeProp('__style', nextStyle);
            }}
          />
        </Tabs.TabPanel>
      </Tabs>

      <Dialog
        visible={swiperDialogVisible}
        width="980px"
        header="配置轮播图片"
        closeOnOverlayClick={false}
        confirmBtn="应用"
        cancelBtn="取消"
        onConfirm={applySwiperImageDraft}
        onClose={() => setSwiperDialogVisible(false)}
        style={{ maxHeight: '90vh' }}
        destroyOnClose
      >
        <div style={{ marginBottom: 12 }}>
          <Button
            size="small"
            variant="outline"
            onClick={() => setSwiperImageDraft((previous) => [...previous, createSwiperImageRow()])}
          >
            增加一行
          </Button>
        </div>

        <div
          style={{
            maxHeight: 'min(480px, calc(100vh - 240px))',
            overflow: 'auto',
          }}
        >
        <Table
          rowKey="id"
          data={swiperImageDraft}
          columns={[
            {
              colKey: 'src',
              title: 'src',
              width: 320,
              cell: ({ row }: { row: SwiperImageRow }) => (
                <Space align="center" size={8} style={{ width: '100%' }}>
                  <Input
                    clearable
                    style={{ flex: 1, minWidth: 100 }}
                    placeholder="自定义 URL 或素材库"
                    value={row.src}
                    onChange={(value) =>
                      setSwiperImageDraft((previous) =>
                        previous.map((item) => (item.id === row.id ? { ...item, src: String(value ?? '') } : item)),
                      )
                    }
                  />
                  <Button
                    size="small"
                    variant="outline"
                    disabled={readOnly}
                    onClick={() => setAssetPickerTarget({ kind: 'swiper', rowId: row.id, field: 'src' })}
                  >
                    素材库
                  </Button>
                </Space>
              ),
            },
            {
              colKey: 'fallback',
              title: 'fallback',
              width: 320,
              cell: ({ row }: { row: SwiperImageRow }) => (
                <Space align="center" size={8} style={{ width: '100%' }}>
                  <Input
                    clearable
                    style={{ flex: 1, minWidth: 100 }}
                    placeholder="自定义 URL 或素材库"
                    value={row.fallback}
                    onChange={(value) =>
                      setSwiperImageDraft((previous) =>
                        previous.map((item) => (item.id === row.id ? { ...item, fallback: String(value ?? '') } : item)),
                      )
                    }
                  />
                  <Button
                    size="small"
                    variant="outline"
                    disabled={readOnly}
                    onClick={() => setAssetPickerTarget({ kind: 'swiper', rowId: row.id, field: 'fallback' })}
                  >
                    素材库
                  </Button>
                </Space>
              ),
            },
            {
              colKey: 'lazy',
              title: 'lazy',
              width: 88,
              cell: ({ row }: { row: SwiperImageRow }) => (
                <Switch
                  size="small"
                  value={row.lazy}
                  onChange={(value) =>
                    setSwiperImageDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, lazy: Boolean(value) } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'objectFit',
              title: 'objectFit',
              width: 140,
              cell: ({ row }: { row: SwiperImageRow }) => (
                <Select
                  size="small"
                  options={SWIPER_FIT_OPTIONS}
                  value={row.objectFit}
                  onChange={(value) =>
                    setSwiperImageDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, objectFit: String(value ?? 'cover') } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'objectPosition',
              title: 'objectPosition',
              width: 140,
              cell: ({ row }: { row: SwiperImageRow }) => (
                <Select
                  size="small"
                  options={SWIPER_POSITION_OPTIONS}
                  value={row.objectPosition}
                  onChange={(value) =>
                    setSwiperImageDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, objectPosition: String(value ?? 'center') } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'action',
              title: '操作',
              width: 90,
              cell: ({ row }: { row: SwiperImageRow }) => (
                <Space>
                  <Button
                    size="small"
                    variant="text"
                    theme="danger"
                    onClick={() =>
                      setSwiperImageDraft((previous) => previous.filter((item) => item.id !== row.id))
                    }
                  >
                    删除
                  </Button>
                </Space>
              ),
            },
          ]}
        />
        </div>
      </Dialog>

      <Dialog
        visible={tabsDialogVisible}
        width="980px"
        header="配置选项卡"
        closeOnOverlayClick={false}
        confirmBtn="应用"
        cancelBtn="取消"
        onConfirm={applyTabsDraft}
        onClose={() => {
          setTabsDialogVisible(false);
          setTabsTargetPropKey(null);
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <Button
            size="small"
            variant="outline"
            onClick={() => {
              const nextIndex = tabsDraft.length + 1;
              setTabsDraft((previous) => ([
                ...previous,
                createTabsRow({
                  value: `tab-${nextIndex}`,
                  label: `选项卡${nextIndex}`,
                }),
              ]));
            }}
          >
            增加一行
          </Button>
        </div>

        <Table
          rowKey="id"
          data={tabsDraft}
          columns={[
            {
              colKey: 'value',
              title: 'value(唯一标识)',
              width: 180,
              cell: ({ row }: { row: TabsRow }) => (
                <Input
                  clearable
                  value={row.value}
                  onChange={(value) =>
                    setTabsDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, value: String(value ?? '') } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'label',
              title: 'label(标题)',
              width: 180,
              cell: ({ row }: { row: TabsRow }) => (
                <Input
                  clearable
                  value={row.label}
                  onChange={(value) =>
                    setTabsDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, label: String(value ?? '') } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'disabled',
              title: '禁用',
              width: 78,
              cell: ({ row }: { row: TabsRow }) => (
                <Switch
                  size="small"
                  value={row.disabled}
                  onChange={(value) =>
                    setTabsDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, disabled: Boolean(value) } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'draggable',
              title: '可拖拽',
              width: 88,
              cell: ({ row }: { row: TabsRow }) => (
                <Switch
                  size="small"
                  value={row.draggable}
                  onChange={(value) =>
                    setTabsDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, draggable: Boolean(value) } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'removable',
              title: '可移除',
              width: 88,
              cell: ({ row }: { row: TabsRow }) => (
                <Switch
                  size="small"
                  value={row.removable}
                  onChange={(value) =>
                    setTabsDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, removable: Boolean(value) } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'lazy',
              title: '懒加载',
              width: 78,
              cell: ({ row }: { row: TabsRow }) => (
                <Switch
                  size="small"
                  value={row.lazy}
                  onChange={(value) =>
                    setTabsDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, lazy: Boolean(value) } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'destroyOnHide',
              title: '隐藏销毁',
              width: 94,
              cell: ({ row }: { row: TabsRow }) => (
                <Switch
                  size="small"
                  value={row.destroyOnHide}
                  onChange={(value) =>
                    setTabsDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, destroyOnHide: Boolean(value) } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'action',
              title: '操作',
              width: 78,
              cell: ({ row }: { row: TabsRow }) => (
                <Button
                  size="small"
                  variant="text"
                  theme="danger"
                  onClick={() => setTabsDraft((previous) => previous.filter((item) => item.id !== row.id))}
                >
                  删除
                </Button>
              ),
            },
          ]}
        />
      </Dialog>

      <Dialog
        visible={tableColumnsDialogVisible}
        width="1120px"
        header="配置表格列"
        closeOnOverlayClick={false}
        confirmBtn="应用"
        cancelBtn="取消"
        onConfirm={applyTableColumnsDraft}
        onClose={() => {
          setTableColumnsDialogVisible(false);
          setTableColumnsTargetPropKey(null);
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <Button
            size="small"
            variant="outline"
            onClick={() => {
              const nextIndex = tableColumnsDraft.length + 1;
              setTableColumnsDraft((previous) => ([
                ...previous,
                createTableColumnRow({
                  colKey: `column_${nextIndex}`,
                  title: `列${nextIndex}`,
                  width: 140,
                  align: 'left',
                  ellipsis: true,
                  sortType: '',
                  fixed: '',
                }),
              ]));
            }}
          >
            增加一列
          </Button>
        </div>

        <Table
          rowKey="id"
          data={tableColumnsDraft}
          columns={[
            {
              colKey: 'colKey',
              title: 'key(colKey)',
              width: 160,
              cell: ({ row }: { row: TableColumnRow }) => (
                <Input
                  clearable
                  value={row.colKey}
                  onChange={(value) =>
                    setTableColumnsDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, colKey: String(value ?? '') } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'title',
              title: '列名(title)',
              width: 180,
              cell: ({ row }: { row: TableColumnRow }) => (
                <Input
                  clearable
                  value={row.title}
                  onChange={(value) =>
                    setTableColumnsDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, title: String(value ?? '') } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'width',
              title: '宽度(width)',
              width: 118,
              cell: ({ row }: { row: TableColumnRow }) => (
                <InputNumber
                  size="small"
                  min={60}
                  max={480}
                  value={row.width}
                  onChange={(value) => {
                    const nextWidth = typeof value === 'number' && Number.isFinite(value) && value > 0
                      ? Math.round(value)
                      : undefined;
                    setTableColumnsDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, width: nextWidth } : item)),
                    );
                  }}
                />
              ),
            },
            {
              colKey: 'align',
              title: '对齐',
              width: 120,
              cell: ({ row }: { row: TableColumnRow }) => (
                <Select
                  size="small"
                  options={[
                    { label: '左对齐', value: 'left' },
                    { label: '居中', value: 'center' },
                    { label: '右对齐', value: 'right' },
                  ]}
                  value={row.align}
                  onChange={(value) =>
                    setTableColumnsDraft((previous) =>
                      previous.map((item) => (
                        item.id === row.id
                          ? {
                              ...item,
                              align: value === 'center' || value === 'right' ? value : 'left',
                            }
                          : item
                      )),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'ellipsis',
              title: '省略',
              width: 86,
              cell: ({ row }: { row: TableColumnRow }) => (
                <Switch
                  size="small"
                  value={row.ellipsis}
                  onChange={(value) =>
                    setTableColumnsDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, ellipsis: Boolean(value) } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'sortType',
              title: '排序',
              width: 128,
              cell: ({ row }: { row: TableColumnRow }) => (
                <Select
                  size="small"
                  options={[
                    { label: '无', value: '' },
                    { label: '双向', value: 'all' },
                    { label: '升序', value: 'asc' },
                    { label: '降序', value: 'desc' },
                  ]}
                  value={row.sortType}
                  onChange={(value) =>
                    setTableColumnsDraft((previous) =>
                      previous.map((item) => (
                        item.id === row.id
                          ? {
                              ...item,
                              sortType:
                                value === 'all' || value === 'asc' || value === 'desc'
                                  ? value
                                  : '',
                            }
                          : item
                      )),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'fixed',
              title: '固定',
              width: 120,
              cell: ({ row }: { row: TableColumnRow }) => (
                <Select
                  size="small"
                  options={[
                    { label: '不固定', value: '' },
                    { label: '左固定', value: 'left' },
                    { label: '右固定', value: 'right' },
                  ]}
                  value={row.fixed}
                  onChange={(value) =>
                    setTableColumnsDraft((previous) =>
                      previous.map((item) => (
                        item.id === row.id
                          ? {
                              ...item,
                              fixed: value === 'left' || value === 'right' ? value : '',
                            }
                          : item
                      )),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'action',
              title: '操作',
              width: 80,
              cell: ({ row }: { row: TableColumnRow }) => (
                <Button
                  size="small"
                  variant="text"
                  theme="danger"
                  onClick={() => setTableColumnsDraft((previous) => previous.filter((item) => item.id !== row.id))}
                >
                  删除
                </Button>
              ),
            },
          ]}
        />
      </Dialog>

      <Dialog
        visible={listBindingDialogVisible}
        width="720px"
        header="配置动态字段映射"
        closeOnOverlayClick={false}
        confirmBtn={{
          content: '应用映射',
          disabled: Boolean(isInsideDynamicList && dynamicListFieldError),
        }}
        cancelBtn="取消"
        onConfirm={applyListBindingDraft}
        onClose={() => setListBindingDialogVisible(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div style={{ fontSize: 12, color: 'var(--td-text-color-secondary)' }}>
            将动态列表当前数据项的字段映射到当前组件的可配置属性。一个组件可配置多组映射。
          </div>

          {isInsideDynamicList ? (
            <div style={{ fontSize: 12, color: dynamicListFieldError ? 'var(--td-error-color, #d54941)' : 'var(--td-text-color-secondary)' }}>
              {dynamicListFieldError || (
                dynamicListDataSourceConfig.type === 'flowCode'
                  ? `数据字段来源：流程代码节点「${dynamicListFlowCodeLabel || '-'}」`
                  : `数据字段来源：常量「${dynamicListConstantRecord?.name ?? '-'}」`
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--td-text-color-secondary)' }}>
              当前使用的是普通列表模板绑定。
            </div>
          )}

          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            {listBindingDraft.map((row) => (
              <div
                key={row.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr auto',
                  gap: 8,
                  alignItems: 'start',
                }}
              >
                <Select
                  options={bindableProps}
                  value={row.prop || undefined}
                  placeholder="选择目标组件属性"
                  onChange={(value) => {
                    const nextValue = String(value ?? '');
                    setListBindingDraft((previous) => previous.map((item) => (
                      item.id === row.id ? { ...item, prop: nextValue } : item
                    )));
                  }}
                />
                <Select
                  options={dynamicListFieldOptions}
                  value={row.field || undefined}
                  placeholder={
                    isInsideDynamicList
                      ? (dynamicListFieldError ? '当前数据源不可绑定' : '选择数据字段')
                      : '输入或选择数据字段'
                  }
                  disabled={Boolean(isInsideDynamicList && dynamicListFieldError)}
                  filterable
                  creatable={!isInsideDynamicList}
                  onChange={(value) => {
                    const nextValue = String(value ?? '');
                    setListBindingDraft((previous) => previous.map((item) => (
                      item.id === row.id ? { ...item, field: nextValue } : item
                    )));
                  }}
                />
                <Button
                  variant="text"
                  theme="danger"
                  disabled={listBindingDraft.length <= 1}
                  onClick={() => {
                    setListBindingDraft((previous) => previous.filter((item) => item.id !== row.id));
                  }}
                >
                  删除
                </Button>
              </div>
            ))}
          </Space>

          <div>
            <Button
              size="small"
              variant="outline"
              disabled={Boolean(dynamicListFieldError)}
              onClick={() => {
                setListBindingDraft((previous) => [...previous, createListBindingDraftRow()]);
              }}
            >
              新增映射
            </Button>
          </div>
        </Space>
      </Dialog>

      <Dialog
        visible={dataSourceDialogVisible}
        width="760px"
        header="配置数据源"
        closeOnOverlayClick={false}
        confirmBtn="应用"
        cancelBtn="取消"
        onConfirm={applyDataSourceConfigDraft}
        onClose={() => {
          setDataSourceDialogVisible(false);
          setDataSourceTargetPropKey(null);
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div className="config-row">
            <span className="config-label">数据来源</span>
            <div className="config-editor">
              <Select
                value={dataSourceDraft.type}
                options={dataSourceTypeSelectOptions}
                onChange={(value) => {
                  const nextType = String(value ?? 'static') as ComponentDataSourceType;
                  setDataSourceDraft((previous) => ({
                    ...previous,
                    type: nextType,
                    ...(nextType !== 'constant' ? { constantId: '' } : {}),
                    ...(nextType !== 'flowCode' ? { flowCodeNodeId: '' } : {}),
                  }));
                }}
              />
            </div>
          </div>

          {dataSourceDraft.type === 'constant' ? (
            <div className="config-row">
              <span className="config-label">常量</span>
              <div className="config-editor">
                <Select
                  loading={dataSourceLoading}
                  value={dataSourceDraft.constantId || undefined}
                  options={dataConstantOptions.map((item) => ({
                    label: item.name,
                    value: item.id,
                  }))}
                  placeholder="请选择常量"
                  onChange={(value) =>
                    setDataSourceDraft((previous) => ({
                      ...previous,
                      constantId: String(value ?? ''),
                    }))
                  }
                />
              </div>
            </div>
          ) : null}

          {dataSourceDraft.type === 'flowCode' ? (
            <div className="config-row">
              <span className="config-label">代码节点</span>
              <div className="config-editor">
                <Select
                  value={dataSourceDraft.flowCodeNodeId || undefined}
                  options={flowUpstreamCodeSelectOptions}
                  placeholder={
                    flowUpstreamCodeSelectOptions.length === 0
                      ? '请先在流程图中从代码节点连到本组件节点'
                      : '请选择上游代码节点'
                  }
                  onChange={(value) =>
                    setDataSourceDraft((previous) => ({
                      ...previous,
                      flowCodeNodeId: String(value ?? ''),
                    }))
                  }
                />
              </div>
            </div>
          ) : null}

          {dataSourceDraft.type === 'dataTable' ? (
            <>
              <div className="config-row">
                <span className="config-label">数据表</span>
                <div className="config-editor">
                  <Select
                    loading={dataSourceLoading}
                    value={dataSourceDraft.tableId || undefined}
                    options={dataTableOptions.map((item) => ({
                      label: item.name,
                      value: item.id,
                    }))}
                    placeholder="请选择数据表"
                    onChange={(value) =>
                      setDataSourceDraft((previous) => ({
                        ...previous,
                        tableId: String(value ?? ''),
                      }))
                    }
                  />
                </div>
              </div>
              <Row gutter={12}>
                <div style={{ flex: 1 }}>
                  <div className="config-row">
                    <span className="config-label">页码</span>
                    <div className="config-editor">
                      <InputNumber
                        min={1}
                        value={dataSourceDraft.page}
                        onChange={(value) =>
                          setDataSourceDraft((previous) => ({
                            ...previous,
                            page: typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.round(value)) : 1,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="config-row">
                    <span className="config-label">每页</span>
                    <div className="config-editor">
                      <InputNumber
                        min={1}
                        value={dataSourceDraft.pageSize}
                        onChange={(value) =>
                          setDataSourceDraft((previous) => ({
                            ...previous,
                            pageSize: typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.round(value)) : 20,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </Row>
            </>
          ) : null}

          {dataSourceDraft.type === 'cloudFunction' ? (
            <>
              <div className="config-row">
                <span className="config-label">云函数</span>
                <div className="config-editor">
                  <Select
                    loading={dataSourceLoading}
                    value={dataSourceDraft.functionId || undefined}
                    options={cloudFunctionOptions.map((item) => ({
                      label: item.name,
                      value: item.id,
                    }))}
                    placeholder="请选择云函数"
                    onChange={(value) =>
                      setDataSourceDraft((previous) => ({
                        ...previous,
                        functionId: String(value ?? ''),
                      }))
                    }
                  />
                </div>
              </div>
              <div className="config-row">
                <span className="config-label">结果路径</span>
                <div className="config-editor">
                  <Input
                    clearable
                    value={dataSourceDraft.responsePath}
                    placeholder="默认 output，例如 output.list"
                    onChange={(value) =>
                      setDataSourceDraft((previous) => ({
                        ...previous,
                        responsePath: String(value ?? ''),
                      }))
                    }
                  />
                </div>
              </div>
              <div className="config-row">
                <span className="config-label">调用参数</span>
                <div className="config-editor">
                  <Textarea
                    autosize={{ minRows: 4, maxRows: 8 }}
                    value={dataSourceDraft.payloadText}
                    onChange={(value) =>
                      setDataSourceDraft((previous) => ({
                        ...previous,
                        payloadText: String(value ?? ''),
                      }))
                    }
                  />
                </div>
              </div>
            </>
          ) : null}
        </Space>
      </Dialog>

      <Dialog
        visible={gridResponsiveDialogVisible}
        width="760px"
        header={(
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span>Grid.Col 响应式配置</span>
            <Popup
              trigger="hover"
              placement="right"
              showArrow
              content={(
                <div style={{ maxWidth: 360, lineHeight: '20px' }}>
                  编辑器中采用“断点独立命中”语义：每个断点未配置时，回退到基础 span/offset。<br />
                  预览渲染时会自动转换为 TDesign 级联断点参数，保证渲染层兼容而不改变编辑体验。
                </div>
              )}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: '#8b92a1',
                  cursor: 'help',
                }}
              >
                <HelpCircleIcon size="16px" />
              </span>
            </Popup>
          </div>
        )}
        className="grid-responsive-config-dialog"
        closeOnOverlayClick={false}
        confirmBtn="应用配置"
        cancelBtn="取消"
        onConfirm={applyGridResponsiveDraft}
        onClose={() => setGridResponsiveDialogVisible(false)}
      >
        <div className="grid-responsive-config">
          <div className="grid-responsive-config__top">
            <div className="grid-responsive-config__meta">
              <Tag variant="light">模拟器宽度：{simulatorWidth}px</Tag>
              <Tag theme="primary" variant="light">当前命中：{simulatorBreakpoint}</Tag>
            </div>

            <div className="grid-responsive-config__breakpoint-wrap">
              <span className="grid-responsive-config__breakpoint-label">断点</span>
              <Select
                className="grid-responsive-config__breakpoint-select"
                value={activeBreakpoint}
                options={GRID_BREAKPOINTS.map((breakpoint) => ({
                  label: `${BREAKPOINT_LABEL_MAP[breakpoint]} · ${BREAKPOINT_DEVICE_MAP[breakpoint]}`,
                  value: breakpoint,
                }))}
                onChange={(value) => setActiveBreakpoint(String(value ?? 'xs') as GridBreakpoint)}
              />
            </div>
          </div>

          <div className="grid-responsive-config__head">
            <Typography.Text>{BREAKPOINT_LABEL_MAP[activeBreakpoint]}</Typography.Text>
            <Space size={8}>
              <Button size="small" variant="outline" onClick={() => clearBreakpointDraft(activeBreakpoint)}>清空当前断点</Button>
              <Button size="small" variant="outline" onClick={resetGridResponsiveDraft}>重置全部</Button>
            </Space>
          </div>

          <div className="grid-responsive-config__section">
            <div className="grid-responsive-config__row">
              <Typography.Text>占格数（span）</Typography.Text>
              <Typography.Text>{activeSpan}</Typography.Text>
            </div>
            <div className="grid-responsive-config__sub-label">可选范围 0 - 12，0 表示不占据列宽</div>
            <Slider
              className="grid-responsive-config__slider"
              min={0}
              max={12}
              step={1}
              value={activeSpan}
              onChange={(value) => updateBreakpointDraft(activeBreakpoint, { span: Number(value) })}
            />
            <Space size={8} style={{ marginTop: 8, flexWrap: 'wrap' }}>
              {GRID_PRESET_OPTIONS.map((option) => (
                <Button
                  key={option.label}
                  size="small"
                  variant="outline"
                  onClick={() => updateBreakpointDraft(activeBreakpoint, { span: option.value })}
                >
                  {option.label}
                </Button>
              ))}
            </Space>
          </div>

          <div className="grid-responsive-config__section">
            <div className="grid-responsive-config__row">
              <Typography.Text>左侧偏移（offset）</Typography.Text>
              <Typography.Text>{activeOffset}</Typography.Text>
            </div>
            <div className="grid-responsive-config__sub-label">可选范围 0 - 11，表示左侧空出格数</div>
            <Slider
              className="grid-responsive-config__slider"
              min={0}
              max={11}
              step={1}
              value={activeOffset}
              onChange={(value) => updateBreakpointDraft(activeBreakpoint, { offset: Number(value) })}
            />
          </div>

          <div className="grid-responsive-config__preview">
            {Array.from({ length: 12 }).map((_, index) => {
              const inOffset = index < activeOffset;
              const inSpan = index >= activeOffset && index < activeOffset + activeSpan;
              return (
                <div
                  key={`grid-cell-${index}`}
                  className={`grid-responsive-config__cell${inSpan ? ' is-span' : ''}${inOffset ? ' is-offset' : ''}`}
                >
                  {index + 1}
                </div>
              );
            })}
          </div>
        </div>
      </Dialog>

      <IconPickerModal
        visible={iconPickerPropKey !== null}
        propKey={iconPickerPropKey ?? ''}
        readOnly={readOnly}
        value={
          iconPickerPropKey
            ? String(
                ((activeNode.props ?? {})[iconPickerPropKey] as { value?: unknown } | undefined)?.value ?? '',
              )
            : ''
        }
        quickFilter={iconPickerPropKey ? iconQuickFilters[iconPickerPropKey] ?? 'all' : 'all'}
        initialFilter={iconPickerPropKey ? iconInitialFilters[iconPickerPropKey] ?? 'all' : 'all'}
        onQuickFilterChange={(next) => {
          if (!iconPickerPropKey) {
            return;
          }
          setIconQuickFilters((previous) => ({
            ...previous,
            [iconPickerPropKey]: next,
          }));
        }}
        onInitialFilterChange={(next) => {
          if (!iconPickerPropKey) {
            return;
          }
          setIconInitialFilters((previous) => ({
            ...previous,
            [iconPickerPropKey]: next,
          }));
        }}
        onSelect={(iconName) => {
          if (!iconPickerPropKey) {
            return;
          }
          updateActiveNodeProp(iconPickerPropKey, iconName);
        }}
        onClear={() => {
          if (!iconPickerPropKey) {
            return;
          }
          updateActiveNodeProp(iconPickerPropKey, '');
        }}
        onClose={() => setIconPickerPropKey(null)}
      />

      <AssetPickerModal
        visible={assetPickerTarget !== null}
        workspaceMode={workspaceMode}
        teamId={currentTeamId ?? undefined}
        onClose={() => {
          setAssetPickerTarget(null);
        }}
        onConfirm={(url) => {
          const target = assetPickerTarget;
          if (!target) {
            return;
          }
          if (target.kind === 'prop') {
            updateActiveNodeProp(target.propKey, url);
            setInputDrafts((previous) => ({
              ...previous,
              [target.propKey]: url,
            }));
          } else {
            const { rowId, field } = target;
            setSwiperImageDraft((previous) =>
              previous.map((item) => (item.id === rowId ? { ...item, [field]: url } : item)),
            );
            MessagePlugin.success('已填入素材地址');
          }
          setAssetPickerTarget(null);
        }}
      />
      </div>
    </div>
  );
};

export default React.memo(ComponentConfigPanel);
