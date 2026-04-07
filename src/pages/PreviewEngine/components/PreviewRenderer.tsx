import React from 'react';
import { Avatar, Button, Card, Col, Divider, Image, Row, Space, Switch, Swiper, Typography, Layout, Calendar, ColorPicker, TimePicker, TimeRangePicker, InputNumber, Slider, Steps, List, Link, Tabs, BackTop, Menu, Drawer, Progress, Upload, Input, Textarea, Table, Statistic, Collapse } from 'tdesign-react';
import ReactECharts from 'echarts-for-react';
import type { Edge, Node } from '@xyflow/react';
import type { UiTreeNode } from '../../../builder/store/types';
import { getNodeSlotKey, isSlotNode } from '../../../builder/utils/slot';
import { convertResponsiveConfigToTDesignProps, normalizeResponsiveConfig } from '../../../builder/utils/gridResponsive';
import type { ComponentLifecycleHandler, ListRecord, SwiperImageItem } from '../../../types/component';
import { CORE_LIFETIMES, LIST_PREVIEW_DATA } from '../../../constants/componentBuilder';
import { renderNamedIcon } from '../../../constants/iconRegistry';
import { getTabsSlotNodeByValue, normalizeTabsList, normalizeTabsValue } from '../../../builder/utils/tabs';
import {
  getCollapseHeaderSlotNodeByValue,
  getCollapsePanelSlotNodeByValue,
  normalizeCollapseList,
  normalizeCollapseValue,
} from '../../../builder/utils/collapse';
import { createPreviewDataHub } from '../runtime/dataHub';
import { createPreviewFlowRuntime, type PreviewFlowRuntime } from '../runtime/flowRuntime';
import { getDataConstantList } from '../../../api/dataConstant';
import { executeCloudFunction } from '../../../api/cloudFunction';
import { getDataTableRecords } from '../../../api/dataTable';
import { getStoredCurrentTeamId, getStoredWorkspaceMode } from '../../../team/storage';
import { buildEChartOption, normalizeEChartDataSource } from '../../../utils/echart';
import { ensureBuiltInChinaMap } from '../../../utils/echartMap';
import { normalizeDataSourceConfig, pickByPath, type ComponentDataSourceConfig } from '../../../types/dataSource';
import type { EChartSeriesType } from '../../../constants/echart';
import { CHART_COMPONENT_TYPE_MAP } from '../../../constants/echart';
import type { ResourceOwnerType } from '../../../api/types';
import {
  applyInstanceSlotsToTemplate,
  applyExposedPropsToTemplate,
  cloneTemplateUiTree,
  getNodeStringProp,
  loadCustomComponentDetail,
  resolveExposedLifecycleMappings,
  resolveExposedLifecycles,
} from '../../../utils/customComponentRuntime';
import { resolveSimulatorStyle } from '../../../builder/utils/simulatorStyle';
import type { PreviewDataHub } from '../runtime/dataHub';

const PreviewDataHubRefContext = React.createContext<React.RefObject<PreviewDataHub | null>>({ current: null });

export { PreviewDataHubRefContext };

interface PreviewRendererProps {
  node: UiTreeNode;
  onLifecycle?: ComponentLifecycleHandler;
}

/** 与数组引用无关的稳定 key，避免父级重渲染时 lifetimes 新数组引用导致 mount effect 反复执行。 */
function getLifetimesContentKey(node: UiTreeNode): string {
  if (!Array.isArray(node.lifetimes)) {
    return '';
  }

  return node.lifetimes.map((item) => String(item)).sort().join('\u0001');
}

/** 节点展示数据是否变化（忽略 props/children 引用抖动导致误触发 onUpdated）。 */
function getPreviewNodeRevisionKey(node: UiTreeNode): string {
  try {
    return JSON.stringify({
      key: node.key,
      label: node.label,
      type: node.type,
      props: node.props,
      childKeys: (node.children ?? []).map((c) => c.key),
    });
  } catch {
    return `${node.key}:${String(node.label)}:${String(node.type)}:${(node.children ?? []).map((c) => c.key).join(',')}`;
  }
}

function shouldEmitCoreLifetime(lifetimes: string[], lifetime: string): boolean {
  if (lifetimes.includes(lifetime)) {
    return true;
  }

  if (lifetimes.length > 0) {
    return false;
  }

  return CORE_LIFETIMES.includes(lifetime);
}

const getProp = (node: UiTreeNode, propName: string) => {
  const prop = node?.props?.[propName] as { value?: unknown } | undefined;
  return prop?.value;
};

const getNumberProp = (node: UiTreeNode, propName: string) => {
  const value = getProp(node, propName);
  return typeof value === 'number' ? value : undefined;
};

const getGridNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const getStringProp = (node: UiTreeNode, propName: string) => {
  const value = getProp(node, propName);
  return typeof value === 'string' ? value : undefined;
};

const getTextProp = (node: UiTreeNode, propName: string) => {
  const value = getProp(node, propName);
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
};

const resolvePreviewPathFromHref = (href: string) => {
  const text = String(href ?? '').trim();
  if (!text) {
    return '';
  }

  try {
    const parsed = new URL(text, window.location.origin);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return text;
  }
};

const navigatePreviewByHref = (href: string) => {
  const targetPath = resolvePreviewPathFromHref(href);
  if (!targetPath) {
    return;
  }

  const router = (window.dataHub as { router?: { push?: (path: string) => unknown } } | undefined)?.router;
  if (router?.push) {
    router.push(targetPath);
    return;
  }

  window.location.href = targetPath;
};

const getCalendarValueProp = (node: UiTreeNode, propName: string) => {
  const value = getProp(node, propName);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  return undefined;
};

const getBooleanProp = (node: UiTreeNode, propName: string) => {
  const value = getProp(node, propName);
  return typeof value === 'boolean' ? value : undefined;
};

const getStyleProp = (node: UiTreeNode) => {
  const value = getProp(node, '__style');
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return resolveSimulatorStyle(value as React.CSSProperties);
};

const getStringArrayProp = (node: UiTreeNode, propName: string) => {
  const value = getProp(node, propName);
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\r?\n|,|，/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const getSwiperImages = (node: UiTreeNode): SwiperImageItem[] => {
  const value = getProp(node, 'images');
  if (Array.isArray(value)) {
    return value
      .filter((item) => !!item && typeof item === 'object')
      .map((item) => {
        const record = item as Partial<SwiperImageItem>;
        return {
          src: String(record.src ?? '').trim(),
          fallback: String(record.fallback ?? '').trim(),
          lazy: typeof record.lazy === 'boolean' ? record.lazy : true,
          objectFit: String(record.objectFit ?? 'cover'),
          objectPosition: String(record.objectPosition ?? 'center'),
        };
      })
      .filter((item) => !!item.src);
  }

  return getStringArrayProp(node, 'images').map((src) => ({
    src,
    fallback: '',
    lazy: true,
    objectFit: 'cover',
    objectPosition: 'center',
  }));
};

const getTimeStepsProp = (node: UiTreeNode) => {
  const value = getProp(node, 'steps');
  const toValidStep = (input: unknown) => {
    const parsed = Number(input);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 1;
    }
    return Math.max(1, Math.round(parsed));
  };

  if (Array.isArray(value)) {
    const list = value.slice(0, 3).map((item) => toValidStep(item));
    if (list.length === 3) {
      return list;
    }
    return [1, 1, 1];
  }

  if (typeof value === 'string') {
    const list = value
      .split(/,|，|\s+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3)
      .map((item) => toValidStep(item));

    if (list.length === 3) {
      return list;
    }
  }

  return [1, 1, 1];
};

const getTimeRangeValueProp = (node: UiTreeNode, propName: string) => {
  const values = getStringArrayProp(node, propName).slice(0, 2);
  if (values.length === 2) {
    return values;
  }

  return undefined;
};

const getInputNumberValueProp = (node: UiTreeNode, propName: string) => {
  const value = getProp(node, propName);
  if (typeof value === 'number') {
    return Number.isNaN(value) ? undefined : value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  return undefined;
};

const getFiniteNumberProp = (node: UiTreeNode, propName: string) => {
  const value = getProp(node, propName);
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const getSliderValueProp = (node: UiTreeNode, propName: string): number | [number, number] | undefined => {
  const value = getProp(node, propName);
  const parseNumber = (input: unknown) => {
    if (typeof input === 'number' && Number.isFinite(input)) {
      return input;
    }

    if (typeof input === 'string' && input.trim()) {
      const parsed = Number(input);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  };

  const parseArrayValue = (list: unknown[]) => {
    const numbers = list.map((item) => parseNumber(item)).filter((item): item is number => typeof item === 'number');
    if (numbers.length >= 2) {
      return [numbers[0], numbers[1]] as [number, number];
    }

    if (numbers.length === 1) {
      return [numbers[0], numbers[0]] as [number, number];
    }

    return undefined;
  };

  if (Array.isArray(value)) {
    return parseArrayValue(value);
  }

  const numberValue = parseNumber(value);
  if (typeof numberValue === 'number') {
    return numberValue;
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return undefined;
    }

    if (text.startsWith('[') && text.endsWith(']')) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return parseArrayValue(parsed);
        }
      } catch {
        return undefined;
      }
    }

    const chunks = text
      .split(/,|，|\s+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (chunks.length >= 2) {
      return parseArrayValue(chunks);
    }
  }

  return undefined;
};

const getStepsCurrentProp = (node: UiTreeNode, propName: string): string | number | undefined => {
  const value = getProp(node, propName);
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return undefined;
    }

    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : text;
  }

  return undefined;
};

const getTabsListProp = (node: UiTreeNode) => normalizeTabsList(getProp(node, 'list'));
const getTabsControlledValue = (node: UiTreeNode) => normalizeTabsValue(getProp(node, 'value'));
const getTabsDefaultValue = (node: UiTreeNode) => normalizeTabsValue(getProp(node, 'defaultValue'));

const getMenuValueProp = (node: UiTreeNode, propName: string): string | number | undefined => {
  const value = getProp(node, propName);
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return undefined;
    }

    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : text;
  }

  return undefined;
};

const getMenuValueArrayProp = (node: UiTreeNode, propName: string): Array<string | number> | undefined => {
  const value = getProp(node, propName);

  if (Array.isArray(value)) {
    const normalized = value
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

    return normalized.length ? normalized : undefined;
  }

  if (typeof value === 'string') {
    const normalized = value
      .split(/\r?\n|,|，/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const parsed = Number(item);
        return Number.isFinite(parsed) ? parsed : item;
      });

    return normalized.length ? normalized : undefined;
  }

  return undefined;
};

const getMenuWidthProp = (node: UiTreeNode, propName: string): string | number | Array<string | number> | undefined => {
  const value = getProp(node, propName);

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => {
        if (typeof item === 'number' && Number.isFinite(item)) {
          return item;
        }

        if (typeof item === 'string') {
          const text = item.trim();
          return text || undefined;
        }

        return undefined;
      })
      .filter((item): item is string | number => typeof item !== 'undefined');

    return normalized.length ? normalized : undefined;
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return undefined;
    }

    const chunks = text
      .split(/,|，/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (chunks.length >= 2) {
      return chunks.slice(0, 2);
    }

    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : text;
  }

  return undefined;
};

const getBackTopOffsetProp = (node: UiTreeNode, propName: string): [string | number, string | number] | undefined => {
  const value = getProp(node, propName);

  if (Array.isArray(value) && value.length >= 2) {
    return [value[0] as string | number, value[1] as string | number];
  }

  if (typeof value === 'string') {
    const chunks = value
      .split(/,|，/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (chunks.length >= 2) {
      return [chunks[0], chunks[1]];
    }
  }

  return undefined;
};

const getBackTopVisibleHeightProp = (node: UiTreeNode, propName: string): string | number | undefined => {
  const value = getProp(node, propName);

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return undefined;
};

const getBackTopTargetProp = (node: UiTreeNode, propName: string) => {
  const target = getStringProp(node, propName);
  return target || 'body';
};

const getBackTopContainerProp = () => {
  return () => (document.querySelector('[data-preview-scroll-container="true"]') as HTMLElement | null) ?? document.body;
};

const getBackTopContentNode = (node: UiTreeNode) => {
  const text = getTextProp(node, 'content');
  const iconNode = renderNamedIcon(getStringProp(node, 'iconName'), {
    size: getStringProp(node, 'size') === 'small' ? 16 : 20,
    strokeWidth: 2,
  });

  if (!iconNode) {
    return text || undefined;
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{iconNode}</span>
      {text ? <span>{text}</span> : null}
    </span>
  );
};

const getDrawerHeaderProp = (node: UiTreeNode): string | boolean => {
  const showHeader = getBooleanProp(node, 'showHeader') !== false;
  if (!showHeader) {
    return false;
  }

  const headerText = getStringProp(node, 'header')?.trim();
  return headerText || true;
};

const getDrawerFooterProp = (node: UiTreeNode): boolean => {
  return getBooleanProp(node, 'footer') !== false;
};

const getDrawerSizeDraggableProp = (node: UiTreeNode): boolean | { min: number; max: number } | undefined => {
  const enabled = getBooleanProp(node, 'sizeDraggable') === true;
  if (!enabled) {
    return undefined;
  }

  const min = getNumberProp(node, 'sizeDragMin');
  const max = getNumberProp(node, 'sizeDragMax');
  if (typeof min === 'number' && typeof max === 'number' && min > 0 && max >= min) {
    return { min, max };
  }

  return true;
};

const getProgressColorProp = (node: UiTreeNode, propName: string): string | string[] | Record<string, string> | undefined => {
  const value = getProp(node, propName);

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return undefined;
    }

    if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          const list = parsed.map((item) => String(item).trim()).filter(Boolean);
          return list.length ? list : undefined;
        }

        if (parsed && typeof parsed === 'object') {
          const entries = Object.entries(parsed as Record<string, unknown>)
            .map(([key, item]) => [key, String(item).trim()] as const)
            .filter(([, item]) => !!item);
          return entries.length ? Object.fromEntries(entries) : undefined;
        }
      } catch {
        return text;
      }
    }

    const splitList = text.split(/,|，/).map((item) => item.trim()).filter(Boolean);
    if (splitList.length >= 2) {
      return splitList;
    }

    return text;
  }

  if (Array.isArray(value)) {
    const list = value.map((item) => String(item).trim()).filter(Boolean);
    return list.length ? list : undefined;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, String(item).trim()] as const)
      .filter(([, item]) => !!item);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }

  return undefined;
};

