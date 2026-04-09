import type { CSSProperties } from 'react';
import { normalizeBuilderTableColumns } from './tableColumnNormalize';

/**
 * TDesign Card 默认 body 内边距往往比 antd Card 更「松」，同一 DSL 切换预览库时登录区等会显得更靠下、更「空」。
 * 搭建与预览里为两套 Card 统一内容区内边距，避免纯组件库 token 差异带来的纵向错位观感。
 */
export const BUILDER_CARD_BODY_STYLE: CSSProperties = {
  padding: '20px 24px',
};

/**
 * Ant Design Statistic 根节点默认偏块级、易独占一行；TDesign Statistic 更接近行内块。
 * 根节点下兄弟的纵向排列由 `.drop-area-root > .drop-area__body` / `.preview-page-root__body` 的纵向 flex（`align-items: flex-start`）与 `min-width:0` 约束统一，避免 antd inline-flex 根在 block 流里横向并排。
 */
export function antStatisticRootStyleMerge(user?: CSSProperties): CSSProperties {
  return {
    display: 'inline-block',
    maxWidth: '100%',
    boxSizing: 'border-box',
    ...(user ?? {}),
  };
}

/** TDesign Statistic.color -> Ant Statistic valueStyle */
export function statisticColorStyle(color: string | undefined): CSSProperties | undefined {
  const map: Record<string, string> = {
    black: 'rgba(0,0,0,0.88)',
    blue: '#1677ff',
    red: '#ff4d4f',
    orange: '#fa8c16',
    green: '#52c41a',
  };
  const c = color && map[color];
  return c ? { color: c } : undefined;
}

/** TDesign Divider.align -> Ant Divider orientation */
export function dividerOrientationFromAlign(align: string | undefined): 'left' | 'center' | 'right' {
  const a = String(align ?? 'center').trim();
  if (a === 'left' || a === 'right' || a === 'center') {
    return a;
  }
  return 'center';
}

/** TDesign Typography.Title level h1..h6 -> Ant Title level 1..5 */
export function antTitleLevelFromTdesign(levelRaw: string | undefined): 1 | 2 | 3 | 4 | 5 {
  const s = String(levelRaw ?? 'h4').trim().toLowerCase();
  const n = Number(s.replace('h', ''));
  if (Number.isFinite(n) && n >= 1 && n <= 5) {
    return n as 1 | 2 | 3 | 4 | 5;
  }
  if (Number.isFinite(n) && n === 6) {
    return 5;
  }
  return 4;
}

export type ButtonAntdMapping = {
  type: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  size: 'large' | 'middle' | 'small';
  danger: boolean;
  block: boolean;
  shape?: 'default' | 'round' | 'circle';
};

export function mapTdesignButtonToAntd(opts: {
  theme?: string;
  variant?: string;
  shape?: string;
  size?: string;
  danger?: boolean;
  block?: boolean;
}): ButtonAntdMapping {
  const theme = String(opts.theme ?? 'default');
  const variant = String(opts.variant ?? 'base');
  const shape = String(opts.shape ?? 'rect');
  const sizeRaw = String(opts.size ?? 'medium');

  const sizeMap: Record<string, 'large' | 'middle' | 'small'> = {
    large: 'large',
    small: 'small',
    normal: 'middle',
    medium: 'middle',
  };
  const size = sizeMap[sizeRaw] ?? 'middle';

  let type: ButtonAntdMapping['type'] = 'default';
  if (variant === 'dashed') {
    type = 'dashed';
  } else if (variant === 'text') {
    type = 'text';
  } else if (variant === 'outline') {
    type = 'default';
  } else if (theme === 'primary') {
    type = 'primary';
  }

  const danger = theme === 'error' || opts.danger === true;
  const block = opts.block === true;
  const shapeAnt: 'default' | 'round' | 'circle' = shape === 'round' ? 'round' : 'default';

  return { type, size, danger, block, shape: shapeAnt };
}

/** TDesign Space.size 为 number，Ant Space 为 small|middle|large|number */
export function antdSpaceSizeFromTdesign(raw: unknown): number | 'small' | 'middle' | 'large' {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  const s = String(raw ?? '8');
  if (s === 'small') {
    return 'small';
  }
  if (s === 'middle' || s === 'medium') {
    return 'middle';
  }
  if (s === 'large') {
    return 'large';
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 8;
}

export function tdesignTableColumnsToAntd(columnsUnknown: unknown) {
  const normalized = normalizeBuilderTableColumns(columnsUnknown);
  return normalized.map((col, index) => ({
    title: String(col.title ?? ''),
    dataIndex: String(col.colKey ?? index),
    key: String(col.colKey ?? `col-${index}`),
    width: typeof col.width === 'number' ? col.width : undefined,
    align: col.align === 'center' || col.align === 'right' ? (col.align as 'center' | 'right') : ('left' as const),
    ellipsis: col.ellipsis === true ? ({ showTitle: true } as const) : undefined,
  }));
}

const TABLE_FALLBACK = [
  { id: 'row-1', name: '张三', role: '管理员', status: '启用' },
  { id: 'row-2', name: '李四', role: '编辑', status: '启用' },
  { id: 'row-3', name: '王五', role: '访客', status: '禁用' },
];

export function resolveAntdTableDataSource(raw: unknown): Array<Record<string, unknown>> {
  return Array.isArray(raw) && raw.length > 0 ? (raw as Array<Record<string, unknown>>) : TABLE_FALLBACK;
}

/**
 * TDesign Drawer 的 `size`（及可选数值 `width`）与 antd Drawer 的 `width`/`height` 对齐。
 * 尺寸表与 tdesign-react `drawer/Drawer.js` 内 `sizeMap` 一致（small/medium/large）。
 */
export function drawerWidthPxFromTdesignSize(opts: {
  width?: number;
  size?: string;
}): number {
  if (typeof opts.width === 'number' && opts.width > 0) {
    return opts.width;
  }
  const raw = String(opts.size ?? 'small').trim().toLowerCase();
  const sizeMap: Record<string, number> = {
    small: 300,
    medium: 500,
    large: 760,
  };
  if (sizeMap[raw]) {
    return sizeMap[raw];
  }
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) {
    return n;
  }
  return 300;
}
