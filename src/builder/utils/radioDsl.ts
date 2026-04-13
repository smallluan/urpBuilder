import type { CSSProperties } from 'react';
import type { UiTreeNode } from '../store/types';

export type RadioLabelAlign = 'top' | 'center' | 'bottom';

export type RadioGroupOptionLayout = 'horizontal' | 'vertical';

export type DslRadioRow = {
  key: string;
  value: string | number | boolean;
  /** 无子树时供 `options` 回退等使用的占位文案（通常为 `String(value)`） */
  label: string;
  disabled: boolean;
  /** 对应 DSL 子节点，用于搭建态标签区 DropArea / 预览子树 */
  node: UiTreeNode;
};

const RADIO_NODE_TYPES = new Set(['Radio', 'antd.Radio']);

/** 解析禁用、开关等布尔字段（兼容历史或非严格 boolean 存储） */
export function normalizeDslBoolean(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0 || raw === null || raw === undefined) return false;
  if (typeof raw === 'string') {
    const t = raw.trim().toLowerCase();
    return t === 'true' || t === '1' || t === 'yes';
  }
  return false;
}

/** 两个选项 value 是否视为同一选中项（如 1 与 "1"） */
export function valuesEqualForRadio(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

/** 单选项：标签与选项圈垂直对齐 */
export function parseRadioLabelAlign(raw: unknown): RadioLabelAlign {
  const s = String(raw ?? 'center').trim().toLowerCase();
  if (s === 'top' || s === 'bottom') {
    return s;
  }
  return 'center';
}

/** 单选组：子选项排列方向（物料 prop `optionLayout`） */
export function parseRadioGroupOptionLayout(raw: unknown): RadioGroupOptionLayout {
  const s = String(raw ?? 'horizontal').trim().toLowerCase();
  return s === 'vertical' ? 'vertical' : 'horizontal';
}

/** 单选组：子选项间距（px，物料 `optionGap`，横纵均生效） */
export function parseRadioGroupOptionGap(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number(raw.trim());
    if (Number.isFinite(n) && n >= 0) {
      return n;
    }
  }
  return 8;
}

/** TDesign / antd 单选组容器：横向或纵向排列子项 */
export function radioGroupOptionLayoutStyle(
  layout: RadioGroupOptionLayout,
  gapPx?: number,
): CSSProperties {
  const gap = gapPx ?? 8;
  return {
    display: 'flex',
    flexDirection: layout === 'vertical' ? 'column' : 'row',
    flexWrap: 'wrap',
    alignItems: layout === 'vertical' ? 'flex-start' : 'center',
    gap,
  };
}

/** 从 DSL 子节点收集单选项（与搭建/预览中 Radio.Group 子树一致） */
export function collectDslRadioRows(children: UiTreeNode[] | undefined): DslRadioRow[] {
  return (children ?? [])
    .filter((child) => RADIO_NODE_TYPES.has(String(child.type ?? '').trim()))
    .map((child) => {
      const get = (name: string) => (child.props?.[name] as { value?: unknown } | undefined)?.value;
      const valueRaw = get('value');
      let value: string | number | boolean =
        typeof valueRaw === 'number' || typeof valueRaw === 'boolean'
          ? valueRaw
          : typeof valueRaw === 'string' && valueRaw.trim()
            ? valueRaw.trim()
            : child.key;
      const disabled = normalizeDslBoolean(get('disabled'));
      const label = String(value);
      return { key: child.key, value, label, disabled, node: child };
    });
}

export function hasDslRadioChildren(children: UiTreeNode[] | undefined): boolean {
  return (children ?? []).some((c) => RADIO_NODE_TYPES.has(String(c.type ?? '').trim()));
}

/** 供 `Radio.Group` `options` 属性或等价结构使用 */
export function optionsFromRadioRows(
  rows: DslRadioRow[],
): Array<{ value: string | number | boolean; label: string; disabled?: boolean }> {
  return rows.map((r) => ({
    value: r.value,
    label: r.label,
    ...(r.disabled ? { disabled: true as const } : {}),
  }));
}

/**
 * React 单选组：非受控时**不能**传入 `value`（含 `value={undefined}`），否则仍会视为受控且会忽略 `defaultValue`。
 * 受控时只传 `value`，不传 `defaultValue`。
 */
export function radioGroupValuePropsForReact(
  controlled: boolean,
  valueResolved: string | number | boolean | undefined,
  defaultVal: string | number | boolean | undefined,
): { value?: string | number | boolean; defaultValue?: string | number | boolean } {
  if (controlled) {
    return { value: valueResolved };
  }
  if (defaultVal !== undefined) {
    return { defaultValue: defaultVal };
  }
  return {};
}

/**
 * 将属性面板里多为 string 的 `value` / `defaultValue` 与选项（或子 Radio）的 `value` 对齐，
 * 避免 JSON 里是数字 `1`、输入框里是 `"1"` 时受控选中不生效。
 */
export function coerceRadioGroupStoredValue(
  raw: unknown,
  options: Array<{ value: string | number | boolean }>,
): string | number | boolean | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw === 'string' && raw.trim() === '') {
    return undefined;
  }

  if (options.length === 0) {
    if (typeof raw === 'string') {
      const t = raw.trim();
      const n = Number(t);
      if (Number.isFinite(n) && String(n) === t) {
        return n;
      }
      return t;
    }
    if (typeof raw === 'number' || typeof raw === 'boolean') {
      return raw;
    }
    return undefined;
  }

  const match = (candidate: unknown): string | number | boolean | undefined => {
    for (const o of options) {
      if (Object.is(o.value, candidate)) {
        return o.value;
      }
    }
    return undefined;
  };

  const direct = match(raw);
  if (direct !== undefined) {
    return direct;
  }

  if (typeof raw === 'string') {
    const t = raw.trim();
    const fromStr = match(t);
    if (fromStr !== undefined) {
      return fromStr;
    }
    const n = Number(t);
    if (Number.isFinite(n) && String(n) === t) {
      const fromNum = match(n);
      if (fromNum !== undefined) {
        return fromNum;
      }
    }
    for (const o of options) {
      if (String(o.value) === t) {
        return o.value;
      }
    }
    return t;
  }

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const fromNum = match(raw);
    if (fromNum !== undefined) {
      return fromNum;
    }
    for (const o of options) {
      if (String(o.value) === String(raw)) {
        return o.value;
      }
    }
    return raw;
  }

  if (typeof raw === 'boolean') {
    return match(raw);
  }

  return undefined;
}

function parseJsonRecordArray(raw: string | undefined): Array<Record<string, unknown>> {
  if (!raw?.trim()) {
    return [];
  }
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as Array<Record<string, unknown>>) : [];
  } catch {
    return [];
  }
}

/**
 * 属性面板：单选组可选值（子 Radio 优先，否则 `options` JSON，与搭建/预览一致）。
 */
export function getRadioGroupOptionDescriptors(
  node: UiTreeNode,
): Array<{ value: string | number | boolean; label: string; disabled?: boolean }> {
  const rows = collectDslRadioRows(node.children);
  if (rows.length > 0) {
    return rows.map((r) => ({
      value: r.value,
      label: String(r.value),
      ...(r.disabled ? { disabled: true as const } : {}),
    }));
  }
  const raw = (node.props?.options as { value?: unknown } | undefined)?.value;
  const s = typeof raw === 'string' ? raw : '';
  return parseJsonRecordArray(s).map((o) => ({
    value: o.value as string | number | boolean,
    label: String(o.label ?? o.value ?? ''),
    ...(o.disabled === true ? { disabled: true as const } : {}),
  }));
}
