import type React from 'react';
import { getBuilderDragPreviewContext } from './builderDragPreviewBridge';
import {
  mountBuilderPageDragPreview,
  shouldUseStaticPageDragPreview,
  teardownDragPreviewReactRoot,
} from './mountPageDragPreview';
import { mountFlowBuiltinDragPreview, mountFlowComponentDragPreview } from './mountFlowDragPreview';

const TITLE_MAX = 22;
const TYPE_MAX = 18;

function truncate(text: string, max: number): string {
  const t = String(text ?? '').trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function resolvePageVariant(componentType: string): string {
  const t = componentType.trim();
  if (t === 'Button') {
    return 'td-button';
  }
  if (t === 'Link') {
    return 'td-link';
  }
  if (
    t === 'Input'
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
    return 'td-input';
  }
  if (t.startsWith('Typography.')) {
    return 'td-text';
  }
  if (t === 'Image' || t === 'Avatar') {
    return 'media';
  }
  if (t.startsWith('ECharts.') || t.includes('Chart')) {
    return 'chart';
  }
  if (t === 'CustomComponent') {
    return 'custom';
  }
  if (
    t.startsWith('Grid.')
    || t.startsWith('Flex')
    || t === 'Stack'
    || t === 'Space'
    || t === 'Inline'
    || t.startsWith('Layout.')
    || t === 'Layout'
    || t === 'RouteOutlet'
    || t === 'ComponentSlotOutlet'
    || t.startsWith('Menu')
    || t === 'Tabs'
    || t === 'Collapse'
    || t === 'Steps'
    || t === 'Swiper'
    || t === 'List'
    || t === 'Drawer'
  ) {
    return 'layout';
  }
  return 'chip';
}

export type BuilderDragPreviewKind = 'page' | 'flow-builtin' | 'flow-component';

export interface BuilderDragPreviewOptions {
  kind: BuilderDragPreviewKind;
  title: string;
  componentType?: string;
  /** 与 insertToUiPageData 相同的完整 schema（页面组件库拖拽） */
  catalogData?: Record<string, unknown>;
  flowBuiltinTheme?: string;
  flowNodeType?: string;
}

function buildPagePreview(root: HTMLElement, title: string, componentType: string): void {
  const variant = resolvePageVariant(componentType);
  root.className = `builder-drag-preview builder-drag-preview--page-${variant}`;
  const safeTitle = truncate(title, TITLE_MAX);

  if (variant === 'td-button') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'builder-drag-preview__td-button';
    btn.textContent = safeTitle;
    btn.tabIndex = -1;
    root.appendChild(btn);
    return;
  }

  if (variant === 'td-link') {
    const span = document.createElement('span');
    span.className = 'builder-drag-preview__td-link';
    span.textContent = safeTitle;
    root.appendChild(span);
    return;
  }

  if (variant === 'td-input') {
    const inner = document.createElement('span');
    inner.className = 'builder-drag-preview__td-input-ph';
    inner.textContent = safeTitle;
    root.appendChild(inner);
    return;
  }

  if (variant === 'td-text') {
    root.textContent = safeTitle;
    return;
  }

  if (variant === 'media') {
    const sq = document.createElement('div');
    sq.className = 'builder-drag-preview__media-sq';
    root.appendChild(sq);
    const cap = document.createElement('span');
    cap.className = 'builder-drag-preview__media-cap';
    cap.textContent = safeTitle;
    root.appendChild(cap);
    return;
  }

  if (variant === 'chart') {
    root.textContent = safeTitle;
    return;
  }

  if (variant === 'layout') {
    root.textContent = safeTitle;
    return;
  }

  if (variant === 'custom') {
    const tag = document.createElement('span');
    tag.className = 'builder-drag-preview__custom-tag';
    tag.textContent = '自定义';
    root.appendChild(tag);
    const name = document.createElement('span');
    name.className = 'builder-drag-preview__custom-name';
    name.textContent = safeTitle;
    root.appendChild(name);
    return;
  }

  root.textContent = safeTitle;
}

