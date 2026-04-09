import type { ProgressProps } from 'antd';

/** 与 propAccessors / PreviewRenderer 中 Progress 颜色解析一致，供预览与搭建共用 */
export function parseProgressColorValue(value: unknown): string | string[] | Record<string, string> | undefined {
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return undefined;
    if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
      try {
        const parsed = JSON.parse(text) as unknown;
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
    if (splitList.length >= 2) return splitList;
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
}

export function parseProgressLabelValue(showLabel: unknown, labelText: unknown): string | boolean {
  if (showLabel === false) return false;
  const text = typeof labelText === 'string' ? labelText.trim() : '';
  return text || true;
}

function normalizeStrokeColorForAntd(
  color: string | string[] | Record<string, string> | undefined,
): ProgressProps['strokeColor'] | undefined {
  if (color === undefined) return undefined;
  if (typeof color === 'string') return color;
  if (Array.isArray(color)) return color.length ? color : undefined;
  const rec = color as Record<string, string>;
  if (rec.from && rec.to) return { from: rec.from, to: rec.to };
  return rec;
}

/** DSL status → antd Progress status（warning 无对应，走 normal） */
export function mapProgressStatusToAntd(status: string | undefined): ProgressProps['status'] | undefined {
  if (!status || status === 'default') return undefined;
  if (status === 'success') return 'success';
  if (status === 'error') return 'exception';
  if (status === 'active') return 'active';
  if (status === 'warning') return 'normal';
  return undefined;
}

function mapLineSizeToAntd(size: string | number | undefined): ProgressProps['size'] {
  if (size === 'small') return 'small';
  if (size === 'medium') return 'medium';
  if (size === 'large') return 'default';
  return 'default';
}

function circleDiameterFromSize(size: string | number | undefined): number {
  if (typeof size === 'number' && Number.isFinite(size) && size > 0) return Math.max(32, size);
  if (size === 'small') return 80;
  if (size === 'large') return 160;
  return 120;
}

function resolveStrokeWidth(theme: string | undefined, strokeWidth: number | undefined): number | undefined {
  if (typeof strokeWidth === 'number' && Number.isFinite(strokeWidth) && strokeWidth > 0) return strokeWidth;
  if (theme === 'plump') return 16;
  return undefined;
}

export type ProgressDslInput = {
  theme?: string;
  percentage: number;
  status?: string;
  color?: string | string[] | Record<string, string>;
  trackColor?: string;
  strokeWidth?: number;
  size?: string | number;
  label: string | boolean;
};

/**
 * 将物料 Progress（TDesign 语义）映射为 antd Progress 可识别属性：
 * - theme: line | plump | circle → type line | circle（plump 加粗默认线宽）
 * - color / trackColor → strokeColor / railColor
 * - strokeWidth / size
 * - showLabel / labelText → showInfo / format
 */
export function antdProgressPropsFromDsl(input: ProgressDslInput): ProgressProps {
  const theme = (input.theme || 'line').trim();
  const type: ProgressProps['type'] = theme === 'circle' ? 'circle' : 'line';
  const status = mapProgressStatusToAntd(input.status);
  const strokeColor = normalizeStrokeColorForAntd(input.color);
  const rail = input.trackColor?.trim();
  const strokeWidth = resolveStrokeWidth(theme, input.strokeWidth);

  const props: ProgressProps = {
    percent: input.percentage,
    type,
    status,
    strokeColor,
    railColor: rail || undefined,
    trailColor: rail || undefined,
    strokeWidth,
  };

  if (type === 'circle') {
    props.size = circleDiameterFromSize(input.size);
  } else {
    props.size = mapLineSizeToAntd(input.size);
  }

  if (input.label === false) {
    props.showInfo = false;
  } else if (typeof input.label === 'string') {
    const text = input.label;
    props.format = () => text;
  }

  return props;
}