const getProgressLabelProp = (node: UiTreeNode): string | boolean => {
  if (getBooleanProp(node, 'showLabel') === false) {
    return false;
  }

  const text = getStringProp(node, 'labelText')?.trim();
  return text || true;
};

const getProgressSizeProp = (node: UiTreeNode, propName: string): string | number | undefined => {
  const value = getProp(node, propName);

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return undefined;
    }

    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : text;
  }

  return undefined;
};

const getProgressStatusProp = (node: UiTreeNode): string | undefined => {
  const status = getStringProp(node, 'status')?.trim();
  if (!status || status === 'default') {
    return undefined;
  }

  return status;
};

const getUploadAbridgeNameProp = (node: UiTreeNode, propName: string): [number, number] | undefined => {
  const value = getProp(node, propName);

  const normalize = (input: unknown[]) => {
    const numbers = input
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item >= 0)
      .map((item) => Math.round(item));

    if (numbers.length >= 2) {
      return [numbers[0], numbers[1]] as [number, number];
    }

    return undefined;
  };

  if (Array.isArray(value)) {
    return normalize(value);
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return normalize(parsed);
      }
    } catch {
      const chunks = text.split(/,|，/).map((item) => item.trim()).filter(Boolean);
      return normalize(chunks);
    }
  }

  return undefined;
};

const getUploadFileListProp = (node: UiTreeNode, propName: string): Array<Record<string, unknown>> | undefined => {
  const value = getProp(node, propName);

  if (Array.isArray(value)) {
    return value.filter((item) => !!item && typeof item === 'object') as Array<Record<string, unknown>>;
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => !!item && typeof item === 'object') as Array<Record<string, unknown>>;
      }
    } catch {
      return undefined;
    }
  }

  return undefined;
};

const getUploadObjectProp = (node: UiTreeNode, propName: string): Record<string, unknown> | undefined => {
  const value = getProp(node, propName);

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
      return undefined;
    }
  }

  return undefined;
};

const getUploadSizeLimitProp = (node: UiTreeNode, propName: string): number | Record<string, unknown> | undefined => {
  const value = getProp(node, propName);

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string' && value.trim()) {
    const text = value.trim();
    const parsedNumber = Number(text);
    if (Number.isFinite(parsedNumber)) {
      return parsedNumber;
    }

    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'number' && Number.isFinite(parsed)) {
        return parsed;
      }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return undefined;
    }
  }

  return undefined;
};

const getUploadStatusProp = (node: UiTreeNode, propName: string): string | undefined => {
  const value = getStringProp(node, propName)?.trim();
  if (!value || value === 'default') {
    return undefined;
  }

  return value;
};

const getListDataSource = (node: UiTreeNode): ListRecord[] => {
  const value = getProp(node, 'dataSource');
  if (Array.isArray(value)) {
    const arrayValue = value.filter((item) => !!item && typeof item === 'object') as ListRecord[];
    return arrayValue.length ? arrayValue : LIST_PREVIEW_DATA;
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        const arrayValue = parsed.filter((item) => !!item && typeof item === 'object') as ListRecord[];
        return arrayValue.length ? arrayValue : LIST_PREVIEW_DATA;
      }
    } catch {
      return LIST_PREVIEW_DATA;
    }
  }

  return LIST_PREVIEW_DATA;
};

const TABLE_FALLBACK_DATA: Array<Record<string, unknown>> = [
  { id: 'row-1', name: '张三', role: '管理员', status: '启用' },
  { id: 'row-2', name: '李四', role: '编辑', status: '启用' },
  { id: 'row-3', name: '王五', role: '访客', status: '禁用' },
];
const TABLE_FALLBACK_COLUMNS: Array<Record<string, unknown>> = [
  { colKey: 'name', title: '姓名', width: 140, align: 'left', ellipsis: true },
  { colKey: 'role', title: '角色', width: 120, align: 'left', ellipsis: true },
  { colKey: 'status', title: '状态', width: 120, align: 'center', ellipsis: true },
];

const normalizePreviewTableColumns = (node: UiTreeNode): Array<Record<string, unknown>> => {
  const value = getProp(node, 'columns');
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => !!item && typeof item === 'object')
    .map((item) => item as Record<string, unknown>)
    .map((item, index) => {
      const colKey = String(item.colKey ?? '').trim();
      if (!colKey) {
        return null;
      }

      const title = String(item.title ?? '').trim() || `列${index + 1}`;
      const widthRaw = item.width;
      const width = typeof widthRaw === 'number' && Number.isFinite(widthRaw) ? Math.round(widthRaw) : undefined;
      const align = item.align === 'center' || item.align === 'right' ? item.align : 'left';
      const ellipsis = typeof item.ellipsis === 'boolean' ? item.ellipsis : true;
      const sortType = item.sortType === 'all' || item.sortType === 'asc' || item.sortType === 'desc' ? item.sortType : undefined;
      const fixed = item.fixed === 'left' || item.fixed === 'right' ? item.fixed : undefined;

      const column: Record<string, unknown> = {
        colKey,
        title,
        align,
        ellipsis,
      };

      if (typeof width === 'number' && width > 0) {
        column.width = width;
      }
      if (sortType) {
        column.sortType = sortType;
      }
      if (fixed) {
        column.fixed = fixed;
      }

      return column;
    })
    .filter((item): item is Record<string, unknown> => !!item);
};

const getTableDataSource = (node: UiTreeNode): Array<Record<string, unknown>> => {
  const value = getProp(node, 'dataSource');
  if (Array.isArray(value)) {
    const rows = value.filter((item) => !!item && typeof item === 'object') as Array<Record<string, unknown>>;
    return rows.length > 0 ? rows : TABLE_FALLBACK_DATA;
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        const rows = parsed.filter((item) => !!item && typeof item === 'object') as Array<Record<string, unknown>>;
        return rows.length > 0 ? rows : TABLE_FALLBACK_DATA;
      }
    } catch {
      return TABLE_FALLBACK_DATA;
    }
  }

  return TABLE_FALLBACK_DATA;
};

const resolvePreviewAccessContext = (): { ownerType: ResourceOwnerType; ownerTeamId?: string } => {
  const workspaceMode = getStoredWorkspaceMode();
  const teamId = getStoredCurrentTeamId() || undefined;
  if (workspaceMode === 'team' && teamId) {
    return { ownerType: 'team', ownerTeamId: teamId };
  }
  return { ownerType: 'user' };
};