function buildFlowBuiltinPreview(root: HTMLElement, title: string, theme: string): void {
  const t = theme || 'event';
  root.className = `builder-drag-preview builder-drag-preview--flow-builtin builder-drag-preview--fb-${t}`;
  root.textContent = truncate(title, TITLE_MAX);
}

function buildFlowComponentPreview(root: HTMLElement, title: string, componentType: string): void {
  root.className = 'flow-component-node builder-drag-preview--flow-snapshot';

  const top = document.createElement('div');
  top.className = 'flow-component-node__top';

  const badge = document.createElement('span');
  badge.className = 'flow-component-node__badge';
  badge.textContent = '组件节点';
  top.appendChild(badge);

  const typeEl = document.createElement('span');
  typeEl.className = 'flow-component-node__type';
  typeEl.textContent = truncate(componentType || 'Unknown', TYPE_MAX);
  top.appendChild(typeEl);

  root.appendChild(top);

  const titleEl = document.createElement('div');
  titleEl.className = 'flow-component-node__title';
  titleEl.textContent = truncate(title, TITLE_MAX);
  root.appendChild(titleEl);

  const meta = document.createElement('div');
  meta.className = 'flow-component-node__meta';
  meta.textContent = '从结构树拖入';
  root.appendChild(meta);
}

function clearHost(host: HTMLElement): void {
  teardownDragPreviewReactRoot(host);
  host.replaceChildren();
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

  let usedReact = false;

  try {
    if (options.kind === 'flow-builtin') {
      const nodeType = String(options.flowNodeType ?? '');
      if (nodeType) {
        usedReact = mountFlowBuiltinDragPreview(host, nodeType, options.title);
      }
      if (!usedReact) {
        clearHost(host);
        const inner = document.createElement('div');
        buildFlowBuiltinPreview(inner, options.title, String(options.flowBuiltinTheme ?? 'event'));
        host.appendChild(inner);
      }
    } else if (options.kind === 'flow-component') {
      usedReact = mountFlowComponentDragPreview(host, options.title, String(options.componentType ?? ''));
      if (!usedReact) {
        clearHost(host);
        const inner = document.createElement('div');
        buildFlowComponentPreview(inner, options.title, String(options.componentType ?? ''));
        host.appendChild(inner);
      }
    } else {
      const catalog = options.catalogData;
      const type = String(options.componentType ?? (catalog?.type as string) ?? '');
      const ctx = getBuilderDragPreviewContext();
      if (catalog && ctx && !shouldUseStaticPageDragPreview(type)) {
        usedReact = mountBuilderPageDragPreview(host, catalog, ctx);
      }
      if (!usedReact) {
        clearHost(host);
        const inner = document.createElement('div');
        buildPagePreview(inner, options.title, type);
        host.appendChild(inner);
      }
    }
  } catch {
    clearHost(host);
    const inner = document.createElement('div');
    if (options.kind === 'flow-builtin') {
      buildFlowBuiltinPreview(inner, options.title, String(options.flowBuiltinTheme ?? 'event'));
    } else if (options.kind === 'flow-component') {
      buildFlowComponentPreview(inner, options.title, String(options.componentType ?? ''));
    } else {
      const type = String(options.componentType ?? (options.catalogData?.type as string) ?? '');
      buildPagePreview(inner, options.title, type);
    }
    host.appendChild(inner);
  }

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

  const rect = host.getBoundingClientRect();
  const ox = Math.max(12, Math.round(Math.min(rect.width / 2, 56)));
  const oy = Math.max(10, Math.round(Math.min(rect.height / 2, 32)));

  try {
    dt.setDragImage(host, ox, oy);
  } catch {
    teardownDragPreviewReactRoot(host);
    host.remove();
    return;
  }

  const cleanup = () => {
    teardownDragPreviewReactRoot(host);
    host.remove();
  };
  document.addEventListener('dragend', cleanup, { once: true });
}
