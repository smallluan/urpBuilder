import type React from 'react';
import type { UiTreeNode } from '../store/types';
import componentCatalog from '../../config/componentCatalog';

const TITLE_MAX = 16;
const META_MAX = 14;

function truncate(text: string, max: number): string {
  const t = String(text ?? '').trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

const CATALOG_TYPE_TO_ZH = new Map<string, string>();
for (const item of componentCatalog) {
  const t = String(item.type ?? '').trim();
  const n = String(item.name ?? '').trim();
  if (t && n) {
    CATALOG_TYPE_TO_ZH.set(t, n);
  }
}

/** 无目录条目时的中文归类（不出现英文 type） */
function categoryZhByType(type: string): string {
  const t = String(type ?? '').trim();
  if (!t) {
    return '';
  }
  if (t === 'CustomComponent') {
    return '自定义';
  }
  if (t.startsWith('ECharts.') || t.endsWith('Chart') || t === 'EChart') {
    return '图表';
  }
  if (t === 'Table') {
    return '表格';
  }
  if (t.startsWith('Typography.')) {
    return '文本';
  }
  if (t.startsWith('antd.')) {
    return 'Ant Design';
  }

  if (t.startsWith('Grid.') || t.startsWith('Layout.') || t === 'Layout') {
    return '布局';
  }
  if (
    t.startsWith('Menu')
    || t === 'Tabs'
    || t === 'Collapse'
    || t === 'Steps'
    || t === 'Swiper'
  ) {
    return '导航';
  }
  if (
    t === 'Button'
    || t === 'Link'
    || t === 'Input'
    || t === 'Textarea'
    || t === 'InputNumber'
    || t === 'Select'
    || t === 'Switch'
    || t === 'Slider'
    || t === 'Upload'
    || t === 'ColorPicker'
    || t === 'TimePicker'
    || t === 'TimeRangePicker'
  ) {
    return '表单';
  }
  if (t === 'Image' || t === 'Avatar') {
    return '媒体';
  }
  if (t === 'List') {
    return '列表';
  }
  if (t.startsWith('Flex') || t === 'Stack' || t === 'Space' || t === 'Inline') {
    return '布局';
  }
  return '';
}

function componentTypeLabelZh(
  type: string,
  catalogData?: Record<string, unknown>,
): string {
  const t = String(type ?? '').trim();
  const fromCatalog = CATALOG_TYPE_TO_ZH.get(t);
  if (fromCatalog) {
    return fromCatalog;
  }
  const nameFromPayload = catalogData && typeof catalogData.name === 'string' ? String(catalogData.name).trim() : '';
  if (nameFromPayload) {
    return nameFromPayload;
  }
  return categoryZhByType(t);
}

const FLOW_NODE_META: Record<string, string> = {
  eventFilterNode: '事件过滤',
  codeNode: '代码',
  networkRequestNode: '网络请求',
  timerNode: '定时器',
  propExposeNode: '属性暴露',
  lifecycleExposeNode: '生命周期',
};

function flowNodeMeta(nodeType: string): string {
  const k = String(nodeType ?? '').trim();
  return FLOW_NODE_META[k] || '';
}

export type BuilderDragPreviewKind = 'page' | 'flow-builtin' | 'flow-component';

export interface BuilderDragPreviewOptions {
  kind: BuilderDragPreviewKind;
  title: string;
  componentType?: string;
  catalogData?: Record<string, unknown>;
  pageUiTreeNode?: UiTreeNode;
  flowBuiltinTheme?: string;
  flowNodeType?: string;
}

/** 小卡片：闪亮图标 + 角标 + 主文案 + 可选补充（全中文优先） */
function buildDragChip(
  root: HTMLElement,
  options: {
    badge: string;
    title: string;
    meta: string;
    accent?: 'default' | 'event' | 'code' | 'request' | 'timer' | 'page' | 'flow';
  },
): void {
  const { badge, title, meta, accent = 'default' } = options;
  const safeTitle = truncate(title, TITLE_MAX);
  const safeMetaRaw = String(meta ?? '').trim();
  const safeMeta =
    safeMetaRaw && safeMetaRaw !== safeTitle ? truncate(safeMetaRaw, META_MAX) : '';

  root.className = [
    'builder-drag-chip',
    accent !== 'default' ? `builder-drag-chip--accent-${accent}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const glow = document.createElement('div');
  glow.className = 'builder-drag-chip__glow';
  glow.setAttribute('aria-hidden', 'true');
  const spark = document.createElement('span');
  spark.className = 'builder-drag-chip__spark';
  spark.textContent = '✦';
  glow.appendChild(spark);

  const main = document.createElement('div');
  main.className = 'builder-drag-chip__main';

  const titleEl = document.createElement('div');
  titleEl.className = 'builder-drag-chip__title';
  titleEl.textContent = safeTitle;

  const badgeText = String(badge ?? '').trim();
  if (badgeText) {
    const badgeEl = document.createElement('div');
    badgeEl.className = 'builder-drag-chip__badge';
    badgeEl.textContent = badgeText;
    main.appendChild(badgeEl);
  }
  main.appendChild(titleEl);
  if (safeMeta) {
    const metaEl = document.createElement('div');
    metaEl.className = 'builder-drag-chip__meta';
    metaEl.textContent = safeMeta;
    main.appendChild(metaEl);
  }

  root.appendChild(glow);
  root.appendChild(main);
}

function themeToAccent(theme: string): 'event' | 'code' | 'request' | 'timer' | 'default' {
  const t = String(theme ?? '').trim();
  if (t === 'event') return 'event';
  if (t === 'code') return 'code';
  if (t === 'request' || t === 'network') return 'request';
  if (t === 'timer') return 'timer';
  return 'default';
}

export function applyBuilderDragPreview(
  event: React.DragEvent<HTMLElement>,
  options: BuilderDragPreviewOptions,
): void {
  const dt = event.dataTransfer;
  if (!dt || typeof dt.setDragImage !== 'function') {
    return;
  }

  const host = document.createElement('div');
  host.className = 'builder-drag-preview-host';

  const inner = document.createElement('div');

  if (options.kind === 'flow-builtin') {
    const theme = String(options.flowBuiltinTheme ?? 'event');
    const sub = flowNodeMeta(String(options.flowNodeType ?? ''));
    buildDragChip(inner, {
      badge: '内置',
      title: options.title,
      meta: sub,
      accent: themeToAccent(theme),
    });
  } else if (options.kind === 'flow-component') {
    const ctype = String(options.componentType ?? '').trim();
    const sub = componentTypeLabelZh(ctype, undefined) || categoryZhByType(ctype);
    buildDragChip(inner, {
      badge: '流程',
      title: options.title,
      meta: sub,
      accent: 'flow',
    });
  } else {
    const type = String(
      options.componentType
        ?? options.pageUiTreeNode?.type
        ?? (options.catalogData?.type as string)
        ?? '',
    );
    const sub = componentTypeLabelZh(type, options.catalogData)
      || (options.pageUiTreeNode?.label
        ? String(options.pageUiTreeNode.label).trim()
        : '')
      || categoryZhByType(type);
    buildDragChip(inner, {
      badge: '',
      title: options.title,
      meta: sub,
      accent: 'page',
    });
  }

  host.appendChild(inner);

  Object.assign(host.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    zIndex: '2147483647',
    pointerEvents: 'none',
    margin: '0',
    padding: '0',
  });

  document.body.appendChild(host);
  void host.offsetWidth;

  try {
    const rect = host.getBoundingClientRect();
    const ox = Math.max(10, Math.round(Math.min(rect.width / 2, 52)));
    const oy = Math.max(8, Math.round(Math.min(rect.height / 2, 28)));
    dt.setDragImage(host, ox, oy);
  } catch {
    host.remove();
    return;
  }

  const cleanup = () => {
    host.remove();
  };
  document.addEventListener('dragend', cleanup, { once: true });
}
