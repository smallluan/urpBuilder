import type { CSSProperties } from 'react';
import type { UiTreeNode } from '../store/types';
import { normalizeDslBoolean } from './radioDsl';

export type CheckboxLabelAlign = 'top' | 'center' | 'bottom';

export type CheckboxGroupOptionLayout = 'horizontal' | 'vertical';

export type DslCheckboxRow = {
  key: string;
  value: string | number | boolean;
  /** 无子树时供 `options` 回退等使用的占位文案（通常为 `String(value)`） */
  label: string;
  disabled: boolean;
  /** 对应 DSL 子节点，用于搭建态标签区 DropArea / 预览子树 */
  node: UiTreeNode;
};

const CHECKBOX_NODE_TYPES = new Set(['Checkbox', 'antd.Checkbox']);

/** 多选项：标签与复选框垂直对齐 */
export function parseCheckboxLabelAlign(raw: unknown): CheckboxLabelAlign {
  const s = String(raw ?? 'center').trim().toLowerCase();
  if (s === 'top' || s === 'bottom') {
    return s;
  }
  return 'center';
}

/** 多选组：子选项排列方向（物料 prop `optionLayout`） */
export function parseCheckboxGroupOptionLayout(raw: unknown): CheckboxGroupOptionLayout {
  const s = String(raw ?? 'horizontal').trim().toLowerCase();
  return s === 'vertical' ? 'vertical' : 'horizontal';
}

/** 多选组：子选项间距（px，物料 `optionGap`，横纵均生效） */
export function parseCheckboxGroupOptionGap(raw: unknown): number {
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

/**
 * 最多可选数：未配置时默认为当前选项个数（与 TDesign 语义一致）；显式 0 表示不限制。
 * antd 无原生 `max`，预览/搭建侧用同一解析结果做截断。
 */
export function parseCheckboxGroupMax(raw: unknown, optionCount: number): number | undefined {
  const n = Math.max(0, Math.floor(optionCount));
  if (raw === 0 || raw === '0') {
    return undefined;
  }
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }
  if (typeof raw === 'string' && raw.trim()) {
    const p = Number(raw.trim());
    if (Number.isFinite(p) && p > 0) {
      return Math.floor(p);
    }
  }
  return n > 0 ? n : undefined;
}

/** 将选中值截断到 `max` 以内（antd 等无原生 max 时使用） */
export function clampCheckboxGroupSelection<T extends string | number | boolean>(
  next: T[],
  maxEff: number | undefined,
): T[] {
  if (maxEff === undefined || maxEff <= 0 || next.length <= maxEff) {
    return next;
  }
  return next.slice(0, maxEff);
}

/** TDesign / antd 多选组容器：横向或纵向排列子项 */
export function checkboxGroupOptionLayoutStyle(
  layout: CheckboxGroupOptionLayout,
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

/** 从 DSL 子节点收集多选项（与搭建/预览中 Checkbox.Group 子树一致） */
export function collectDslCheckboxRows(children: UiTreeNode[] | undefined): DslCheckboxRow[] {
  return (children ?? [])
    .filter((child) => CHECKBOX_NODE_TYPES.has(String(child.type ?? '').trim()))
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

export function hasDslCheckboxChildren(children: UiTreeNode[] | undefined): boolean {
  return (children ?? []).some((c) => CHECKBOX_NODE_TYPES.has(String(c.type ?? '').trim()));
}

/** 供 `Checkbox.Group` `options` 属性或等价结构使用 */
export function optionsFromCheckboxRows(
  rows: DslCheckboxRow[],
): Array<{ value: string | number | boolean; label: string; disabled?: boolean }> {
  return rows.map((r) => ({
    value: r.value,
    label: r.label,
    ...(r.disabled ? { disabled: true as const } : {}),
  }));
}

/**
 * React 多选组：非受控时**不能**传入 `value`（含 `value={undefined}`），否则仍会视为受控且会忽略 `defaultValue`。
 * 受控时只传 `value`，不传 `defaultValue`。
 * 值为数组。
 */
export function checkboxGroupValuePropsForReact(
  controlled: boolean,
  valueResolved: Array<string | number | boolean> | undefined,
  defaultVal: Array<string | number | boolean> | undefined,
): { value?: Array<string | number | boolean>; defaultValue?: Array<string | number | boolean> } {
  if (controlled) {
    return { value: valueResolved ?? [] };
  }
  if (defaultVal !== undefined) {
    return { defaultValue: defaultVal };
  }
  return {};
}

/**
 * 将属性面板里的 `value` / `defaultValue`（可能为 JSON 字符串或数组）解析为数组，
 * 并与选项的 value 做类型对齐（如 `"1"` 与 `1`）。
 */
export function coerceCheckboxGroupStoredValue(
  raw: unknown,
  options: Array<{ value: string | number | boolean }>,
): Array<string | number | boolean> | undefined {
  const arr = parseCheckboxValueArray(raw);
  if (!arr) return undefined;
  if (options.length === 0) return arr;
  return arr.map((item) => {
    for (const o of options) {
      if (Object.is(o.value, item)) return o.value;
      if (String(o.value) === String(item)) return o.value;
    }
    return item;
  });
}

function parseCheckboxValueArray(raw: unknown): Array<string | number | boolean> | undefined {
  if (Array.isArray(raw)) {
    return raw.filter(
      (v): v is string | number | boolean =>
        typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
    );
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (v): v is string | number | boolean =>
            typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
        );
      }
    } catch {
      // not JSON array
    }
    return trimmed.split(',').map((s) => {
      const t = s.trim();
      const n = Number(t);
      if (Number.isFinite(n) && String(n) === t) return n;
      return t;
    }).filter(Boolean);
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
 * 属性面板：多选组可选值（子 Checkbox 优先，否则 `options` JSON，与搭建/预览一致）。
 */
export function getCheckboxGroupOptionDescriptors(
  node: UiTreeNode,
): Array<{ value: string | number | boolean; label: string; disabled?: boolean }> {
  const rows = collectDslCheckboxRows(node.children);
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

/** 子项增删后：将 `max` 同步为当前多选项个数（与「默认可全选」一致） */
export function patchCheckboxGroupMaxFromChildCount(node: UiTreeNode): UiTreeNode {
  const t = String(node.type ?? '').trim();
  if (t !== 'Checkbox.Group' && t !== 'antd.Checkbox.Group') {
    return node;
  }
  const n = collectDslCheckboxRows(node.children).length;
  const prev = (node.props?.max ?? {}) as {
    value?: unknown;
    name?: string;
    editType?: string;
    payload?: unknown;
  };
  return {
    ...node,
    props: {
      ...node.props,
      max: {
        ...prev,
        name: prev.name ?? '最多可选数',
        value: n,
        editType: prev.editType ?? 'inputNumber',
        payload: prev.payload ?? { min: 0 },
      },
    },
  };
}
