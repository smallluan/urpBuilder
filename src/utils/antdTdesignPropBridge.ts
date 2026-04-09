import type { CSSProperties } from 'react';
import { normalizeBuilderTableColumns } from './tableColumnNormalize';

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