const normalizeRowsFromUnknown = (
  source: unknown,
  fallback: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> => {
  if (Array.isArray(source)) {
    const rows = source.filter((item) => !!item && typeof item === 'object') as Array<Record<string, unknown>>;
    return rows.length > 0 ? rows : fallback;
  }

  if (source && typeof source === 'object') {
    return [source as Record<string, unknown>];
  }

  if (typeof source === 'string' && source.trim()) {
    try {
      const parsed = JSON.parse(source);
      return normalizeRowsFromUnknown(parsed, fallback);
    } catch {
      return fallback;
    }
  }

  return fallback;
};

const resolveDataBySourceConfig = async (
  config: ComponentDataSourceConfig,
  fallback: unknown,
): Promise<unknown> => {
  const accessContext = resolvePreviewAccessContext();

  if (config.type === 'constant') {
    if (!config.constantId) {
      return fallback;
    }
    const result = await getDataConstantList({
      ...accessContext,
      page: 1,
      pageSize: 200,
    });
    const matched = (result.list ?? []).find((item) => item.id === config.constantId);
    return matched?.value ?? fallback;
  }

  if (config.type === 'dataTable') {
    if (!config.tableId) {
      return fallback;
    }
    const result = await getDataTableRecords(config.tableId, {
      ...accessContext,
      page: config.page ?? 1,
      pageSize: config.pageSize ?? 20,
    });
    const list = Array.isArray(result.list) ? result.list : [];
    return list.map((item) => ({
      id: item.id,
      ...(item.data ?? {}),
    }));
  }

  if (config.type === 'cloudFunction') {
    if (!config.functionId) {
      return fallback;
    }
    const result = await executeCloudFunction(
      config.functionId,
      { payload: config.payload ?? {} },
      accessContext,
    );
    const responsePath = String(config.responsePath ?? '').trim() || 'output';
    return pickByPath(result, responsePath) ?? fallback;
  }

  return fallback;
};

interface PreviewTableNodeProps {
  node: UiTreeNode;
  style?: React.CSSProperties;
  emitInteractionLifecycle: (lifetime: string, payload?: unknown) => void;
}

const PreviewTableNode: React.FC<PreviewTableNodeProps> = ({ node, style, emitInteractionLifecycle }) => {
  const staticDataSource = React.useMemo(() => getTableDataSource(node), [node]);
  const [dataSource, setDataSource] = React.useState<Array<Record<string, unknown>>>(staticDataSource);
  const [resolveError, setResolveError] = React.useState('');
  const dataSourceRevision = React.useMemo(
    () => JSON.stringify({
      dataSource: getProp(node, 'dataSource'),
      dataSourceConfig: getProp(node, 'dataSourceConfig'),
    }),
    [node],
  );

  React.useEffect(() => {
    let cancelled = false;
    const config = normalizeDataSourceConfig(getProp(node, 'dataSourceConfig'));
    setDataSource(staticDataSource);
    setResolveError('');

    if (config.type === 'static') {
      return () => {
        cancelled = true;
      };
    }

    resolveDataBySourceConfig(config, staticDataSource)
      .then((resolvedValue) => {
        if (cancelled) {
          return;
        }
        setDataSource(normalizeRowsFromUnknown(resolvedValue, staticDataSource));
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setResolveError((error as { message?: string })?.message ?? '数据源加载失败');
      });

    return () => {
      cancelled = true;
    };
  }, [dataSourceRevision, staticDataSource, node]);

  const columns = normalizePreviewTableColumns(node);
  const tableColumns = columns.length > 0 ? columns : TABLE_FALLBACK_COLUMNS;
  const rowKey = getStringProp(node, 'rowKey') || 'id';
  const pageSize = Math.max(1, getFiniteNumberProp(node, 'pageSize') ?? 5);
  const paginationEnabled = getBooleanProp(node, 'paginationEnabled') !== false;

  return (
    <div style={style}>
      {resolveError ? (
        <div style={{ marginBottom: 8, color: '#d54941', fontSize: 12 }}>
          数据源加载失败：{resolveError}
        </div>
      ) : null}
      <Table
        rowKey={rowKey}
        columns={tableColumns as any}
        data={dataSource}
        size={getStringProp(node, 'size') as any}
        bordered={getBooleanProp(node, 'bordered')}
        stripe={getBooleanProp(node, 'stripe')}
        hover={getBooleanProp(node, 'hover')}
        tableLayout={getStringProp(node, 'tableLayout') as any}
        maxHeight={getFiniteNumberProp(node, 'maxHeight')}
        pagination={
          paginationEnabled
            ? {
                defaultCurrent: 1,
                defaultPageSize: pageSize,
                total: dataSource.length,
              }
            : undefined
        }
        onRowClick={(context) => emitInteractionLifecycle('onRowClick', context)}
        onPageChange={(pageInfo, context) => emitInteractionLifecycle('onPageChange', { pageInfo, context })}
        onSortChange={(sortInfo, context) => emitInteractionLifecycle('onSortChange', { sortInfo, context })}
        onFilterChange={(filterValue, context) => emitInteractionLifecycle('onFilterChange', { filterValue, context })}
        style={style}
      />
    </div>
  );
};

interface PreviewEChartNodeProps {
  node: UiTreeNode;
  style?: React.CSSProperties;
  emitInteractionLifecycle: (lifetime: string, payload?: unknown) => void;
}

const PreviewEChartNode: React.FC<PreviewEChartNodeProps> = ({ node, style, emitInteractionLifecycle }) => {
  ensureBuiltInChinaMap();

  const staticDataSource = React.useMemo(
    () => normalizeEChartDataSource(getProp(node, 'dataSource')),
    [node],
  );
  const [dataSource, setDataSource] = React.useState<Array<Record<string, unknown>>>(staticDataSource);
  const [resolveError, setResolveError] = React.useState('');
  const dataSourceRevision = React.useMemo(
    () => JSON.stringify({
      dataSource: getProp(node, 'dataSource'),
      dataSourceConfig: getProp(node, 'dataSourceConfig'),
    }),
    [node],
  );

  React.useEffect(() => {
    let cancelled = false;
    const config = normalizeDataSourceConfig(getProp(node, 'dataSourceConfig'));
    setDataSource(staticDataSource);
    setResolveError('');

    if (config.type === 'static') {
      return () => {
        cancelled = true;
      };
    }

    resolveDataBySourceConfig(config, staticDataSource)
      .then((resolvedValue) => {
        if (cancelled) {
          return;
        }
        setDataSource(normalizeRowsFromUnknown(resolvedValue, staticDataSource));
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setResolveError((error as { message?: string })?.message ?? '数据源加载失败');
      });

    return () => {
      cancelled = true;
    };
  }, [dataSourceRevision, staticDataSource, node]);

  const nodeType = typeof node.type === 'string' ? node.type : '';
  const chartType = CHART_COMPONENT_TYPE_MAP[nodeType]
    ?? (getStringProp(node, 'chartType') as EChartSeriesType | undefined)
    ?? 'line';
  const chartHeight = Math.max(120, getFiniteNumberProp(node, 'height') ?? 320);
  const chartOption = React.useMemo(() => buildEChartOption({
    chartType,
    dataSource,
    xField: getStringProp(node, 'xField') || 'name',
    yField: getStringProp(node, 'yField') || 'value',
    nameField: getStringProp(node, 'nameField') || 'name',
    valueField: getStringProp(node, 'valueField') || 'value',
    openField: getStringProp(node, 'openField') || 'open',
    closeField: getStringProp(node, 'closeField') || 'close',
    lowField: getStringProp(node, 'lowField') || 'low',
    highField: getStringProp(node, 'highField') || 'high',
    sourceField: getStringProp(node, 'sourceField') || 'source',
    targetField: getStringProp(node, 'targetField') || 'target',
    categoryField: getStringProp(node, 'categoryField') || 'category',
    childrenField: getStringProp(node, 'childrenField') || 'children',
    mapName: getStringProp(node, 'mapName') || 'china',
    minField: getStringProp(node, 'minField') || 'min',
    q1Field: getStringProp(node, 'q1Field') || 'q1',
    medianField: getStringProp(node, 'medianField') || 'median',
    q3Field: getStringProp(node, 'q3Field') || 'q3',
    maxField: getStringProp(node, 'maxField') || 'max',
    min: getFiniteNumberProp(node, 'min') ?? 0,
    max: getFiniteNumberProp(node, 'max') ?? 100,
    splitNumber: getFiniteNumberProp(node, 'splitNumber') ?? 5,
    sort: getStringProp(node, 'sort') === 'ascending' ? 'ascending' : 'descending',
    smooth: getBooleanProp(node, 'smooth') !== false,
    showLegend: getBooleanProp(node, 'showLegend') !== false,
    optionPreset: getStringProp(node, 'optionPreset') || 'none',
    optionOverride: getProp(node, 'option'),
  }), [chartType, dataSource, node]);

  return (
    <div style={style}>
      {resolveError ? (
        <div style={{ marginBottom: 8, color: '#d54941', fontSize: 12 }}>
          数据源加载失败：{resolveError}
        </div>
      ) : null}
      <ReactECharts
        option={chartOption as any}
        style={{ width: '100%', height: chartHeight }}
        notMerge
        lazyUpdate
        onEvents={{
          click: (params: unknown) => emitInteractionLifecycle('onClick', { params }),
        }}
      />
    </div>
  );
};

const getListFieldValue = (record: ListRecord, fieldPath?: string): string | undefined => {
  if (!fieldPath) {
    return undefined;
  }

  const path = fieldPath.trim();
  if (!path) {
    return undefined;
  }

  const value = path.split('.').reduce<unknown>((current, segment) => {
    if (!segment) {
      return current;
    }

    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, record);

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return undefined;
};

const getListFieldRawValue = (record: ListRecord, fieldPath?: string): unknown => {
  if (!fieldPath) {
    return undefined;
  }

  const path = fieldPath.trim();
  if (!path) {
    return undefined;
  }

  return path.split('.').reduce<unknown>((current, segment) => {
    if (!segment) {
      return current;
    }

    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, record);
};

const applyListBindingToNode = (node: UiTreeNode, item: ListRecord): UiTreeNode => {
  const nextNode: UiTreeNode = {
    ...node,
    props: {
      ...(node.props ?? {}),
    },
    children: (node.children ?? []).map((child) => applyListBindingToNode(child, item)),
  };

  const binding = (node.props?.__listBinding as { value?: unknown } | undefined)?.value as
    | { prop?: string; field?: string }
    | undefined;

  const bindProp = typeof binding?.prop === 'string' ? binding.prop.trim() : '';
  const bindField = typeof binding?.field === 'string' ? binding.field.trim() : '';
  if (!bindProp || !bindField) {
    return nextNode;
  }

  const rawBoundValue = getListFieldRawValue(item, bindField);
  if (typeof rawBoundValue === 'undefined') {
    return nextNode;
  }

  const targetProp = (nextNode.props?.[bindProp] ?? {}) as Record<string, unknown>;
  nextNode.props = {
    ...(nextNode.props ?? {}),
    [bindProp]: {
      ...targetProp,
      value: rawBoundValue,
    },
  };

  return nextNode;
};

const getSlotChildren = (node: UiTreeNode, slotKey: 'header' | 'body') => {
  const sourceChildren = node.children ?? [];
  const slotNode = sourceChildren.find((child) => getNodeSlotKey(child) === slotKey && isSlotNode(child));
  if (slotNode) {
    return slotNode.children ?? [];
  }

  // 兼容旧结构：没有影子插槽节点时，全部旧 children 视为 body。
  if (slotKey === 'body') {
    return sourceChildren.filter((child) => !isSlotNode(child));
  }

  return [];
};

const renderChildList = (
  children: UiTreeNode[],
  onLifecycle?: ComponentLifecycleHandler,
) => {
  return children.map((child) => (
    <PreviewRenderer
      key={child.key}
      node={child}
      onLifecycle={onLifecycle}
    />
  ));
};

const renderChildren = (
  node?: UiTreeNode,
  onLifecycle?: ComponentLifecycleHandler,
) => {
  return node?.children?.map((child) => (
    <PreviewRenderer
      key={child.key}
      node={child}
      onLifecycle={onLifecycle}
    />
  )) ?? null;
};

function PreviewCustomComponentRenderer({
  node,
  onLifecycle,
}: {
  node: UiTreeNode;
  onLifecycle?: ComponentLifecycleHandler;
}) {
  const [runtimeSeed, setRuntimeSeed] = React.useState<{
    tree: UiTreeNode;
    flowNodes: Node[];
    flowEdges: Edge[];
    exposedLifecycles: string[];
    lifecycleMappings: Array<{ lifetime: string; key?: string; sourceKey?: string; sourceRef?: string }>;
    exposedPropRefs: Array<{
      sourceKey?: string;
      sourceRef?: string;
      sourcePropKey: string;
      externalPropName: string;
    }>;
  } | null>(null);
  const [renderTree, setRenderTree] = React.useState<UiTreeNode | null>(null);
  const [loading, setLoading] = React.useState(false);
  const runtimeRef = React.useRef<PreviewFlowRuntime | null>(null);
  const innerHubRef = React.useRef<PreviewDataHub | null>(null);

  const componentId = getNodeStringProp(node, '__componentId');
  const componentVersion = React.useMemo(() => {
    const raw = (node.props?.__componentVersion as { value?: unknown } | undefined)?.value;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
  }, [node.props?.__componentVersion]);

  const exposedLifecycleSet = React.useMemo(
    () => new Set(runtimeSeed?.exposedLifecycles ?? []),
    [runtimeSeed?.exposedLifecycles],
  );

  React.useEffect(() => {
    let cancelled = false;

    if (!componentId) {
      setRuntimeSeed(null);
      setRenderTree(null);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    void loadCustomComponentDetail(componentId, { version: componentVersion })
      .then((detail) => {
        if (cancelled) {
          return;
        }

        const tryParseJsonObject = (value: unknown): Record<string, unknown> | null => {
          if (!value) {
            return null;
          }
          if (typeof value === 'string') {
            const text = value.trim();
            if (!text) {
              return null;
            }
            try {
              const parsed = JSON.parse(text);
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed as Record<string, unknown>;
              }
              return null;
            } catch {
              return null;
            }
          }
          if (typeof value === 'object' && !Array.isArray(value)) {
            return value as Record<string, unknown>;
          }
          return null;
        };

        const resolveExposedPropRefs = (d: typeof detail) => {
          const refs: Array<{
            sourceKey?: string;
            sourceRef?: string;
            sourcePropKey: string;
            externalPropName: string;
          }> = [];

          const pageConfig = tryParseJsonObject(d?.template?.pageConfig);
          const contract = pageConfig ? tryParseJsonObject(pageConfig.componentContract) : null;
          const contractExposed = Array.isArray(contract?.exposedProps) ? (contract?.exposedProps as unknown[]) : [];

          if (contractExposed.length > 0) {
            contractExposed.forEach((item) => {
              if (!item) return;
              if (typeof item === 'string') {
                const key = String(item).trim();
                if (!key) return;
                // string 形式无法携带 sourceKey/sourcePropKey，无法用于反向同步，跳过
                return;
              }
              if (typeof item !== 'object') return;
              const obj = item as Record<string, unknown>;
              const sourcePropKey = String(obj.propKey ?? obj.key ?? '').trim();
              const externalPropName = String(obj.key ?? obj.propKey ?? '').trim();
              if (!sourcePropKey || !externalPropName) return;
              refs.push({
                sourceKey: typeof obj.sourceKey === 'string' ? String(obj.sourceKey).trim() : undefined,
                sourceRef: typeof obj.sourceRef === 'string' ? String(obj.sourceRef).trim() : undefined,
                sourcePropKey,
                externalPropName,
              });
            });
            return refs;
          }

          const flowNodes = Array.isArray(d?.template?.flowNodes)
            ? (d?.template?.flowNodes as Array<Record<string, unknown>>)
            : [];
          flowNodes.forEach((flowNode) => {
            if (String(flowNode?.type ?? '').trim() !== 'propExposeNode') {
              return;
            }
            const data = (flowNode?.data ?? {}) as Record<string, unknown>;
            const sourceKey = typeof data.sourceKey === 'string' ? String(data.sourceKey).trim() : '';
            const sourceRef = typeof data.sourceRef === 'string' ? String(data.sourceRef).trim() : '';
            const selectedMappings = Array.isArray(data.selectedMappings) ? (data.selectedMappings as unknown[]) : [];
            selectedMappings.forEach((mapping) => {
              if (!mapping || typeof mapping !== 'object') return;
              const m = mapping as Record<string, unknown>;
              const sourcePropKey = String(m.sourcePropKey ?? '').trim();
              if (!sourcePropKey) return;
              const alias = typeof m.alias === 'string' ? String(m.alias).trim() : '';
              const externalPropName = alias || sourcePropKey;
              refs.push({
                sourceKey: sourceKey || undefined,
                sourceRef: sourceRef || undefined,
                sourcePropKey,
                externalPropName,
              });
            });
          });
          return refs;
        };

        const root = cloneTemplateUiTree(detail);
        if (!root) {
          setRuntimeSeed(null);
          setRenderTree(null);
          return;
        }

        const exposedPatchedTree = applyExposedPropsToTemplate(node, root, detail);
        const injectedTree = applyInstanceSlotsToTemplate(node, exposedPatchedTree);
        const flowNodes = (detail?.template?.flowNodes as unknown as Node[]) ?? [];
        const flowEdges = (detail?.template?.flowEdges as unknown as Edge[]) ?? [];
        const exposedLifecycles = resolveExposedLifecycles(detail);
        const lifecycleMappings = resolveExposedLifecycleMappings(detail);
        const exposedPropRefs = resolveExposedPropRefs(detail);

        setRuntimeSeed({
          tree: injectedTree,
          flowNodes,
          flowEdges,
          exposedLifecycles,
          lifecycleMappings,
          exposedPropRefs,
        });
        setRenderTree(injectedTree);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [componentId, componentVersion, node]);

  React.useEffect(() => {
    runtimeRef.current?.destroy();
    runtimeRef.current = null;

    if (!runtimeSeed) {
      return;
    }

    const hub = createPreviewDataHub(runtimeSeed.tree, { scopeId: 'root' });
    innerHubRef.current = hub;
    const runtime = createPreviewFlowRuntime(runtimeSeed.flowNodes, runtimeSeed.flowEdges, hub);
    const unsubscribePatched = hub.subscribe('component:patched', () => {
      setRenderTree(hub.getTreeSnapshot());
    });
    const unsubscribeExposeSync = hub.subscribe('component:patched', (eventPayload) => {
      if (!onLifecycle) {
        return;
      }

      const data = (eventPayload && typeof eventPayload === 'object') ? (eventPayload as Record<string, unknown>) : null;
      const patchedKey = data ? String(data.componentKey ?? '').trim() : '';
      const patchedRef = data ? String(data.componentRef ?? '').trim() : '';
      const patch = data?.patch;
      if (!patchedKey && !patchedRef) {
        return;
      }
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        return;
      }

      const nextExternalPatch: Record<string, unknown> = {};
      runtimeSeed.exposedPropRefs.forEach((ref) => {
        const sourceKeyMatched = ref.sourceKey ? ref.sourceKey === patchedKey : false;
        const sourceRefMatched = ref.sourceRef ? ref.sourceRef === patchedRef : false;
        if (!sourceKeyMatched && !sourceRefMatched) {
          return;
        }
        const nextValue = (patch as Record<string, unknown>)[ref.sourcePropKey];
        if (typeof nextValue === 'undefined') {
          return;
        }
        nextExternalPatch[ref.externalPropName] = nextValue;
      });

      if (Object.keys(nextExternalPatch).length === 0) {
        return;
      }

      // 写回外层实例 props，让外层 code 节点 dataHub.getComponentProp 可读到最新输入值。
      onLifecycle(node.key, '__customComponentPropSync', { patch: nextExternalPatch });
    });

    runtimeRef.current = runtime;

    return () => {
      unsubscribePatched();
      unsubscribeExposeSync();
      runtime.destroy();
      if (runtimeRef.current === runtime) {
        runtimeRef.current = null;
      }
      if (innerHubRef.current === hub) {
        innerHubRef.current = null;
      }
    };
  }, [node.key, onLifecycle, runtimeSeed]);

  const handleInnerLifecycle = React.useCallback<ComponentLifecycleHandler>((componentKey, lifetime, payload) => {
    queueMicrotask(() => {
      runtimeRef.current?.emitLifecycle(componentKey, lifetime, payload);

      const emittedLifetime = String(lifetime ?? '').trim();
      if (!onLifecycle || !emittedLifetime) {
        return;
      }

      const lifecycleMappings = runtimeSeed?.lifecycleMappings ?? [];
      const lifetimeMatched = lifecycleMappings.filter((item) => item.lifetime === emittedLifetime);
      const sourceMatched = lifetimeMatched.filter((item) => {
        if (!item.sourceKey && !item.sourceRef) return true;
        if (item.sourceKey && item.sourceKey === componentKey) return true;
        if (item.sourceRef && item.sourceRef === componentKey) return true;
        return false;
      });

      let targetLifecycles: string[];
      if (sourceMatched.length > 0) {
        targetLifecycles = Array.from(new Set(
          sourceMatched.map((item) => String(item.key || item.lifetime).trim()).filter(Boolean),
        ));
      } else if (lifetimeMatched.length > 0) {
        targetLifecycles = [];
      } else {
        targetLifecycles = exposedLifecycleSet.has(emittedLifetime) ? [emittedLifetime] : [];
      }

      targetLifecycles.forEach((targetLifetime) => {
        onLifecycle(node.key, targetLifetime, {
          from: 'custom-component',
          componentId,
          componentKey,
          originalLifetime: emittedLifetime,
          payload,
        });
      });
    });
  }, [componentId, exposedLifecycleSet, node.key, onLifecycle, runtimeSeed?.lifecycleMappings]);

  if (!componentId) {
    return null;
  }

  if (loading) {
    return null;
  }

  if (!renderTree) {
    return null;
  }

  return (
    <PreviewDataHubRefContext.Provider value={innerHubRef}>
      <PreviewRenderer key={renderTree.key} node={renderTree} onLifecycle={handleInnerLifecycle} />
    </PreviewDataHubRefContext.Provider>
  );
}

const PreviewRenderer: React.FC<PreviewRendererProps> = ({ node, onLifecycle }) => {
  const inlineStyle = getStyleProp(node);
  const type = typeof node.type === 'string' ? node.type.trim() : node.type;
  const { Header, Content, Aside, Footer } = Layout;
  const { ListItem, ListItemMeta } = List;
  const scopedHubRef = React.useContext(PreviewDataHubRefContext);
  if (isSlotNode(node)) {
    return null;
  }

  const isDrawerNode = type === 'Drawer';
  const isSwitchNode = type === 'Switch';
  const isSwitchControlled = isSwitchNode ? getBooleanProp(node, 'controlled') !== false : false;
  const controlledSwitchValue = isSwitchNode ? Boolean(getBooleanProp(node, 'value')) : false;
  const switchDefaultValue = isSwitchNode ? Boolean(getBooleanProp(node, 'defaultValue')) : false;
  const lifetimesContentKey = getLifetimesContentKey(node);
  const lifetimes = React.useMemo(
    () => (Array.isArray(node.lifetimes) ? node.lifetimes.map((item) => String(item)) : []),
    [lifetimesContentKey],
  );
  const lifetimesRef = React.useRef(lifetimes);
  lifetimesRef.current = lifetimes;
  const nodeRevisionKey = getPreviewNodeRevisionKey(node);
  const previousRevisionKeyRef = React.useRef<string | undefined>(undefined);
  const [uncontrolledSwitchValue, setUncontrolledSwitchValue] = React.useState<boolean>(switchDefaultValue);
  const didInitControlledSwitchValueRef = React.useRef(false);
  const lastControlledSwitchValueRef = React.useRef<boolean | undefined>(undefined);
  const suppressNextControlledPropEventRef = React.useRef(false);
  const expectedControlledSwitchValueRef = React.useRef<boolean | undefined>(undefined);
  const [tabsInnerValue, setTabsInnerValue] = React.useState<string | number | undefined>(undefined);
  const [collapseInnerValue, setCollapseInnerValue] = React.useState<string | number | Array<string | number> | undefined>(undefined);
  const hasLifetime = React.useCallback(
    (lifetime: string) => lifetimes.includes(lifetime),
    [lifetimes],
  );
  // 挂载/卸载：仅依赖 node 身份与回调，避免因 lifetimes 数组引用抖动而误触发「整轮卸载再挂载」。
  React.useLayoutEffect(() => {
    if (!onLifecycle) {
      return;
    }

    const lt = lifetimesRef.current;
    if (shouldEmitCoreLifetime(lt, 'onInit')) {
      onLifecycle(node.key, 'onInit', { nodeType: node.type });
    }

    if (shouldEmitCoreLifetime(lt, 'onBeforeMount')) {
      onLifecycle(node.key, 'onBeforeMount', { nodeType: node.type });
    }
  }, [node.key, node.type, onLifecycle]);

  React.useEffect(() => {
    if (!onLifecycle) {
      return;
    }

    const lt = lifetimesRef.current;
    if (shouldEmitCoreLifetime(lt, 'onMounted')) {
      onLifecycle(node.key, 'onMounted', { nodeType: node.type });
    }

    return () => {
      const ltCleanup = lifetimesRef.current;
      if (shouldEmitCoreLifetime(ltCleanup, 'onBeforeUnmount')) {
        onLifecycle(node.key, 'onBeforeUnmount', { nodeType: node.type });
      }

      if (shouldEmitCoreLifetime(ltCleanup, 'onUnmounted')) {
        onLifecycle(node.key, 'onUnmounted', { nodeType: node.type });
      }
    };
  }, [node.key, node.type, onLifecycle]);

  React.useLayoutEffect(() => {
    if (!onLifecycle) {
      return;
    }

    const prev = previousRevisionKeyRef.current;
    if (prev === undefined) {
      previousRevisionKeyRef.current = nodeRevisionKey;
      return;
    }

    if (prev === nodeRevisionKey) {
      return;
    }

    previousRevisionKeyRef.current = nodeRevisionKey;
    const lt = lifetimesRef.current;
    if (shouldEmitCoreLifetime(lt, 'onBeforeUpdate')) {
      onLifecycle(node.key, 'onBeforeUpdate', { nodeType: node.type });
    }

    if (shouldEmitCoreLifetime(lt, 'onUpdated')) {
      onLifecycle(node.key, 'onUpdated', { nodeType: node.type });
    }
  }, [nodeRevisionKey, node.key, node.type, onLifecycle]);

  const visible = getBooleanProp(node, 'visible');
  const controlledDrawerVisible = isDrawerNode ? visible === true : false;
  const [drawerInnerVisible, setDrawerInnerVisible] = React.useState<boolean>(controlledDrawerVisible);
  const lastDrawerVisiblePropRef = React.useRef<boolean>(controlledDrawerVisible);
  const lastDrawerNodeKeyRef = React.useRef<string>(node.key);

  const mergeStyle = (baseStyle?: React.CSSProperties): React.CSSProperties | undefined => {
    if (!baseStyle && !inlineStyle) {
      return undefined;
    }

    return {
      ...(baseStyle ?? {}),
      ...(inlineStyle ?? {}),
    };
  };

  const emitInteractionLifecycle = React.useCallback(
    (lifetime: string, payload?: unknown) => {
      const canEmitInteraction =
        hasLifetime(lifetime)
        || (type === 'Slider' && lifetime === 'onChange' && lifetimes.length === 0);

      if (!onLifecycle || !canEmitInteraction) {
        return;
      }

      onLifecycle(node.key, lifetime, {
        nodeType: node.type,
        ...(payload && typeof payload === 'object' ? payload : {}),
      });
    },
    [hasLifetime, lifetimes.length, node.key, node.type, onLifecycle, type],
  );

  React.useEffect(() => {
    if (!isSwitchNode) {
      setUncontrolledSwitchValue(false);
      didInitControlledSwitchValueRef.current = false;
      lastControlledSwitchValueRef.current = undefined;
      suppressNextControlledPropEventRef.current = false;
      expectedControlledSwitchValueRef.current = undefined;
      return;
    }

    if (!isSwitchControlled) {
      setUncontrolledSwitchValue(switchDefaultValue);
      didInitControlledSwitchValueRef.current = false;
      lastControlledSwitchValueRef.current = undefined;
      suppressNextControlledPropEventRef.current = false;
      expectedControlledSwitchValueRef.current = undefined;
      return;
    }

    if (!didInitControlledSwitchValueRef.current) {
      didInitControlledSwitchValueRef.current = true;
      lastControlledSwitchValueRef.current = controlledSwitchValue;
      return;
    }

    if (Object.is(lastControlledSwitchValueRef.current, controlledSwitchValue)) {
      return;
    }

    if (
      suppressNextControlledPropEventRef.current
      && Object.is(expectedControlledSwitchValueRef.current, controlledSwitchValue)
    ) {
      suppressNextControlledPropEventRef.current = false;
      expectedControlledSwitchValueRef.current = undefined;
      lastControlledSwitchValueRef.current = controlledSwitchValue;
      return;
    }

    lastControlledSwitchValueRef.current = controlledSwitchValue;
    emitInteractionLifecycle('onChange', {
      value: controlledSwitchValue,
      source: 'propChange',
      controlMode: 'controlled',
    });
  }, [
    controlledSwitchValue,
    emitInteractionLifecycle,
    isSwitchControlled,
    isSwitchNode,
    switchDefaultValue,
  ]);

  React.useEffect(() => {
    setTabsInnerValue(undefined);
    setCollapseInnerValue(undefined);
  }, [node.key]);

  React.useEffect(() => {
    if (!isDrawerNode) {
      setDrawerInnerVisible(false);
      lastDrawerVisiblePropRef.current = false;
      lastDrawerNodeKeyRef.current = node.key;
      return;
    }

    if (lastDrawerNodeKeyRef.current !== node.key) {
      lastDrawerNodeKeyRef.current = node.key;
      lastDrawerVisiblePropRef.current = controlledDrawerVisible;
      setDrawerInnerVisible(controlledDrawerVisible);
      return;
    }

    if (lastDrawerVisiblePropRef.current === controlledDrawerVisible) {
      return;
    }

    lastDrawerVisiblePropRef.current = controlledDrawerVisible;
    setDrawerInnerVisible(controlledDrawerVisible);
  }, [controlledDrawerVisible, isDrawerNode, node.key]);

  const syncDrawerVisible = React.useCallback((nextVisible: boolean) => {
    if (!isDrawerNode) {
      return;
    }

    setDrawerInnerVisible(nextVisible);
    lastDrawerVisiblePropRef.current = nextVisible;
    const hub = scopedHubRef.current;
    if (hub) {
      hub.applyComponentPatch(node.key, { visible: nextVisible });
    } else {
      window.dataHub?.applyComponentPatch(node.key, { visible: nextVisible });
    }
  }, [isDrawerNode, node.key, scopedHubRef]);

  const syncNodeValue = React.useCallback((nextValue: unknown) => {
    const hub = scopedHubRef.current;
    if (hub) {
      hub.applyComponentPatch(node.key, { value: nextValue });
    } else {
      window.dataHub?.applyComponentPatch(node.key, { value: nextValue });
    }
  }, [node.key, scopedHubRef]);

  if (visible === false && !isDrawerNode) {
    return null;
  }

  // 根节点在搭建态可通过 DropArea 承载 __style，预览态需要显式兜底渲染，
  // 否则 type 为空字符串时会丢失布局样式（例如 flex/column/gap）。
  if (!type) {
    return (
      <div style={mergeStyle()} className="preview-page-root" data-preview-page-root>
        <div className="preview-page-root__body">{renderChildren(node, onLifecycle)}</div>
      </div>
    );
  }

  const renderPreviewMenuNodes = (nodes?: UiTreeNode[]): React.ReactNode => {
    return (nodes ?? []).map((child) => {
      const childType = typeof child.type === 'string' ? child.type.trim() : child.type;
      const getChildProp = (propName: string) => {
        const prop = child.props?.[propName] as { value?: unknown } | undefined;
        return prop?.value;
      };
      const getChildStringProp = (propName: string) => {
        const value = getChildProp(propName);
        return typeof value === 'string' ? value : undefined;
      };
      const getChildTextProp = (propName: string) => {
        const value = getChildProp(propName);
        if (typeof value === 'string') {
          return value;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
          return String(value);
        }
        return undefined;
      };
      const getChildBooleanProp = (propName: string) => {
        const value = getChildProp(propName);
        return typeof value === 'boolean' ? value : undefined;
      };

      if (getChildBooleanProp('visible') === false) {
        return null;
      }

      if (childType === 'Menu.Submenu') {
        const iconNode = renderNamedIcon(getChildStringProp('iconName'));
        const submenuValue = getChildStringProp('value')?.trim() || child.key;
        return (
          <Menu.SubMenu
            key={child.key}
            value={submenuValue}
            title={getChildTextProp('title') || undefined}
            content={getChildTextProp('content') || undefined}
            icon={iconNode as any}
            disabled={getChildBooleanProp('disabled')}
          >
            {renderPreviewMenuNodes(child.children)}
          </Menu.SubMenu>
        );
      }

      if (childType === 'Menu.Group') {
        return (
          <Menu.MenuGroup key={child.key} title={getChildTextProp('title') || undefined}>
            {renderPreviewMenuNodes(child.children)}
          </Menu.MenuGroup>
        );
      }

      if (childType === 'Menu.Item') {
        const iconNode = renderNamedIcon(getChildStringProp('iconName'));
        const itemValue = getChildStringProp('value')?.trim() || child.key;
        const itemHref = getChildStringProp('href') || undefined;
        return (
          <Menu.MenuItem
            key={child.key}
            value={itemValue}
            content={getChildTextProp('content') || undefined}
            icon={iconNode as any}
            href={itemHref}
            target={getChildStringProp('target') as any}
            disabled={getChildBooleanProp('disabled')}
            onClick={(context) => {
              context?.e?.preventDefault?.();
              if (!onLifecycle) {
                if (itemHref) {
                  navigatePreviewByHref(itemHref);
                }
                return;
              }

              onLifecycle(child.key, 'onClick', {
                nodeType: child.type,
                ...context,
              });

              if (itemHref) {
                navigatePreviewByHref(itemHref);
              }
            }}
          />
        );
      }

      return null;
    });
  };

  switch (type) {
    case 'Button': {
      const isBlockButton = getBooleanProp(node, 'block') === true;
      const prefixIcon = renderNamedIcon(getStringProp(node, 'prefixIconName'));
      const suffixIcon = renderNamedIcon(getStringProp(node, 'suffixIconName'));
      return (
        <Button
          theme={getStringProp(node, 'theme') as any}
          shape={getStringProp(node, 'shape') as any}
          size={getStringProp(node, 'size') as any}
          variant={getStringProp(node, 'variant') as any}
          icon={prefixIcon as any}
          suffix={suffixIcon as any}
          block={isBlockButton}
          style={mergeStyle(isBlockButton ? { width: '100%', display: 'flex' } : undefined)}
          onClick={() => emitInteractionLifecycle('onClick')}
        >
          {getTextProp(node, 'content')}
        </Button>
      );
    }
    case 'Link':
      {
      const prefixIcon = renderNamedIcon(getStringProp(node, 'prefixIconName'));
      const suffixIcon = renderNamedIcon(getStringProp(node, 'suffixIconName'));
      const linkHref = getStringProp(node, 'href') || undefined;
      return (
        <Link
          content={getTextProp(node, 'content')}
          href={linkHref}
          target={getStringProp(node, 'target') || undefined}
          theme={getStringProp(node, 'theme') as any}
          size={getStringProp(node, 'size') as any}
          hover={getStringProp(node, 'hover') as any}
          prefixIcon={prefixIcon as any}
          suffixIcon={suffixIcon as any}
          underline={getBooleanProp(node, 'underline')}
          disabled={getBooleanProp(node, 'disabled')}
          style={mergeStyle()}
          onClick={(event) => {
            event.preventDefault();
            emitInteractionLifecycle('onClick');
            if (linkHref) {
              navigatePreviewByHref(linkHref);
            }
          }}
        />
      );
      }
    case 'BackTop':
      return (
        <div style={mergeStyle()}>
          <BackTop
            className="preview-back-top"
            content={getBackTopContentNode(node)}
            duration={getFiniteNumberProp(node, 'duration')}
            offset={getBackTopOffsetProp(node, 'offset') as any}
            shape={getStringProp(node, 'shape') as any}
            size={getStringProp(node, 'size') as any}
            target={getBackTopTargetProp(node, 'target') as any}
            container={getBackTopContainerProp() as any}
            theme={getStringProp(node, 'theme') as any}
            visibleHeight={getBackTopVisibleHeightProp(node, 'visibleHeight') as any}
            style={mergeStyle()}
            onClick={(context) => emitInteractionLifecycle('onClick', context)}
          />
        </div>
      );
    case 'Progress':
      return (
        <div style={mergeStyle()}>
          <Progress
            className={getStringProp(node, 'className') || undefined}
            color={getProgressColorProp(node, 'color') as any}
            label={getProgressLabelProp(node) as any}
            percentage={getFiniteNumberProp(node, 'percentage') ?? 0}
            size={getProgressSizeProp(node, 'size') as any}
            status={getProgressStatusProp(node) as any}
            strokeWidth={getProgressSizeProp(node, 'strokeWidth') as any}
            theme={getStringProp(node, 'theme') as any}
            trackColor={getStringProp(node, 'trackColor') || undefined}
            style={mergeStyle()}
          />
        </div>
      );
    case 'Upload':
      return (
        <div style={mergeStyle()}>
          <Upload
            className={getStringProp(node, 'className') || undefined}
            abridgeName={getUploadAbridgeNameProp(node, 'abridgeName') as any}
            accept={getStringProp(node, 'accept') || undefined}
            action={getStringProp(node, 'action') || undefined}
            allowUploadDuplicateFile={getBooleanProp(node, 'allowUploadDuplicateFile')}
            autoUpload={getBooleanProp(node, 'autoUpload') !== false}
            data={getUploadObjectProp(node, 'data') as any}
            disabled={getBooleanProp(node, 'disabled')}
            draggable={getBooleanProp(node, 'draggable')}
            files={getUploadFileListProp(node, 'files') as any}
            defaultFiles={getUploadFileListProp(node, 'defaultFiles') as any}
            headers={getUploadObjectProp(node, 'headers') as any}
            max={getFiniteNumberProp(node, 'max')}
            method={getStringProp(node, 'method') as any}
            mockProgressDuration={getFiniteNumberProp(node, 'mockProgressDuration')}
            multiple={getBooleanProp(node, 'multiple')}
            name={getStringProp(node, 'name') || undefined}
            placeholder={getStringProp(node, 'placeholder') || undefined}
            showImageFileName={getBooleanProp(node, 'showImageFileName')}
            showThumbnail={getBooleanProp(node, 'showThumbnail')}
            showUploadProgress={getBooleanProp(node, 'showUploadProgress')}
            sizeLimit={getUploadSizeLimitProp(node, 'sizeLimit') as any}
            status={getUploadStatusProp(node, 'status') as any}
            theme={getStringProp(node, 'theme') as any}
            tips={getStringProp(node, 'tips') || undefined}
            uploadAllFilesInOneRequest={getBooleanProp(node, 'uploadAllFilesInOneRequest')}
            uploadPastedFiles={getBooleanProp(node, 'uploadPastedFiles')}
            useMockProgress={getBooleanProp(node, 'useMockProgress')}
            withCredentials={getBooleanProp(node, 'withCredentials')}
            style={mergeStyle()}
            onCancelUpload={() => emitInteractionLifecycle('onCancelUpload')}
            onChange={(value, context) => emitInteractionLifecycle('onChange', { value, ...context })}
            onDragenter={(context) => emitInteractionLifecycle('onDragenter', context)}
            onDragleave={(context) => emitInteractionLifecycle('onDragleave', context)}
            onDrop={(context) => emitInteractionLifecycle('onDrop', context)}
            onFail={(context) => emitInteractionLifecycle('onFail', context)}
            onOneFileFail={(context) => emitInteractionLifecycle('onOneFileFail', context)}
            onOneFileSuccess={(context) => emitInteractionLifecycle('onOneFileSuccess', context)}
            onPreview={(context) => emitInteractionLifecycle('onPreview', context)}
            onProgress={(context) => emitInteractionLifecycle('onProgress', context)}
            onRemove={(context) => emitInteractionLifecycle('onRemove', context)}
            onSelectChange={(files, context) => emitInteractionLifecycle('onSelectChange', { files, ...context })}
            onSuccess={(context) => emitInteractionLifecycle('onSuccess', context)}
            onValidate={(context) => emitInteractionLifecycle('onValidate', context)}
            onWaitingUploadFilesChange={(context) => emitInteractionLifecycle('onWaitingUploadFilesChange', context)}
          >
            {renderChildList(node.children ?? [], onLifecycle)}
          </Upload>
        </div>
      );
    case 'Drawer': {
      const hasDrawerChildren = (node.children?.length ?? 0) > 0;
      const drawerBodyText = getStringProp(node, 'body')?.trim();
      return (
        <div style={mergeStyle()}>
          <Drawer
            className={getStringProp(node, 'className') || undefined}
            attach="body"
            body={!hasDrawerChildren ? (drawerBodyText || undefined) : undefined}
            cancelBtn={getStringProp(node, 'cancelBtn') || undefined}
            closeBtn={getBooleanProp(node, 'closeBtn') !== false}
            closeOnEscKeydown={getBooleanProp(node, 'closeOnEscKeydown') !== false}
            closeOnOverlayClick={getBooleanProp(node, 'closeOnOverlayClick') !== false}
            confirmBtn={getStringProp(node, 'confirmBtn') || undefined}
            destroyOnClose={getBooleanProp(node, 'destroyOnClose') === true}
            footer={getDrawerFooterProp(node)}
            header={getDrawerHeaderProp(node) as any}
            lazy={getBooleanProp(node, 'lazy') !== false}
            placement={getStringProp(node, 'placement') as any}
            preventScrollThrough={getBooleanProp(node, 'preventScrollThrough') !== false}
            showInAttachedElement={getBooleanProp(node, 'showInAttachedElement') === true}
            showOverlay={getBooleanProp(node, 'showOverlay') !== false}
            size={getStringProp(node, 'size') || undefined}
            sizeDraggable={getDrawerSizeDraggableProp(node) as any}
            visible={drawerInnerVisible}
            zIndex={getNumberProp(node, 'zIndex')}
            style={mergeStyle()}
            onBeforeOpen={() => emitInteractionLifecycle('onBeforeOpen')}
            onBeforeClose={() => emitInteractionLifecycle('onBeforeClose')}
            onCancel={(context) => {
              syncDrawerVisible(false);
              emitInteractionLifecycle('onCancel', context);
            }}
            onClose={(context) => {
              syncDrawerVisible(false);
              emitInteractionLifecycle('onClose', context);
            }}
            onCloseBtnClick={(context) => {
              syncDrawerVisible(false);
              emitInteractionLifecycle('onCloseBtnClick', context);
            }}
            onConfirm={(context) => emitInteractionLifecycle('onConfirm', context)}
            onEscKeydown={(context) => {
              syncDrawerVisible(false);
              emitInteractionLifecycle('onEscKeydown', context);
            }}
            onOverlayClick={(context) => {
              syncDrawerVisible(false);
              emitInteractionLifecycle('onOverlayClick', context);
            }}
            onSizeDragEnd={(context) => emitInteractionLifecycle('onSizeDragEnd', context)}
          >
            {renderChildList(node.children ?? [], onLifecycle)}
          </Drawer>
        </div>
      );
    }
    case 'Menu':
      return (
        <div style={mergeStyle()}>
          <Menu
            collapsed={getBooleanProp(node, 'collapsed')}
            expandMutex={getBooleanProp(node, 'expandMutex')}
            expandType={getStringProp(node, 'expandType') as any}
            expanded={getMenuValueArrayProp(node, 'expanded') as any}
            defaultExpanded={getMenuValueArrayProp(node, 'defaultExpanded') as any}
            theme={getStringProp(node, 'theme') as any}
            value={getMenuValueProp(node, 'value') as any}
            defaultValue={getMenuValueProp(node, 'defaultValue') as any}
            width={getMenuWidthProp(node, 'width') as any}
            style={mergeStyle()}
            onChange={(value) => emitInteractionLifecycle('onChange', { value })}
            onExpand={(value) => emitInteractionLifecycle('onExpand', { value })}
          >
            {renderPreviewMenuNodes(node.children)}
          </Menu>
        </div>
      );
    case 'HeadMenu':
      return (
        <div style={mergeStyle()}>
          <Menu.HeadMenu
            expandType={getStringProp(node, 'expandType') as any}
            expanded={getMenuValueArrayProp(node, 'expanded') as any}
            defaultExpanded={getMenuValueArrayProp(node, 'defaultExpanded') as any}
            theme={getStringProp(node, 'theme') as any}
            value={getMenuValueProp(node, 'value') as any}
            defaultValue={getMenuValueProp(node, 'defaultValue') as any}
            style={mergeStyle()}
            onChange={(value) => emitInteractionLifecycle('onChange', { value })}
            onExpand={(value) => emitInteractionLifecycle('onExpand', { value })}
          >
            {renderPreviewMenuNodes(node.children)}
          </Menu.HeadMenu>
        </div>
      );
    case 'Menu.Submenu':
    case 'Menu.Item':
    case 'Menu.Group':
      return null;
    case 'Icon':
      {
      const iconNode = renderNamedIcon(getStringProp(node, 'iconName'), {
        size: getNumberProp(node, 'size') ?? 16,
        strokeWidth: getNumberProp(node, 'strokeWidth') ?? 2,
      });
      const mergedIconStyle = mergeStyle();

      if (!React.isValidElement(iconNode)) {
        return iconNode;
      }

      const iconProps = (iconNode.props ?? {}) as { style?: React.CSSProperties };
      return React.cloneElement(iconNode, {
        ...iconProps,
        style: { ...(iconProps.style ?? {}), ...(mergedIconStyle ?? {}) },
      });
      }
    case 'Tabs': {
      const tabsList = getTabsListProp(node);
      const controlledValue = getTabsControlledValue(node);
      const defaultValue = getTabsDefaultValue(node);
      const firstValue = tabsList[0]?.value;
      const activeTabValue =
        controlledValue
        ?? tabsInnerValue
        ?? defaultValue
        ?? firstValue;

      const tabsPanels = tabsList.map((item) => {
        const slotNode = getTabsSlotNodeByValue(node, item.value);

        return {
          value: item.value,
          label: item.label,
          disabled: item.disabled,
          draggable: item.draggable,
          removable: item.removable,
          lazy: item.lazy,
          destroyOnHide: item.destroyOnHide,
          panel: slotNode ? renderChildList(slotNode.children ?? [], onLifecycle) : null,
        };
      });

      return (
        <div style={mergeStyle()}>
          <Tabs
            action={getStringProp(node, 'action') || undefined}
            addable={getBooleanProp(node, 'addable')}
            disabled={getBooleanProp(node, 'disabled')}
            dragSort={getBooleanProp(node, 'dragSort')}
            list={tabsPanels as any}
            placement={getStringProp(node, 'placement') as any}
            scrollPosition={getStringProp(node, 'scrollPosition') as any}
            size={getStringProp(node, 'size') as any}
            theme={getStringProp(node, 'theme') as any}
            value={activeTabValue as any}
            onAdd={(context) => emitInteractionLifecycle('onAdd', context)}
            onDragSort={(context) => emitInteractionLifecycle('onDragSort', context)}
            onRemove={(context) => emitInteractionLifecycle('onRemove', context)}
            onChange={(value) => {
              setTabsInnerValue(value as string | number);
              emitInteractionLifecycle('onChange', { value });
            }}
          />
        </div>
      );
    }
    case 'Collapse': {
      const collapseList = normalizeCollapseList(getProp(node, 'list'));
      const controlledValue = normalizeCollapseValue(getProp(node, 'value'));
      const defaultValue = normalizeCollapseValue(getProp(node, 'defaultValue'));
      const firstValue = collapseList[0]?.value;
      const toCollapseValueArray = (value: unknown) => {
        const normalized = normalizeCollapseValue(value);
        if (typeof normalized === 'undefined') {
          return undefined;
        }
        return Array.isArray(normalized) ? normalized : [normalized];
      };
      const activeValue = toCollapseValueArray(controlledValue ?? collapseInnerValue ?? defaultValue)
        ?? (typeof firstValue !== 'undefined' ? [firstValue] : undefined);

      return (
        <div style={mergeStyle()}>
          <Collapse
            value={activeValue as any}
            disabled={getBooleanProp(node, 'disabled')}
            borderless={getBooleanProp(node, 'bordered') === false}
            expandMutex={getBooleanProp(node, 'expandMutex')}
            defaultExpandAll={getBooleanProp(node, 'defaultExpandAll')}
            expandIconPlacement={getStringProp(node, 'expandIconPlacement') as any}
            onChange={(value) => {
              setCollapseInnerValue(value as Array<string | number>);
              emitInteractionLifecycle('onChange', { value });
            }}
            style={mergeStyle()}
          >
            {collapseList.map((item) => {
              const headerSlotNode = getCollapseHeaderSlotNodeByValue(node, item.value);
              const panelSlotNode = getCollapsePanelSlotNodeByValue(node, item.value);
              const headerChildren = headerSlotNode ? renderChildList(headerSlotNode.children ?? [], onLifecycle) : null;
              const panelChildren = panelSlotNode ? renderChildList(panelSlotNode.children ?? [], onLifecycle) : null;

              return (
                <Collapse.Panel
                  key={`${node.key}-collapse-panel-${String(item.value)}`}
                  value={item.value as any}
                  disabled={item.disabled}
                  destroyOnCollapse={item.destroyOnCollapse}
                  header={headerChildren || item.label}
                >
                  {panelChildren}
                </Collapse.Panel>
              );
            })}
          </Collapse>
        </div>
      );
    }
    case 'Space': {
      const direction = getStringProp(node, 'direction') as 'horizontal' | 'vertical' | undefined;
      const isSpaceSplitEnabled = getBooleanProp(node, 'splitEnabled') === true;
      const spaceSplitLayout = direction === 'vertical' ? 'horizontal' : 'vertical';
      const spaceSplitContent = getStringProp(node, 'splitContent');
      const spaceSplitAlign = getStringProp(node, 'splitAlign') as any;
      const spaceSplitDashed = getBooleanProp(node, 'splitDashed');
      const childrenList = renderChildren(node, onLifecycle);
      const childrenArray = React.Children.toArray(childrenList);

      if (!isSpaceSplitEnabled || childrenArray.length <= 1) {
        return (
          <div style={mergeStyle()}>
            <Space
              align={getStringProp(node, 'align') as any}
              direction={direction as any}
              size={getNumberProp(node, 'size')}
              breakLine={getBooleanProp(node, 'breakLine')}
            >
              {childrenList}
            </Space>
          </div>
        );
      }

      const mergedChildren: React.ReactNode[] = [];
      childrenArray.forEach((child, index) => {
        mergedChildren.push(child);

        if (index < childrenArray.length - 1) {
          mergedChildren.push(
            <Divider
              key={`space-split-${node.key}-${index}`}
              layout={spaceSplitLayout as any}
              dashed={spaceSplitDashed}
              align={spaceSplitAlign}
              content={spaceSplitLayout === 'horizontal' ? spaceSplitContent : undefined}
            />,
          );
        }
      });

      return (
        <div style={mergeStyle()}>
          <Space
            align={getStringProp(node, 'align') as any}
            direction={direction as any}
            size={getNumberProp(node, 'size')}
            breakLine={getBooleanProp(node, 'breakLine')}
          >
            {mergedChildren}
          </Space>
        </div>
      );
    }
    case 'Flex':
      return (
        <div
          style={mergeStyle({
            display: 'flex',
            flexDirection: (getStringProp(node, 'direction') as React.CSSProperties['flexDirection']) ?? 'row',
            justifyContent: (getStringProp(node, 'justify') as React.CSSProperties['justifyContent']) ?? 'flex-start',
            alignItems: (getStringProp(node, 'align') as React.CSSProperties['alignItems']) ?? 'stretch',
            flexWrap: getBooleanProp(node, 'wrap') ? 'wrap' : 'nowrap',
            gap: getNumberProp(node, 'gap') ?? 8,
          })}
        >
          {renderChildren(node, onLifecycle)}
        </div>
      );
    case 'Flex.Item':
      return (
        <div
          style={mergeStyle({
            flexGrow: getNumberProp(node, 'grow') ?? 0,
            flexShrink: getNumberProp(node, 'shrink') ?? 1,
            flexBasis: getStringProp(node, 'basis') || 'auto',
            alignSelf: (getStringProp(node, 'alignSelf') as React.CSSProperties['alignSelf']) || undefined,
            minWidth: 0,
          })}
        >
          {renderChildren(node, onLifecycle)}
        </div>
      );
    case 'Stack':
      return (
        <div
          style={mergeStyle({
            display: 'flex',
            flexDirection: 'column',
            justifyContent: (getStringProp(node, 'justify') as React.CSSProperties['justifyContent']) ?? 'flex-start',
            alignItems: (getStringProp(node, 'align') as React.CSSProperties['alignItems']) ?? 'stretch',
            gap: getNumberProp(node, 'gap') ?? 8,
          })}
        >
          {renderChildren(node, onLifecycle)}
        </div>
      );
    case 'Inline':
      return (
        <div
          style={mergeStyle({
            display: 'flex',
            flexDirection: 'row',
            justifyContent: (getStringProp(node, 'justify') as React.CSSProperties['justifyContent']) ?? 'flex-start',
            alignItems: (getStringProp(node, 'align') as React.CSSProperties['alignItems']) ?? 'center',
            flexWrap: getBooleanProp(node, 'wrap') ? 'wrap' : 'nowrap',
            gap: getNumberProp(node, 'gap') ?? 8,
          })}
        >
          {renderChildren(node, onLifecycle)}
        </div>
      );
    case 'Grid.Row':
      return (
        <Row
          align={getStringProp(node, 'align') as any}
          justify={getStringProp(node, 'justify') as any}
          gutter={getNumberProp(node, 'gutter')}
          style={mergeStyle({ width: '100%' })}
        >
          {renderChildren(node, onLifecycle)}
        </Row>
      );
    case 'Grid.Col':
      {
      const baseSpan = getGridNumber(getProp(node, 'span')) ?? 6;
      const baseOffset = getGridNumber(getProp(node, 'offset')) ?? 0;
      const responsiveConfig = normalizeResponsiveConfig(getProp(node, '__responsiveCol'));
      const responsiveColProps = convertResponsiveConfigToTDesignProps(baseSpan, baseOffset, responsiveConfig);

      return (
        <Col span={baseSpan} offset={baseOffset} {...responsiveColProps} style={mergeStyle()}>
          {renderChildren(node, onLifecycle)}
        </Col>
      );
      }
    case 'Table':
      return (
        <PreviewTableNode
          node={node}
          style={mergeStyle()}
          emitInteractionLifecycle={emitInteractionLifecycle}
        />
      );
    case 'EChart':
    case 'LineChart':
    case 'BarChart':
    case 'PieChart':
    case 'RadarChart':
    case 'ScatterChart':
    case 'AreaChart':
    case 'DonutChart':
    case 'GaugeChart':
    case 'FunnelChart':
    case 'CandlestickChart':
    case 'TreemapChart':
    case 'HeatmapChart':
    case 'SunburstChart':
    case 'MapChart':
    case 'SankeyChart':
    case 'GraphChart':
    case 'BoxplotChart':
    case 'WaterfallChart':
      return (
        <PreviewEChartNode
          node={node}
          style={mergeStyle()}
          emitInteractionLifecycle={emitInteractionLifecycle}
        />
      );
    case 'List':
      {
      const customTemplateEnabled = getBooleanProp(node, 'customTemplateEnabled') === true;
      const listDataSource = getListDataSource(node);
      const listItemTemplateNode = (node.children ?? []).find((child) => child.type === 'List.Item');
      const getListItemTemplateProp = (propName: string) => {
        const prop = listItemTemplateNode?.props?.[propName] as { value?: unknown } | undefined;
        return prop?.value;
      };
      const titleField = getStringProp(node, 'titleField') || 'title';
      const descriptionField = getStringProp(node, 'descriptionField') || 'description';
      const imageField = getStringProp(node, 'imageField') || 'image';
      const actionField = getStringProp(node, 'actionField') || 'actionText';
      const showImage = getListItemTemplateProp('showImage') !== false;
      const showDescription = getListItemTemplateProp('showDescription') !== false;
      const showAction = getListItemTemplateProp('showAction') !== false;
      const actionTheme = String(getListItemTemplateProp('actionTheme') ?? 'default');
      const actionVariant = String(getListItemTemplateProp('actionVariant') ?? 'text');
      const actionSize = String(getListItemTemplateProp('actionSize') ?? 'small');

      if (customTemplateEnabled) {
        return (
          <div style={mergeStyle()}>
            <List
              layout={getStringProp(node, 'layout') as any}
              size={getStringProp(node, 'size') as any}
              split={getBooleanProp(node, 'split')}
              stripe={getBooleanProp(node, 'stripe')}
              header={getStringProp(node, 'header') || undefined}
              footer={getStringProp(node, 'footer') || undefined}
              asyncLoading={getStringProp(node, 'asyncLoading') || undefined}
              onLoadMore={(options) => emitInteractionLifecycle('onLoadMore', options)}
              onScroll={(options) => emitInteractionLifecycle('onScroll', options)}
              style={mergeStyle()}
            >
              {listDataSource.map((item, index) => {
                const itemRecord = (item && typeof item === 'object') ? (item as ListRecord) : {};
                const boundChildren = (listItemTemplateNode?.children ?? []).map((child) => applyListBindingToNode(child, itemRecord));

                return (
                  <ListItem key={`${node.key}-template-${index}`}>
                    <div onClick={() => emitInteractionLifecycle('onItemClick', { item, index })}>
                      {renderChildList(boundChildren, onLifecycle)}
                    </div>
                  </ListItem>
                );
              })}
            </List>
          </div>
        );
      }

      return (
        <div style={mergeStyle()}>
          <List
            layout={getStringProp(node, 'layout') as any}
            size={getStringProp(node, 'size') as any}
            split={getBooleanProp(node, 'split')}
            stripe={getBooleanProp(node, 'stripe')}
            header={getStringProp(node, 'header') || undefined}
            footer={getStringProp(node, 'footer') || undefined}
            asyncLoading={getStringProp(node, 'asyncLoading') || undefined}
            onLoadMore={(options) => emitInteractionLifecycle('onLoadMore', options)}
            onScroll={(options) => emitInteractionLifecycle('onScroll', options)}
            style={mergeStyle()}
          >
            {listDataSource.map((item, index) => {
              const itemRecord = (item && typeof item === 'object') ? (item as ListRecord) : {};
              const metaTitle = getListFieldValue(itemRecord, titleField);
              const metaDescription = getListFieldValue(itemRecord, descriptionField);
              const metaImage = getListFieldValue(itemRecord, imageField);
              const actionText = getListFieldValue(itemRecord, actionField);
              const resolvedTitle = metaTitle || `列表项 ${index + 1}`;
              const resolvedDescription = showDescription ? metaDescription : undefined;
              const resolvedImage = showImage ? metaImage : undefined;

              return (
                <ListItem
                  key={`${node.key}-item-${index}`}
                  action={showAction && actionText ? (
                    <Button
                      size={actionSize as any}
                      variant={actionVariant as any}
                      theme={actionTheme as any}
                      onClick={() => emitInteractionLifecycle('onActionClick', { item, index })}
                    >
                      {actionText}
                    </Button>
                  ) : undefined}
                >
                  <div onClick={() => emitInteractionLifecycle('onItemClick', { item, index })}>
                    <ListItemMeta
                      title={resolvedTitle}
                      description={resolvedDescription}
                      image={resolvedImage ? <Image src={resolvedImage} style={{ width: 56, height: 56, borderRadius: 6 }} /> : undefined}
                    />
                  </div>
                </ListItem>
              );
            })}
          </List>
        </div>
      );
      }
    case 'Layout':
      return (
        <div style={mergeStyle()}>
          <Layout>
            {renderChildren(node, onLifecycle)}
          </Layout>
        </div>
      );
    case 'Layout.Header':
      return (
        <div style={mergeStyle()}>
          <Header>
            {renderChildren(node, onLifecycle)}
          </Header>
        </div>
      );
    case 'Layout.Content':
      return (
        <div style={mergeStyle()}>
          <Content>
            {renderChildren(node, onLifecycle)}
          </Content>
        </div>
      );
    case 'Layout.Aside':
      return (
        <div style={mergeStyle()}>
          <Aside>
            {renderChildren(node, onLifecycle)}
          </Aside>
        </div>
      );
    case 'Layout.Footer':
      return (
        <div style={mergeStyle()}>
          <Footer>
            {renderChildren(node, onLifecycle)}
          </Footer>
        </div>
      );
    case 'RouteOutlet':
      {
      const outletChildren = renderChildren(node, onLifecycle);
      const hasOutletContent = (node.children ?? []).length > 0;
      return (
        <div style={mergeStyle({ minHeight: Number(getProp(node, 'minHeight') ?? 360) || 360 })}>
          {hasOutletContent ? outletChildren : (
            <div className="preview-route-outlet-empty">
              <div className="preview-route-outlet-empty__title">路由内容为空</div>
              <div className="preview-route-outlet-empty__desc">该路由出口暂未放置组件，可在搭建器中拖拽内容到此处。</div>
            </div>
          )}
        </div>
      );
      }
    case 'Card':
      {
      const headerChildren = getSlotChildren(node, 'header');
      const bodyChildren = getSlotChildren(node, 'body');
      return (
        <div style={mergeStyle()}>
          <Card
            header={headerChildren.length > 0 ? renderChildList(headerChildren, onLifecycle) : undefined}
            title={headerChildren.length > 0 ? undefined : getStringProp(node, 'title')}
            subtitle={headerChildren.length > 0 ? undefined : getStringProp(node, 'subtitle')}
            size={getStringProp(node, 'size') as any}
            bordered={getBooleanProp(node, 'bordered')}
            headerBordered={getBooleanProp(node, 'headerBordered')}
            shadow={getBooleanProp(node, 'shadow')}
            hoverShadow={getBooleanProp(node, 'hoverShadow')}
            style={mergeStyle()}
          >
            {renderChildList(bodyChildren, onLifecycle)}
          </Card>
        </div>
      );
      }
    case 'Statistic':
      {
      const trend = getStringProp(node, 'trend');
      return (
        <div style={mergeStyle()}>
          <Statistic
            title={getStringProp(node, 'title')}
            value={getFiniteNumberProp(node, 'value') ?? 0}
            unit={getStringProp(node, 'unit') || undefined}
            decimalPlaces={getFiniteNumberProp(node, 'decimalPlaces')}
            separator={getStringProp(node, 'separator') || ','}
            color={getStringProp(node, 'color') as any}
            trend={trend === 'increase' || trend === 'decrease' ? trend : undefined}
            trendPlacement={getStringProp(node, 'trendPlacement') as any}
            loading={getBooleanProp(node, 'loading')}
            animationStart={getBooleanProp(node, 'animationStart')}
            style={mergeStyle()}
          />
        </div>
      );
      }
    case 'Image':
      return (
        <div style={mergeStyle()}>
          <Image
            src={getStringProp(node, 'src')}
            alt={getStringProp(node, 'alt')}
            fit={getStringProp(node, 'fit') as any}
            shape={getStringProp(node, 'shape') as any}
            gallery={getBooleanProp(node, 'gallery') === true}
            style={mergeStyle()}
          />
        </div>
      );
    case 'Avatar':
      return (
        <div style={mergeStyle()}>
          <Avatar
            image={getStringProp(node, 'image')}
            alt={getStringProp(node, 'alt')}
            content={getStringProp(node, 'content')}
            shape={getStringProp(node, 'shape') as any}
            size={getStringProp(node, 'size')}
            hideOnLoadFailed={getBooleanProp(node, 'hideOnLoadFailed')}
            style={mergeStyle()}
          />
        </div>
      );
    case 'Switch':
      {
      const renderedSwitchValue = isSwitchControlled ? controlledSwitchValue : uncontrolledSwitchValue;
      return (
        <div style={mergeStyle()}>
          <Space align="center" size={8}>
            <Switch
              size={getStringProp(node, 'size') as any}
              value={isSwitchControlled ? renderedSwitchValue : undefined}
              defaultValue={isSwitchControlled ? undefined : switchDefaultValue}
              onChange={(nextValue) => {
                const normalizedValue = Boolean(nextValue);
                if (isSwitchControlled) {
                  didInitControlledSwitchValueRef.current = true;
                  lastControlledSwitchValueRef.current = normalizedValue;
                  suppressNextControlledPropEventRef.current = true;
                  expectedControlledSwitchValueRef.current = normalizedValue;
                } else {
                  setUncontrolledSwitchValue(normalizedValue);
                }
                syncNodeValue(normalizedValue);

                emitInteractionLifecycle('onChange', {
                  value: normalizedValue,
                  source: 'userInput',
                  controlMode: isSwitchControlled ? 'controlled' : 'uncontrolled',
                });
              }}
            />
          </Space>
        </div>
      );
      }
    case 'Calendar':
      return (
        <div style={mergeStyle()}>
          <Calendar
            theme={getStringProp(node, 'theme') as any}
            mode={getStringProp(node, 'mode') as any}
            firstDayOfWeek={getNumberProp(node, 'firstDayOfWeek')}
            format={getStringProp(node, 'format')}
            fillWithZero={getBooleanProp(node, 'fillWithZero')}
            isShowWeekendDefault={getBooleanProp(node, 'isShowWeekendDefault')}
            controllerConfig={getBooleanProp(node, 'controllerConfig')}
            preventCellContextmenu={getBooleanProp(node, 'preventCellContextmenu')}
            value={getCalendarValueProp(node, 'value') as any}
            onCellClick={(options) => emitInteractionLifecycle('onCellClick', options)}
            onCellDoubleClick={(options) => emitInteractionLifecycle('onCellDoubleClick', options)}
            onCellRightClick={(options) => emitInteractionLifecycle('onCellRightClick', options)}
            onControllerChange={(options) => emitInteractionLifecycle('onControllerChange', options)}
            onMonthChange={(options) => emitInteractionLifecycle('onMonthChange', options)}
            style={mergeStyle()}
          />
        </div>
      );
    case 'ColorPicker':
      {
      const isControlled = getBooleanProp(node, 'controlled') !== false;
      return (
        <div style={mergeStyle()}>
          <ColorPicker
            format={getStringProp(node, 'format') as any}
            value={isControlled ? (getStringProp(node, 'value') || undefined) : undefined}
            defaultValue={isControlled ? undefined : (getStringProp(node, 'defaultValue') || undefined)}
            clearable={getBooleanProp(node, 'clearable')}
            borderless={getBooleanProp(node, 'borderless')}
            disabled={getBooleanProp(node, 'disabled')}
            enableAlpha={getBooleanProp(node, 'enableAlpha')}
            showPrimaryColorPreview={getBooleanProp(node, 'showPrimaryColorPreview')}
            onChange={(value, context) => emitInteractionLifecycle('onChange', { value, context })}
            onClear={(context) => emitInteractionLifecycle('onClear', context)}
            onPaletteBarChange={(context) => emitInteractionLifecycle('onPaletteBarChange', context)}
            onRecentColorsChange={(value) => emitInteractionLifecycle('onRecentColorsChange', { value })}
            style={mergeStyle()}
          />
        </div>
      );
      }
    case 'TimePicker':
      {
      const isControlled = getBooleanProp(node, 'controlled') !== false;

      return (
        <div style={mergeStyle()}>
          <TimePicker
            format={getStringProp(node, 'format') || 'HH:mm:ss'}
            value={isControlled ? (getStringProp(node, 'value') || undefined) : undefined}
            defaultValue={isControlled ? undefined : (getStringProp(node, 'defaultValue') || undefined)}
            placeholder={getStringProp(node, 'placeholder') || undefined}
            size={getStringProp(node, 'size') as any}
            status={getStringProp(node, 'status') as any}
            steps={getTimeStepsProp(node) as any}
            allowInput={getBooleanProp(node, 'allowInput')}
            borderless={getBooleanProp(node, 'borderless')}
            clearable={getBooleanProp(node, 'clearable')}
            disabled={getBooleanProp(node, 'disabled')}
            hideDisabledTime={getBooleanProp(node, 'hideDisabledTime')}
            onBlur={(context) => emitInteractionLifecycle('onBlur', context)}
            onChange={(value) => emitInteractionLifecycle('onChange', { value })}
            onClear={(context) => emitInteractionLifecycle('onClear', context)}
            onClose={(context) => emitInteractionLifecycle('onClose', context)}
            onFocus={(context) => emitInteractionLifecycle('onFocus', context)}
            onInput={(context) => emitInteractionLifecycle('onInput', context)}
            onOpen={(context) => emitInteractionLifecycle('onOpen', context)}
            onPick={(value, context) => emitInteractionLifecycle('onPick', { value, context })}
            style={mergeStyle()}
          />
        </div>
      );
      }
    case 'TimeRangePicker':
      {
      const isControlled = getBooleanProp(node, 'controlled') !== false;
      const value = getTimeRangeValueProp(node, 'value');
      const defaultValue = getTimeRangeValueProp(node, 'defaultValue');
      const placeholderStart = getStringProp(node, 'placeholderStart');
      const placeholderEnd = getStringProp(node, 'placeholderEnd');
      const placeholder = placeholderStart || placeholderEnd
        ? [placeholderStart || '开始时间', placeholderEnd || '结束时间']
        : undefined;

      return (
        <div style={mergeStyle()}>
          <TimeRangePicker
            format={getStringProp(node, 'format') || 'HH:mm:ss'}
            value={isControlled ? (value as any) : undefined}
            defaultValue={isControlled ? undefined : (defaultValue as any)}
            placeholder={placeholder as any}
            size={getStringProp(node, 'size') as any}
            status={getStringProp(node, 'status') as any}
            steps={getTimeStepsProp(node) as any}
            allowInput={getBooleanProp(node, 'allowInput')}
            autoSwap={getBooleanProp(node, 'autoSwap')}
            borderless={getBooleanProp(node, 'borderless')}
            clearable={getBooleanProp(node, 'clearable')}
            disabled={getBooleanProp(node, 'disabled')}
            hideDisabledTime={getBooleanProp(node, 'hideDisabledTime')}
            onBlur={(context) => emitInteractionLifecycle('onBlur', context)}
            onChange={(nextValue) => emitInteractionLifecycle('onChange', { value: nextValue })}
            onFocus={(context) => emitInteractionLifecycle('onFocus', context)}
            onInput={(context) => emitInteractionLifecycle('onInput', context)}
            onPick={(nextValue, context) => emitInteractionLifecycle('onPick', { value: nextValue, context })}
            style={mergeStyle()}
          />
        </div>
      );
      }
    case 'Input':
      {
      const isControlled = getBooleanProp(node, 'controlled') !== false;
      const inputValueProps = isControlled
        ? { value: getStringProp(node, 'value') ?? '' }
        : { defaultValue: getStringProp(node, 'defaultValue') || undefined };

      return (
        <div style={mergeStyle()}>
          <Input
            {...inputValueProps}
            className={getStringProp(node, 'className') || undefined}
            align={getStringProp(node, 'align') as any}
            allowInputOverMax={getBooleanProp(node, 'allowInputOverMax')}
            autoWidth={getBooleanProp(node, 'autoWidth')}
            autocomplete={getStringProp(node, 'autocomplete') || undefined}
            autofocus={getBooleanProp(node, 'autofocus')}
            borderless={getBooleanProp(node, 'borderless')}
            placeholder={getStringProp(node, 'placeholder') || undefined}
            size={getStringProp(node, 'size') as any}
            status={getStringProp(node, 'status') as any}
            clearable={getBooleanProp(node, 'clearable')}
            disabled={getBooleanProp(node, 'disabled')}
            readonly={getBooleanProp(node, 'readOnly') ?? getBooleanProp(node, 'readonly')}
            maxcharacter={getFiniteNumberProp(node, 'maxcharacter') as any}
            maxlength={getFiniteNumberProp(node, 'maxlength') as any}
            name={getStringProp(node, 'name') || undefined}
            showClearIconOnEmpty={getBooleanProp(node, 'showClearIconOnEmpty')}
            showLimitNumber={getBooleanProp(node, 'showLimitNumber')}
            spellCheck={getBooleanProp(node, 'spellCheck')}
            tips={getStringProp(node, 'tips') || undefined}
            type={getStringProp(node, 'type') as any}
            onBlur={(value, context) => emitInteractionLifecycle('onBlur', { value, context })}
            onChange={(value, context) => {
              const nextValue = String(value ?? '');
              syncNodeValue(nextValue);
              emitInteractionLifecycle('onChange', { value: nextValue, context });
            }}
            onClear={(context) => emitInteractionLifecycle('onClear', context)}
            onClick={(context) => emitInteractionLifecycle('onClick', context)}
            onCompositionend={(value, context) => emitInteractionLifecycle('onCompositionend', { value, context })}
            onCompositionstart={(value, context) => emitInteractionLifecycle('onCompositionstart', { value, context })}
            onEnter={(value, context) => emitInteractionLifecycle('onEnter', { value, context })}
            onFocus={(value, context) => emitInteractionLifecycle('onFocus', { value, context })}
            onKeydown={(value, context) => emitInteractionLifecycle('onKeydown', { value, context })}
            onKeypress={(value, context) => emitInteractionLifecycle('onKeypress', { value, context })}
            onKeyup={(value, context) => emitInteractionLifecycle('onKeyup', { value, context })}
            onMouseenter={(context) => emitInteractionLifecycle('onMouseenter', context)}
            onMouseleave={(context) => emitInteractionLifecycle('onMouseleave', context)}
            onPaste={(context) => emitInteractionLifecycle('onPaste', context)}
            onValidate={(context) => emitInteractionLifecycle('onValidate', context)}
            onWheel={(context) => emitInteractionLifecycle('onWheel', context)}
            style={mergeStyle()}
          />
        </div>
      );
      }
    case 'Textarea':
      {
      const isControlled = getBooleanProp(node, 'controlled') !== false;
      const getTextareaStyleProp = () => {
        const value = getProp(node, 'style');

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return value as React.CSSProperties;
        }

        if (typeof value === 'string') {
          const text = value.trim();
          if (!text) {
            return undefined;
          }

          try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              return parsed as React.CSSProperties;
            }
          } catch {
            return undefined;
          }
        }

        return undefined;
      };

      const getTextareaAutosizeProp = () => {
        const value = getProp(node, 'autosize');

        if (typeof value === 'boolean') {
          return value;
        }

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const record = value as Record<string, unknown>;
          const minRows = typeof record.minRows === 'number' && Number.isFinite(record.minRows)
            ? record.minRows
            : undefined;
          const maxRows = typeof record.maxRows === 'number' && Number.isFinite(record.maxRows)
            ? record.maxRows
            : undefined;

          if (typeof minRows === 'number' || typeof maxRows === 'number') {
            return { minRows, maxRows };
          }

          return undefined;
        }

        if (typeof value === 'string') {
          const text = value.trim();
          if (!text) {
            return undefined;
          }

          if (text === 'true') {
            return true;
          }

          if (text === 'false') {
            return false;
          }

          try {
            const parsed = JSON.parse(text);
            if (typeof parsed === 'boolean') {
              return parsed;
            }
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              const record = parsed as Record<string, unknown>;
              const minRows = typeof record.minRows === 'number' && Number.isFinite(record.minRows)
                ? record.minRows
                : undefined;
              const maxRows = typeof record.maxRows === 'number' && Number.isFinite(record.maxRows)
                ? record.maxRows
                : undefined;

              if (typeof minRows === 'number' || typeof maxRows === 'number') {
                return { minRows, maxRows };
              }
            }
          } catch {
            return undefined;
          }
        }

        return undefined;
      };

      const textareaValueProps = isControlled
        ? { value: getStringProp(node, 'value') ?? '' }
        : { defaultValue: getStringProp(node, 'defaultValue') || undefined };
      const textareaStyle = getTextareaStyleProp();
      const mergedTextareaStyle = textareaStyle ? { ...mergeStyle(), ...textareaStyle } : mergeStyle();

      return (
        <div style={mergeStyle()}>
          <Textarea
            {...textareaValueProps}
            className={getStringProp(node, 'className') || undefined}
            allowInputOverMax={getBooleanProp(node, 'allowInputOverMax')}
            autofocus={getBooleanProp(node, 'autofocus')}
            count={getBooleanProp(node, 'count')}
            placeholder={getStringProp(node, 'placeholder') || undefined}
            status={getStringProp(node, 'status') as any}
            disabled={getBooleanProp(node, 'disabled')}
            readonly={getBooleanProp(node, 'readOnly') ?? getBooleanProp(node, 'readonly')}
            maxcharacter={getFiniteNumberProp(node, 'maxcharacter') as any}
            maxlength={getFiniteNumberProp(node, 'maxlength') as any}
            name={getStringProp(node, 'name') || undefined}
            tips={getStringProp(node, 'tips') || undefined}
            autosize={getTextareaAutosizeProp()}
            onBlur={(value, context) => emitInteractionLifecycle('onBlur', { value, context })}
            onChange={(value, context) => {
              const nextValue = String(value ?? '');
              syncNodeValue(nextValue);
              emitInteractionLifecycle('onChange', { value: nextValue, context });
            }}
            onFocus={(value, context) => emitInteractionLifecycle('onFocus', { value, context })}
            onKeydown={(value, context) => emitInteractionLifecycle('onKeydown', { value, context })}
            onKeypress={(value, context) => emitInteractionLifecycle('onKeypress', { value, context })}
            onKeyup={(value, context) => emitInteractionLifecycle('onKeyup', { value, context })}
            style={mergedTextareaStyle}
          />
        </div>
      );
      }
    case 'InputNumber':
      {
      const isControlled = getBooleanProp(node, 'controlled') !== false;

      return (
        <div style={mergeStyle()}>
          <InputNumber
            value={isControlled ? getInputNumberValueProp(node, 'value') as any : undefined}
            defaultValue={isControlled ? undefined : getInputNumberValueProp(node, 'defaultValue') as any}
            min={getInputNumberValueProp(node, 'min') as any}
            max={getInputNumberValueProp(node, 'max') as any}
            step={getInputNumberValueProp(node, 'step') as any}
            decimalPlaces={getFiniteNumberProp(node, 'decimalPlaces') as any}
            placeholder={getStringProp(node, 'placeholder') || undefined}
            size={getStringProp(node, 'size') as any}
            status={getStringProp(node, 'status') as any}
            align={getStringProp(node, 'align') as any}
            theme={getStringProp(node, 'theme') as any}
            allowInputOverLimit={getBooleanProp(node, 'allowInputOverLimit')}
            autoWidth={getBooleanProp(node, 'autoWidth')}
            disabled={getBooleanProp(node, 'disabled')}
            readOnly={getBooleanProp(node, 'readOnly')}
            largeNumber={getBooleanProp(node, 'largeNumber')}
            onBlur={(value, context) => emitInteractionLifecycle('onBlur', { value, context })}
            onChange={(value, context) => {
              syncNodeValue(value);
              emitInteractionLifecycle('onChange', { value, context });
            }}
            onEnter={(value, context) => emitInteractionLifecycle('onEnter', { value, context })}
            onFocus={(value, context) => emitInteractionLifecycle('onFocus', { value, context })}
            onKeydown={(value, context) => emitInteractionLifecycle('onKeydown', { value, context })}
            onKeypress={(value, context) => emitInteractionLifecycle('onKeypress', { value, context })}
            onKeyup={(value, context) => emitInteractionLifecycle('onKeyup', { value, context })}
            onValidate={(context) => emitInteractionLifecycle('onValidate', context)}
            style={mergeStyle()}
          />
        </div>
      );
      }
    case 'Slider':
      {
      const isControlled = getBooleanProp(node, 'controlled') !== false;
      const isRange = getBooleanProp(node, 'range') === true;
      const min = getFiniteNumberProp(node, 'min') ?? 0;
      const max = getFiniteNumberProp(node, 'max') ?? 100;
      const rawValue = getSliderValueProp(node, 'value');
      const rawDefaultValue = getSliderValueProp(node, 'defaultValue');

      const value = isRange
        ? (Array.isArray(rawValue) ? rawValue : (typeof rawValue === 'number' ? [rawValue, rawValue] : [min, min]))
        : (Array.isArray(rawValue) ? rawValue[0] : (typeof rawValue === 'number' ? rawValue : min));

      const defaultValue = isRange
        ? (Array.isArray(rawDefaultValue) ? rawDefaultValue : (typeof rawDefaultValue === 'number' ? [rawDefaultValue, rawDefaultValue] : [min, min]))
        : (Array.isArray(rawDefaultValue) ? rawDefaultValue[0] : (typeof rawDefaultValue === 'number' ? rawDefaultValue : min));

      const sliderValueProps = isControlled
        ? { value: value as any }
        : { defaultValue: defaultValue as any };

      return (
        <div style={mergeStyle()}>
          <Slider
            {...sliderValueProps}
            layout={getStringProp(node, 'layout') as any}
            min={min}
            max={max}
            step={getFiniteNumberProp(node, 'step')}
            range={isRange}
            disabled={getBooleanProp(node, 'disabled')}
            onChange={(nextValue) => {
              syncNodeValue(nextValue);
              emitInteractionLifecycle('onChange', { value: nextValue });
            }}
            style={mergeStyle()}
          />
        </div>
      );
      }
    case 'Steps':
      {
      const isControlled = getBooleanProp(node, 'controlled') !== false;
      const current = getStepsCurrentProp(node, 'current');
      const defaultCurrent = getStepsCurrentProp(node, 'defaultCurrent');
      const stepItems = (node.children ?? [])
        .filter((child) => (typeof child.type === 'string' ? child.type.trim() : child.type) === 'Steps.Item')
        .filter((child) => {
          const visibleProp = (child.props?.visible as { value?: unknown } | undefined)?.value;
          return visibleProp !== false;
        })
        .map((child) => {
          const getStepProp = (propName: string) => {
            const prop = child.props?.[propName] as { value?: unknown } | undefined;
            return prop?.value;
          };

          const title = getStepProp('title');
          const content = getStepProp('content');
          const status = getStepProp('status');
          const value = getStepProp('value');
          const normalizedStatus =
            status === 'default' || status === 'process' || status === 'finish' || status === 'error'
              ? status
              : undefined;
          const normalizedValue =
            typeof value === 'number'
              ? value
              : (typeof value === 'string'
                ? (value.trim() ? value.trim() : undefined)
                : undefined);

          return {
            key: child.key,
            title: typeof title === 'string' ? title : '',
            content: typeof content === 'string' ? content : '',
            status: normalizedStatus,
            value: normalizedValue,
          };
        });

      const stepsValueProps = isControlled
        ? { current: current ?? 0 }
        : { defaultCurrent: defaultCurrent ?? 0 };

      const stepsLayout = getStringProp(node, 'layout') as 'horizontal' | 'vertical' | undefined;
      const fallbackMinHeight = stepsLayout === 'vertical' ? 160 : 88;

      return (
        <div style={mergeStyle()}>
          <Steps
            {...stepsValueProps}
            layout={stepsLayout as any}
            readOnly={getBooleanProp(node, 'readOnly')}
            separator={getStringProp(node, 'separator') as any}
            sequence={getStringProp(node, 'sequence') as any}
            theme={getStringProp(node, 'theme') as any}
            onChange={(currentValue, previousValue, context) =>
              emitInteractionLifecycle('onChange', {
                current: currentValue,
                previous: previousValue,
                context,
              })
            }
            style={mergeStyle({ minHeight: fallbackMinHeight })}
          >
            {stepItems.map((item) => (
              <Steps.StepItem
                key={item.key}
                title={item.title}
                content={item.content}
                status={item.status as any}
                value={item.value as any}
              />
            ))}
          </Steps>
        </div>
      );
      }
    case 'Steps.Item':
      return null;
    case 'Swiper': {
      const imageList = getSwiperImages(node);
      const height = getNumberProp(node, 'height') ?? 240;

      if (imageList.length === 0) {
        return null;
      }

      return (
        <div style={mergeStyle()}>
          <Swiper autoplay height={height} style={{ width: '100%' }}>
            {imageList.map((imageItem, index) => (
              <Swiper.SwiperItem key={`${node.key}-swiper-${index}`}>
                <div style={{ width: '100%', height: '100%' }}>
                  <Image
                    src={imageItem.src}
                    fallback={imageItem.fallback || undefined}
                    lazy={imageItem.lazy}
                    fit={imageItem.objectFit as any}
                    style={{ width: '100%', height: '100%', objectPosition: imageItem.objectPosition }}
                  />
                </div>
              </Swiper.SwiperItem>
            ))}
          </Swiper>
        </div>
      );
    }
    case 'Divider':
      return (
        <div style={mergeStyle()}>
          <Divider
            align={getStringProp(node, 'align') as any}
            dashed={getBooleanProp(node, 'dashed')}
            size={getNumberProp(node, 'size')}
            content={getStringProp(node, 'content')}
            style={mergeStyle()}
          />
        </div>
      );
    case 'Typography.Title':
      return (
        <div style={mergeStyle()}>
          <Typography.Title level={getStringProp(node, 'level') as any} style={mergeStyle()}>
            {getTextProp(node, 'content')}
          </Typography.Title>
        </div>
      );
    case 'Typography.Paragraph':
      return (
        <div style={mergeStyle()}>
          <Typography.Paragraph style={mergeStyle()}>
            {getTextProp(node, 'content')}
          </Typography.Paragraph>
        </div>
      );
    case 'Typography.Text':
      return (
        <div style={mergeStyle()}>
          <Typography.Text
            theme={getStringProp(node, 'theme') as any}
            strong={getBooleanProp(node, 'strong')}
            underline={getBooleanProp(node, 'underline')}
            delete={getBooleanProp(node, 'delete')}
            code={getBooleanProp(node, 'code')}
            mark={getBooleanProp(node, 'mark')}
            style={mergeStyle()}
          >
            {getTextProp(node, 'content')}
          </Typography.Text>
        </div>
      );
    case 'CustomComponent':
      return (
        <div style={mergeStyle()}>
          <PreviewCustomComponentRenderer node={node} onLifecycle={onLifecycle} />
        </div>
      );
    case 'ComponentSlotOutlet':
      return <>{renderChildren(node, onLifecycle)}</>;
    case 'root':
      return (
        <div style={mergeStyle()} className="preview-page-root" data-preview-page-root>
          <div className="preview-page-root__body">{renderChildren(node, onLifecycle)}</div>
        </div>
      );
    default:
      return <>{renderChildren(node, onLifecycle)}</>;
  }
};

export default React.memo(PreviewRenderer);
